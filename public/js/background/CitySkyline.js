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
        this.initLayer(this.foreground, 'nextForeX', false);
        this.initLayer(this.background, 'nextBackX', true);
    }

    initLayer(layer, nextXProp, isBack) {
        while (this[nextXProp] < this.canvas.width + GameConfig.scaleWidth(100)) {
            this.addBuilding(layer, nextXProp, isBack);
        }
    }

    addBuilding(layer, nextXProp, isBack) {
        const width = Math.random() * GameConfig.scaleWidth(60) + GameConfig.scaleWidth(40);

        // Background buildings are taller/bigger to look distant but massive
        const heightScale = isBack ? 1.5 : 1.0;

        const height = (Math.random() * GameConfig.scaleHeight(150) + GameConfig.scaleHeight(50)) * heightScale;

        // Generate window grid for this building
        const windows = this.generateWindows(width, height, isBack);

        layer.push({ x: this[nextXProp], width, height, windows, isBack });
        this[nextXProp] += width;
    }

    generateWindows(buildingWidth, buildingHeight, isBack) {
        const windows = [];
        // Larger, rectangular windows
        const windowWidth = GameConfig.scaleWidth(isBack ? 4 : 6);
        const windowHeight = GameConfig.scaleHeight(isBack ? 6 : 10);
        // More spacing between windows
        const gapX = GameConfig.scaleWidth(isBack ? 10 : 14);
        const gapY = GameConfig.scaleHeight(isBack ? 12 : 16);
        const margin = GameConfig.scaleWidth(10);

        const cols = Math.floor((buildingWidth - margin * 2) / gapX);
        const rows = Math.floor((buildingHeight - margin * 2) / gapY);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Random chance for window to be lit (25-40%)
                const isLit = Math.random() < (isBack ? 0.25 : 0.4);
                // Warm or cool color
                const isWarm = Math.random() < 0.6;
                // Random phase for pulsing
                const pulsePhase = Math.random() * Math.PI * 2;

                windows.push({
                    relX: margin + col * gapX,
                    relY: margin + row * gapY,
                    width: windowWidth,
                    height: windowHeight,
                    isLit,
                    isWarm,
                    pulsePhase
                });
            }
        }
        return windows;
    }

    update(currentPipeSpeed, gameHue, deltaTime = 1) {
        // Foreground: 0.5x speed
        this.updateLayer(this.foreground, 'nextForeX', currentPipeSpeed * 0.5 * deltaTime, false);

        // Background: 0.25x speed (Parallax)
        this.updateLayer(this.background, 'nextBackX', currentPipeSpeed * 0.25 * deltaTime, true);
    }

    updateLayer(layer, nextXProp, speed, isBack) {
        layer.forEach(b => {
            b.x -= speed;
        });

        if (layer.length > 0 && layer[0].x + layer[0].width < 0) {
            layer.shift();
        }

        const lastBuilding = layer[layer.length - 1];
        if (lastBuilding.x + lastBuilding.width < this.canvas.width + GameConfig.scaleWidth(100)) {
            this[nextXProp] = lastBuilding.x + lastBuilding.width;
            this.addBuilding(layer, nextXProp, isBack);
        }
    }

    draw(ctx, gameHue) {
        ctx.save();
        const time = Date.now() * 0.001;

        // Draw Background Layer (Darker, further away)
        this.drawLayer(ctx, this.background, gameHue, time, true);

        // Draw Foreground Layer
        this.drawLayer(ctx, this.foreground, gameHue, time, false);

        ctx.restore();
    }

    drawLayer(ctx, layer, gameHue, time, isBack) {
        const buildingColor = isBack
            ? `hsl(${gameHue}, 40%, 10%)`
            : `hsl(${gameHue}, 60%, 15%)`;

        layer.forEach(b => {
            const buildingY = this.canvas.height - b.height;

            // Draw building body
            ctx.fillStyle = buildingColor;
            ctx.shadowBlur = isBack ? 0 : 10;
            ctx.shadowColor = isBack ? 'transparent' : `hsl(${gameHue}, 60%, 10%)`;
            ctx.fillRect(b.x, buildingY, b.width + 1, b.height);

            // Draw windows with glow
            b.windows.forEach(w => {
                if (!w.isLit) return;

                // Subtle pulsing effect
                const pulse = Math.sin(time * 2 + w.pulsePhase) * 0.15 + 0.85;
                const alpha = (isBack ? 0.5 : 0.85) * pulse;

                // Warm windows (yellow/orange) or cool windows (cyan/white)
                const windowColor = w.isWarm
                    ? `rgba(255, 220, 150, ${alpha})`
                    : `hsla(${gameHue}, 80%, 75%, ${alpha})`;

                // Add subtle glow for foreground windows
                if (!isBack) {
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = w.isWarm ? 'rgba(255, 200, 100, 0.5)' : `hsla(${gameHue}, 100%, 60%, 0.5)`;
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.fillStyle = windowColor;
                ctx.fillRect(b.x + w.relX, buildingY + w.relY, w.width, w.height);
            });
            ctx.shadowBlur = 0;
        });
    }
}
