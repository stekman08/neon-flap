import { GameConfig } from '../config/GameConfig.js';
import { ScorePopup } from './ScorePopup.js';

/**
 * Manages scoring, high scores, perfect passes, and milestone celebrations
 */
export class ScoringSystem {
    constructor(uiElements) {
        this.uiElements = uiElements;
        this.score = 0;
        this.pipesPassed = 0;
        this.highScore = 0;
        this.scorePopups = [];
    }

    /**
     * Reset scoring state
     */
    reset() {
        this.score = 0;
        this.pipesPassed = 0;
        this.scorePopups = [];
        this.updateScoreDisplay();
        this.hideScoreHud();
    }

    /**
     * Load high score from localStorage based on current mode
     */
    loadHighScore() {
        const storageKey = GameConfig.isTurtleMode ? 'neonFlapTurtleHighScore' : 'neonFlapHighScore';
        try {
            this.highScore = localStorage.getItem(storageKey) || 0;
        } catch (e) {
            this.highScore = 0;
        }
    }

    /**
     * Save high score to localStorage
     * @returns {boolean} True if new high score was saved
     */
    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            const storageKey = GameConfig.isTurtleMode ? 'neonFlapTurtleHighScore' : 'neonFlapHighScore';
            try {
                localStorage.setItem(storageKey, this.highScore);
            } catch (e) {
                // localStorage may be unavailable or quota exceeded
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

            return true;
        }
        return false;
    }

    /**
     * Process a pipe pass and determine if it was perfect
     * @param {Object} pipe - The pipe that was passed
     * @param {Object} bird - The bird
     * @param {number} currentPipeGap - Current pipe gap size
     * @param {CanvasRenderingContext2D} ctx - Canvas context for popups
     * @param {Object} particleSystem - Particle system for effects
     * @param {Object} audioController - Audio controller for sounds
     * @returns {Object} { isPerfect, isMilestone }
     */
    processPipePass(pipe, bird, currentPipeGap, ctx, particleSystem, audioController) {
        this.pipesPassed++;

        // Check for perfect pass
        const gapCenter = pipe.topHeight + (currentPipeGap / 2);
        const birdCenter = bird.y + (bird.height / 2);
        const diff = Math.abs(gapCenter - birdCenter);
        const perfectThreshold = GameConfig.scaleHeight(25); // ~4.2% of height

        const isPerfect = diff < perfectThreshold;

        if (isPerfect) {
            this.score += 2;
            this.scorePopups.push(new ScorePopup(bird.x, bird.y - 20, "+2", ctx, "#ffd700"));
            particleSystem.createExplosion(bird.x + bird.width / 2, bird.y + bird.height / 2);
            if (audioController) audioController.playPerfectScore();
        } else {
            this.score++;
            this.scorePopups.push(new ScorePopup(bird.x, bird.y - 20, "+1", ctx));
            particleSystem.createPipeClearedEffect(bird.x, bird.y + bird.height / 2, particleSystem.gameHue || 180);
            if (audioController) audioController.playScore();
        }

        this.updateScoreDisplay();

        // Check for milestone
        const milestones = [10, 25, 50, 100];
        const isMilestone = milestones.includes(this.score);

        return { isPerfect, isMilestone };
    }

    /**
     * Create milestone celebration particles
     * @param {Object} bird - The bird
     * @param {Object} particleSystem - Particle system
     * @param {number} gameHue - Current game hue
     */
    createMilestoneParticles(bird, particleSystem, gameHue) {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const distance = 30 + Math.random() * 20;
            particleSystem.particles.push({
                x: bird.x + bird.width / 2 + Math.cos(angle) * distance,
                y: bird.y + bird.height / 2 + Math.sin(angle) * distance,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                life: 1.0,
                color: `hsl(${gameHue + i * 18}, 100%, 60%)`,
                size: 3 + Math.random() * 2
            });
        }
    }

    /**
     * Update score popups
     * @param {number} deltaTime - Frame delta time
     */
    updatePopups(deltaTime) {
        for (let i = 0; i < this.scorePopups.length; i++) {
            this.scorePopups[i].update(deltaTime);
            if (this.scorePopups[i].life <= 0) {
                this.scorePopups.splice(i, 1);
                i--;
            }
        }
    }

    /**
     * Draw all score popups
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawPopups(ctx) {
        this.scorePopups.forEach(p => p.draw(ctx));
    }

    /**
     * Update the score display in the HUD
     */
    updateScoreDisplay() {
        const scoreEl = this.uiElements.scoreHud?.querySelector('.score-number');
        if (scoreEl) scoreEl.innerText = this.score;
    }

    /**
     * Show the score HUD
     */
    showScoreHud() {
        if (this.uiElements.scoreHud) {
            this.uiElements.scoreHud.style.display = 'flex';
        }
    }

    /**
     * Hide the score HUD
     */
    hideScoreHud() {
        if (this.uiElements.scoreHud) {
            this.uiElements.scoreHud.style.display = 'none';
        }
    }

    /**
     * Update game over screen with final scores
     */
    updateGameOverScreen() {
        if (this.uiElements.finalScoreEl) {
            this.uiElements.finalScoreEl.innerText = this.score;
        }
        if (this.uiElements.bestScoreEl) {
            this.uiElements.bestScoreEl.innerText = this.highScore;
        }
    }

    /**
     * Get current score
     * @returns {number}
     */
    getScore() {
        return this.score;
    }

    /**
     * Get pipes passed count
     * @returns {number}
     */
    getPipesPassed() {
        return this.pipesPassed;
    }

    /**
     * Get high score
     * @returns {number}
     */
    getHighScore() {
        return this.highScore;
    }

    /**
     * Check if difficulty should increase (every 3 pipes)
     * @returns {boolean}
     */
    shouldIncreaseDifficulty() {
        return this.pipesPassed % 3 === 0;
    }
}
