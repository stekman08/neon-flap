import { Bird } from './Bird.js';
import { Pipe } from './Pipe.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Star } from '../background/Star.js';
import { CitySkyline } from '../background/CitySkyline.js';
import { SynthGrid } from '../background/SynthGrid.js';
import { ScorePopup } from '../scoring/ScorePopup.js';
import { MatrixColumn } from '../background/MatrixColumn.js';
import { AIController } from '../ai/AIController.js';
import { TrainingBird } from '../ai/TrainingBird.js';
import { NeuralNetwork } from '../ai/NeuralNetwork.js';
import { aiDebugLog } from '../ai/AIDebugLog.js';
import { GameConfig } from '../config/GameConfig.js';
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
        this.gameOverTime = 0; // Timestamp when game over occurred (for restart cooldown)
        this.screenFlash = 0; // Screen flash intensity for milestone celebrations
        this.deathFlash = 0; // Red flash on death
        this.deathHueShift = 0; // Temporary hue shift towards red on death

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

        // AI Debug logging (for test diagnostics)
        this.aiDebugLog = aiDebugLog;

        // AI Training mode
        this.isTraining = false;
        this.population = [];
        this.savedBirds = [];
        this.generation = 1;
        this.bestFitness = 0;
        this.bestBrainScore = 0; // Best score achieved by any bird ever
        this.POPULATION_SIZE = 50;
        this.MUTATION_RATE = 0.1;

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
        const scoreNumber = this.uiElements.scoreHud.querySelector('.score-number');
        if (scoreNumber) scoreNumber.innerText = this.score;
        this.uiElements.scoreHud.style.display = 'none'; // Ensure hidden on init

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

        // Load High Score based on mode
        const storageKey = GameConfig.isTurtleMode ? 'neonFlapTurtleHighScore' : 'neonFlapHighScore';
        try {
            this.highScore = localStorage.getItem(storageKey) || 0;
        } catch (e) {
            // localStorage may be unavailable in private/incognito mode
            this.highScore = 0;
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
            this.uiElements.scoreHud.style.display = 'flex'; // Show score

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
        // Legacy method kept for compatibility if needed, but using ParticleSystem now
        this.particleSystem.createExplosion(x, y);
    }

    gameOver() {
        // Prevent multiple gameOver calls
        if (this.gameState === 'GAMEOVER') return;

        this.gameState = 'GAMEOVER';
        this.gameOverTime = Date.now(); // Track when game over occurred for restart cooldown

        // Log game over - check if it's floor collision (bird at bottom)
        const isFloorCollision = this.bird.y + this.bird.height >= this.canvas.height;
        if (isFloorCollision) {
            aiDebugLog.logCollision('floor', this.bird);
        }
        aiDebugLog.logGameOver(this.score, aiDebugLog.summary?.gameOverReason || (isFloorCollision ? 'floor' : 'unknown'));

        this.particleSystem.createExplosion(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2);
        if (this.audioController) this.audioController.playCrash();
        this.shake = 25; // Stronger shake
        this.deathFlash = 0.8; // Bright red flash
        this.deathHueShift = 1.0; // Full shift towards red

        // Haptic feedback (heavy)
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        // Delay showing game over screen for dramatic effect
        setTimeout(() => {
            this.uiElements.gameOverScreen.classList.add('active');
        }, 300);

        if (!this.isAutoPlay && this.score > this.highScore) {
            this.highScore = this.score;
            const storageKey = GameConfig.isTurtleMode ? 'neonFlapTurtleHighScore' : 'neonFlapHighScore';
            try {
                localStorage.setItem(storageKey, this.highScore);
            } catch (e) {
                // localStorage may be unavailable or quota exceeded
            }

            // Haptic feedback for new highscore (celebration)
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100, 50, 200]);
            }

            // Track new highscore in analytics
            try {
                if (window.goatcounter && window.goatcounter.count) {
                    window.goatcounter.count({
                        path: '/event/highscore/' + this.highScore,
                        title: 'Highscore: ' + this.highScore,
                        event: true
                    });
                }
            } catch (e) {
                // Analytics error should not break the game
            }
        }

        if (this.uiElements.finalScoreEl) {
            this.uiElements.finalScoreEl.innerText = this.score;
        }
        if (this.uiElements.bestScoreEl) {
            this.uiElements.bestScoreEl.innerText = this.highScore;
        }
        if (this.uiElements.scoreHud) {
            this.uiElements.scoreHud.style.display = 'none';
        }
    }

    /**
     * Start AI training mode with neuroevolution
     */
    /**
     * Exit training or AI mode and return to start screen
     */
    exitTraining() {
        if (!this.isTraining && !this.isAutoPlay) return;

        const aiStats = document.getElementById('ai-stats');
        if (aiStats) aiStats.classList.remove('active');

        this.isTraining = false;
        this.isAutoPlay = false;
        this.init();
        this.gameState = 'START';
        this.uiElements.startScreen.classList.add('active');
    }

    startTraining() {
        this.isTraining = true;
        this.isAutoPlay = false;
        this.gameState = 'PLAYING';
        this.generation = 1;
        this.bestFitness = 0;

        // Load existing best brain score
        const savedBrain = GameLoop.loadTrainedBrain();
        this.bestBrainScore = savedBrain ? savedBrain.score : 0;
        if (savedBrain) {
            console.log(`[AI] Starting training. Best saved brain has score: ${savedBrain.score}`);
        }

        this.uiElements.startScreen.classList.remove('active');
        this.uiElements.gameOverScreen.classList.remove('active');
        this.uiElements.scoreHud.style.display = 'none'; // Hide score during training

        // Show AI stats panel
        const aiStats = document.getElementById('ai-stats');
        if (aiStats) aiStats.classList.add('active');

        // Reset game state
        this.pipes = [];
        this.score = 0;
        this.pipesPassed = 0;
        this.frames = 0;
        this.timeSinceLastPipe = 0;
        this.currentPipeSpeed = INITIAL_PIPE_SPEED;
        this.currentPipeGap = GameConfig.initialPipeGap;

        // Create initial population
        this.createPopulation();
        this.updateTrainingUI();

        // Start game loop
        if (!this.lastTimestamp) {
            this.lastTimestamp = performance.now();
            this.loop(this.lastTimestamp);
        }
    }

    /**
     * Create initial population of training birds
     * If a trained brain exists, seed population with mutated copies of it
     */
    createPopulation() {
        this.population = [];
        this.savedBirds = [];

        // Try to load saved brain to continue training
        const savedData = GameLoop.loadTrainedBrain();
        let baseBrain = null;

        if (savedData) {
            baseBrain = NeuralNetwork.fromJSON(savedData.brain);
            console.log(`[AI] Seeding population from saved brain (score: ${savedData.score})`);
        }

        for (let i = 0; i < this.POPULATION_SIZE; i++) {
            let bird;

            if (baseBrain) {
                // Create mutated copy of saved brain
                const childBrain = baseBrain.copy();
                // First bird gets no mutation (keep the original), rest get mutations
                if (i > 0) {
                    childBrain.mutate(this.MUTATION_RATE);
                }
                bird = new TrainingBird(this.canvas, childBrain);
            } else {
                // No saved brain - start with random
                bird = new TrainingBird(this.canvas);
            }

            bird.jump(); // Initial jump like normal game
            this.population.push(bird);
        }
    }

    /**
     * Create next generation using genetic algorithm
     */
    nextGeneration() {
        // Calculate raw fitness for each bird
        for (const bird of this.savedBirds) {
            bird.calculateFitness();
        }

        // Track best fitness BEFORE normalizing
        const maxFitness = Math.max(...this.savedBirds.map(b => b.fitness));
        if (maxFitness > this.bestFitness) {
            this.bestFitness = maxFitness;
        }

        // Now normalize for selection
        this.normalizeFitness();
        this.generation++;

        // Create new population
        this.population = [];
        for (let i = 0; i < this.POPULATION_SIZE; i++) {
            this.population.push(this.pickOne());
        }
        this.savedBirds = [];

        // Reset game state for new generation
        this.pipes = [];
        this.score = 0;
        this.pipesPassed = 0;
        this.frames = 0;
        this.timeSinceLastPipe = 0;
        this.currentPipeSpeed = INITIAL_PIPE_SPEED;
        this.currentPipeGap = GameConfig.initialPipeGap;

        this.updateTrainingUI();
    }

    /**
     * Select a parent bird using fitness-proportionate selection
     */
    pickOne() {
        let index = 0;
        let r = Math.random();

        while (r > 0 && index < this.savedBirds.length) {
            r -= this.savedBirds[index].fitness;
            index++;
        }
        index = Math.max(0, index - 1);

        const parent = this.savedBirds[index];
        return parent.createChild(this.MUTATION_RATE);
    }

    /**
     * Normalize fitness values to sum to 1 (for selection probability)
     */
    normalizeFitness() {
        const totalFitness = this.savedBirds.reduce((sum, b) => sum + b.fitness, 0);
        if (totalFitness > 0) {
            for (const bird of this.savedBirds) {
                bird.fitness /= totalFitness;
            }
        }
    }

    /**
     * Update the training UI stats
     */
    updateTrainingUI() {
        const genEl = document.getElementById('gen-count');
        const aliveEl = document.getElementById('alive-count');
        const bestEl = document.getElementById('best-fitness');

        if (genEl) genEl.innerText = this.generation;
        if (aliveEl) aliveEl.innerText = this.population.filter(b => b.alive).length;
        if (bestEl) bestEl.innerText = Math.floor(this.bestFitness / 100);
    }

    /**
     * Save the best performing brain to localStorage
     * @param {TrainingBird} bird - The bird whose brain to save
     */
    saveBestBrain(bird) {
        if (!bird || !bird.brain) return;

        try {
            const brainData = {
                brain: bird.brain.toJSON(),
                score: bird.score,
                generation: this.generation,
                savedAt: Date.now()
            };
            localStorage.setItem('neonFlapTrainedBrain', JSON.stringify(brainData));
            console.log(`[AI] Saved brain with score ${bird.score} from generation ${this.generation}`);

            // Reset AIController cache so it picks up the new brain
            AIController.resetBrainCache();
        } catch (e) {
            console.warn('[AI] Failed to save brain:', e);
        }
    }

    /**
     * Check if a trained brain exists in localStorage
     * @returns {boolean}
     */
    static hasTrainedBrain() {
        try {
            return localStorage.getItem('neonFlapTrainedBrain') !== null;
        } catch (e) {
            return false;
        }
    }

    /**
     * Load the trained brain from localStorage
     * @returns {Object|null} - The brain data or null
     */
    static loadTrainedBrain() {
        try {
            const data = localStorage.getItem('neonFlapTrainedBrain');
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.warn('[AI] Failed to load brain:', e);
        }
        return null;
    }

    /**
     * Update all training birds
     */
    updateTrainingBirds(deltaTime) {
        let aliveBirds = 0;

        for (let i = this.population.length - 1; i >= 0; i--) {
            const bird = this.population[i];

            if (!bird.alive) continue;

            // Let the neural network decide
            bird.think(this.pipes);

            // Update physics
            bird.update(deltaTime, this.currentPipeSpeed);

            // Check collision
            if (bird.checkCollision(this.pipes)) {
                // Bird died - move to saved birds
                this.savedBirds.push(bird);
            } else {
                aliveBirds++;
                // Reward for passing pipes and check for new best
                for (const pipe of this.pipes) {
                    if (pipe.x + pipe.width < bird.x && !pipe.passedByBird?.has(bird)) {
                        // Track which birds have passed this pipe
                        if (!pipe.passedByBird) pipe.passedByBird = new Set();
                        pipe.passedByBird.add(bird);

                        bird.score++;

                        // Track global pipe passes for difficulty scaling (first bird to pass counts)
                        if (!pipe.passed) {
                            pipe.passed = true;
                            this.pipesPassed++;

                            // Difficulty Scaling - same as normal mode
                            if (this.pipesPassed % 3 === 0) {
                                const increment = GameConfig.isTurtleMode ? (SPEED_INCREMENT / 2) : SPEED_INCREMENT;
                                this.currentPipeSpeed = Math.min(this.currentPipeSpeed + increment, MAX_SPEED);
                            }
                        }

                        // Save brain if this bird beats the best score (min 3 pipes)
                        if (bird.score > this.bestBrainScore && bird.score >= 3) {
                            this.bestBrainScore = bird.score;
                            this.saveBestBrain(bird);
                        }
                    }
                }
            }
        }

        // Update alive count in UI
        const aliveEl = document.getElementById('alive-count');
        if (aliveEl) aliveEl.innerText = aliveBirds;

        // Check if all birds are dead
        if (aliveBirds === 0) {
            this.nextGeneration();
        }
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
        let currentBaseHue = targetHue + oscillation;

        // Death hue shift - push towards red/magenta (0/360 degrees)
        if (this.deathHueShift > 0) {
            currentBaseHue = currentBaseHue + (360 - currentBaseHue) * this.deathHueShift * 0.5;
            this.deathHueShift *= 0.95; // Decay
            if (this.deathHueShift < 0.01) this.deathHueShift = 0;
        }

        this.gameHue = this.gameHue + (currentBaseHue - this.gameHue) * 0.05;

        this.stars.forEach(star => star.update(this.currentPipeSpeed, deltaTime));
        this.city.update(this.currentPipeSpeed, this.gameHue, deltaTime);
        this.synthGrid.update(this.currentPipeSpeed, this.gameHue, deltaTime);
        this.matrixRain.forEach(col => col.update(this.gameHue, deltaTime));

        if (this.gameState === 'PLAYING') {
            // Handle different game modes
            if (this.isTraining) {
                // Training mode: update all birds in population
                this.updateTrainingBirds(deltaTime);
            } else if (this.isAutoPlay) {
                AIController.performAI(this.bird, this.pipes, this.currentPipeGap, this.canvas);
                aiDebugLog.logFrame(this.bird, this.pipes, this.performanceMonitor.fps);
                this.bird.update(this.gameHue, deltaTime, this.currentPipeSpeed);
            } else {
                this.bird.update(this.gameHue, deltaTime, this.currentPipeSpeed);
            }

            // Floor collision in Bird.update() may have triggered game over
            if (this.gameState !== 'PLAYING') return;

            // Pipe Spawning - time-based instead of frame-based
            // Convert PIPE_SPAWN_RATE from frames to milliseconds (assuming 60fps base)
            const baseSpawnInterval = (PIPE_SPAWN_RATE / 60) * 1000; // ms
            const safePipeSpeed = this.currentPipeSpeed || INITIAL_PIPE_SPEED; // Guard against division by zero
            const currentSpawnInterval = Math.max(1000, baseSpawnInterval * (INITIAL_PIPE_SPEED / safePipeSpeed));

            this.timeSinceLastPipe += (16.67 * deltaTime); // Add elapsed time

            if (this.timeSinceLastPipe >= currentSpawnInterval) {
                const newPipe = new Pipe(this.canvas, this.ctx, this.currentPipeGap, GameConfig.minPipeGap, this.lastPipeGapCenter, this.gameHue, (center) => {
                    this.lastPipeGapCenter = center;
                });
                this.pipes.push(newPipe);
                aiDebugLog.logPipeSpawn(newPipe);
                this.timeSinceLastPipe = 0;
            }

            // Pipe Logic
            for (let i = 0; i < this.pipes.length; i++) {
                let p = this.pipes[i];
                p.update(this.currentPipeSpeed, this.gameHue, deltaTime);

                // Collision Detection (skip in training mode - handled separately)
                if (
                    !this.isTraining &&
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
                if (!this.isTraining && p.x + p.width < this.bird.x && !p.passed) {
                    p.passed = true;
                    this.pipesPassed++;
                    aiDebugLog.logPipePassed(p, this.score + 1);

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
                        this.particleSystem.createPipeClearedEffect(this.bird.x, this.bird.y + this.bird.height / 2, this.gameHue);
                        if (this.audioController) this.audioController.playScore();
                    }

                    const scoreEl = this.uiElements.scoreHud.querySelector('.score-number');
                    if (scoreEl) scoreEl.innerText = this.score;

                    // Milestone celebrations at 10, 25, 50, 100
                    const milestones = [10, 25, 50, 100];
                    if (milestones.includes(this.score)) {
                        this.screenFlash = 0.4; // Trigger screen flash
                        // Create celebration particles around the bird
                        for (let i = 0; i < 20; i++) {
                            const angle = (i / 20) * Math.PI * 2;
                            const distance = 30 + Math.random() * 20;
                            this.particleSystem.particles.push({
                                x: this.bird.x + this.bird.width / 2 + Math.cos(angle) * distance,
                                y: this.bird.y + this.bird.height / 2 + Math.sin(angle) * distance,
                                vx: Math.cos(angle) * 2,
                                vy: Math.sin(angle) * 2,
                                life: 1.0,
                                color: `hsl(${this.gameHue + i * 18}, 100%, 60%)`,
                                size: 3 + Math.random() * 2
                            });
                        }
                    }

                    // Difficulty Scaling
                    if (this.pipesPassed % 3 === 0) {
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

        // Draw Bird(s) - only if not game over
        if (this.gameState !== 'GAMEOVER') {
            if (this.isTraining) {
                // Draw training population - find the best performing bird
                let bestBird = null;
                let bestScore = -1;
                for (const bird of this.population) {
                    if (bird.alive && bird.framesAlive > bestScore) {
                        bestScore = bird.framesAlive;
                        bestBird = bird;
                    }
                }

                // Draw all alive birds, marking the best one
                for (const bird of this.population) {
                    if (bird.alive) {
                        bird.draw(this.ctx, this.gameHue, bird === bestBird);
                    }
                }
            } else {
                this.bird.draw(this.ctx, this.gameHue);
            }
        }

        // Draw Particles
        this.particleSystem.draw();

        // Draw Score Popups
        this.scorePopups.forEach(p => p.draw(this.ctx));

        // Draw screen flash for milestones
        if (this.screenFlash > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.screenFlash})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.screenFlash -= 0.02; // Fade out
            if (this.screenFlash < 0) this.screenFlash = 0;
        }

        // Death flash - dramatic red/magenta overlay
        if (this.deathFlash > 0) {
            this.ctx.fillStyle = `rgba(255, 50, 100, ${this.deathFlash})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.deathFlash *= 0.85; // Fast decay
            if (this.deathFlash < 0.01) this.deathFlash = 0;
        }

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
