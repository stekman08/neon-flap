import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Particle } from '../../../public/js/effects/Particle.js';

describe('Particle', () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      beginPath: vi.fn()
    };
  });

  describe('initialization', () => {
    it('should initialize at given position', () => {
      const particle = new Particle(100, 200, '#ff0000', ctx);

      expect(particle.x).toBe(100);
      expect(particle.y).toBe(200);
    });

    it('should have speed properties', () => {
      const particle = new Particle(100, 200, '#ff0000', ctx);

      expect(particle.speedX).toBeDefined();
      expect(particle.speedY).toBeDefined();
    });

    it('should start with full life', () => {
      const particle = new Particle(100, 200, '#ff0000', ctx);

      expect(particle.life).toBe(1);
    });

    it('should have random size between 2-7', () => {
      const particle = new Particle(100, 200, '#ff0000', ctx);

      expect(particle.size).toBeGreaterThanOrEqual(2);
      expect(particle.size).toBeLessThanOrEqual(7);
    });
  });

  describe('update', () => {
    it('should move based on velocity', () => {
      const particle = new Particle(100, 200, '#ff0000', ctx);
      const initialX = particle.x;
      const initialY = particle.y;

      particle.update();

      expect(particle.x).not.toBe(initialX);
      expect(particle.y).not.toBe(initialY);
    });

    it('should fade out', () => {
      const particle = new Particle(100, 200, '#ff0000', ctx);
      const initialLife = particle.life;

      particle.update();

      expect(particle.life).toBeLessThan(initialLife);
    });

    it('should decrease life by 0.03 per update', () => {
      const particle = new Particle(100, 200, '#ff0000', ctx);
      particle.life = 1;

      particle.update();

      expect(particle.life).toBe(0.97);
    });
  });

  describe('drawing', () => {
    it('should call canvas drawing methods', () => {
      const particle = new Particle(100, 200, '#ff0000', ctx);

      particle.draw(ctx);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('should use globalAlpha based on life', () => {
      const particle = new Particle(100, 200, '#ff0000', ctx);
      particle.life = 0.7;

      particle.draw(ctx);

      expect(ctx.globalAlpha).toBe(0.7);
    });

    it('should draw circle at particle position', () => {
      const particle = new Particle(100, 200, '#ff0000', ctx);
      particle.x = 150;
      particle.y = 250;
      particle.size = 4;

      particle.draw(ctx);

      expect(ctx.arc).toHaveBeenCalledWith(150, 250, 4, 0, Math.PI * 2);
    });
  });
});