/**
 * Manages visual game effects like screen shake, flash overlays, and hue shifts
 */
export class GameEffects {
    constructor() {
        // Screen shake
        this.shake = 0;

        // Flash effects
        this.screenFlash = 0;  // White flash for milestones
        this.deathFlash = 0;   // Red flash on death
        this.deathHueShift = 0; // Temporary hue shift towards red on death

        // Theme/hue
        this.gameHue = 180; // Start at Cyan
    }

    /**
     * Reset all effects to initial state
     */
    reset() {
        this.shake = 0;
        this.screenFlash = 0;
        this.deathFlash = 0;
        this.deathHueShift = 0;
        this.gameHue = 180;
    }

    /**
     * Trigger death effects (shake, flash, hue shift)
     */
    triggerDeathEffects() {
        this.shake = 25;
        this.deathFlash = 0.8;
        this.deathHueShift = 1.0;
    }

    /**
     * Trigger milestone celebration flash
     */
    triggerMilestoneFlash() {
        this.screenFlash = 0.4;
    }

    /**
     * Update the game hue based on score and music
     * @param {number} score - Current score
     * @param {Object|null} audioController - Audio controller instance
     * @returns {number} Current game hue
     */
    updateHue(score, audioController) {
        let targetHue = 180; // Default Cyan/Blue

        if (audioController && audioController.isPlayingMusic) {
            // Music controls the vibe
            const track = audioController.getCurrentTrack();
            if (track) {
                targetHue = track.hue;
            }
        } else {
            // Score controls the vibe (fallback)
            if (score > 50) {
                targetHue = 45; // Gold/Fire
            } else if (score > 25) {
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

        return this.gameHue;
    }

    /**
     * Apply screen shake translation to context
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    applyShake(ctx) {
        if (this.shake > 0) {
            const dx = (Math.random() - 0.5) * this.shake;
            const dy = (Math.random() - 0.5) * this.shake;
            ctx.translate(dx, dy);
            this.shake *= 0.9; // Decay
            if (this.shake < 0.5) this.shake = 0;
        }
    }

    /**
     * Draw flash overlays (milestone white flash, death red flash)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    drawFlashOverlays(ctx, canvasWidth, canvasHeight) {
        // Milestone celebration flash (white)
        if (this.screenFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.screenFlash})`;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            this.screenFlash -= 0.02; // Fade out
            if (this.screenFlash < 0) this.screenFlash = 0;
        }

        // Death flash (red/magenta)
        if (this.deathFlash > 0) {
            ctx.fillStyle = `rgba(255, 50, 100, ${this.deathFlash})`;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            this.deathFlash *= 0.85; // Fast decay
            if (this.deathFlash < 0.01) this.deathFlash = 0;
        }
    }

    /**
     * Check if shake is active
     * @returns {boolean}
     */
    hasShake() {
        return this.shake > 0;
    }

    /**
     * Get current game hue
     * @returns {number}
     */
    getHue() {
        return this.gameHue;
    }

    /**
     * Set game hue directly (for init)
     * @param {number} hue
     */
    setHue(hue) {
        this.gameHue = hue;
    }
}
