import { GameConfig } from '../config/GameConfig.js';
import { NeuralNetwork } from './NeuralNetwork.js';

/**
 * Simplified bird for AI training mode
 * Optimized for population-based training with neural network brain
 */
export class TrainingBird {
    constructor(canvas, brain = null) {
        this.canvas = canvas;

        // Position and physics
        this.x = GameConfig.birdX;
        this.y = canvas.height / 2;
        this.width = GameConfig.birdSize;
        this.height = GameConfig.birdSize;
        this.velocity = 0;

        // AI brain - 5 inputs, 8 hidden, 1 output
        this.brain = brain || new NeuralNetwork(5, 8, 1);

        // Fitness tracking
        this.fitness = 0;
        this.score = 0;
        this.alive = true;
        this.framesAlive = 0;

        // Visual - simple contrail for alive birds
        this.contrail = [];
        this.hue = Math.random() * 360; // Each bird gets unique color
    }

    /**
     * Update bird physics
     * @param {number} deltaTime - Frame delta
     * @param {number} currentSpeed - Current pipe speed for contrail
     */
    update(deltaTime, currentSpeed) {
        if (!this.alive) return;

        this.velocity += GameConfig.gravity * deltaTime;
        this.y += this.velocity * deltaTime;
        this.framesAlive++;

        // Update contrail - calculate engine position with rotation
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.velocity * 0.1));
        const engineX = centerX + (-this.width / 2) * Math.cos(rotation);
        const engineY = centerY + (-this.width / 2) * Math.sin(rotation);

        this.contrail.push({ x: engineX, y: engineY });

        if (this.contrail.length > 20) {
            this.contrail.shift();
        }

        for (let i = 0; i < this.contrail.length; i++) {
            this.contrail[i].x -= currentSpeed * deltaTime;
        }
    }

    /**
     * Let the neural network decide whether to jump
     * @param {Array} pipes - Array of pipe objects
     */
    think(pipes) {
        if (!this.alive || !this.brain) return;

        // Find the closest pipe ahead of the bird
        let closest = null;
        let closestDist = Infinity;

        for (const pipe of pipes) {
            const dist = (pipe.x + pipe.width) - this.x;
            if (dist > 0 && dist < closestDist) {
                closest = pipe;
                closestDist = dist;
            }
        }

        // Prepare inputs (normalized to 0-1)
        let inputs;

        if (closest) {
            // Normal case: pipe is visible
            inputs = [
                this.y / this.canvas.height,                           // Bird Y position
                (this.velocity + 15) / 30,                             // Bird velocity (roughly -15 to +15)
                closestDist / this.canvas.width,                        // Horizontal distance to pipe
                closest.topHeight / this.canvas.height,                 // Top of gap
                closest.bottomY / this.canvas.height                    // Bottom of gap
            ];
        } else {
            // No pipe visible yet - use default target (center of screen)
            const centerY = this.canvas.height / 2;
            inputs = [
                this.y / this.canvas.height,                           // Bird Y position
                (this.velocity + 15) / 30,                             // Bird velocity
                1.0,                                                    // Far away (no pipe)
                (centerY - 50) / this.canvas.height,                   // Imaginary gap top
                (centerY + 50) / this.canvas.height                    // Imaginary gap bottom
            ];
        }

        // Get prediction
        const output = this.brain.predict(inputs);

        // Jump if output > 0.5
        if (output[0] > 0.5) {
            this.jump();
        }
    }

    /**
     * Make the bird jump
     */
    jump() {
        if (!this.alive) return;
        this.velocity = GameConfig.jumpStrength;
    }

    /**
     * Check collision with pipes and boundaries
     * @param {Array} pipes - Array of pipe objects
     * @returns {boolean} - True if collision occurred
     */
    checkCollision(pipes) {
        if (!this.alive) return false;

        // Floor collision
        if (this.y + this.height > this.canvas.height) {
            this.alive = false;
            return true;
        }

        // Ceiling collision
        if (this.y < 0) {
            this.alive = false;
            return true;
        }

        // Pipe collision
        for (const pipe of pipes) {
            if (
                this.x < pipe.x + pipe.width &&
                this.x + this.width > pipe.x &&
                (this.y < pipe.topHeight || this.y + this.height > pipe.bottomY)
            ) {
                this.alive = false;
                return true;
            }
        }

        return false;
    }

    /**
     * Draw the bird (simplified for performance with many birds)
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} gameHue - Current game hue for styling
     * @param {boolean} isBest - Whether this is the best performing bird
     */
    draw(ctx, gameHue, isBest = false) {
        if (!this.alive) return;

        const alpha = isBest ? 1.0 : 0.4;
        const birdHue = isBest ? gameHue : this.hue;

        // Draw simple contrail
        if (this.contrail.length > 1) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(this.contrail[0].x, this.contrail[0].y);
            for (let i = 1; i < this.contrail.length; i++) {
                ctx.lineTo(this.contrail[i].x, this.contrail[i].y);
            }
            ctx.strokeStyle = `hsla(${birdHue}, 100%, 70%, ${alpha * 0.3})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Draw simple triangle ship
        ctx.save();
        ctx.globalAlpha = alpha;

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // Rotate based on velocity
        const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.velocity * 0.1));
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);

        // Ship body
        ctx.fillStyle = `hsl(${birdHue}, 100%, 50%)`;
        if (isBest) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsl(${birdHue}, 100%, 50%)`;
        }

        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(-this.width / 2, -this.height / 2);
        ctx.lineTo(-this.width / 3, 0);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    /**
     * Calculate fitness based on survival and score
     */
    calculateFitness() {
        // Fitness = frames alive + bonus for score
        this.fitness = this.framesAlive + (this.score * 1000);
    }

    /**
     * Create a child bird through mutation
     * @param {number} mutationRate - Rate of mutation (0-1)
     * @returns {TrainingBird}
     */
    createChild(mutationRate = 0.1) {
        const childBrain = this.brain.copy();
        childBrain.mutate(mutationRate);
        return new TrainingBird(this.canvas, childBrain);
    }

    /**
     * Create a child through crossover with another bird
     * @param {TrainingBird} partner
     * @param {number} mutationRate
     * @returns {TrainingBird}
     */
    crossover(partner, mutationRate = 0.1) {
        const childBrain = this.brain.crossover(partner.brain);
        childBrain.mutate(mutationRate);
        return new TrainingBird(this.canvas, childBrain);
    }
}
