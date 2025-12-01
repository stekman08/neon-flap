import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputHandler } from '../../../public/js/input/InputHandler.js';

describe('InputHandler', () => {
  let game, canvas, audioController, inputHandler;

  beforeEach(() => {
    // Mock canvas
    canvas = {
      addEventListener: vi.fn()
    };

    // Create a proper mock that can be modified
    const audioCtx = {
      state: 'suspended',
      resume: vi.fn(() => Promise.resolve())
    };

    // Mock audio controller
    audioController = {
      initialized: false,
      isMuted: false,
      ctx: audioCtx,
      init: vi.fn(() => {
        audioController.initialized = true;
      })
    };

    // Mock bird
    const bird = {
      jump: vi.fn()
    };

    // Mock game
    game = {
      canvas,
      audioController,
      gameState: 'START',
      bird,
      start: vi.fn(() => {
        game.gameState = 'PLAYING';
      })
    };

    // Mock window.addEventListener
    window.addEventListener = vi.fn();
  });

  describe('initialization', () => {
    it('should bind keyboard events', () => {
      inputHandler = new InputHandler(game);

      expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should bind touch events with passive: false', () => {
      inputHandler = new InputHandler(game);

      expect(game.canvas.addEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: false }
      );
    });

    it('should bind mouse events', () => {
      inputHandler = new InputHandler(game);

      expect(game.canvas.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });
  });

  describe('keyboard input', () => {
    it('should handle spacebar press when in START state', () => {
      game.gameState = 'START';
      inputHandler = new InputHandler(game);

      // Get the keydown handler that was registered
      const keydownHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      const event = { code: 'Space', preventDefault: vi.fn() };
      keydownHandler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(game.start).toHaveBeenCalled();
    });

    it('should handle spacebar press when in PLAYING state', () => {
      game.gameState = 'PLAYING';
      inputHandler = new InputHandler(game);

      const keydownHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      const event = { code: 'Space', preventDefault: vi.fn() };
      keydownHandler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(game.bird.jump).toHaveBeenCalled();
    });
  });

  describe('touch input', () => {
    it('should handle touch start', () => {
      inputHandler = new InputHandler(game);
      game.gameState = 'START';

      const touchHandler = game.canvas.addEventListener.mock.calls.find(
        call => call[0] === 'touchstart'
      )[1];

      const event = { preventDefault: vi.fn() };
      touchHandler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(game.start).toHaveBeenCalled();
    });
  });

  describe('mouse input', () => {
    it('should handle mouse down', () => {
      inputHandler = new InputHandler(game);
      game.gameState = 'START';

      const mouseHandler = game.canvas.addEventListener.mock.calls.find(
        call => call[0] === 'mousedown'
      )[1];

      mouseHandler();

      expect(game.start).toHaveBeenCalled();
    });
  });

  describe('training mode exit', () => {
    it('should exit training mode on tap instead of jumping', () => {
      game.isTraining = true;
      game.isAutoPlay = false;
      game.exitTraining = vi.fn();
      inputHandler = new InputHandler(game);

      const touchHandler = game.canvas.addEventListener.mock.calls.find(
        call => call[0] === 'touchstart'
      )[1];

      const event = { preventDefault: vi.fn() };
      touchHandler(event);

      expect(game.exitTraining).toHaveBeenCalled();
      expect(game.start).not.toHaveBeenCalled();
      expect(game.bird.jump).not.toHaveBeenCalled();
    });

    it('should exit AI autoplay mode on tap', () => {
      game.isTraining = false;
      game.isAutoPlay = true;
      game.exitTraining = vi.fn();
      inputHandler = new InputHandler(game);

      const mouseHandler = game.canvas.addEventListener.mock.calls.find(
        call => call[0] === 'mousedown'
      )[1];

      mouseHandler();

      expect(game.exitTraining).toHaveBeenCalled();
      expect(game.start).not.toHaveBeenCalled();
    });

    it('should exit training mode on spacebar press', () => {
      game.isTraining = true;
      game.exitTraining = vi.fn();
      inputHandler = new InputHandler(game);

      const keydownHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      const event = { code: 'Space', preventDefault: vi.fn() };
      keydownHandler(event);

      expect(game.exitTraining).toHaveBeenCalled();
      expect(game.bird.jump).not.toHaveBeenCalled();
    });
  });

  describe('audio initialization', () => {
    it('should initialize audio on first interaction', () => {
      // Reset audioController for this test
      audioController.initialized = false;
      audioController.isMuted = false;
      inputHandler = new InputHandler(game);

      const keydownHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      const event = { code: 'Space', preventDefault: vi.fn() };
      keydownHandler(event);

      expect(audioController.init).toHaveBeenCalled();
    });

    it('should resume suspended audio context', () => {
      // Set up for this test
      audioController.initialized = false;
      audioController.isMuted = false;
      audioController.ctx.state = 'suspended';
      inputHandler = new InputHandler(game);

      const keydownHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      const event = { code: 'Space', preventDefault: vi.fn() };
      keydownHandler(event);

      expect(audioController.ctx.resume).toHaveBeenCalled();
    });

    it('should not initialize audio if already initialized', () => {
      audioController.initialized = true;
      inputHandler = new InputHandler(game);
      audioController.init.mockClear();

      const keydownHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      const event = { code: 'Space', preventDefault: vi.fn() };
      keydownHandler(event);

      expect(audioController.init).not.toHaveBeenCalled();
    });

    it('should handle AudioContext.resume() rejection gracefully', async () => {
      // Simulate AudioContext.resume() throwing an error (e.g., on iOS Safari restrictions)
      const resumeError = new DOMException('The play() request was interrupted', 'NotAllowedError');
      audioController.ctx.resume = vi.fn(() => Promise.reject(resumeError));
      audioController.ctx.state = 'suspended';
      audioController.initialized = false;
      audioController.isMuted = false;

      inputHandler = new InputHandler(game);

      const keydownHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      const event = { code: 'Space', preventDefault: vi.fn() };

      // This should NOT throw - the error should be handled gracefully
      expect(() => keydownHandler(event)).not.toThrow();

      // Game should still start despite audio failure
      expect(game.start).toHaveBeenCalled();
    });

    it('should continue to handle input after AudioContext.resume() fails', async () => {
      // First interaction: resume fails
      const resumeError = new DOMException('Not allowed', 'NotAllowedError');
      audioController.ctx.resume = vi.fn(() => Promise.reject(resumeError));
      audioController.ctx.state = 'suspended';
      audioController.initialized = false;
      audioController.isMuted = false;

      inputHandler = new InputHandler(game);
      game.gameState = 'START';

      const keydownHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      // First input - starts game
      keydownHandler({ code: 'Space', preventDefault: vi.fn() });
      expect(game.start).toHaveBeenCalled();

      // Simulate game state changed to PLAYING
      game.gameState = 'PLAYING';

      // Second input - should still work for jumping
      keydownHandler({ code: 'Space', preventDefault: vi.fn() });
      expect(game.bird.jump).toHaveBeenCalled();
    });
  });
});
