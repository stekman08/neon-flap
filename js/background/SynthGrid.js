import { GameConfig } from '../config/GameConfig.js';

export class SynthGrid {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.horizonY = canvas.height * 0.8; // Horizon line
        this.speed = 0;
        this.offset = 0;
        this.gridSize = GameConfig.scaleWidth(40); // 10% of width

        // Cached gradient (recreated only when hue changes significantly)
        this.cachedHue = -1;
        this.cachedGradient = null;
    }

    /**
     * Update cached gradient when hue changes significantly
     */
    updateGradientCache(ctx, gameHue) {
        if (Math.abs(gameHue - this.cachedHue) > 3) {
            const hue = Math.round(gameHue);
            this.cachedHue = gameHue;
            this.cachedGradient = ctx.createLinearGradient(0, this.horizonY, 0, this.canvas.height);
            this.cachedGradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.0)`);
            this.cachedGradient.addColorStop(0.2, `hsla(${hue}, 100%, 50%, 0.1)`);
            this.cachedGradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0.4)`);
        }
    }

    update(currentPipeSpeed, gameHue, deltaTime = 1) {
        this.speed = currentPipeSpeed; // Update speed dynamically
        this.offset = (this.offset + this.speed * deltaTime) % this.gridSize;
    }

    draw(ctx, gameHue) {
        // Update gradient cache if needed
        this.updateGradientCache(ctx, gameHue);

        ctx.save();
        ctx.beginPath();

        // Clip to bottom area
        ctx.rect(0, this.horizonY, this.canvas.width, this.canvas.height - this.horizonY);
        ctx.clip();

        ctx.strokeStyle = this.cachedGradient;
        ctx.lineWidth = GameConfig.scaleWidth(2);

        // Vertical Perspective Lines
        const centerX = this.canvas.width / 2;
        const vanishingOffset = GameConfig.scaleHeight(50);
        const lineExtension = GameConfig.scaleHeight(100);
        // Draw more lines than needed to cover width
        for (let i = -10; i <= 10; i++) {
            const x = centerX + (i * this.gridSize * 4); // Spread them out

            ctx.beginPath();
            ctx.moveTo(centerX, this.horizonY - vanishingOffset); // Vanishing point slightly above horizon
            ctx.lineTo(x, this.canvas.height + lineExtension);
            ctx.stroke();
        }

        // Horizontal Moving Lines
        // We draw them with increasing spacing to simulate perspective
        const perspectiveScale = GameConfig.scaleHeight(5);
        for (let i = 0; i < 10; i++) {
            // Perspective math approximation
            const y = this.horizonY + (i * this.gridSize) + this.offset;
            // Scale spacing exponentially for 3D effect
            const perspectiveY = this.horizonY + Math.pow(i + (this.offset / this.gridSize), 2) * perspectiveScale;

            if (perspectiveY > this.canvas.height) continue;

            ctx.beginPath();
            ctx.moveTo(0, perspectiveY);
            ctx.lineTo(this.canvas.width, perspectiveY);
            ctx.stroke();
        }

        ctx.restore();
    }
}
