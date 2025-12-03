import { GameConfig } from '../config/GameConfig.js';

// Pre-computed constant
const STAR_COLOR = '#fff';

export class Star {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * GameConfig.scaleWidth(2); // 0.5% of width
        // Parallax factor: smaller = further away, slower movement
        this.parallaxFactor = 0.05 + Math.random() * 0.1; // 0.05-0.15x pipe speed
        // Cached alpha for twinkling effect (updated occasionally, not every frame)
        this.alpha = Math.random() * 0.5 + 0.3;
        this.twinkleTimer = Math.random() * 30; // Randomize initial timer
    }

    update(pipeSpeed, deltaTime = 1) {
        this.x -= pipeSpeed * this.parallaxFactor * deltaTime;
        if (this.x < 0) {
            this.x = this.canvas.width;
            this.y = Math.random() * this.canvas.height;
        }
        // Update twinkle occasionally (not every frame)
        this.twinkleTimer -= deltaTime;
        if (this.twinkleTimer <= 0) {
            this.alpha = Math.random() * 0.5 + 0.3;
            this.twinkleTimer = 15 + Math.random() * 20; // Next update in 15-35 frames
        }
    }

    draw(ctx) {
        ctx.fillStyle = STAR_COLOR;
        ctx.globalAlpha = this.alpha;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}
