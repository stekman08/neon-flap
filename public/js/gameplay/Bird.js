import { GameConfig } from '../config/GameConfig.js';

// Pre-computed constants
const PI_QUARTER = Math.PI / 4;
const TWO_PI = Math.PI * 2;
const CONTRAIL_LENGTH = 40;

export class Bird {
    constructor(canvas, ctx, gameHue, createParticles, gameOver, playJumpSound) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.gameHue = gameHue;
        this.createParticles = createParticles;
        this.gameOver = gameOver;
        this.playJumpSound = playJumpSound;

        // Use proportional coordinates from GameConfig
        this.updateDimensions();

        this.y = canvas.height / 2;
        this.velocity = 0;
        this.exhaust = [];

        // Circular buffer for contrail (avoids push/shift allocation)
        this.contrail = new Array(CONTRAIL_LENGTH);
        for (let i = 0; i < CONTRAIL_LENGTH; i++) {
            this.contrail[i] = { x: 0, y: 0, active: false };
        }
        this.contrailIndex = 0;

        // Cached values (updated in update(), used in draw())
        // Note: halfWidth/halfHeight are set by updateDimensions() above
        this.centerX = 0;
        this.centerY = 0;
        this.rotation = 0;

        // Cached color strings (updated when hue changes significantly)
        this.cachedHue = -1;
        this.exhaustColor = '';
        this.contrailStroke = '';
        this.contrailShadow = '';
    }

    /**
     * Update bird dimensions based on current canvas size
     * Called on initialization and when viewport resizes
     */
    updateDimensions() {
        this.x = GameConfig.birdX;
        this.width = GameConfig.birdSize;
        this.height = GameConfig.birdSize;
        this.halfWidth = this.width / 2;
        this.halfHeight = this.height / 2;
    }

    /**
     * Update cached color strings when hue changes
     */
    updateColorCache(gameHue) {
        if (Math.abs(gameHue - this.cachedHue) > 3) {
            const hue = Math.round(gameHue);
            this.cachedHue = gameHue;
            this.exhaustColor = `hsla(${hue}, 100%, 80%, 0.6)`;
            this.contrailStroke = `hsla(${hue}, 100%, 70%, 0.3)`;
            this.contrailShadow = `hsla(${hue}, 100%, 50%, 0.5)`;
            this.bodyColor = `hsl(${hue}, 100%, 50%)`;
        }
    }

    draw(ctx, gameHue) {
        this.updateColorCache(gameHue);

        // Draw contrail behind the ship (circular buffer)
        let activeCount = 0;
        for (let i = 0; i < CONTRAIL_LENGTH; i++) {
            if (this.contrail[i].active) activeCount++;
        }

        if (activeCount > 1) {
            ctx.save();
            ctx.beginPath();

            // Find first active point (oldest in circular buffer)
            let started = false;
            for (let i = 0; i < CONTRAIL_LENGTH; i++) {
                const idx = (this.contrailIndex + i) % CONTRAIL_LENGTH;
                const p = this.contrail[idx];
                if (p.active) {
                    if (!started) {
                        ctx.moveTo(p.x, p.y);
                        started = true;
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                }
            }

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = this.contrailStroke;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 5;
            ctx.shadowColor = this.contrailShadow;
            ctx.stroke();
            ctx.restore();
        }

        // Draw Exhaust Particles (single save/restore)
        if (this.exhaust.length > 0) {
            ctx.save();
            for (let i = 0; i < this.exhaust.length; i++) {
                const p = this.exhaust[i];
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.centerX, this.centerY);
        ctx.rotate(this.rotation);

        // Engine Flame (Dynamic flicker)
        const flameLength = Math.random() * 20 + 10;
        const flameWidth = Math.random() * 6 + 4;
        const halfFlameWidth = flameWidth / 2;

        // Outer flame
        ctx.fillStyle = '#ff4500';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(-this.halfWidth, -halfFlameWidth);
        ctx.lineTo(-this.halfWidth - flameLength, 0);
        ctx.lineTo(-this.halfWidth, halfFlameWidth);
        ctx.fill();

        // Inner flame
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(-this.halfWidth, -flameWidth / 4);
        ctx.lineTo(-this.halfWidth - flameLength * 0.6, 0);
        ctx.lineTo(-this.halfWidth, flameWidth / 4);
        ctx.fill();

        // Ship Body
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.bodyColor;
        ctx.fillStyle = this.bodyColor;

        ctx.beginPath();
        ctx.moveTo(this.halfWidth, 0); // Nose
        ctx.lineTo(-this.halfWidth, -this.halfHeight); // Top rear
        ctx.lineTo(-this.halfWidth + 5, 0); // Engine indent
        ctx.lineTo(-this.halfWidth, this.halfHeight); // Bottom rear
        ctx.closePath();
        ctx.fill();

        // Cockpit / Detail
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.moveTo(this.width / 6, 0);
        ctx.lineTo(-this.width / 4, -5);
        ctx.lineTo(-this.width / 4, 5);
        ctx.fill();

        ctx.restore();
    }

    update(gameHue, deltaTime = 1, currentSpeed = 0) {
        this.velocity += GameConfig.gravity * deltaTime;
        this.y += this.velocity * deltaTime;

        // Update cached values (used in draw())
        this.centerX = this.x + this.halfWidth;
        this.centerY = this.y + this.halfHeight;
        this.rotation = Math.min(PI_QUARTER, Math.max(-PI_QUARTER, this.velocity * 0.1));

        // Update color cache if needed
        this.updateColorCache(gameHue);

        // Engine is at local (-halfWidth, 0) rotated
        const engineX = this.centerX + (-this.halfWidth) * Math.cos(this.rotation);
        const engineY = this.centerY + (-this.halfWidth) * Math.sin(this.rotation);

        // Add Exhaust Particle (scaled with bird size)
        const exhaustScale = GameConfig.birdSize / 30;
        this.exhaust.push({
            x: engineX,
            y: engineY,
            vx: -3 - Math.random(),
            vy: (Math.random() - 0.5) * 2,
            life: 0.8,
            color: this.exhaustColor, // Use cached color
            size: (Math.random() * 4 + 2) * exhaustScale
        });

        // Update Exhaust
        const shrinkFactor = Math.pow(0.95, deltaTime); // Calculate once
        for (let i = this.exhaust.length - 1; i >= 0; i--) {
            const p = this.exhaust[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= 0.04 * deltaTime;
            p.size *= shrinkFactor;
            if (p.life <= 0) {
                this.exhaust.splice(i, 1);
            }
        }

        // Update Contrail using circular buffer (no allocation)
        const contrailPoint = this.contrail[this.contrailIndex];
        contrailPoint.x = engineX;
        contrailPoint.y = engineY;
        contrailPoint.active = true;
        this.contrailIndex = (this.contrailIndex + 1) % CONTRAIL_LENGTH;

        // Move contrail points to the left (simulate world movement)
        const movement = currentSpeed * deltaTime;
        for (let i = 0; i < CONTRAIL_LENGTH; i++) {
            this.contrail[i].x -= movement;
        }

        // Floor collision
        if (this.y + this.height > this.canvas.height) {
            this.y = this.canvas.height - this.height;
            this.gameOver();
        }

        // Ceiling collision
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    }

    jump() {
        this.velocity = GameConfig.jumpStrength;
        // Burst of particles on jump
        this.createParticles(this.x, this.y + this.height / 2, 5, '#fff');
        // Play sound
        if (this.playJumpSound) this.playJumpSound();
    }
}
