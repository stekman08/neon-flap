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
      resume: vi.fn()
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
  });
});
