import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScorePopup } from '../../../public/js/scoring/ScorePopup.js';

describe('ScorePopup', () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      translate: vi.fn()
    };
  });

  describe('initialization', () => {
    it('should initialize with correct values', () => {
      const popup = new ScorePopup(100, 200, '+1', ctx);

      expect(popup.x).toBe(100);
      expect(popup.y).toBe(200);
      expect(popup.text).toBe('+1');
      expect(popup.life).toBe(1);
    });

    it('should accept custom color', () => {
      const popup = new ScorePopup(100, 200, '+2', ctx, '#ffd700');

      expect(popup.color).toBe('#ffd700');
    });

    it('should default to white color', () => {
      const popup = new ScorePopup(100, 200, '+1', ctx);

      expect(popup.color).toBe('#fff');
    });
  });

  describe('update', () => {
    it('should move upward', () => {
      const popup = new ScorePopup(100, 200, '+1', ctx);
      const initialY = popup.y;

      popup.update();

      expect(popup.y).toBeLessThan(initialY);
    });

    it('should fade out over time', () => {
      const popup = new ScorePopup(100, 200, '+1', ctx);
      const initialLife = popup.life;

      popup.update();

      expect(popup.life).toBeLessThan(initialLife);
    });

    it('should decrease life by 0.02 per update', () => {
      const popup = new ScorePopup(100, 200, '+1', ctx);
      popup.life = 1;

      popup.update();

      expect(popup.life).toBe(0.98);
    });
  });

  describe('drawing', () => {
    it('should call canvas drawing methods', () => {
      const popup = new ScorePopup(100, 200, '+1', ctx);

      popup.draw(ctx);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled();
    });

    it('should use globalAlpha based on life', () => {
      const popup = new ScorePopup(100, 200, '+1', ctx);
      popup.life = 0.5;

      popup.draw(ctx);

      // globalAlpha should be set to life value
      expect(ctx.globalAlpha).toBe(0.5);
    });

    it('should draw the text at correct position', () => {
      const popup = new ScorePopup(100, 200, '+2', ctx);

      popup.draw(ctx);

      expect(ctx.fillText).toHaveBeenCalledWith('+2', 100, 200);
    });
  });
});