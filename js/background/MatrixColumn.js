export class MatrixColumn {
    constructor(x, canvas, ctx) {
        this.x = x;
        this.canvas = canvas;
        this.ctx = ctx;
        this.y = Math.random() * canvas.height;
        this.speed = Math.random() * 3 + 1;
        this.len = Math.random() * 10 + 5;
        this.chars = [];
    }
    update(gameHue) {
        this.y += this.speed;
        if (this.y - this.len * 20 > this.canvas.height) {
            this.y = -20;
            this.speed = Math.random() * 3 + 1;
        }
    }
    draw(ctx, gameHue) {
        ctx.save();
        ctx.font = '14px monospace';
        for (let i = 0; i < this.len; i++) {
            const charY = this.y - i * 15;
            // Optimization: don't draw if off screen
            if (charY > this.canvas.height || charY < -20) continue;

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
