import { GameConfig } from '../config/GameConfig.js';

export class Pipe {
    constructor(canvas, ctx, currentPipeGap, minGap, lastPipeGapCenter, gameHue, updateGapCenter) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.x = canvas.width;
        this.width = GameConfig.pipeWidth;

        // Ensure gap is never impossible (absolute min minGap)
        const safeGap = Math.max(currentPipeGap, minGap);

        // Constrain vertical movement from last pipe
        // Max vertical move per frame is roughly (JUMP_STRENGTH + GRAVITY*t)
        // At speed 3, 200px horizontal is ~66 frames.
        // We want to be safe. Let's limit change to +/- 100px (16.7% of reference height).
        const maxDiff = GameConfig.scaleHeight(100);
        let minCenter = lastPipeGapCenter - maxDiff;
        let maxCenter = lastPipeGapCenter + maxDiff;

        // Also clamp to screen bounds (padding 8.3% of height)
        const padding = GameConfig.scaleHeight(50);
        minCenter = Math.max(minCenter, padding + safeGap / 2);
        maxCenter = Math.min(maxCenter, canvas.height - padding - safeGap / 2);

        // Guard against invalid bounds (maxCenter < minCenter)
        if (maxCenter < minCenter) {
            maxCenter = minCenter;
        }

        // Randomize within constraints
        const center = Math.random() * (maxCenter - minCenter) + minCenter;

        this.topHeight = center - safeGap / 2;
        this.bottomY = center + safeGap / 2;
        this.bottomHeight = canvas.height - this.bottomY;

        this.passed = false;

        // Update via callback
        updateGapCenter(center);

        // Store hue offset for variety
        this.hueOffset = Math.random() * 360;

        // Cached color strings (updated when hue changes)
        this.cachedHue = -1;
        this.pipeColor = '';
        this.cachedBrightness = -1;
        this.dynamicColor = '';
    }

    /**
     * Update cached color strings when hue or brightness changes
     */
    updateColorCache(gameHue, brightness) {
        const complementaryHue = Math.round((gameHue + 180) % 360);

        // Update pipe shadow color if hue changed
        if (Math.abs(gameHue - this.cachedHue) > 3) {
            this.cachedHue = gameHue;
            this.pipeColor = `hsl(${complementaryHue}, 100%, 50%)`;
        }

        // Update dynamic fill color if brightness changed
        if (Math.abs(brightness - this.cachedBrightness) > 1) {
            this.cachedBrightness = brightness;
            this.dynamicColor = `hsl(${complementaryHue}, 100%, ${Math.round(brightness)}%)`;
        }
    }

    draw(ctx, gameHue, bird) {
        ctx.save();

        // Proximity Glow Logic
        let shadowBlur = 15;
        let brightness = 50; // default lightness

        if (bird) {
            // Calculate horizontal distance between pipe and bird centers
            const dist = Math.abs((this.x + this.width / 2) - (bird.x + bird.width / 2));
            if (dist < 200) { // Within 200px
                const intensity = 1 - (dist / 200); // 0 to 1
                shadowBlur = 15 + (intensity * 30); // Up to 45
                brightness = 50 + (intensity * 30); // Up to 80% lightness (whiter)
            }
        }

        // Update cached colors (only regenerates strings when values change)
        this.updateColorCache(gameHue, brightness);

        ctx.shadowBlur = shadowBlur;
        ctx.shadowColor = this.pipeColor;
        ctx.fillStyle = this.dynamicColor;

        // Top Pipe
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        // Bottom Pipe
        ctx.fillRect(this.x, this.bottomY, this.width, this.bottomHeight);

        // Pipe details (stripes) - scaled proportionally with pipe width
        const stripeOffset = this.width / 6; // 10px at 60px width
        const stripeWidth = this.width / 6;  // 10px at 60px width
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x + stripeOffset, 0, stripeWidth, this.topHeight);
        ctx.fillRect(this.x + stripeOffset, this.bottomY, stripeWidth, this.bottomHeight);

        ctx.restore();
    }

    update(currentPipeSpeed, gameHue, deltaTime = 1) {
        this.x -= currentPipeSpeed * deltaTime;
    }
}
