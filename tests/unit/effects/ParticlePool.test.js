import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParticlePool } from '../../../public/js/effects/ParticlePool.js';

describe('ParticlePool', () => {
  let ctx;
  let pool;

  beforeEach(() => {
    ctx = {
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn()
    };
    pool = new ParticlePool(ctx, 10);
  });

  describe('initialization', () => {
    it('should pre-allocate particles', () => {
      expect(pool.pool.length).toBe(10);
      expect(pool.active.length).toBe(0);
    });

    it('should use default size if not specified', () => {
      const defaultPool = new ParticlePool(ctx);
      expect(defaultPool.pool.length).toBe(100);
    });
  });

  describe('get()', () => {
    it('should return a particle from the pool', () => {
      const particle = pool.get(100, 200, '#ff0000');

      expect(particle).toBeDefined();
      expect(particle.x).toBe(100);
      expect(particle.y).toBe(200);
    });

    it('should move particle from pool to active', () => {
      const initialPoolSize = pool.pool.length;

      pool.get(100, 200, '#ff0000');

      expect(pool.pool.length).toBe(initialPoolSize - 1);
      expect(pool.active.length).toBe(1);
    });

    it('should create new particle when pool is exhausted', () => {
      // Exhaust the pool
      for (let i = 0; i < 10; i++) {
        pool.get(i, i, '#fff');
      }

      expect(pool.pool.length).toBe(0);
      expect(pool.active.length).toBe(10);

      // Get one more - should create new
      const particle = pool.get(999, 999, '#000');

      expect(particle).toBeDefined();
      expect(pool.active.length).toBe(11);
    });
  });

  describe('release()', () => {
    it('should move particle from active back to pool', () => {
      const particle = pool.get(100, 200, '#ff0000');
      const activeCount = pool.active.length;
      const poolCount = pool.pool.length;

      pool.release(particle);

      expect(pool.active.length).toBe(activeCount - 1);
      expect(pool.pool.length).toBe(poolCount + 1);
    });

    it('should do nothing for non-active particle', () => {
      const initialPoolSize = pool.pool.length;
      const fakeParticle = { x: 0, y: 0 };

      pool.release(fakeParticle);

      expect(pool.pool.length).toBe(initialPoolSize);
    });
  });

  describe('update()', () => {
    it('should update all active particles', () => {
      const particle1 = pool.get(100, 100, '#fff');
      const particle2 = pool.get(200, 200, '#fff');

      particle1.update = vi.fn();
      particle2.update = vi.fn();

      pool.update(1);

      expect(particle1.update).toHaveBeenCalledWith(1);
      expect(particle2.update).toHaveBeenCalledWith(1);
    });

    it('should auto-release dead particles', () => {
      const particle = pool.get(100, 100, '#fff');
      particle.life = 0; // Mark as dead

      pool.update(1);

      expect(pool.active.length).toBe(0);
      expect(pool.pool.length).toBe(10); // Back in pool
    });

    it('should use default deltaTime of 1', () => {
      const particle = pool.get(100, 100, '#fff');
      particle.update = vi.fn();

      pool.update();

      expect(particle.update).toHaveBeenCalledWith(1);
    });
  });

  describe('draw()', () => {
    it('should draw all active particles', () => {
      const particle1 = pool.get(100, 100, '#fff');
      const particle2 = pool.get(200, 200, '#fff');

      particle1.draw = vi.fn();
      particle2.draw = vi.fn();

      pool.draw(ctx);

      expect(particle1.draw).toHaveBeenCalledWith(ctx);
      expect(particle2.draw).toHaveBeenCalledWith(ctx);
    });

    it('should not draw pooled particles', () => {
      // Don't get any particles - all should be in pool
      pool.draw(ctx);

      // No particles should have been drawn
      expect(pool.active.length).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics', () => {
      pool.get(100, 100, '#fff');
      pool.get(200, 200, '#fff');

      const stats = pool.getStats();

      expect(stats.active).toBe(2);
      expect(stats.pooled).toBe(8);
      expect(stats.total).toBe(10);
    });
  });

  describe('clear()', () => {
    it('should move all active particles back to pool', () => {
      pool.get(100, 100, '#fff');
      pool.get(200, 200, '#fff');
      pool.get(300, 300, '#fff');

      expect(pool.active.length).toBe(3);

      pool.clear();

      expect(pool.active.length).toBe(0);
      expect(pool.pool.length).toBe(10);
    });
  });
});
