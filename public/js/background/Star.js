import { GameConfig } from '../config/GameConfig.js';

export class Star {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * GameConfig.scaleWidth(2); // 0.5% of width
        this.speed = Math.random() * GameConfig.scaleWidth(0.5) + GameConfig.scaleWidth(0.1); // 0.025%-0.15% of width
    }

    update() {
        this.x -= this.speed;
        if (this.x < 0) {
            this.x = this.canvas.width;
            this.y = Math.random() * this.canvas.height;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}
