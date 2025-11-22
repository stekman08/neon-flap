import { Bird } from './Bird.js';
import { Pipe } from './Pipe.js';
import { Particle } from '../effects/Particle.js';
import { Star } from '../background/Star.js';
import { CitySkyline } from '../background/CitySkyline.js';
import { SynthGrid } from '../background/SynthGrid.js';
import { ScorePopup } from '../scoring/ScorePopup.js';
import { MatrixColumn } from '../background/MatrixColumn.js';
import { AIController } from '../ai/AIController.js';
import {
    GRAVITY,
    JUMP_STRENGTH,
    PIPE_SPAWN_RATE,
    INITIAL_PIPE_SPEED,
    INITIAL_PIPE_GAP,
    SPEED_INCREMENT,
    MAX_SPEED,
    MIN_GAP
} from '../config/constants.js';

export class GameLoop {
    constructor(canvas, ctx, uiElements) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.uiElements = uiElements;

        // Game state
        this.currentPipeSpeed = INITIAL_PIPE_SPEED;
        this.currentPipeGap = INITIAL_PIPE_GAP;
        this.gameState = 'START'; // START, PLAYING, GAMEOVER
        this.frames = 0;
        this.score = 0;
        this.pipesPassed = 0;
        this.highScore = localStorage.getItem('neonFlapHighScore') || 0;
        this.gameHue = 0; // For rainbow effect
        this.isAutoPlay = false;
        this.lastPipeGapCenter = 0;

        // Arrays
        this.bird = null;
        this.pipes = [];
        this.particles = [];
        this.stars = [];
        this.city = null;
        this.scorePopups = [];
        this.matrixRain = [];
        this.synthGrid = null;

        // Bind methods
        this.loop = this.loop.bind(this);
        this.update = this.update.bind(this);
        this.draw = this.draw.bind(this);
    }

    init() {
        this.bird = new Bird(this.canvas, this.ctx, this.gameHue, (x, y, count, color) => this.createParticles(x, y, count, color), () => this.gameOver());
        this.pipes = [];
        this.particles = [];
        this.city = new CitySkyline(this.canvas, this.ctx);
        this.synthGrid = new SynthGrid(this.canvas, this.ctx);
        this.scorePopups = [];
        this.score = 0;
        this.pipesPassed = 0;
        this.frames = 0;
        this.gameHue = 0;
        this.isAutoPlay = false;
        this.lastPipeGapCenter = this.canvas.height / 2; // Init center
        this.uiElements.scoreHud.innerText = this.score;

        // Reset difficulty
        this.currentPipeSpeed = INITIAL_PIPE_SPEED;
        this.currentPipeGap = INITIAL_PIPE_GAP;

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
    }

    createParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color, this.ctx));
        }
    }

    gameOver() {
        this.gameState = 'GAMEOVER';
        this.createParticles(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2, 50, '#ff0000'); // Explosion

        if (!this.isAutoPlay && this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('neonFlapHighScore', this.highScore);
        }

        this.uiElements.finalScoreEl.innerText = this.score;
        this.uiElements.bestScoreEl.innerText = this.highScore;

        this.uiElements.scoreHud.style.display = 'none';
        this.uiElements.gameOverScreen.classList.add('active');
    }

    update() {
        // Background
        this.gameHue += 0.5; // Cycle colors
        this.stars.forEach(star => star.update());
        this.city.update(this.currentPipeSpeed, this.gameHue);
        this.synthGrid.update(this.currentPipeSpeed, this.gameHue);
        this.matrixRain.forEach(col => col.update(this.gameHue));

        if (this.gameState === 'PLAYING') {
            if (this.isAutoPlay) {
                AIController.performAI(this.bird, this.pipes, this.currentPipeGap, this.canvas);
            }
            this.bird.update(this.gameHue);

            // Pipe Spawning
            // Adjust spawn rate based on speed

            // Let's use a dynamic spawn rate
            const currentSpawnRate = Math.max(60, Math.floor(PIPE_SPAWN_RATE * (INITIAL_PIPE_SPEED / this.currentPipeSpeed)));

            if (this.frames % currentSpawnRate === 0) {
                this.pipes.push(new Pipe(this.canvas, this.ctx, this.currentPipeGap, MIN_GAP, this.lastPipeGapCenter, this.gameHue, (center) => {
                    this.lastPipeGapCenter = center;
                }));
            }

            // Pipe Logic
            for (let i = 0; i < this.pipes.length; i++) {
                let p = this.pipes[i];
                p.update(this.currentPipeSpeed, this.gameHue);

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

                    if (diff < 25) { // Threshold for perfect
                        this.score += 2;
                        this.scorePopups.push(new ScorePopup(this.bird.x, this.bird.y - 20, "+2", this.ctx, "#ffd700"));
                        this.createParticles(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2, 40, "#ffd700");
                    } else {
                        this.score++;
                        this.scorePopups.push(new ScorePopup(this.bird.x, this.bird.y - 20, "+1", this.ctx));
                    }

                    this.uiElements.scoreHud.innerText = this.score;

                    // Difficulty Scaling
                    if (this.pipesPassed % 3 === 0) {
                        this.currentPipeSpeed = Math.min(this.currentPipeSpeed + SPEED_INCREMENT, MAX_SPEED);
                    }
                }

                // Remove off-screen pipes
                if (p.x + p.width < 0) {
                    this.pipes.splice(i, 1);
                    i--;
                }
            }
        }

        // Particles
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
                i--;
            }
        }

        // Score Popups
        for (let i = 0; i < this.scorePopups.length; i++) {
            this.scorePopups[i].update();
            if (this.scorePopups[i].life <= 0) {
                this.scorePopups.splice(i, 1);
                i--;
            }
        }

        this.frames++;
    }

    draw() {
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
        this.pipes.forEach(p => p.draw(this.ctx, this.gameHue));

        // Draw Bird (only if not game over, or draw explosion instead)
        if (this.gameState !== 'GAMEOVER') {
            this.bird.draw(this.ctx, this.gameHue);
        }

        // Draw Particles
        this.particles.forEach(p => p.draw(this.ctx));

        // Draw Score Popups
        this.scorePopups.forEach(p => p.draw(this.ctx));
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }
}
