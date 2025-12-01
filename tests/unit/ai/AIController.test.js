import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIController } from '../../../public/js/ai/AIController.js';

describe('AIController', () => {
  let bird, pipes, canvas;

  beforeEach(() => {
    canvas = { width: 400, height: 600 };
    bird = {
      x: 50,
      y: 300,
      height: 24,
      jump: vi.fn(),
      velocity: 0
    };
  });

  describe('finding next pipe', () => {
    it('should find the first pipe ahead of bird', () => {
      pipes = [
        { x: 30, width: 60, bottomY: 370 }, // Behind bird (x + width < bird.x)
        { x: 100, width: 60, bottomY: 370 }, // Ahead of bird
        { x: 300, width: 60, bottomY: 370 }  // Further ahead
      ];
      bird.y = 400; // Below target
      bird.velocity = 0;

      AIController.performAI(bird, pipes, 170, canvas);

      // Bird is below target (gap center = 370 - 170/2 = 285), should jump
      expect(bird.jump).toHaveBeenCalled();
    });

    it('should not jump if no pipes ahead', () => {
      pipes = [
        { x: 30, width: 60, topHeight: 200 } // Behind bird
      ];
      bird.y = 300; // At center

      AIController.performAI(bird, pipes, 170, canvas);

      expect(bird.jump).not.toHaveBeenCalled();
    });
  });

  describe('jump decision', () => {
    it('should jump when bird is below target height', () => {
      pipes = [
        { x: 100, width: 60, bottomY: 370 }
      ];
      bird.y = 400; // Below gap center (285)
      bird.velocity = 0;

      AIController.performAI(bird, pipes, 170, canvas);

      expect(bird.jump).toHaveBeenCalled();
    });

    it('should not jump when bird is above target height', () => {
      pipes = [
        { x: 100, width: 60, bottomY: 370 }
      ];
      bird.y = 200; // Above gap center (285)
      bird.velocity = 0;

      AIController.performAI(bird, pipes, 170, canvas);

      expect(bird.jump).not.toHaveBeenCalled();
    });

    it('should consider bird velocity in jump decision', () => {
      pipes = [
        { x: 100, width: 60, bottomY: 370 }
      ];
      bird.y = 280; // At gap center (285)
      bird.velocity = -10; // Rising, so y + velocity = 270 < 285

      AIController.performAI(bird, pipes, 170, canvas);

      // Should not jump because y + velocity < targetY
      expect(bird.jump).not.toHaveBeenCalled();
    });
  });

  describe('default behavior', () => {
    it('should maintain center position when no pipes exist', () => {
      pipes = [];
      bird.y = 400; // Below center (300)
      bird.velocity = 2; // Falling - required to trigger jump

      AIController.performAI(bird, pipes, 170, canvas);

      // Should jump to get back to center (only when falling AND below center)
      expect(bird.jump).toHaveBeenCalled();
    });

    it('should not jump when rising even if below center', () => {
      pipes = [];
      bird.y = 400; // Below center
      bird.velocity = -5; // Rising

      AIController.performAI(bird, pipes, 170, canvas);

      // Should NOT jump when rising - prevents over-jumping
      expect(bird.jump).not.toHaveBeenCalled();
    });
  });
});
