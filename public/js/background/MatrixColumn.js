import { GameConfig } from '../config/GameConfig.js';

export class MatrixColumn {
    constructor(x, canvas, ctx) {
        this.x = x;
        this.canvas = canvas;
        this.ctx = ctx;
        this.y = Math.random() * canvas.height;
        this.speed = Math.random() * GameConfig.scaleHeight(3) + GameConfig.scaleHeight(1); // 0.5%-0.67% of height
        this.len = Math.floor(Math.random() * 10 + 5);
        this.chars = [];
        this.charSpacing = GameConfig.scaleHeight(20); // ~3.3% of height
        this.resetOffset = GameConfig.scaleHeight(20);

        // Cached color strings (per character index, updated when hue changes)
        this.cachedHue = -1;
        this.cachedColors = new Array(this.len);
    }

    /**
     * Update cached color strings when hue changes significantly
     */
    updateColorCache(gameHue) {
        if (Math.abs(gameHue - this.cachedHue) > 3) {
            const hue = Math.round(gameHue);
            this.cachedHue = gameHue;
            for (let i = 0; i < this.len; i++) {
                const alpha = (1 - (i / this.len)) * 0.3;
                this.cachedColors[i] = `hsla(${hue}, 100%, 50%, ${alpha.toFixed(3)})`;
            }
        }
    }

    update(gameHue, deltaTime = 1) {
        this.y += this.speed * deltaTime;
        if (this.y - this.len * this.charSpacing > this.canvas.height) {
            this.y = -this.resetOffset;
            this.speed = Math.random() * GameConfig.scaleHeight(3) + GameConfig.scaleHeight(1);
        }
    }

    draw(ctx, gameHue) {
        // Update color cache if needed
        this.updateColorCache(gameHue);

        ctx.save();
        const fontSize = GameConfig.scaleHeight(14); // ~2.3% of height
        const charSpacing = GameConfig.scaleHeight(15); // 2.5% of height
        ctx.font = `${fontSize}px monospace`;
        for (let i = 0; i < this.len; i++) {
            const charY = this.y - i * charSpacing;
            // Optimization: don't draw if off screen
            if (charY > this.canvas.height || charY < -this.resetOffset) continue;

            // Use cached color string
            ctx.fillStyle = this.cachedColors[i];

            // Random binary char
            const char = Math.random() > 0.5 ? '1' : '0';
            ctx.fillText(char, this.x, charY);
        }
        ctx.restore();
    }
}
