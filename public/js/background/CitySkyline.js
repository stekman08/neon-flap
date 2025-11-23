import { GameConfig } from '../config/GameConfig.js';

export class CitySkyline {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.foreground = [];
        this.background = [];
        this.nextForeX = 0;
        this.nextBackX = 0;

        // Fill screen initially
        this.initLayer(this.foreground, 'nextForeX');
        this.initLayer(this.background, 'nextBackX');
    }

    initLayer(layer, nextXProp) {
        while (this[nextXProp] < this.canvas.width + GameConfig.scaleWidth(100)) {
            this.addBuilding(layer, nextXProp);
        }
    }

    addBuilding(layer, nextXProp) {
        const width = Math.random() * GameConfig.scaleWidth(60) + GameConfig.scaleWidth(40);

        // Background buildings are taller/bigger to look distant but massive
        const isBack = layer === this.background;
        const heightScale = isBack ? 1.5 : 1.0;

        const height = (Math.random() * GameConfig.scaleHeight(150) + GameConfig.scaleHeight(50)) * heightScale;

        layer.push({ x: this[nextXProp], width, height });
        this[nextXProp] += width;
    }

    update(currentPipeSpeed, gameHue, deltaTime = 1) {
        // Foreground: 0.5x speed
        this.updateLayer(this.foreground, 'nextForeX', currentPipeSpeed * 0.5 * deltaTime);

        // Background: 0.25x speed (Parallax)
        this.updateLayer(this.background, 'nextBackX', currentPipeSpeed * 0.25 * deltaTime);
    }

    updateLayer(layer, nextXProp, speed) {
        layer.forEach(b => {
            b.x -= speed;
        });

        if (layer.length > 0 && layer[0].x + layer[0].width < 0) {
            layer.shift();
        }

        const lastBuilding = layer[layer.length - 1];
        if (lastBuilding.x + lastBuilding.width < this.canvas.width + GameConfig.scaleWidth(100)) {
            this[nextXProp] = lastBuilding.x + lastBuilding.width;
            this.addBuilding(layer, nextXProp);
        }
    }

    draw(ctx, gameHue) {
        ctx.save();

        // Draw Background Layer (Darker, further away)
        ctx.fillStyle = `hsl(${gameHue}, 40%, 10%)`; // Desaturated, dark
        ctx.shadowBlur = 0; // No glow for background
        this.background.forEach(b => {
            ctx.fillRect(b.x, this.canvas.height - b.height, b.width + 1, b.height);
        });

        // Draw Foreground Layer
        ctx.fillStyle = `hsl(${gameHue}, 60%, 15%)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsl(${gameHue}, 60%, 10%)`;

        this.foreground.forEach(b => {
            // Draw building + 1px overlap to prevent gaps
            ctx.fillRect(b.x, this.canvas.height - b.height, b.width + 1, b.height);

            // Optional: Add some "windows" (scaled proportionally)
            ctx.fillStyle = `hsl(${gameHue}, 100%, 50%, 0.1)`;
            if (Math.random() > 0.95) { // Flicker effect
                const windowOffset = GameConfig.scaleWidth(10);
                const windowSize = GameConfig.scaleWidth(5);
                ctx.fillRect(b.x + windowOffset, this.canvas.height - b.height + windowOffset, windowSize, windowSize);
            }
            // Reset fill for next building body
            ctx.fillStyle = `hsl(${gameHue}, 60%, 15%)`;
        });
        ctx.restore();
    }
}
