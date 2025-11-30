import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PerformanceMonitor } from '../../../public/js/debug/PerformanceMonitor.js';

describe('PerformanceMonitor', () => {
  let monitor;
  let originalLocation;

  beforeEach(() => {
    // Mock performance.now
    vi.spyOn(performance, 'now').mockReturnValue(0);

    // Mock window.location for checkDebugMode
    originalLocation = window.location;
    delete window.location;
    window.location = {
      hostname: 'localhost',
      search: ''
    };

    // Create fresh monitor
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    // Restore window.location
    window.location = originalLocation;

    // Clean up DOM
    const container = document.getElementById('performance-monitor');
    if (container) {
      container.remove();
    }
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(monitor.fps).toBe(0);
      expect(monitor.frameCount).toBe(0);
      expect(monitor.updateTime).toBe(0);
      expect(monitor.drawTime).toBe(0);
    });

    it('should enable on localhost', () => {
      expect(monitor.enabled).toBe(true);
    });

    it('should enable with ?debug param', () => {
      window.location = {
        hostname: 'production.com',
        search: '?debug=true'
      };

      const prodMonitor = new PerformanceMonitor();
      expect(prodMonitor.enabled).toBe(true);
    });

    it('should disable on production without debug param', () => {
      window.location = {
        hostname: 'production.com',
        search: ''
      };

      const prodMonitor = new PerformanceMonitor();
      expect(prodMonitor.enabled).toBe(false);
    });

    it('should enable on 127.0.0.1', () => {
      window.location = {
        hostname: '127.0.0.1',
        search: ''
      };

      const localMonitor = new PerformanceMonitor();
      expect(localMonitor.enabled).toBe(true);
    });
  });

  describe('createUI', () => {
    it('should create performance monitor container', () => {
      expect(monitor.container).toBeDefined();
      expect(monitor.container.id).toBe('performance-monitor');
    });

    it('should append container to document body', () => {
      const container = document.getElementById('performance-monitor');
      expect(container).toBeDefined();
    });
  });

  describe('startFrame/endFrame', () => {
    it('should track frame timing when enabled', () => {
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)    // startFrame
        .mockReturnValueOnce(16);  // endFrame

      monitor.startFrame();
      monitor.endFrame();

      expect(monitor.frameTimes.length).toBe(1);
      expect(monitor.frameTimes[0]).toBe(16);
    });

    it('should not track when disabled', () => {
      monitor.enabled = false;

      monitor.startFrame();
      monitor.endFrame();

      expect(monitor.frameTimes.length).toBe(0);
    });

    it('should increment frame count', () => {
      monitor.startFrame();
      monitor.endFrame();

      expect(monitor.frameCount).toBe(1);
    });

    it('should limit frame history to maxFrameHistory', () => {
      for (let i = 0; i < 100; i++) {
        vi.spyOn(performance, 'now').mockReturnValue(i * 16);
        monitor.startFrame();
        monitor.endFrame();
      }

      expect(monitor.frameTimes.length).toBeLessThanOrEqual(monitor.maxFrameHistory);
    });

    it('should update FPS after 1 second', () => {
      // Initial frame
      vi.spyOn(performance, 'now').mockReturnValue(0);
      monitor.startFrame();
      monitor.endFrame();

      // Simulate more frames
      for (let i = 1; i <= 60; i++) {
        vi.spyOn(performance, 'now').mockReturnValue(i * 16);
        monitor.startFrame();
        vi.spyOn(performance, 'now').mockReturnValue(i * 16 + 10);
        monitor.endFrame();
      }

      // After 1 second (1000ms)
      vi.spyOn(performance, 'now').mockReturnValue(1001);
      monitor.startFrame();
      vi.spyOn(performance, 'now').mockReturnValue(1010);
      monitor.endFrame();

      expect(monitor.fps).toBeGreaterThan(0);
    });
  });

  describe('markUpdateStart/End', () => {
    it('should track update time when enabled', () => {
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(100)   // markUpdateStart
        .mockReturnValueOnce(105);  // markUpdateEnd

      monitor.markUpdateStart();
      monitor.markUpdateEnd();

      expect(monitor.updateTime).toBe(5);
    });

    it('should not track when disabled', () => {
      monitor.enabled = false;
      monitor.updateTime = 0;

      monitor.markUpdateStart();
      monitor.markUpdateEnd();

      expect(monitor.updateTime).toBe(0);
    });
  });

  describe('markDrawStart/End', () => {
    it('should track draw time when enabled', () => {
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(200)   // markDrawStart
        .mockReturnValueOnce(208);  // markDrawEnd

      monitor.markDrawStart();
      monitor.markDrawEnd();

      expect(monitor.drawTime).toBe(8);
    });

    it('should not track when disabled', () => {
      monitor.enabled = false;
      monitor.drawTime = 0;

      monitor.markDrawStart();
      monitor.markDrawEnd();

      expect(monitor.drawTime).toBe(0);
    });
  });

  describe('setPoolStats', () => {
    it('should store pool statistics', () => {
      const stats = { active: 10, pooled: 90, total: 100 };
      monitor.setPoolStats(stats);

      expect(monitor.poolStats).toEqual(stats);
    });
  });

  describe('updateUI', () => {
    it('should update container innerHTML', () => {
      monitor.fps = 60;
      monitor.frameTime = 16.5;
      monitor.updateTime = 5;
      monitor.drawTime = 8;

      monitor.updateUI();

      expect(monitor.container.innerHTML).toContain('FPS: 60');
      expect(monitor.container.innerHTML).toContain('16.50ms');
    });

    it('should show green color for good FPS', () => {
      monitor.fps = 60;
      monitor.updateUI();

      expect(monitor.container.innerHTML).toContain('#0f0');
    });

    it('should show yellow color for medium FPS', () => {
      monitor.fps = 45;
      monitor.updateUI();

      expect(monitor.container.innerHTML).toContain('#ff0');
    });

    it('should show red color for low FPS', () => {
      monitor.fps = 25;
      monitor.updateUI();

      expect(monitor.container.innerHTML).toContain('#f00');
    });

    it('should show pool stats when available', () => {
      monitor.fps = 60;
      monitor.setPoolStats({ active: 10, pooled: 90, total: 100 });
      monitor.updateUI();

      expect(monitor.container.innerHTML).toContain('Particles: 10/100');
      expect(monitor.container.innerHTML).toContain('Pool: 90 cached');
    });

    it('should handle missing container gracefully', () => {
      monitor.container = null;

      expect(() => monitor.updateUI()).not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      monitor.fps = 55;
      monitor.frameTime = 18;
      monitor.updateTime = 6;
      monitor.drawTime = 9;

      const metrics = monitor.getMetrics();

      expect(metrics.fps).toBe(55);
      expect(metrics.frameTime).toBe(18);
      expect(metrics.updateTime).toBe(6);
      expect(metrics.drawTime).toBe(9);
    });

    it('should detect low performance', () => {
      monitor.fps = 45;
      expect(monitor.getMetrics().isLowPerformance).toBe(true);

      monitor.fps = 60;
      expect(monitor.getMetrics().isLowPerformance).toBe(false);
    });
  });
});
