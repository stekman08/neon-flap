export class ParticleSystem {
    constructor(ctx) {
        this.ctx = ctx;
        this.particles = [];
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
                color: `rgba(0, 255, 255, ${Math.random()})`,
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
                color: `hsl(${hue}, 100%, 70%)`,
                size: Math.random() * 2 + 1
            });
        }
    }

    update(deltaTime = 1) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= 0.02 * deltaTime;
            p.size *= Math.pow(0.95, deltaTime); // Shrink

            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;
    }

    reset() {
        this.particles = [];
    }
}
