import { GameConfig } from '../config/GameConfig.js';

// Pre-computed constants
const TWO_PI = Math.PI * 2;

// Pre-computed warm window colors at different alpha levels (10 levels from 0.7 to 1.0)
const WARM_WINDOW_COLORS = [];
for (let i = 0; i < 10; i++) {
    const alpha = 0.7 + (i * 0.033);
    WARM_WINDOW_COLORS.push(`rgba(255, 220, 150, ${alpha.toFixed(2)})`);
}

// Pre-computed sin lookup table (64 entries for one full cycle)
const SIN_TABLE_SIZE = 64;
const SIN_TABLE = [];
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
    SIN_TABLE.push(Math.sin((i / SIN_TABLE_SIZE) * TWO_PI));
}

// Fast sin approximation using lookup table
function fastSin(radians) {
    // Normalize to 0-2π range and map to table index
    const normalized = ((radians % TWO_PI) + TWO_PI) % TWO_PI;
    const index = Math.floor((normalized / TWO_PI) * SIN_TABLE_SIZE) % SIN_TABLE_SIZE;
    return SIN_TABLE[index];
}

export class CitySkyline {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.foreground = [];
        this.background = [];
        this.nextForeX = 0;
        this.nextBackX = 0;

        // Cached color strings (updated when hue changes)
        this.cachedHue = -1;
        this.backBuildingColor = '';
        this.foreBuildingColor = '';
        this.foreShadowColor = '';
        this.coolWindowShadow = '';
        this.warmWindowShadow = 'rgba(255, 200, 100, 0.5)';

        // Cool window color cache (indexed by alpha level 0-9)
        this.coolWindowColors = [];

        // Fill screen initially
        this.initLayer(this.foreground, 'nextForeX', false);
        this.initLayer(this.background, 'nextBackX', true);
    }

    /**
     * Update cached color strings when hue changes significantly
     */
    updateColorCache(gameHue) {
        if (Math.abs(gameHue - this.cachedHue) > 3) {
            const hue = Math.round(gameHue);
            this.cachedHue = gameHue;
            this.backBuildingColor = `hsl(${hue}, 40%, 10%)`;
            this.foreBuildingColor = `hsl(${hue}, 60%, 15%)`;
            this.foreShadowColor = `hsl(${hue}, 60%, 10%)`;
            this.coolWindowShadow = `hsla(${hue}, 100%, 60%, 0.5)`;

            // Pre-compute cool window colors at 10 alpha levels (0.7 to 1.0)
            this.coolWindowColors = [];
            for (let i = 0; i < 10; i++) {
                const alpha = 0.7 + (i * 0.033);
                this.coolWindowColors.push(`hsla(${hue}, 80%, 75%, ${alpha.toFixed(2)})`);
            }
        }
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

        // Roof style: 0=flat, 1=stepped, 2=angled, 3=spire
        const roofStyle = Math.floor(Math.random() * 4);

        // Generate window grid for this building (accounting for roof style)
        const windows = this.generateWindows(width, height, isBack, roofStyle);

        // Some buildings have antennas (but not spire buildings - they already have a pointed top)
        const hasAntenna = !isBack && roofStyle !== 3 && Math.random() < 0.3;

        // Only very tall buildings with spires get warning lights (and not if they have antennas)
        const hasWarningLight = !isBack && !hasAntenna && roofStyle === 3 && height > this.canvas.height * 0.55;
        const warningLightPhase = Math.random() * Math.PI * 2;
        const antennaHeight = GameConfig.scaleHeight(15 + Math.random() * 20);

        layer.push({
            x: this[nextXProp],
            width,
            height,
            windows,
            isBack,
            roofStyle,
            hasWarningLight,
            warningLightPhase,
            hasAntenna,
            antennaHeight
        });
        this[nextXProp] += width;
    }

    generateWindows(buildingWidth, buildingHeight, isBack, roofStyle) {
        const windows = [];
        // Larger, rectangular windows
        const windowWidth = GameConfig.scaleWidth(isBack ? 4 : 6);
        const windowHeight = GameConfig.scaleHeight(isBack ? 6 : 10);
        // More spacing between windows
        const gapX = GameConfig.scaleWidth(isBack ? 10 : 14);
        const gapY = GameConfig.scaleHeight(isBack ? 12 : 16);
        const margin = GameConfig.scaleWidth(10);

        // Reduce effective height based on roof style to avoid windows in roof area
        let effectiveHeight = buildingHeight;
        let topMargin = margin;

        switch (roofStyle) {
            case 1: // Stepped - top 15% is roof
                topMargin = margin + buildingHeight * 0.18;
                effectiveHeight = buildingHeight * 0.82;
                break;
            case 2: // Angled - top 10% is roof
                topMargin = margin + buildingHeight * 0.15;
                effectiveHeight = buildingHeight * 0.85;
                break;
            case 3: // Spire - top 20% is roof
                topMargin = margin + buildingHeight * 0.25;
                effectiveHeight = buildingHeight * 0.75;
                break;
            default: // Flat roof
                break;
        }

        const cols = Math.floor((buildingWidth - margin * 2) / gapX);
        const rows = Math.floor((effectiveHeight - topMargin - margin) / gapY);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Random chance for window to be lit (25-40%)
                const isLit = Math.random() < (isBack ? 0.25 : 0.4);
                // Warm or cool color
                const isWarm = Math.random() < 0.6;
                // Random phase for pulsing
                const pulsePhase = Math.random() * Math.PI * 2;
                // Extra bright "working late" window (rare)
                const isBright = isLit && !isBack && Math.random() < 0.05;

                windows.push({
                    relX: margin + col * gapX,
                    relY: topMargin + row * gapY,
                    width: windowWidth,
                    height: windowHeight,
                    isLit,
                    isWarm,
                    pulsePhase,
                    isBright
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
        for (let i = 0; i < layer.length; i++) {
            layer[i].x -= speed;
        }

        if (layer.length > 0 && layer[0].x + layer[0].width < 0) {
            layer.shift();
        }

        const lastBuilding = layer[layer.length - 1];
        if (lastBuilding.x + lastBuilding.width < this.canvas.width + GameConfig.scaleWidth(100)) {
            this[nextXProp] = lastBuilding.x + lastBuilding.width;
            this.addBuilding(layer, nextXProp, isBack);
        }
    }

    draw(ctx, gameHue, time = null) {
        // Use passed time or fall back to Date.now()
        const t = time !== null ? time : Date.now() * 0.001;

        ctx.save();
        this.updateColorCache(gameHue);

        // Draw Background Layer (Darker, further away)
        this.drawLayer(ctx, this.background, gameHue, t, true);

        // Draw Foreground Layer
        this.drawLayer(ctx, this.foreground, gameHue, t, false);

        ctx.restore();
    }

    drawLayer(ctx, layer, gameHue, time, isBack) {
        // Use cached building colors
        const buildingColor = isBack ? this.backBuildingColor : this.foreBuildingColor;
        const shadowColor = isBack ? 'transparent' : this.foreShadowColor;
        const canvasHeight = this.canvas.height;
        const time2 = time * 2;

        // Pre-compute alpha multiplier for this layer
        const alphaMultiplier = isBack ? 0.5 : 0.85;

        for (let i = 0; i < layer.length; i++) {
            const b = layer[i];
            const buildingY = canvasHeight - b.height;
            const bx = b.x;

            // Draw building body based on roof style
            ctx.fillStyle = buildingColor;
            ctx.shadowBlur = isBack ? 0 : 10;
            ctx.shadowColor = shadowColor;

            this.drawBuildingShape(ctx, b, buildingY, buildingColor);

            // Draw antenna if present
            if (b.hasAntenna) {
                this.drawAntenna(ctx, b, buildingY, gameHue, time);
            }

            // Draw aircraft warning light
            if (b.hasWarningLight) {
                this.drawWarningLight(ctx, b, buildingY, time);
            }

            // Draw windows - batched by type to minimize state changes
            const windows = b.windows;

            if (isBack) {
                // Background windows: no shadow, simpler rendering
                ctx.shadowBlur = 0;
                for (let j = 0; j < windows.length; j++) {
                    const w = windows[j];
                    if (!w.isLit) continue;

                    // Use fast sin lookup and map to alpha index (0-9)
                    const pulse = fastSin(time2 + w.pulsePhase) * 0.15 + 0.85;
                    const alphaIndex = Math.min(9, Math.floor((alphaMultiplier * pulse - 0.7) * 30));

                    ctx.fillStyle = w.isWarm
                        ? WARM_WINDOW_COLORS[alphaIndex]
                        : this.coolWindowColors[alphaIndex];
                    ctx.fillRect(bx + w.relX, buildingY + w.relY, w.width, w.height);
                }
            } else {
                // Foreground windows: collect by type, render in batches
                // First pass: render warm windows with warm shadow
                ctx.shadowBlur = 6;
                ctx.shadowColor = this.warmWindowShadow;
                for (let j = 0; j < windows.length; j++) {
                    const w = windows[j];
                    if (!w.isLit || !w.isWarm || w.isBright) continue;

                    const pulse = fastSin(time2 + w.pulsePhase) * 0.15 + 0.85;
                    const alphaIndex = Math.min(9, Math.max(0, Math.floor((alphaMultiplier * pulse - 0.7) * 30)));
                    ctx.fillStyle = WARM_WINDOW_COLORS[alphaIndex];
                    ctx.fillRect(bx + w.relX, buildingY + w.relY, w.width, w.height);
                }

                // Second pass: render cool windows with cool shadow
                ctx.shadowColor = this.coolWindowShadow;
                for (let j = 0; j < windows.length; j++) {
                    const w = windows[j];
                    if (!w.isLit || w.isWarm || w.isBright) continue;

                    const pulse = fastSin(time2 + w.pulsePhase) * 0.15 + 0.85;
                    const alphaIndex = Math.min(9, Math.max(0, Math.floor((alphaMultiplier * pulse - 0.7) * 30)));
                    ctx.fillStyle = this.coolWindowColors[alphaIndex];
                    ctx.fillRect(bx + w.relX, buildingY + w.relY, w.width, w.height);
                }

                // Third pass: render bright windows with intense glow
                ctx.shadowBlur = 12;
                ctx.shadowColor = 'rgba(255, 255, 200, 0.8)';
                ctx.fillStyle = 'rgba(255, 255, 220, 0.95)';
                for (let j = 0; j < windows.length; j++) {
                    const w = windows[j];
                    if (!w.isBright) continue;
                    ctx.fillRect(bx + w.relX, buildingY + w.relY, w.width, w.height);
                }
            }
            ctx.shadowBlur = 0;
        }
    }

    drawBuildingShape(ctx, b, buildingY, buildingColor) {
        ctx.beginPath();

        switch (b.roofStyle) {
            case 1: // Stepped roof
                const stepHeight = b.height * 0.15;
                const stepWidth = b.width * 0.3;
                ctx.moveTo(b.x, this.canvas.height);
                ctx.lineTo(b.x, buildingY + stepHeight);
                ctx.lineTo(b.x + stepWidth, buildingY + stepHeight);
                ctx.lineTo(b.x + stepWidth, buildingY);
                ctx.lineTo(b.x + b.width - stepWidth, buildingY);
                ctx.lineTo(b.x + b.width - stepWidth, buildingY + stepHeight);
                ctx.lineTo(b.x + b.width, buildingY + stepHeight);
                ctx.lineTo(b.x + b.width, this.canvas.height);
                break;

            case 2: // Angled roof
                const peakOffset = b.width * 0.5;
                const roofHeight = b.height * 0.1;
                ctx.moveTo(b.x, this.canvas.height);
                ctx.lineTo(b.x, buildingY + roofHeight);
                ctx.lineTo(b.x + peakOffset, buildingY);
                ctx.lineTo(b.x + b.width, buildingY + roofHeight);
                ctx.lineTo(b.x + b.width, this.canvas.height);
                break;

            case 3: // Spire
                const spireWidth = b.width * 0.2;
                const spireHeight = b.height * 0.2;
                ctx.moveTo(b.x, this.canvas.height);
                ctx.lineTo(b.x, buildingY + spireHeight);
                ctx.lineTo(b.x + (b.width - spireWidth) / 2, buildingY + spireHeight);
                ctx.lineTo(b.x + b.width / 2, buildingY);
                ctx.lineTo(b.x + (b.width + spireWidth) / 2, buildingY + spireHeight);
                ctx.lineTo(b.x + b.width, buildingY + spireHeight);
                ctx.lineTo(b.x + b.width, this.canvas.height);
                break;

            default: // Flat roof (case 0)
                ctx.rect(b.x, buildingY, b.width + 1, b.height);
                break;
        }

        ctx.closePath();
        ctx.fill();
    }

    drawAntenna(ctx, b, buildingY, gameHue, time) {
        const antennaX = b.x + b.width / 2;
        const antennaBaseY = buildingY;

        // Antenna pole
        ctx.strokeStyle = `hsl(${gameHue}, 40%, 25%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(antennaX, antennaBaseY);
        ctx.lineTo(antennaX, antennaBaseY - b.antennaHeight);
        ctx.stroke();

        // Blinking light on antenna
        const blink = Math.sin(time * 4 + b.warningLightPhase) > 0.3;
        if (blink) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';
            ctx.fillStyle = '#ff3333';
            ctx.beginPath();
            ctx.arc(antennaX, antennaBaseY - b.antennaHeight, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    drawWarningLight(ctx, b, buildingY, time) {
        // Aircraft warning light - blinks red
        const blink = Math.sin(time * 3 + b.warningLightPhase) > 0.5;

        if (blink) {
            const lightX = b.x + b.width / 2;
            const lightY = buildingY + 5;

            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0000';
            ctx.fillStyle = '#ff2222';
            ctx.beginPath();
            ctx.arc(lightX, lightY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}
