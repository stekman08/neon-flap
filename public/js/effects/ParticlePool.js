import { Particle } from './Particle.js';

/**
 * ParticlePool - Object pool for efficient particle management
 *
 * Reduces garbage collection by reusing particle objects instead of
 * constantly creating and destroying them.
 */
export class ParticlePool {
    constructor(ctx, initialSize = 100) {
        this.ctx = ctx;
        this.pool = [];
        this.active = [];

        // Pre-allocate particles
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(new Particle(0, 0, '#fff', ctx));
        }
    }

    /**
     * Get a particle from the pool (reuse) or create new if pool is empty
     */
    get(x, y, color) {
        let particle;

        if (this.pool.length > 0) {
            // Reuse from pool
            particle = this.pool.pop();
            particle.reset(x, y, color);
        } else {
            // Pool exhausted, create new
            particle = new Particle(x, y, color, this.ctx);
        }

        this.active.push(particle);
        return particle;
    }

    /**
     * Release a particle back to the pool for reuse
     * Uses swap-and-pop for O(1) removal instead of O(n) splice
     */
    release(particle) {
        const index = this.active.indexOf(particle);
        if (index > -1) {
            // Swap with last element and pop (O(1) instead of splice O(n))
            const last = this.active.length - 1;
            if (index !== last) {
                this.active[index] = this.active[last];
            }
            this.active.pop();
            this.pool.push(particle);
        }
    }

    /**
     * Update all active particles and auto-release dead ones
     */
    update(deltaTime = 1) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const particle = this.active[i];
            particle.update(deltaTime);

            // Auto-release dead particles (swap-and-pop for O(1) removal)
            if (particle.life <= 0) {
                const last = this.active.length - 1;
                if (i !== last) {
                    this.active[i] = this.active[last];
                }
                this.active.pop();
                this.pool.push(particle);
            }
        }
    }

    /**
     * Draw all active particles
     */
    draw(ctx) {
        for (const particle of this.active) {
            particle.draw(ctx);
        }
    }

    /**
     * Get pool statistics for monitoring
     */
    getStats() {
        return {
            active: this.active.length,
            pooled: this.pool.length,
            total: this.active.length + this.pool.length
        };
    }

    /**
     * Clear all particles
     */
    clear() {
        while (this.active.length > 0) {
            this.pool.push(this.active.pop());
        }
    }
}
