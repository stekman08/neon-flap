// Pre-computed constants
const TWO_PI = Math.PI * 2;

// Pre-computed RGBA colors for jump particles (10 alpha levels)
const JUMP_COLORS = [];
for (let i = 0; i < 10; i++) {
    const alpha = (i + 1) / 10; // 0.1 to 1.0
    JUMP_COLORS.push(`rgba(0, 255, 255, ${alpha})`);
}

export class ParticleSystem {
    constructor(ctx) {
        this.ctx = ctx;
        this.particles = [];

        // Cached HSL color for pipe cleared effect
        this.cachedPipeHue = -1;
        this.cachedPipeColor = '';
    }

    // Create particles for a jump effect
    createJumpParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 + 2, // Downward bias
                life: 1.0,
                color: JUMP_COLORS[Math.floor(Math.random() * 10)],
                size: Math.random() * 3 + 1
            });
        }
    }

    // Create particles for an explosion effect
    createExplosion(x, y) {
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: Math.random() > 0.5 ? '#0ff' : '#f0f',
                size: Math.random() * 4 + 2
            });
        }
    }

    // Create sparkle effect when passing a pipe
    createPipeClearedEffect(x, y, hue) {
        // Update cached color if hue changed significantly
        if (Math.abs(hue - this.cachedPipeHue) > 3) {
            this.cachedPipeHue = hue;
            this.cachedPipeColor = `hsl(${Math.round(hue)}, 100%, 70%)`;
        }

        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            // Spread particles in a small burst behind the bird
            const angle = (Math.random() - 0.5) * Math.PI * 0.5; // Mostly backward
            const speed = Math.random() * 3 + 1;
            this.particles.push({
                x: x,
                y: y + (Math.random() - 0.5) * 20,
                vx: -Math.abs(Math.cos(angle) * speed) - 1, // Always move left/backward
                vy: Math.sin(angle) * speed,
                life: 0.8,
                color: this.cachedPipeColor,
                size: Math.random() * 2 + 1
            });
        }
    }

    update(deltaTime = 1) {
        // Cache shrink factor (calculate once per frame, not per particle)
        const shrinkFactor = Math.pow(0.95, deltaTime);
        const lifeDrain = 0.02 * deltaTime;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= lifeDrain;
            p.size *= shrinkFactor;

            // Remove dead particles (swap-and-pop for O(1) removal)
            if (p.life <= 0) {
                const last = this.particles.length - 1;
                if (i !== last) {
                    this.particles[i] = this.particles[last];
                }
                this.particles.pop();
            }
        }
    }

    draw() {
        const ctx = this.ctx;
        const particles = this.particles;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    reset() {
        this.particles = [];
    }
}
