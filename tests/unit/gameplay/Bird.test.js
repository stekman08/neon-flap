import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Bird } from '../../../public/js/gameplay/Bird.js';

describe('Bird', () => {
  let canvas, ctx, createParticles, gameOver;

  beforeEach(() => {
    canvas = { width: 400, height: 600 };
    ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn()
    };
    createParticles = vi.fn();
    gameOver = vi.fn();
  });

  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);

      expect(bird.x).toBe(50);
      expect(bird.y).toBe(300); // canvas.height / 2
      expect(bird.width).toBe(30);
      expect(bird.height).toBe(30);
      expect(bird.velocity).toBe(0);
    });
  });

  describe('gravity', () => {
    it('should apply gravity to velocity', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
      const initialVelocity = bird.velocity;

      bird.update(0);

      expect(bird.velocity).toBeGreaterThan(initialVelocity);
    });

    it('should update y position based on velocity', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
      bird.velocity = 5;
      const initialY = bird.y;

      bird.update(0);

      // Gravity (0.25) is applied first, then y is updated by velocity
      expect(bird.y).toBe(initialY + 5.25);
    });
  });

  describe('jumping', () => {
    it('should set velocity to negative value when jumping', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);

      bird.jump();

      expect(bird.velocity).toBeLessThan(0);
    });

    it('should create particles when jumping', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);

      bird.jump();

      expect(createParticles).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        5,
        expect.any(String)
      );
    });
  });

  describe('boundaries', () => {
    it('should reset velocity when hitting top boundary', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
      bird.y = -10;
      bird.velocity = -5;

      bird.update(0);

      expect(bird.y).toBe(0);
      expect(bird.velocity).toBe(0);
      expect(gameOver).not.toHaveBeenCalled();
    });

    it('should call gameOver when hitting bottom boundary', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
      bird.y = canvas.height + 10;

      bird.update(0);

      expect(gameOver).toHaveBeenCalled();
    });

    it('should not call gameOver when within boundaries', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
      bird.y = 300;

      bird.update(0);

      expect(gameOver).not.toHaveBeenCalled();
    });
  });

  describe('exhaust particles', () => {
    it('should create exhaust particles when updating', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
      const initialExhaustLength = bird.exhaust.length;

      bird.update(0);

      expect(bird.exhaust.length).toBeGreaterThan(initialExhaustLength);
    });

    it('should fade out exhaust particles over time', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);

      // Add multiple updates to let particles fade
      for (let i = 0; i < 30; i++) {
        bird.update(0);
      }

      // Some particles should have faded and been removed
      expect(bird.exhaust.length).toBeLessThan(30);
    });
  });

  describe('drawing', () => {
    it('should call canvas drawing methods', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);

      bird.draw(ctx, 100);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.translate).toHaveBeenCalled();
      expect(ctx.rotate).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('should draw exhaust particles', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
      bird.exhaust.push({ x: 10, y: 10, life: 0.5, color: '#fff', size: 2 });

      bird.draw(ctx, 100);

      expect(ctx.arc).toHaveBeenCalled();
    });

    it('should use gameHue for coloring', () => {
      const bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
      const mockFillStyle = vi.fn();
      Object.defineProperty(ctx, 'fillStyle', {
        set: mockFillStyle,
        configurable: true
      });

      bird.draw(ctx, 180);

      // Should set fillStyle multiple times with hsl colors
      expect(mockFillStyle).toHaveBeenCalled();
    });
  });
});
