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
    }

    draw(ctx, gameHue) {
        ctx.save();
        // Make pipes complementary to the bird
        const pipeColor = `hsl(${gameHue + 180}, 100%, 50%)`;

        ctx.shadowBlur = 15;
        ctx.shadowColor = pipeColor;
        ctx.fillStyle = pipeColor;

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
