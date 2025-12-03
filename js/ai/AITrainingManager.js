import { TrainingBird } from './TrainingBird.js';
import { NeuralNetwork } from './NeuralNetwork.js';
import { AIController } from './AIController.js';
import { GameConfig } from '../config/GameConfig.js';
import {
    INITIAL_PIPE_SPEED,
    SPEED_INCREMENT,
    MAX_SPEED
} from '../config/constants.js';

/**
 * Manages AI neuroevolution training mode
 * Handles population management, genetic algorithms, and brain persistence
 */
export class AITrainingManager {
    constructor(canvas, uiElements) {
        this.canvas = canvas;
        this.uiElements = uiElements;

        // Training state
        this.isTraining = false;
        this.population = [];
        this.savedBirds = [];
        this.generation = 1;
        this.bestFitness = 0;
        this.bestBrainScore = 0;

        // Configuration
        this.POPULATION_SIZE = 50;
        this.MUTATION_RATE = 0.1;
    }

    /**
     * Start AI training mode with neuroevolution
     * @param {Function} onStateChange - Callback when training starts
     * @returns {Object} Initial game state values
     */
    startTraining(onStateChange) {
        this.isTraining = true;
        this.generation = 1;
        this.bestFitness = 0;

        // Load existing best brain score
        const savedBrain = AITrainingManager.loadTrainedBrain();
        this.bestBrainScore = savedBrain ? savedBrain.score : 0;
        if (savedBrain) {
            console.log(`[AI] Starting training. Best saved brain has score: ${savedBrain.score}`);
        }

        // Update UI
        this.uiElements.startScreen.classList.remove('active');
        this.uiElements.gameOverScreen.classList.remove('active');
        this.uiElements.scoreHud.style.display = 'none';

        const aiStats = document.getElementById('ai-stats');
        if (aiStats) aiStats.classList.add('active');

        // Create initial population
        this.createPopulation();
        this.updateTrainingUI();

        if (onStateChange) onStateChange();

        // Return initial game state values
        return {
            pipes: [],
            score: 0,
            pipesPassed: 0,
            frames: 0,
            timeSinceLastPipe: 0,
            currentPipeSpeed: INITIAL_PIPE_SPEED,
            currentPipeGap: GameConfig.initialPipeGap
        };
    }

    /**
     * Exit training mode and return to start screen
     * @param {Function} onExit - Callback when exiting
     */
    exitTraining(onExit) {
        if (!this.isTraining) return;

        const aiStats = document.getElementById('ai-stats');
        if (aiStats) aiStats.classList.remove('active');

        this.isTraining = false;
        this.population = [];
        this.savedBirds = [];

        if (onExit) onExit();
    }

    /**
     * Create initial population of training birds
     * If a trained brain exists, seed population with mutated copies of it
     */
    createPopulation() {
        this.population = [];
        this.savedBirds = [];

        // Try to load saved brain to continue training
        const savedData = AITrainingManager.loadTrainedBrain();
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
     * @returns {Object} Reset game state values
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

        this.updateTrainingUI();

        // Return reset game state values
        return {
            pipes: [],
            score: 0,
            pipesPassed: 0,
            frames: 0,
            timeSinceLastPipe: 0,
            currentPipeSpeed: INITIAL_PIPE_SPEED,
            currentPipeGap: GameConfig.initialPipeGap
        };
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
     * Update all training birds
     * @param {number} deltaTime - Frame delta time
     * @param {Array} pipes - Current pipes array
     * @param {number} currentPipeSpeed - Current pipe speed
     * @param {number} pipesPassed - Pipes passed count
     * @returns {Object} Updated state { pipesPassed, allDead }
     */
    updateTrainingBirds(deltaTime, pipes, currentPipeSpeed, pipesPassed) {
        let aliveBirds = 0;
        let updatedPipesPassed = pipesPassed;
        let newSpeed = currentPipeSpeed;

        for (let i = this.population.length - 1; i >= 0; i--) {
            const bird = this.population[i];

            if (!bird.alive) continue;

            // Let the neural network decide
            bird.think(pipes);

            // Update physics
            bird.update(deltaTime, currentPipeSpeed);

            // Check collision
            if (bird.checkCollision(pipes)) {
                // Bird died - move to saved birds
                this.savedBirds.push(bird);
            } else {
                aliveBirds++;
                // Reward for passing pipes and check for new best
                for (const pipe of pipes) {
                    if (pipe.x + pipe.width < bird.x && !pipe.passedByBird?.has(bird)) {
                        // Track which birds have passed this pipe
                        if (!pipe.passedByBird) pipe.passedByBird = new Set();
                        pipe.passedByBird.add(bird);

                        bird.score++;

                        // Track global pipe passes for difficulty scaling (first bird to pass counts)
                        if (!pipe.passed) {
                            pipe.passed = true;
                            updatedPipesPassed++;

                            // Difficulty Scaling - same as normal mode
                            if (updatedPipesPassed % 3 === 0) {
                                const increment = GameConfig.isTurtleMode ? (SPEED_INCREMENT / 2) : SPEED_INCREMENT;
                                newSpeed = Math.min(currentPipeSpeed + increment, MAX_SPEED);
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

        return {
            pipesPassed: updatedPipesPassed,
            currentPipeSpeed: newSpeed,
            allDead: aliveBirds === 0
        };
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
     * Get the current population for rendering
     * @returns {Array} Population of training birds
     */
    getPopulation() {
        return this.population;
    }

    /**
     * Check if training mode is active
     * @returns {boolean}
     */
    isActive() {
        return this.isTraining;
    }
}
