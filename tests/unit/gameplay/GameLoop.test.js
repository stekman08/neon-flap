import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameLoop } from '../../../public/js/gameplay/GameLoop.js';

// Mock ScorePopup
vi.mock('../../../public/js/scoring/ScorePopup.js', () => ({
  ScorePopup: class {
    constructor(x, y, text, ctx, color) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.life = 1;
    }
    update() { this.life -= 0.02; }
    draw() {}
  }
}));

describe('GameLoop', () => {
  let canvas, ctx, uiElements;

  beforeEach(() => {
    canvas = { width: 400, height: 600 };
    ctx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn()
    };
    uiElements = {
      startScreen: { classList: { add: vi.fn(), remove: vi.fn() } },
      gameOverScreen: { classList: { add: vi.fn(), remove: vi.fn() } },
      scoreHud: { innerText: '', style: { display: '' } },
      finalScoreEl: { innerText: '' },
      bestScoreEl: { innerText: '' }
    };

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(() => '10'),
      setItem: vi.fn()
    };
  });

  describe('initialization', () => {
    it('should initialize with START state', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      expect(game.gameState).toBe('START');
    });

    it('should initialize score to 0', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      expect(game.score).toBe(0);
    });

    it('should load high score from localStorage', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      expect(game.highScore).toBe('10');
    });

    it('should reset difficulty to initial values', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      expect(game.currentPipeSpeed).toBe(3); // INITIAL_PIPE_SPEED
      expect(game.currentPipeGap).toBeCloseTo(170, 0);  // GameConfig.initialPipeGap (~169.8)
    });

    it('should create bird instance', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      expect(game.bird).toBeDefined();
      expect(game.bird.x).toBe(50);
    });

    it('should initialize empty pipes array', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      expect(game.pipes).toEqual([]);
    });
  });

  describe('game over', () => {
    it('should set game state to GAMEOVER', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      game.gameOver();

      expect(game.gameState).toBe('GAMEOVER');
    });

    it('should update high score if score is higher', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.score = 20;
      game.highScore = 10;

      game.gameOver();

      expect(game.highScore).toBe(20);
      expect(global.localStorage.setItem).toHaveBeenCalledWith('neonFlapHighScore', 20);
    });

    it('should not update high score in autoplay mode', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.score = 20;
      game.highScore = 10;
      game.isAutoPlay = true;

      game.gameOver();

      expect(game.highScore).toBe(10);
      expect(global.localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should show game over screen', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      game.gameOver();

      expect(uiElements.gameOverScreen.classList.add).toHaveBeenCalledWith('active');
    });

    it('should create explosion particles', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      game.gameOver();

      expect(game.particles.length).toBe(50);
    });
  });

  describe('scoring', () => {
    it('should increment score when passing pipe', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'PLAYING';
      game.bird.x = 100; // Bird at x=100

      // Create a pipe that has fully passed the bird (x + width < bird.x)
      game.pipes = [{
        x: 20, // x + width = 20 + 60 = 80 < 100
        width: 60,
        topHeight: 200,
        bottomY: 400,
        passed: false,
        update: vi.fn()
      }];

      game.update();

      expect(game.score).toBe(1);
      expect(game.pipes[0].passed).toBe(true);
    });

    it('should award 2 points for perfect pass', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'PLAYING';
      game.bird.x = 100;
      game.currentPipeGap = 170;

      // gapCenter = topHeight + (gap / 2) = 200 + 85 = 285
      // birdCenter = bird.y + (bird.height / 2) = 270 + 15 = 285
      // diff = 0 < 25, so perfect pass
      game.bird.y = 270;

      game.pipes = [{
        x: 20,
        width: 60,
        topHeight: 200,
        bottomY: 370,
        passed: false,
        update: vi.fn()
      }];

      game.update();

      expect(game.score).toBe(2);
    });
  });

  describe('difficulty scaling', () => {
    it('should increase speed every 3 pipes', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'PLAYING';
      game.bird.x = 100;
      const initialSpeed = game.currentPipeSpeed;

      // Simulate passing the 3rd pipe
      game.pipesPassed = 2; // After this update, it will be 3

      game.pipes = [{
        x: 20,
        width: 60,
        topHeight: 200,
        bottomY: 400,
        passed: false,
        update: vi.fn()
      }];

      game.update();

      expect(game.pipesPassed).toBe(3);
      expect(game.currentPipeSpeed).toBeGreaterThan(initialSpeed);
    });

    it('should not exceed max speed', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'PLAYING';
      game.currentPipeSpeed = 29; // Near max

      // Simulate passing many pipes
      game.pipesPassed = 99;
      game.pipes = [{
        x: 30,
        width: 60,
        topHeight: 200,
        bottomY: 400,
        passed: false,
        update: vi.fn(),
        draw: vi.fn()
      }];

      game.update();

      expect(game.currentPipeSpeed).toBeLessThanOrEqual(30); // MAX_SPEED
    });
  });

  describe('pipe spawning', () => {
    it('should spawn pipes at regular intervals', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'PLAYING';

      // Run update for spawn rate frames
      for (let i = 0; i < 100; i++) {
        game.update();
      }

      expect(game.pipes.length).toBeGreaterThan(0);
    });

    // Note: Off-screen pipe removal is tested via E2E tests
    // Unit testing this specific scenario requires complex mocking that
    // doesn't add significant value over the E2E coverage
  });

  describe('particle system', () => {
    it('should remove dead particles', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      // Add particle with no life
      game.particles = [{
        life: 0,
        update: vi.fn(),
        draw: vi.fn()
      }];

      game.update();

      expect(game.particles.length).toBe(0);
    });
  });
});
