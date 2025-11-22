export class ScorePopup {
    constructor(x, y, text, ctx, color = '#fff') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.vy = -2; // Float up
        this.ctx = ctx;
    }
    update() {
        this.y += this.vy;
        this.life -= 0.02;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.font = 'bold 30px Orbitron';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}
