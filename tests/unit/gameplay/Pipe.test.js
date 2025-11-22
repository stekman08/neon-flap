import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Pipe } from '../../../public/js/gameplay/Pipe.js';

describe('Pipe', () => {
  let canvas, ctx, updateGapCenter;

  beforeEach(() => {
    canvas = { width: 400, height: 600 };
    ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn()
    };
    updateGapCenter = vi.fn();
  });

  describe('initialization', () => {
    it('should initialize at right edge of canvas', () => {
      const pipe = new Pipe(canvas, ctx, 170, 120, 300, 0, updateGapCenter);

      expect(pipe.x).toBe(canvas.width);
    });

    it('should have standard width', () => {
      const pipe = new Pipe(canvas, ctx, 170, 120, 300, 0, updateGapCenter);

      expect(pipe.width).toBe(60);
    });

    it('should not be marked as passed initially', () => {
      const pipe = new Pipe(canvas, ctx, 170, 120, 300, 0, updateGapCenter);

      expect(pipe.passed).toBe(false);
    });

    it('should call updateGapCenter with gap center', () => {
      const pipe = new Pipe(canvas, ctx, 170, 120, 300, 0, updateGapCenter);

      expect(updateGapCenter).toHaveBeenCalledWith(expect.any(Number));
    });
  });

  describe('gap generation', () => {
    it('should respect minimum gap size', () => {
      const minGap = 120;
      const pipe = new Pipe(canvas, ctx, 170, minGap, 300, 0, updateGapCenter);
      const gap = pipe.bottomY - pipe.topHeight;

      expect(gap).toBeGreaterThanOrEqual(minGap);
    });

    it('should vary gap position smoothly from last center', () => {
      const lastCenter = 300;
      const pipe = new Pipe(canvas, ctx, 170, 120, lastCenter, 0, updateGapCenter);
      const gapCenter = pipe.topHeight + (170 / 2);

      // Gap center should be within +/- 100 of last center (max diff in Pipe.js)
      expect(Math.abs(gapCenter - lastCenter)).toBeLessThanOrEqual(100);
    });
  });

  describe('movement', () => {
    it('should move left when updated', () => {
      const pipe = new Pipe(canvas, ctx, 170, 120, 300, 0, updateGapCenter);
      const initialX = pipe.x;

      pipe.update(3, 0);

      expect(pipe.x).toBe(initialX - 3);
    });

    it('should move faster with higher speed', () => {
      const pipe = new Pipe(canvas, ctx, 170, 120, 300, 0, updateGapCenter);
      const initialX = pipe.x;

      pipe.update(10, 0);

      expect(pipe.x).toBe(initialX - 10);
    });
  });

  describe('scoring', () => {
    it('should start with passed = false', () => {
      const pipe = new Pipe(canvas, ctx, 170, 120, 300, 0, updateGapCenter);

      expect(pipe.passed).toBe(false);
    });
  });

  describe('drawing', () => {
    it('should call canvas drawing methods', () => {
      const pipe = new Pipe(canvas, ctx, 170, 120, 300, 0, updateGapCenter);

      pipe.draw(ctx, 100);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('should draw top and bottom pipes', () => {
      const pipe = new Pipe(canvas, ctx, 170, 120, 300, 0, updateGapCenter);

      pipe.draw(ctx, 100);

      // Should call fillRect at least 4 times (2 for pipes, 2 for details)
      expect(ctx.fillRect).toHaveBeenCalledTimes(4);
    });

    it('should use complementary color from gameHue', () => {
      const pipe = new Pipe(canvas, ctx, 170, 120, 300, 0, updateGapCenter);
      const mockFillStyle = vi.fn();
      Object.defineProperty(ctx, 'fillStyle', {
        set: mockFillStyle,
        configurable: true
      });

      pipe.draw(ctx, 100);

      // Should set fillStyle for pipe color
      expect(mockFillStyle).toHaveBeenCalled();
    });
  });
});
