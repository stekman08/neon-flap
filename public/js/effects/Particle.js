// Pre-computed constant
const TWO_PI = Math.PI * 2;

export class Particle {
    constructor(x = 0, y = 0, color = '#fff', ctx = null) {
        this.ctx = ctx;
        this.reset(x, y, color);
    }

    reset(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 4 - 2;
        this.color = color;
        this.life = 1.0;
    }

    update(deltaTime = 1) {
        this.x += this.speedX * deltaTime;
        this.y += this.speedY * deltaTime;
        this.life -= 0.03 * deltaTime;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TWO_PI);
        ctx.fill();
        ctx.restore();
    }
}
