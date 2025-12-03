import { Bird } from './Bird.js';
import { Pipe } from './Pipe.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Star } from '../background/Star.js';
import { CitySkyline } from '../background/CitySkyline.js';
import { SynthGrid } from '../background/SynthGrid.js';
import { MatrixColumn } from '../background/MatrixColumn.js';
import { AIController } from '../ai/AIController.js';
import { AITrainingManager } from '../ai/AITrainingManager.js';
import { aiDebugLog } from '../ai/AIDebugLog.js';
import { GameConfig } from '../config/GameConfig.js';
import { GameEffects } from '../effects/GameEffects.js';
import { ScoringSystem } from '../scoring/ScoringSystem.js';
import { PerformanceMonitor } from '../debug/PerformanceMonitor.js';
import {
    PIPE_SPAWN_RATE,
    INITIAL_PIPE_SPEED,
    SPEED_INCREMENT,
    MAX_SPEED,
    TURTLE_PIPE_SPEED
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
        this.isAutoPlay = false;
        this.lastPipeGapCenter = 0;

        // Delta time tracking for frame rate independence
        this.lastTimestamp = 0;
        this.timeSinceLastPipe = 0;
        this.gameOverTime = 0; // Timestamp when game over occurred (for restart cooldown)

        // Game entities
        this.bird = null;
        this.pipes = [];
        this.particleSystem = new ParticleSystem(ctx);
        this.stars = [];
        this.city = null;
        this.matrixRain = [];
        this.synthGrid = null;

        // Sub-systems
        this.effects = new GameEffects();
        this.scoring = new ScoringSystem(uiElements);
        this.trainingManager = new AITrainingManager(canvas, uiElements);

        // Performance monitoring (debug mode only)
        this.performanceMonitor = new PerformanceMonitor();

        // AI Debug logging (for test diagnostics)
        this.aiDebugLog = aiDebugLog;

        // Bind methods
        this.loop = this.loop.bind(this);
        this.update = this.update.bind(this);
        this.draw = this.draw.bind(this);
    }

    init() {
        this.bird = new Bird(this.canvas, this.ctx, this.effects.getHue(),
            (x, y) => this.particleSystem.createJumpParticles(x, y),
            () => this.gameOver(),
            () => { if (this.audioController) this.audioController.playJump(); }
        );
        this.pipes = [];
        this.particleSystem.reset();
        this.city = new CitySkyline(this.canvas, this.ctx);
        this.synthGrid = new SynthGrid(this.canvas, this.ctx);
        this.frames = 0;
        this.isAutoPlay = false;
        this.lastPipeGapCenter = this.canvas.height / 2;
        this.lastTimestamp = 0;
        this.timeSinceLastPipe = 0;

        // Reset sub-systems
        this.effects.reset();
        this.scoring.reset();
        this.scoring.loadHighScore();

        // Reset difficulty
        this.currentPipeSpeed = GameConfig.isTurtleMode ? TURTLE_PIPE_SPEED : INITIAL_PIPE_SPEED;
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
    }

    start() {
        if (this.gameState === 'START' || this.gameState === 'GAMEOVER') {
            // Prevent immediate restart after game over (750ms cooldown)
            if (this.gameState === 'GAMEOVER') {
                const timeSinceGameOver = Date.now() - this.gameOverTime;
                if (timeSinceGameOver < 750) {
                    return; // Too soon, ignore input
                }
                this.init();
            }

            this.gameState = 'PLAYING';
            this.uiElements.startScreen.classList.remove('active');
            this.uiElements.gameOverScreen.classList.remove('active');
            this.scoring.showScoreHud();

            // Enable AI debug logging for auto-play mode
            if (this.isAutoPlay) {
                aiDebugLog.enable();
                aiDebugLog.logGameStart(this.bird);
            }

            this.bird.jump();

            // Ensure loop is running
            if (!this.lastTimestamp) {
                this.lastTimestamp = performance.now();
                this.loop(this.lastTimestamp);
            }
        }
    }

    createParticles(x, y, count, color) {
        // Legacy method kept for compatibility
        this.particleSystem.createExplosion(x, y);
    }

    gameOver() {
        // Prevent multiple gameOver calls
        if (this.gameState === 'GAMEOVER') return;

        this.gameState = 'GAMEOVER';
        this.gameOverTime = Date.now();

        // Log game over
        const isFloorCollision = this.bird.y + this.bird.height >= this.canvas.height;
        if (isFloorCollision) {
            aiDebugLog.logCollision('floor', this.bird);
        }
        aiDebugLog.logGameOver(this.scoring.getScore(), aiDebugLog.summary?.gameOverReason || (isFloorCollision ? 'floor' : 'unknown'));

        // Trigger effects
        this.particleSystem.createExplosion(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2);
        if (this.audioController) this.audioController.playCrash();
        this.effects.triggerDeathEffects();

        // Haptic feedback (heavy)
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        // Delay showing game over screen for dramatic effect
        setTimeout(() => {
            this.uiElements.gameOverScreen.classList.add('active');
        }, 300);

        // Save high score (only in non-autoplay mode)
        if (!this.isAutoPlay) {
            const isNewHighScore = this.scoring.saveHighScore();
            if (isNewHighScore) {
                // Haptic feedback for new highscore (celebration)
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100, 50, 200]);
                }
            }
        }

        this.scoring.updateGameOverScreen();
        this.scoring.hideScoreHud();
    }

    /**
     * Exit training or AI mode and return to start screen
     */
    exitTraining() {
        if (!this.trainingManager.isActive() && !this.isAutoPlay) return;

        this.trainingManager.exitTraining(() => {
            this.init();
            this.gameState = 'START';
            this.uiElements.startScreen.classList.add('active');
        });
        this.isAutoPlay = false;
    }

    /**
     * Start AI training mode with neuroevolution
     */
    startTraining() {
        this.isAutoPlay = false;
        this.gameState = 'PLAYING';

        const initialState = this.trainingManager.startTraining();

        // Apply initial state
        this.pipes = initialState.pipes;
        this.frames = initialState.frames;
        this.timeSinceLastPipe = initialState.timeSinceLastPipe;
        this.currentPipeSpeed = initialState.currentPipeSpeed;
        this.currentPipeGap = initialState.currentPipeGap;

        // Start game loop
        if (!this.lastTimestamp) {
            this.lastTimestamp = performance.now();
            this.loop(this.lastTimestamp);
        }
    }

    /**
     * Check if a trained brain exists in localStorage
     * @returns {boolean}
     */
    static hasTrainedBrain() {
        return AITrainingManager.hasTrainedBrain();
    }

    /**
     * Load the trained brain from localStorage
     * @returns {Object|null}
     */
    static loadTrainedBrain() {
        return AITrainingManager.loadTrainedBrain();
    }

    update(deltaTime) {
        this.performanceMonitor.markUpdateStart();

        const gameHue = this.effects.updateHue(this.scoring.getScore(), this.audioController);

        // Update background elements
        for (let i = 0; i < this.stars.length; i++) {
            this.stars[i].update(this.currentPipeSpeed, deltaTime);
        }
        this.city.update(this.currentPipeSpeed, gameHue, deltaTime);
        this.synthGrid.update(this.currentPipeSpeed, gameHue, deltaTime);
        for (let i = 0; i < this.matrixRain.length; i++) {
            this.matrixRain[i].update(gameHue, deltaTime);
        }

        if (this.gameState === 'PLAYING') {
            // Handle different game modes
            if (this.trainingManager.isActive()) {
                // Training mode: update all birds in population
                const result = this.trainingManager.updateTrainingBirds(
                    deltaTime,
                    this.pipes,
                    this.currentPipeSpeed,
                    this.scoring.getPipesPassed()
                );

                // Update state from training result
                this.scoring.pipesPassed = result.pipesPassed;
                this.currentPipeSpeed = result.currentPipeSpeed;

                if (result.allDead) {
                    const nextState = this.trainingManager.nextGeneration();
                    this.pipes = nextState.pipes;
                    this.frames = nextState.frames;
                    this.timeSinceLastPipe = nextState.timeSinceLastPipe;
                    this.currentPipeSpeed = nextState.currentPipeSpeed;
                    this.currentPipeGap = nextState.currentPipeGap;
                }
            } else if (this.isAutoPlay) {
                AIController.performAI(this.bird, this.pipes, this.currentPipeGap, this.canvas);
                aiDebugLog.logFrame(this.bird, this.pipes, this.performanceMonitor.fps);
                this.bird.update(gameHue, deltaTime, this.currentPipeSpeed);
            } else {
                this.bird.update(gameHue, deltaTime, this.currentPipeSpeed);
            }

            // Floor collision in Bird.update() may have triggered game over
            if (this.gameState !== 'PLAYING') return;

            // Pipe Spawning - time-based instead of frame-based
            const baseSpawnInterval = (PIPE_SPAWN_RATE / 60) * 1000;
            const safePipeSpeed = this.currentPipeSpeed || INITIAL_PIPE_SPEED;
            const currentSpawnInterval = Math.max(1000, baseSpawnInterval * (INITIAL_PIPE_SPEED / safePipeSpeed));

            this.timeSinceLastPipe += (16.67 * deltaTime);

            if (this.timeSinceLastPipe >= currentSpawnInterval) {
                const newPipe = new Pipe(this.canvas, this.ctx, this.currentPipeGap, GameConfig.minPipeGap, this.lastPipeGapCenter, gameHue, (center) => {
                    this.lastPipeGapCenter = center;
                });
                this.pipes.push(newPipe);
                aiDebugLog.logPipeSpawn(newPipe);
                this.timeSinceLastPipe = 0;
            }

            // Pipe Logic
            for (let i = 0; i < this.pipes.length; i++) {
                let p = this.pipes[i];
                p.update(this.currentPipeSpeed, gameHue, deltaTime);

                // Collision Detection (skip in training mode - handled separately)
                if (
                    !this.trainingManager.isActive() &&
                    this.gameState === 'PLAYING' &&
                    this.bird.x < p.x + p.width &&
                    this.bird.x + this.bird.width > p.x &&
                    (this.bird.y < p.topHeight || this.bird.y + this.bird.height > p.bottomY)
                ) {
                    const collisionType = this.bird.y < p.topHeight ? 'pipe_top' : 'pipe_bottom';
                    aiDebugLog.logCollision(collisionType, this.bird, p);
                    this.gameOver();
                    return;
                }

                // Score (skip in training mode - handled separately)
                if (!this.trainingManager.isActive() && p.x + p.width < this.bird.x && !p.passed) {
                    p.passed = true;
                    aiDebugLog.logPipePassed(p, this.scoring.getScore() + 1);

                    const result = this.scoring.processPipePass(
                        p, this.bird, this.currentPipeGap, this.ctx,
                        this.particleSystem, this.audioController
                    );

                    if (result.isMilestone) {
                        this.effects.triggerMilestoneFlash();
                        this.scoring.createMilestoneParticles(this.bird, this.particleSystem, gameHue);
                    }

                    // Difficulty Scaling
                    if (this.scoring.shouldIncreaseDifficulty()) {
                        const increment = GameConfig.isTurtleMode ? (SPEED_INCREMENT / 2) : SPEED_INCREMENT;
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

        // Update particles and popups
        this.particleSystem.update(deltaTime);
        this.scoring.updatePopups(deltaTime);

        this.frames++;
        this.performanceMonitor.markUpdateEnd();
    }

    draw(time = 0) {
        this.performanceMonitor.markDrawStart();

        const gameHue = this.effects.getHue();

        // Apply Screen Shake
        this.ctx.save();
        this.effects.applyShake(this.ctx);

        // Clear Canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background layers
        for (let i = 0; i < this.stars.length; i++) {
            this.stars[i].draw(this.ctx);
        }
        for (let i = 0; i < this.matrixRain.length; i++) {
            this.matrixRain[i].draw(this.ctx, gameHue);
        }
        this.city.draw(this.ctx, gameHue, time);
        this.synthGrid.draw(this.ctx, gameHue);

        // Draw Pipes
        for (let i = 0; i < this.pipes.length; i++) {
            this.pipes[i].draw(this.ctx, gameHue, this.bird);
        }

        // Draw Bird(s) - only if not game over
        if (this.gameState !== 'GAMEOVER') {
            if (this.trainingManager.isActive()) {
                // Draw training population - find the best performing bird
                const population = this.trainingManager.getPopulation();
                let bestBird = null;
                let bestScore = -1;
                for (const bird of population) {
                    if (bird.alive && bird.framesAlive > bestScore) {
                        bestScore = bird.framesAlive;
                        bestBird = bird;
                    }
                }

                // Draw all alive birds, marking the best one
                for (const bird of population) {
                    if (bird.alive) {
                        bird.draw(this.ctx, gameHue, bird === bestBird);
                    }
                }
            } else {
                this.bird.draw(this.ctx, gameHue);
            }
        }

        // Draw effects and UI
        this.particleSystem.draw();
        this.scoring.drawPopups(this.ctx);
        this.effects.drawFlashOverlays(this.ctx, this.canvas.width, this.canvas.height);

        this.performanceMonitor.markDrawEnd();
        this.ctx.restore();
    }

    loop(timestamp = 0) {
        this.performanceMonitor.startFrame();

        // Calculate delta time (normalized to 60fps baseline)
        if (this.lastTimestamp === 0) {
            this.lastTimestamp = timestamp;
        }
        const rawDelta = timestamp - this.lastTimestamp;
        const deltaTime = rawDelta / 16.67;
        this.lastTimestamp = timestamp;

        // Convert timestamp to seconds for time-based animations
        const timeInSeconds = timestamp * 0.001;

        this.update(deltaTime);
        this.draw(timeInSeconds);

        this.performanceMonitor.endFrame();
        requestAnimationFrame(this.loop);
    }

    /**
     * Handle viewport resize - update all entities with new dimensions
     */
    handleResize() {
        if (this.bird) {
            this.bird.updateDimensions();
        }

        this.currentPipeGap = GameConfig.initialPipeGap;

        // Recreate matrix rain columns based on new canvas width
        this.matrixRain = [];
        const colCount = Math.floor(this.canvas.width / GameConfig.scaleWidth(15));
        for (let i = 0; i < colCount; i++) {
            this.matrixRain.push(new MatrixColumn(i * GameConfig.scaleWidth(15), this.canvas, this.ctx));
        }
    }

    // Expose score and highScore for external access (e.g., main.js)
    get score() {
        return this.scoring.getScore();
    }

    set score(value) {
        this.scoring.score = value;
    }

    get highScore() {
        return this.scoring.getHighScore();
    }

    set highScore(value) {
        this.scoring.highScore = value;
    }

    get pipesPassed() {
        return this.scoring.getPipesPassed();
    }

    set pipesPassed(value) {
        this.scoring.pipesPassed = value;
    }

    // For backwards compatibility with training mode checks
    get isTraining() {
        return this.trainingManager.isActive();
    }

    set isTraining(value) {
        this.trainingManager.isTraining = value;
    }

    // Expose effects properties for backwards compatibility
    get gameHue() {
        return this.effects.getHue();
    }

    set gameHue(value) {
        this.effects.setHue(value);
    }

    get shake() {
        return this.effects.shake;
    }

    set shake(value) {
        this.effects.shake = value;
    }

    get screenFlash() {
        return this.effects.screenFlash;
    }

    set screenFlash(value) {
        this.effects.screenFlash = value;
    }

    get deathFlash() {
        return this.effects.deathFlash;
    }

    set deathFlash(value) {
        this.effects.deathFlash = value;
    }

    get deathHueShift() {
        return this.effects.deathHueShift;
    }

    set deathHueShift(value) {
        this.effects.deathHueShift = value;
    }

    // Expose scorePopups for backwards compatibility
    get scorePopups() {
        return this.scoring.scorePopups;
    }
}
