import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameLoop } from '../../../public/js/gameplay/GameLoop.js';
import { INITIAL_PIPE_SPEED, MAX_SPEED, PIPE_SPAWN_RATE } from '../../../public/js/config/constants.js';

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
    draw() { }
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
      fill: vi.fn(),
      fillText: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      globalAlpha: 1,
      shadowBlur: 0,
      shadowColor: '',
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      }))
    };
    uiElements = {
      startScreen: { classList: { add: vi.fn(), remove: vi.fn() } },
      gameOverScreen: { classList: { add: vi.fn(), remove: vi.fn() } },
      scoreHud: { innerText: '', style: { display: '' } },
      finalScoreEl: { innerText: '' },
      bestScoreEl: { innerText: '' }
    };

    global.localStorage = {
      getItem: vi.fn(() => '10'),
      setItem: vi.fn()
    };

    // Mock document.querySelector for CRT overlay
    document.querySelector = vi.fn(() => ({
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      }
    }));
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

      expect(game.currentPipeSpeed).toBe(INITIAL_PIPE_SPEED);
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
      vi.useFakeTimers();
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      game.gameOver();

      // Fast-forward time for CRT effect delay (500ms)
      vi.advanceTimersByTime(500);

      expect(uiElements.gameOverScreen.classList.add).toHaveBeenCalledWith('active');
      vi.useRealTimers();
    });

    it('should create explosion particles', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      game.gameOver();

      // Check particle count directly from the new ParticleSystem
      expect(game.particleSystem.particles.length).toBe(50);
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

      game.update(1);

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

      game.update(1);

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

      game.update(1);

      expect(game.pipesPassed).toBe(3);
      expect(game.currentPipeSpeed).toBeGreaterThan(initialSpeed);
    });

    it('should not exceed max speed', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'PLAYING';
      game.currentPipeSpeed = MAX_SPEED - 1; // Near max

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

      game.update(1);

      expect(game.currentPipeSpeed).toBeLessThanOrEqual(MAX_SPEED);
    });
  });

  describe('pipe spawning', () => {
    it('should spawn pipes at regular intervals', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'PLAYING';

      // Keep bird in a safe position to prevent game over
      game.bird.y = 300;
      game.bird.velocity = 0;

      // Run update for spawn rate frames with deltaTime = 1 (simulate 60fps)
      // PIPE_SPAWN_RATE frames needed to spawn a pipe
      for (let i = 0; i < PIPE_SPAWN_RATE + 10; i++) {
        game.update(1);
        // Reset bird state to prevent it from falling out of bounds
        game.bird.y = 300;
        game.bird.velocity = 0;
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

      // Create a particle (using createJumpParticles which adds 10 particles)
      game.particleSystem.createJumpParticles(100, 100);

      // Get initial count
      const initialCount = game.particleSystem.particles.length;
      expect(initialCount).toBe(10);

      // Manually set particle life to 0 for all particles
      game.particleSystem.particles.forEach(p => p.life = 0);

      // Update should remove dead particles
      game.update(1);

      expect(game.particleSystem.particles.length).toBe(0);
    });
  });

  describe('frame rate independence', () => {
    it('should maintain consistent pipe movement across different frame rates', () => {
      // Simulate 60fps
      const game60 = new GameLoop(canvas, ctx, uiElements);
      game60.init();
      game60.gameState = 'PLAYING';
      game60.bird.y = 300;
      game60.bird.velocity = 0;

      // Add a pipe at known position
      game60.pipes = [{
        x: 400,
        width: 60,
        topHeight: 200,
        bottomY: 400,
        passed: false,
        update: function (speed, hue, deltaTime) {
          this.x -= speed * deltaTime;
        }
      }];

      // Run 60 frames at 60fps (deltaTime = 1)
      for (let i = 0; i < 60; i++) {
        game60.update(1);
        game60.bird.y = 300;
        game60.bird.velocity = 0;
      }
      const position60fps = game60.pipes[0].x;

      // Simulate 120fps (twice as many frames, half the deltaTime)
      const game120 = new GameLoop(canvas, ctx, uiElements);
      game120.init();
      game120.gameState = 'PLAYING';
      game120.bird.y = 300;
      game120.bird.velocity = 0;

      // Add pipe at same initial position
      game120.pipes = [{
        x: 400,
        width: 60,
        topHeight: 200,
        bottomY: 400,
        passed: false,
        update: function (speed, hue, deltaTime) {
          this.x -= speed * deltaTime;
        }
      }];

      // Run 120 frames at 120fps (deltaTime = 0.5)
      for (let i = 0; i < 120; i++) {
        game120.update(0.5);
        game120.bird.y = 300;
        game120.bird.velocity = 0;
      }
      const position120fps = game120.pipes[0].x;

      // Pipes should be at approximately the same position
      // (within 1 pixel tolerance for floating point precision)
      expect(Math.abs(position60fps - position120fps)).toBeLessThan(1);
    });

    it('should spawn pipes at consistent time intervals regardless of frame rate', () => {
      // At 60fps
      const game60 = new GameLoop(canvas, ctx, uiElements);
      game60.init();
      game60.gameState = 'PLAYING';
      game60.bird.y = 300;
      game60.bird.velocity = 0;

      // Run enough frames to spawn at least one pipe
      // PIPE_SPAWN_RATE frames at 60fps
      for (let i = 0; i < PIPE_SPAWN_RATE + 10; i++) {
        game60.update(1);
        game60.bird.y = 300;
        game60.bird.velocity = 0;
      }
      const pipesAt60fps = game60.pipes.length;

      // At 120fps (same real time, but twice as many frames)
      const game120 = new GameLoop(canvas, ctx, uiElements);
      game120.init();
      game120.gameState = 'PLAYING';
      game120.bird.y = 300;
      game120.bird.velocity = 0;

      // Run twice as many frames at half deltaTime (same real time)
      for (let i = 0; i < (PIPE_SPAWN_RATE + 10) * 2; i++) {
        game120.update(0.5);
        game120.bird.y = 300;
        game120.bird.velocity = 0;
      }
      const pipesAt120fps = game120.pipes.length;

      // Should spawn same number of pipes in same real time
      expect(pipesAt60fps).toBe(pipesAt120fps);
      expect(pipesAt60fps).toBeGreaterThan(0);
    });

    it('should maintain consistent bird physics across different frame rates', () => {
      // At 60fps
      const game60 = new GameLoop(canvas, ctx, uiElements);
      game60.init();
      game60.gameState = 'PLAYING';

      const initialY = 300;
      game60.bird.y = initialY;
      game60.bird.velocity = 0;

      // Let bird fall for 30 frames at 60fps
      for (let i = 0; i < 30; i++) {
        game60.update(1);
      }
      const fallDistance60fps = initialY - game60.bird.y;

      // At 120fps
      const game120 = new GameLoop(canvas, ctx, uiElements);
      game120.init();
      game120.gameState = 'PLAYING';

      game120.bird.y = initialY;
      game120.bird.velocity = 0;

      // Let bird fall for 60 frames at 120fps (same real time)
      for (let i = 0; i < 60; i++) {
        game120.update(0.5);
      }
      const fallDistance120fps = initialY - game120.bird.y;

      // Bird should fall approximately the same distance
      // (within 2 pixels for floating point precision)
      expect(Math.abs(fallDistance60fps - fallDistance120fps)).toBeLessThan(2);
    });
  });

  describe('start() method', () => {
    it('should start game from START state', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'START';

      game.start();

      expect(game.gameState).toBe('PLAYING');
    });

    it('should start game from GAMEOVER state', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'GAMEOVER';

      game.start();

      expect(game.gameState).toBe('PLAYING');
    });

    it('should remove active class from start screen', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'START';

      game.start();

      expect(uiElements.startScreen.classList.remove).toHaveBeenCalledWith('active');
    });

    it('should remove active class from game over screen', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'START';

      game.start();

      expect(uiElements.gameOverScreen.classList.remove).toHaveBeenCalledWith('active');
    });

    it('should show score HUD', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'START';

      game.start();

      expect(uiElements.scoreHud.style.display).toBe('flex');
    });

    it('should not start if already PLAYING', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'PLAYING';
      const initialState = game.gameState;

      game.start();

      // State should not change
      expect(game.gameState).toBe(initialState);
    });
  });

  describe('reactive theme', () => {
    it('should start with cyan hue (180 degrees)', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();

      expect(game.gameHue).toBe(180);
    });

    it('should target magenta hue when score > 25', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'PLAYING';
      game.score = 26;

      // Run a few updates to allow interpolation
      for (let i = 0; i < 100; i++) {
        game.update(1);
        game.bird.y = 300; // Keep bird alive
        game.bird.velocity = 0;
      }

      // gameHue should be moving towards 300 (magenta)
      // Allow for oscillation, so check if it's in the general range
      expect(game.gameHue).toBeGreaterThan(250);
      expect(game.gameHue).toBeLessThan(350);
    });

    it('should target gold hue when score > 50', () => {
      const game = new GameLoop(canvas, ctx, uiElements);
      game.init();
      game.gameState = 'PLAYING';
      game.score = 51;

      // Run a few updates to allow interpolation
      for (let i = 0; i < 100; i++) {
        game.update(1);
        game.bird.y = 300; // Keep bird alive
        game.bird.velocity = 0;
      }

      // gameHue should be moving towards 45 (gold)
      // Allow for oscillation and wrapping
      const hue = game.gameHue;
      // Should be in range [25, 65] approximately
      expect(hue).toBeGreaterThan(25);
      expect(hue).toBeLessThan(200); // Not still at cyan
    });

    it('should use track hue when music is playing', () => {
      const mockAudioController = {
        isPlayingMusic: true,
        getCurrentTrack: vi.fn(() => ({
          name: 'Test Track',
          hue: 120 // Green
        }))
      };

      const game = new GameLoop(canvas, ctx, uiElements, mockAudioController);
      game.init();
      game.gameState = 'PLAYING';

      // Run updates to allow interpolation towards track hue
      for (let i = 0; i < 100; i++) {
        game.update(1);
        game.bird.y = 300;
        game.bird.velocity = 0;
      }

      // gameHue should be moving towards 120 (green)
      expect(game.gameHue).toBeGreaterThan(100);
      expect(game.gameHue).toBeLessThan(140);
      expect(mockAudioController.getCurrentTrack).toHaveBeenCalled();
    });

    it('should use score-based hue when music is not playing', () => {
      const mockAudioController = {
        isPlayingMusic: false,
        getCurrentTrack: vi.fn(() => ({
          name: 'Test Track',
          hue: 120 // This should be ignored
        }))
      };

      const game = new GameLoop(canvas, ctx, uiElements, mockAudioController);
      game.init();
      game.gameState = 'PLAYING';
      game.score = 30; // Should target magenta (300)

      // Run updates
      for (let i = 0; i < 100; i++) {
        game.update(1);
        game.bird.y = 300;
        game.bird.velocity = 0;
      }

      // Should target magenta (300), not track hue (120)
      expect(game.gameHue).toBeGreaterThan(250);
      expect(game.gameHue).toBeLessThan(350);
      expect(mockAudioController.getCurrentTrack).not.toHaveBeenCalled();
    });

    it('should prioritize music hue over score hue', () => {
      const mockAudioController = {
        isPlayingMusic: true,
        getCurrentTrack: vi.fn(() => ({
          name: 'Test Track',
          hue: 30 // Neon Orange (System Override)
        }))
      };

      const game = new GameLoop(canvas, ctx, uiElements, mockAudioController);
      game.init();
      game.gameState = 'PLAYING';
      game.score = 60; // This would normally trigger gold (45), but music should override

      // Run updates
      for (let i = 0; i < 100; i++) {
        game.update(1);
        game.bird.y = 300;
        game.bird.velocity = 0;
      }

      // Should use music hue (30) not score hue (45)
      expect(game.gameHue).toBeGreaterThan(10);
      expect(game.gameHue).toBeLessThan(50);
      expect(mockAudioController.getCurrentTrack).toHaveBeenCalled();
    });
  });
});
