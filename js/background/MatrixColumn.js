import { GameConfig } from '../config/GameConfig.js';

export class MatrixColumn {
    constructor(x, canvas, ctx) {
        this.x = x;
        this.canvas = canvas;
        this.ctx = ctx;
        this.y = Math.random() * canvas.height;
        this.speed = Math.random() * GameConfig.scaleHeight(3) + GameConfig.scaleHeight(1); // 0.5%-0.67% of height
        this.len = Math.random() * 10 + 5;
        this.chars = [];
        this.charSpacing = GameConfig.scaleHeight(20); // ~3.3% of height
        this.resetOffset = GameConfig.scaleHeight(20);
    }
    update(gameHue) {
        this.y += this.speed;
        if (this.y - this.len * this.charSpacing > this.canvas.height) {
            this.y = -this.resetOffset;
            this.speed = Math.random() * GameConfig.scaleHeight(3) + GameConfig.scaleHeight(1);
        }
    }
    draw(ctx, gameHue) {
        ctx.save();
        const fontSize = GameConfig.scaleHeight(14); // ~2.3% of height
        const charSpacing = GameConfig.scaleHeight(15); // 2.5% of height
        ctx.font = `${fontSize}px monospace`;
        for (let i = 0; i < this.len; i++) {
            const charY = this.y - i * charSpacing;
            // Optimization: don't draw if off screen
            if (charY > this.canvas.height || charY < -this.resetOffset) continue;

            // Head is bright, tail is fading
            const alpha = 1 - (i / this.len);
            ctx.fillStyle = `hsla(${gameHue}, 100%, 50%, ${alpha * 0.3})`;

            // Random binary char
            const char = Math.random() > 0.5 ? '1' : '0';
            ctx.fillText(char, this.x, charY);
        }
        ctx.restore();
    }
}
