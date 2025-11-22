import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ViewportManager } from '../../public/js/config/ViewportManager.js';
import { GameConfig } from '../../public/js/config/GameConfig.js';

describe('ViewportManager', () => {
  let canvas;
  let viewportManager;
  let originalInnerWidth;
  let originalInnerHeight;

  beforeEach(() => {
    // Save original window dimensions
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;

    // Create mock canvas
    canvas = {
      width: 0,
      height: 0
    };

    // Reset GameConfig to reference dimensions
    GameConfig.updateDimensions(400, 600);
  });

  afterEach(() => {
    // Clean up ViewportManager
    if (viewportManager) {
      viewportManager.destroy();
      viewportManager = null;
    }

    // Restore window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight
    });
  });

  describe('Mobile Detection', () => {
    it('should detect mobile when window.innerWidth < 768px', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });

      viewportManager = new ViewportManager(canvas);

      expect(viewportManager.isMobile).toBe(true);
    });

    it('should detect desktop when window.innerWidth >= 768px', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768
      });

      viewportManager = new ViewportManager(canvas);

      expect(viewportManager.isMobile).toBe(false);
    });

    it('should detect desktop when window.innerWidth = 768px (boundary)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024
      });

      viewportManager = new ViewportManager(canvas);

      expect(viewportManager.isMobile).toBe(false);
    });
  });

  describe('Canvas Sizing - Mobile', () => {
    it('should set canvas to fill viewport on mobile (iPhone SE)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });

      viewportManager = new ViewportManager(canvas);

      expect(canvas.width).toBe(375);
      expect(canvas.height).toBe(667);
    });

    it('should set canvas to fill viewport on mobile (iPhone 15 Pro Max)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 430
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 932
      });

      viewportManager = new ViewportManager(canvas);

      expect(canvas.width).toBe(430);
      expect(canvas.height).toBe(932);
    });
  });

  describe('Canvas Sizing - Desktop', () => {
    it('should set canvas to 400×600 on desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768
      });

      viewportManager = new ViewportManager(canvas);

      expect(canvas.width).toBe(400);
      expect(canvas.height).toBe(600);
    });

    it('should set canvas to 400×600 on large desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080
      });

      viewportManager = new ViewportManager(canvas);

      expect(canvas.width).toBe(400);
      expect(canvas.height).toBe(600);
    });
  });

  describe('GameConfig Integration', () => {
    it('should update GameConfig with mobile dimensions', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });

      viewportManager = new ViewportManager(canvas);

      expect(GameConfig.canvasWidth).toBe(375);
      expect(GameConfig.canvasHeight).toBe(667);
    });

    it('should update GameConfig with desktop dimensions', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768
      });

      viewportManager = new ViewportManager(canvas);

      expect(GameConfig.canvasWidth).toBe(400);
      expect(GameConfig.canvasHeight).toBe(600);
    });
  });

  describe('Resize Handling', () => {
    it('should update canvas on window resize (mobile to desktop)', async () => {
      // Start mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });

      viewportManager = new ViewportManager(canvas);
      expect(viewportManager.isMobile).toBe(true);
      expect(canvas.width).toBe(375);

      // Resize to desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768
      });

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));

      // Wait for debounce (250ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(viewportManager.isMobile).toBe(false);
      expect(canvas.width).toBe(400);
      expect(canvas.height).toBe(600);
    });

    it('should update canvas on window resize (desktop to mobile)', async () => {
      // Start desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768
      });

      viewportManager = new ViewportManager(canvas);
      expect(viewportManager.isMobile).toBe(false);
      expect(canvas.width).toBe(400);

      // Resize to mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 430
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 932
      });

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(viewportManager.isMobile).toBe(true);
      expect(canvas.width).toBe(430);
      expect(canvas.height).toBe(932);
    });

    it('should debounce resize events', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });

      const resizeSpy = vi.fn();
      viewportManager = new ViewportManager(canvas);
      viewportManager.onResize = resizeSpy;

      // Trigger multiple resize events quickly
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));

      // Should not be called immediately
      expect(resizeSpy).toHaveBeenCalledTimes(0);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should be called only once after debounce
      expect(resizeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onResize Callback', () => {
    it('should call onResize callback on initialization', () => {
      const onResizeCallback = vi.fn();

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });

      viewportManager = new ViewportManager(canvas);
      viewportManager.onResize = onResizeCallback;

      // Manually trigger resize to test callback
      viewportManager.resizeCanvas();

      expect(onResizeCallback).toHaveBeenCalledTimes(1);
    });

    it('should call onResize callback after window resize', async () => {
      const onResizeCallback = vi.fn();

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });

      viewportManager = new ViewportManager(canvas);
      viewportManager.onResize = onResizeCallback;

      // Clear initial call count
      onResizeCallback.mockClear();

      // Trigger resize
      window.dispatchEvent(new Event('resize'));

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(onResizeCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on destroy', () => {
      viewportManager = new ViewportManager(canvas);
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      viewportManager.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', viewportManager.handleResize);
    });

    it('should clear timeout on destroy', () => {
      viewportManager = new ViewportManager(canvas);

      // Trigger resize to create timeout
      window.dispatchEvent(new Event('resize'));

      const timeoutId = viewportManager.resizeTimeoutId;
      expect(timeoutId).not.toBeNull();

      viewportManager.destroy();

      expect(viewportManager.resizeTimeoutId).toBeNull();
    });
  });
});
