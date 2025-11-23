import { GameConfig } from '../config/GameConfig.js';

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
        this.exhaust = []; // Particle based exhaust
    }

    /**
     * Update bird dimensions based on current canvas size
     * Called on initialization and when viewport resizes
     */
    updateDimensions() {
        this.x = GameConfig.birdX;
        this.width = GameConfig.birdSize;
        this.height = GameConfig.birdSize;
    }

    draw(ctx, gameHue) {
        const currentColor = `hsl(${gameHue}, 100%, 50%)`;
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // Draw Exhaust Particles
        this.exhaust.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        ctx.save();
        ctx.translate(centerX, centerY);

        // Rotate based on velocity (tilt up/down)
        const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(rotation);

        // Engine Flame (Dynamic flicker)
        const flameLength = Math.random() * 20 + 10;
        const flameWidth = Math.random() * 6 + 4;

        // Outer flame
        ctx.fillStyle = '#ff4500';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, -flameWidth / 2);
        ctx.lineTo(-this.width / 2 - flameLength, 0);
        ctx.lineTo(-this.width / 2, flameWidth / 2);
        ctx.fill();

        // Inner flame
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, -flameWidth / 4);
        ctx.lineTo(-this.width / 2 - flameLength * 0.6, 0);
        ctx.lineTo(-this.width / 2, flameWidth / 4);
        ctx.fill();

        // Ship Body
        ctx.shadowBlur = 20;
        ctx.shadowColor = currentColor;
        ctx.fillStyle = currentColor;

        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0); // Nose
        ctx.lineTo(-this.width / 2, -this.height / 2); // Top rear
        ctx.lineTo(-this.width / 2 + 5, 0); // Engine indent
        ctx.lineTo(-this.width / 2, this.height / 2); // Bottom rear
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

    update(gameHue, deltaTime = 1) {
        this.velocity += GameConfig.gravity * deltaTime;
        this.y += this.velocity * deltaTime;

        // Calculate Engine Position for Exhaust
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));

        // Engine is at local (-width/2, 0) rotated
        const engineX = centerX + (-this.width / 2) * Math.cos(rotation);
        const engineY = centerY + (-this.width / 2) * Math.sin(rotation);

        // Add Exhaust Particle (scaled with bird size)
        const exhaustScale = GameConfig.birdSize / 30; // Scale relative to reference size
        this.exhaust.push({
            x: engineX,
            y: engineY,
            vx: -3 - Math.random(), // Move left faster
            vy: (Math.random() - 0.5) * 2, // Slight vertical spread
            life: 0.8,
            color: `hsla(${gameHue}, 100%, 80%, 0.6)`, // Brighter core
            size: (Math.random() * 4 + 2) * exhaustScale
        });

        // Update Exhaust
        for (let i = 0; i < this.exhaust.length; i++) {
            let p = this.exhaust[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= 0.04 * deltaTime; // Fade out
            p.size *= Math.pow(0.95, deltaTime); // Shrink
            if (p.life <= 0) {
                this.exhaust.splice(i, 1);
                i--;
            }
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
