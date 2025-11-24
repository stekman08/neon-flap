import { Bird } from './Bird.js';
import { Pipe } from './Pipe.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Star } from '../background/Star.js';
import { CitySkyline } from '../background/CitySkyline.js';
import { SynthGrid } from '../background/SynthGrid.js';
import { ScorePopup } from '../scoring/ScorePopup.js';
import { MatrixColumn } from '../background/MatrixColumn.js';
import { AIController } from '../ai/AIController.js';
import { GameConfig } from '../config/GameConfig.js';
import { PerformanceMonitor } from '../debug/PerformanceMonitor.js';
import {
    PIPE_SPAWN_RATE,
    INITIAL_PIPE_SPEED,
    SPEED_INCREMENT,
    MAX_SPEED,
    BABY_PIPE_SPEED
} from '../config/constants.js';

export class GameLoop {
    constructor(canvas, ctx, uiElements, audioController) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.uiElements = uiElements;
        this.audioController = audioController;

        // Game state
        this.currentPipeSpeed = INITIAL_PIPE_SPEED;
        this.currentPipeGap = GameConfig.initialPipeGap;
        this.gameState = 'START'; // START, PLAYING, GAMEOVER
        this.frames = 0;
        this.score = 0;
        this.pipesPassed = 0;
        this.highScore = 0; // Will be loaded in init based on mode
        this.gameHue = 180; // Start at Cyan
        this.isAutoPlay = false;
        this.lastPipeGapCenter = 0;

        // Delta time tracking for frame rate independence
        this.lastTimestamp = 0;
        this.timeSinceLastPipe = 0;
        this.shake = 0; // Screen shake magnitude

        // Arrays
        this.bird = null;
        this.pipes = [];
        this.particleSystem = new ParticleSystem(ctx);
        this.stars = [];
        this.city = null;
        this.scorePopups = [];
        this.matrixRain = [];
        this.synthGrid = null;

        // Performance monitoring (debug mode only)
        this.performanceMonitor = new PerformanceMonitor();

        // Bind methods
        this.loop = this.loop.bind(this);
        this.update = this.update.bind(this);
        this.draw = this.draw.bind(this);
    }

    init() {
        this.bird = new Bird(this.canvas, this.ctx, this.gameHue,
            (x, y) => this.particleSystem.createJumpParticles(x, y),
            () => this.gameOver(),
            () => { if (this.audioController) this.audioController.playJump(); } // Jump sound callback
        );
        this.pipes = [];
        this.particleSystem.reset();
        this.city = new CitySkyline(this.canvas, this.ctx);
        this.synthGrid = new SynthGrid(this.canvas, this.ctx);
        this.scorePopups = [];
        this.score = 0;
        this.pipesPassed = 0;
        this.frames = 0;
        this.gameHue = 180; // Start at Cyan
        this.isAutoPlay = false;
        this.lastPipeGapCenter = this.canvas.height / 2; // Init center
        this.lastTimestamp = 0;
        this.timeSinceLastPipe = 0;
        this.shake = 0;
        this.uiElements.scoreHud.innerText = this.score;
        this.uiElements.scoreHud.style.display = 'none'; // Ensure hidden on init

        // Reset difficulty
        this.currentPipeSpeed = GameConfig.isBabyMode ? BABY_PIPE_SPEED : INITIAL_PIPE_SPEED;
        this.currentPipeGap = GameConfig.initialPipeGap;

        // Init stars if empty
        if (this.stars.length === 0) {
            for (let i = 0; i < 50; i++) {
                this.stars.push(new Star(this.canvas, this.ctx));
            }
        }

        // Init Matrix Rain
        this.matrixRain = [];
        const colCount = Math.floor(this.canvas.width / 15);
        for (let i = 0; i < colCount; i++) {
            this.matrixRain.push(new MatrixColumn(i * 15, this.canvas, this.ctx));
        }

        // Load High Score based on mode
        const storageKey = GameConfig.isBabyMode ? 'neonFlapBabyHighScore' : 'neonFlapHighScore';
        this.highScore = localStorage.getItem(storageKey) || 0;
    }

    start() {
        if (this.gameState === 'START' || this.gameState === 'GAMEOVER') {
            this.gameState = 'PLAYING';
            this.uiElements.startScreen.classList.remove('active');
            this.uiElements.gameOverScreen.classList.remove('active');
            this.uiElements.scoreHud.style.display = 'flex'; // Show score
            this.bird.jump();

            // Ensure loop is running
            if (!this.lastTimestamp) {
                this.lastTimestamp = performance.now();
                this.loop(this.lastTimestamp);
            }
        }
    }

    createParticles(x, y, count, color) {
        // Legacy method kept for compatibility if needed, but using ParticleSystem now
        this.particleSystem.createExplosion(x, y);
    }

    gameOver() {
        this.gameState = 'GAMEOVER';
        this.particleSystem.createExplosion(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2);
        if (this.audioController) this.audioController.playCrash();
        this.shake = 20;

        // Haptic feedback (heavy)
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        this.uiElements.gameOverScreen.classList.add('active');

        if (!this.isAutoPlay && this.score > this.highScore) {
            this.highScore = this.score;
            const storageKey = GameConfig.isBabyMode ? 'neonFlapBabyHighScore' : 'neonFlapHighScore';
            localStorage.setItem(storageKey, this.highScore);
        }

        this.uiElements.finalScoreEl.innerText = this.score;
        this.uiElements.bestScoreEl.innerText = this.highScore;

        this.uiElements.scoreHud.style.display = 'none';
    }

    update(deltaTime) {
        this.performanceMonitor.markUpdateStart();

        // Background
        // Reactive Themes: Hue shifts based on score OR music
        let targetHue = 180; // Default Cyan/Blue

        if (this.audioController && this.audioController.isPlayingMusic) {
            // Music controls the vibe
            const track = this.audioController.getCurrentTrack();
            if (track) {
                targetHue = track.hue;
            }
        } else {
            // Score controls the vibe (fallback)
            if (this.score > 50) {
                targetHue = 45; // Gold/Fire
            } else if (this.score > 25) {
                targetHue = 300; // Magenta/Purple
            }
        }

        // Smooth interpolation towards target hue with breathing oscillation
        const time = Date.now() * 0.001;
        const oscillation = Math.sin(time) * 20; // +/- 20 degrees breathing
        const currentBaseHue = targetHue + oscillation;
        this.gameHue = this.gameHue + (currentBaseHue - this.gameHue) * 0.05;

        this.stars.forEach(star => star.update(deltaTime));
        this.city.update(this.currentPipeSpeed, this.gameHue, deltaTime);
        this.synthGrid.update(this.currentPipeSpeed, this.gameHue, deltaTime);
        this.matrixRain.forEach(col => col.update(this.gameHue, deltaTime));

        if (this.gameState === 'PLAYING') {
            if (this.isAutoPlay) {
                AIController.performAI(this.bird, this.pipes, this.currentPipeGap, this.canvas);
            }
            this.bird.update(this.gameHue, deltaTime);

            // Pipe Spawning - time-based instead of frame-based
            // Convert PIPE_SPAWN_RATE from frames to milliseconds (assuming 60fps base)
            const baseSpawnInterval = (PIPE_SPAWN_RATE / 60) * 1000; // ms
            const currentSpawnInterval = Math.max(1000, baseSpawnInterval * (INITIAL_PIPE_SPEED / this.currentPipeSpeed));

            this.timeSinceLastPipe += (16.67 * deltaTime); // Add elapsed time

            if (this.timeSinceLastPipe >= currentSpawnInterval) {
                this.pipes.push(new Pipe(this.canvas, this.ctx, this.currentPipeGap, GameConfig.minPipeGap, this.lastPipeGapCenter, this.gameHue, (center) => {
                    this.lastPipeGapCenter = center;
                }));
                this.timeSinceLastPipe = 0;
            }

            // Pipe Logic
            for (let i = 0; i < this.pipes.length; i++) {
                let p = this.pipes[i];
                p.update(this.currentPipeSpeed, this.gameHue, deltaTime);

                // Collision Detection
                if (
                    this.bird.x < p.x + p.width &&
                    this.bird.x + this.bird.width > p.x &&
                    (this.bird.y < p.topHeight || this.bird.y + this.bird.height > p.bottomY)
                ) {
                    this.gameOver();
                }

                // Score
                if (p.x + p.width < this.bird.x && !p.passed) {
                    p.passed = true;
                    this.pipesPassed++;

                    // Check for perfect pass
                    const gapCenter = p.topHeight + (this.currentPipeGap / 2);
                    const birdCenter = this.bird.y + (this.bird.height / 2);
                    const diff = Math.abs(gapCenter - birdCenter);
                    const perfectThreshold = GameConfig.scaleHeight(25); // ~4.2% of height

                    const isPerfect = diff < perfectThreshold;

                    if (isPerfect) {
                        this.score += 2;
                        this.scorePopups.push(new ScorePopup(this.bird.x, this.bird.y - 20, "+2", this.ctx, "#ffd700"));
                        this.particleSystem.createExplosion(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2);
                        if (this.audioController) this.audioController.playPerfectScore();
                    } else {
                        this.score++;
                        this.scorePopups.push(new ScorePopup(this.bird.x, this.bird.y - 20, "+1", this.ctx));
                        if (this.audioController) this.audioController.playScore();
                    }

                    this.uiElements.scoreHud.innerText = this.score;

                    // Difficulty Scaling
                    if (this.pipesPassed % 3 === 0) {
                        const increment = GameConfig.isBabyMode ? (SPEED_INCREMENT / 2) : SPEED_INCREMENT;
                        this.currentPipeSpeed = Math.min(this.currentPipeSpeed + increment, MAX_SPEED);
                    }
                }

                // Remove off-screen pipes
                if (p.x + p.width < 0) {
                    this.pipes.splice(i, 1);
                    i--;
                }
            }
        }

        // Particles (managed by system)
        this.particleSystem.update(deltaTime);

        // Score Popups
        for (let i = 0; i < this.scorePopups.length; i++) {
            this.scorePopups[i].update(deltaTime);
            if (this.scorePopups[i].life <= 0) {
                this.scorePopups.splice(i, 1);
                i--;
            }
        }

        this.frames++;

        this.performanceMonitor.markUpdateEnd();
    }

    draw() {
        this.performanceMonitor.markDrawStart();

        // Apply Screen Shake
        this.ctx.save();
        if (this.shake > 0) {
            const dx = (Math.random() - 0.5) * this.shake;
            const dy = (Math.random() - 0.5) * this.shake;
            this.ctx.translate(dx, dy);
            this.shake *= 0.9; // Decay
            if (this.shake < 0.5) this.shake = 0;
        }

        // Clear Canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Stars
        this.stars.forEach(star => star.draw(this.ctx));

        // Draw Matrix Rain (Behind city)
        this.matrixRain.forEach(col => col.draw(this.ctx, this.gameHue));

        // Draw City
        this.city.draw(this.ctx, this.gameHue);

        // Draw Synth Grid
        this.synthGrid.draw(this.ctx, this.gameHue);

        // Draw Pipes
        this.pipes.forEach(p => p.draw(this.ctx, this.gameHue, this.bird));

        // Draw Bird (only if not game over, or draw explosion instead)
        if (this.gameState !== 'GAMEOVER') {
            this.bird.draw(this.ctx, this.gameHue);
        }

        // Draw Particles
        this.particleSystem.draw();

        // Draw Score Popups
        this.scorePopups.forEach(p => p.draw(this.ctx));

        this.performanceMonitor.markDrawEnd();
        this.ctx.restore(); // Restore shake translation
    }

    loop(timestamp = 0) {
        this.performanceMonitor.startFrame();

        // Calculate delta time (normalized to 60fps baseline)
        if (this.lastTimestamp === 0) {
            this.lastTimestamp = timestamp;
        }
        const rawDelta = timestamp - this.lastTimestamp;
        const deltaTime = rawDelta / 16.67; // Normalize to 60fps (1.0 = 60fps, 2.0 = 120fps, etc)
        this.lastTimestamp = timestamp;

        this.update(deltaTime);
        this.draw();

        this.performanceMonitor.endFrame();
        requestAnimationFrame(this.loop);
    }

    /**
     * Handle viewport resize - update all entities with new dimensions
     * Called by ViewportManager when canvas size changes
     */
    handleResize() {
        // Update bird dimensions
        if (this.bird) {
            this.bird.updateDimensions();
        }

        // Update current pipe gap to new proportional value
        this.currentPipeGap = GameConfig.initialPipeGap;

        // Note: Pipes don't need updateDimensions() - they use GameConfig.pipeWidth directly
        // Background entities (stars, city, grid, matrix) also use GameConfig directly

        // Recreate matrix rain columns based on new canvas width
        this.matrixRain = [];
        const colCount = Math.floor(this.canvas.width / GameConfig.scaleWidth(15));
        for (let i = 0; i < colCount; i++) {
            this.matrixRain.push(new MatrixColumn(i * GameConfig.scaleWidth(15), this.canvas, this.ctx));
        }
    }
}
