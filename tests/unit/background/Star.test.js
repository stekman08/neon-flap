import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Star } from '../../../public/js/background/Star.js';

describe('Star', () => {
  let canvas, ctx;

  beforeEach(() => {
    canvas = { width: 400, height: 600 };
    ctx = {
      fillRect: vi.fn()
    };
  });

  describe('initialization', () => {
    it('should initialize within canvas bounds', () => {
      const star = new Star(canvas, ctx);

      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(canvas.width);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(canvas.height);
    });

    it('should have random size', () => {
      const star = new Star(canvas, ctx);

      expect(star.size).toBeGreaterThan(0);
      expect(star.size).toBeLessThanOrEqual(3);
    });

    it('should have random parallax factor', () => {
      const star = new Star(canvas, ctx);

      expect(star.parallaxFactor).toBeGreaterThanOrEqual(0.05);
      expect(star.parallaxFactor).toBeLessThanOrEqual(0.15);
    });
  });

  describe('update', () => {
    it('should move left based on pipe speed and parallax factor', () => {
      const star = new Star(canvas, ctx);
      const initialX = star.x;
      const pipeSpeed = 5;

      star.update(pipeSpeed);

      expect(star.x).toBeLessThan(initialX);
    });

    it('should wrap around when reaching left edge', () => {
      const star = new Star(canvas, ctx);
      star.x = -10; // Past left edge
      const pipeSpeed = 5;

      star.update(pipeSpeed);

      expect(star.x).toBeGreaterThan(0);
    });
  });

  describe('drawing', () => {
    it('should call fillRect', () => {
      const star = new Star(canvas, ctx);

      star.draw(ctx);

      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('should draw at star position with correct size', () => {
      const star = new Star(canvas, ctx);
      star.x = 100;
      star.y = 200;
      star.size = 1.5;

      star.draw(ctx);

      expect(ctx.fillRect).toHaveBeenCalledWith(100, 200, 1.5, 1.5);
    });
  });
});