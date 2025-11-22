import { describe, it, expect, beforeEach } from 'vitest';
import { GameConfig } from '../../public/js/config/GameConfig.js';

describe('GameConfig', () => {
  beforeEach(() => {
    // Reset to reference dimensions before each test
    GameConfig.updateDimensions(400, 600);
  });

  describe('Reference Dimensions', () => {
    it('should have correct reference dimensions', () => {
      expect(GameConfig.REFERENCE_WIDTH).toBe(400);
      expect(GameConfig.REFERENCE_HEIGHT).toBe(600);
    });

    it('should initialize with reference dimensions', () => {
      expect(GameConfig.canvasWidth).toBe(400);
      expect(GameConfig.canvasHeight).toBe(600);
    });
  });

  describe('updateDimensions', () => {
    it('should update canvas dimensions', () => {
      GameConfig.updateDimensions(800, 1200);

      expect(GameConfig.canvasWidth).toBe(800);
      expect(GameConfig.canvasHeight).toBe(1200);
    });

    it('should recalculate getters after dimension update', () => {
      const initialBirdX = GameConfig.birdX;

      GameConfig.updateDimensions(800, 1200);

      expect(GameConfig.birdX).not.toBe(initialBirdX);
      expect(GameConfig.birdX).toBe(100); // 12.5% of 800
    });
  });

  describe('birdX getter', () => {
    it('should return 50px for 400×600 canvas (reference)', () => {
      expect(GameConfig.birdX).toBe(50);
    });

    it('should return 100px for 800×1200 canvas (2x scale)', () => {
      GameConfig.updateDimensions(800, 1200);
      expect(GameConfig.birdX).toBe(100);
    });

    it('should scale proportionally to canvas width (12.5%)', () => {
      GameConfig.updateDimensions(1000, 600);
      expect(GameConfig.birdX).toBe(125); // 12.5% of 1000
    });

    it('should handle iPhone SE dimensions (375×667)', () => {
      GameConfig.updateDimensions(375, 667);
      expect(GameConfig.birdX).toBeCloseTo(46.875, 2); // 12.5% of 375
    });

    it('should handle iPhone 15 Pro Max dimensions (430×932)', () => {
      GameConfig.updateDimensions(430, 932);
      expect(GameConfig.birdX).toBeCloseTo(53.75, 2); // 12.5% of 430
    });

    it('should handle iPad dimensions (768×1024)', () => {
      GameConfig.updateDimensions(768, 1024);
      expect(GameConfig.birdX).toBe(96); // 12.5% of 768
    });
  });

  describe('birdSize getter', () => {
    it('should return 30px for 400×600 canvas (reference)', () => {
      expect(GameConfig.birdSize).toBe(30);
    });

    it('should return 45px for 400×900 canvas (1.5x height)', () => {
      GameConfig.updateDimensions(400, 900);
      expect(GameConfig.birdSize).toBe(45);
    });

    it('should return 60px for 800×1200 canvas (2x scale)', () => {
      GameConfig.updateDimensions(800, 1200);
      expect(GameConfig.birdSize).toBe(60);
    });

    it('should scale proportionally to canvas height (5%)', () => {
      GameConfig.updateDimensions(400, 1000);
      expect(GameConfig.birdSize).toBe(50); // 5% of 1000
    });

    it('should handle iPhone SE dimensions (375×667)', () => {
      GameConfig.updateDimensions(375, 667);
      expect(GameConfig.birdSize).toBeCloseTo(33.35, 2); // 5% of 667
    });

    it('should handle iPhone 15 Pro Max dimensions (430×932)', () => {
      GameConfig.updateDimensions(430, 932);
      expect(GameConfig.birdSize).toBeCloseTo(46.6, 2); // 5% of 932
    });

    it('should handle iPad dimensions (768×1024)', () => {
      GameConfig.updateDimensions(768, 1024);
      expect(GameConfig.birdSize).toBeCloseTo(51.2, 2); // 5% of 1024
    });
  });

  describe('pipeWidth getter', () => {
    it('should return 60px for 400×600 canvas (reference)', () => {
      expect(GameConfig.pipeWidth).toBe(60);
    });

    it('should return 120px for 800×1200 canvas (2x scale)', () => {
      GameConfig.updateDimensions(800, 1200);
      expect(GameConfig.pipeWidth).toBe(120);
    });

    it('should scale proportionally to canvas width (15%)', () => {
      GameConfig.updateDimensions(1000, 600);
      expect(GameConfig.pipeWidth).toBe(150); // 15% of 1000
    });

    it('should handle iPhone SE dimensions (375×667)', () => {
      GameConfig.updateDimensions(375, 667);
      expect(GameConfig.pipeWidth).toBeCloseTo(56.25, 2); // 15% of 375
    });

    it('should handle iPhone 15 Pro Max dimensions (430×932)', () => {
      GameConfig.updateDimensions(430, 932);
      expect(GameConfig.pipeWidth).toBeCloseTo(64.5, 2); // 15% of 430
    });
  });

  describe('initialPipeGap getter', () => {
    it('should return 170px for 400×600 canvas (reference)', () => {
      expect(GameConfig.initialPipeGap).toBeCloseTo(169.8, 1); // 28.3% of 600
    });

    it('should return ~340px for 800×1200 canvas (2x scale)', () => {
      GameConfig.updateDimensions(800, 1200);
      expect(GameConfig.initialPipeGap).toBeCloseTo(339.6, 1); // 28.3% of 1200
    });

    it('should scale proportionally to canvas height (28.3%)', () => {
      GameConfig.updateDimensions(400, 1000);
      expect(GameConfig.initialPipeGap).toBeCloseTo(283, 1); // 28.3% of 1000
    });

    it('should handle iPhone SE dimensions (375×667)', () => {
      GameConfig.updateDimensions(375, 667);
      expect(GameConfig.initialPipeGap).toBeCloseTo(188.761, 2); // 28.3% of 667
    });

    it('should handle iPhone 15 Pro Max dimensions (430×932)', () => {
      GameConfig.updateDimensions(430, 932);
      expect(GameConfig.initialPipeGap).toBeCloseTo(263.756, 2); // 28.3% of 932
    });
  });

  describe('minPipeGap getter', () => {
    it('should return 120px for 400×600 canvas (reference)', () => {
      expect(GameConfig.minPipeGap).toBe(120); // 20% of 600
    });

    it('should return 240px for 800×1200 canvas (2x scale)', () => {
      GameConfig.updateDimensions(800, 1200);
      expect(GameConfig.minPipeGap).toBe(240); // 20% of 1200
    });

    it('should scale proportionally to canvas height (20%)', () => {
      GameConfig.updateDimensions(400, 1000);
      expect(GameConfig.minPipeGap).toBe(200); // 20% of 1000
    });
  });

  describe('gravity getter', () => {
    it('should return 0.25 for 400×600 canvas (reference)', () => {
      expect(GameConfig.gravity).toBeCloseTo(0.25, 5);
    });

    it('should return 0.5 for 400×1200 canvas (2x height)', () => {
      GameConfig.updateDimensions(400, 1200);
      expect(GameConfig.gravity).toBeCloseTo(0.5, 5);
    });

    it('should return ~0.125 for 400×300 canvas (0.5x height)', () => {
      GameConfig.updateDimensions(400, 300);
      expect(GameConfig.gravity).toBeCloseTo(0.125, 5);
    });

    it('should scale proportionally with height ratio', () => {
      GameConfig.updateDimensions(800, 900); // 1.5x height
      expect(GameConfig.gravity).toBeCloseTo(0.375, 5); // 0.25 * 1.5
    });

    it('should handle iPhone SE dimensions (375×667)', () => {
      GameConfig.updateDimensions(375, 667);
      const heightRatio = 667 / 600;
      expect(GameConfig.gravity).toBeCloseTo(0.25 * heightRatio, 5);
    });

    it('should handle iPhone 15 Pro Max dimensions (430×932)', () => {
      GameConfig.updateDimensions(430, 932);
      const heightRatio = 932 / 600;
      expect(GameConfig.gravity).toBeCloseTo(0.25 * heightRatio, 5);
    });
  });

  describe('jumpStrength getter', () => {
    it('should return -5 for 400×600 canvas (reference)', () => {
      expect(GameConfig.jumpStrength).toBeCloseTo(-5, 5);
    });

    it('should return -10 for 400×1200 canvas (2x height)', () => {
      GameConfig.updateDimensions(400, 1200);
      expect(GameConfig.jumpStrength).toBeCloseTo(-10, 5);
    });

    it('should return ~-2.5 for 400×300 canvas (0.5x height)', () => {
      GameConfig.updateDimensions(400, 300);
      expect(GameConfig.jumpStrength).toBeCloseTo(-2.5, 5);
    });

    it('should scale proportionally with height ratio', () => {
      GameConfig.updateDimensions(800, 900); // 1.5x height
      expect(GameConfig.jumpStrength).toBeCloseTo(-7.5, 5); // -5 * 1.5
    });

    it('should handle iPhone SE dimensions (375×667)', () => {
      GameConfig.updateDimensions(375, 667);
      const heightRatio = 667 / 600;
      expect(GameConfig.jumpStrength).toBeCloseTo(-5 * heightRatio, 5);
    });

    it('should handle iPhone 15 Pro Max dimensions (430×932)', () => {
      GameConfig.updateDimensions(430, 932);
      const heightRatio = 932 / 600;
      expect(GameConfig.jumpStrength).toBeCloseTo(-5 * heightRatio, 5);
    });
  });

  describe('getScaleFactors', () => {
    it('should return 1.0 scale factors for reference dimensions', () => {
      const factors = GameConfig.getScaleFactors();

      expect(factors.x).toBe(1);
      expect(factors.y).toBe(1);
    });

    it('should return 2.0 scale factors for 800×1200 canvas', () => {
      GameConfig.updateDimensions(800, 1200);
      const factors = GameConfig.getScaleFactors();

      expect(factors.x).toBe(2);
      expect(factors.y).toBe(2);
    });

    it('should return different x and y scale factors for non-proportional resize', () => {
      GameConfig.updateDimensions(800, 900);
      const factors = GameConfig.getScaleFactors();

      expect(factors.x).toBe(2); // 800/400
      expect(factors.y).toBe(1.5); // 900/600
    });
  });

  describe('scaleWidth', () => {
    it('should return same value at reference dimensions', () => {
      expect(GameConfig.scaleWidth(100)).toBe(100);
    });

    it('should double value for 2x width', () => {
      GameConfig.updateDimensions(800, 600);
      expect(GameConfig.scaleWidth(100)).toBe(200);
    });

    it('should scale proportionally to width', () => {
      GameConfig.updateDimensions(1000, 600);
      expect(GameConfig.scaleWidth(100)).toBe(250); // 100 * (1000/400)
    });
  });

  describe('scaleHeight', () => {
    it('should return same value at reference dimensions', () => {
      expect(GameConfig.scaleHeight(100)).toBe(100);
    });

    it('should double value for 2x height', () => {
      GameConfig.updateDimensions(400, 1200);
      expect(GameConfig.scaleHeight(100)).toBe(200);
    });

    it('should scale proportionally to height', () => {
      GameConfig.updateDimensions(400, 900);
      expect(GameConfig.scaleHeight(100)).toBe(150); // 100 * (900/600)
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small viewport (320×480)', () => {
      GameConfig.updateDimensions(320, 480);

      expect(GameConfig.birdX).toBeCloseTo(40, 2); // 12.5% of 320
      expect(GameConfig.birdSize).toBe(24); // 5% of 480
      expect(GameConfig.pipeWidth).toBe(48); // 15% of 320
    });

    it('should handle very large viewport (2560×1440)', () => {
      GameConfig.updateDimensions(2560, 1440);

      expect(GameConfig.birdX).toBe(320); // 12.5% of 2560
      expect(GameConfig.birdSize).toBe(72); // 5% of 1440
      expect(GameConfig.pipeWidth).toBe(384); // 15% of 2560
    });

    it('should handle square viewport (600×600)', () => {
      GameConfig.updateDimensions(600, 600);

      expect(GameConfig.birdX).toBe(75); // 12.5% of 600
      expect(GameConfig.birdSize).toBe(30); // 5% of 600 (same as reference)
      expect(GameConfig.pipeWidth).toBe(90); // 15% of 600
    });

    it('should handle ultra-wide viewport (1920×1080)', () => {
      GameConfig.updateDimensions(1920, 1080);

      expect(GameConfig.birdX).toBe(240); // 12.5% of 1920
      expect(GameConfig.birdSize).toBe(54); // 5% of 1080
      expect(GameConfig.gravity).toBeCloseTo(0.45, 5); // 0.25 * (1080/600)
    });
  });

  describe('Consistency', () => {
    it('should maintain proportions across different viewports', () => {
      const viewports = [
        [375, 667],   // iPhone SE
        [390, 844],   // iPhone 14 Pro
        [430, 932],   // iPhone 15 Pro Max
        [768, 1024],  // iPad
        [1024, 768],  // iPad Landscape
        [1920, 1080]  // Desktop FHD
      ];

      viewports.forEach(([width, height]) => {
        GameConfig.updateDimensions(width, height);

        // Bird X should always be 12.5% of width
        expect(GameConfig.birdX).toBeCloseTo(width * 0.125, 2);

        // Bird size should always be 5% of height
        expect(GameConfig.birdSize).toBeCloseTo(height * 0.05, 2);

        // Pipe width should always be 15% of width
        expect(GameConfig.pipeWidth).toBeCloseTo(width * 0.15, 2);

        // Initial gap should always be 28.3% of height
        expect(GameConfig.initialPipeGap).toBeCloseTo(height * 0.283, 2);
      });
    });

    it('should maintain physics ratio across viewports', () => {
      const viewports = [
        [400, 600],
        [800, 1200],
        [375, 667]
      ];

      viewports.forEach(([width, height]) => {
        GameConfig.updateDimensions(width, height);
        const heightRatio = height / 600;

        // Gravity and jump should scale identically with height
        expect(GameConfig.gravity).toBeCloseTo(0.25 * heightRatio, 5);
        expect(GameConfig.jumpStrength).toBeCloseTo(-5 * heightRatio, 5);
      });
    });
  });
});
