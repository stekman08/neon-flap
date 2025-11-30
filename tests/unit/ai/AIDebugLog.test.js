import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIDebugLog } from '../../../public/js/ai/AIDebugLog.js';

describe('AIDebugLog', () => {
  let log;

  beforeEach(() => {
    log = new AIDebugLog(100);
    vi.spyOn(performance, 'now').mockReturnValue(1000);
  });

  describe('initialization', () => {
    it('should initialize with default maxEntries', () => {
      const defaultLog = new AIDebugLog();
      expect(defaultLog.maxEntries).toBe(500);
    });

    it('should initialize with custom maxEntries', () => {
      expect(log.maxEntries).toBe(100);
    });

    it('should start disabled', () => {
      expect(log.enabled).toBe(false);
    });

    it('should initialize with empty entries', () => {
      expect(log.entries).toEqual([]);
    });
  });

  describe('enable/disable', () => {
    it('should enable logging', () => {
      log.enable();
      expect(log.enabled).toBe(true);
    });

    it('should reset state when enabled', () => {
      log.entries = [{ type: 'test' }];
      log.summary.jumps = 5;

      log.enable();

      expect(log.entries).toEqual([]);
      expect(log.summary.jumps).toBe(0);
    });

    it('should disable logging', () => {
      log.enable();
      log.disable();
      expect(log.enabled).toBe(false);
    });
  });

  describe('logFrame', () => {
    it('should not log when disabled', () => {
      const bird = { x: 100, y: 200, velocity: 5 };
      log.logFrame(bird, [], 60);
      expect(log.entries.length).toBe(0);
    });

    it('should log every 10th frame when enabled', () => {
      log.enable();
      const bird = { x: 100, y: 200, velocity: 5 };

      // Log 10 frames
      for (let i = 0; i < 10; i++) {
        log.logFrame(bird, [], 60);
      }

      // Only 1 entry (frame 10)
      expect(log.entries.length).toBe(1);
      expect(log.entries[0].type).toBe('frame');
    });

    it('should include bird and pipe data', () => {
      log.enable();
      const bird = { x: 100, y: 200, velocity: 5.5 };
      const pipes = [{ x: 300, topHeight: 150, bottomY: 350 }];

      // Log 10 frames to trigger an entry
      for (let i = 0; i < 10; i++) {
        log.logFrame(bird, pipes, 60);
      }

      expect(log.entries[0].bird).toEqual({ x: 100, y: 200, vy: 5.5 });
      expect(log.entries[0].fps).toBe(60);
    });
  });

  describe('logAIDecision', () => {
    it('should not log when disabled', () => {
      const bird = { y: 200, velocity: 5 };
      log.logAIDecision(bird, null, null, 'jump', 'test');
      expect(log.entries.length).toBe(0);
    });

    it('should log AI decisions when enabled', () => {
      log.enable();
      const bird = { y: 200, velocity: 5 };
      const pipe = { x: 300, bottomY: 350 };

      log.logAIDecision(bird, pipe, null, 'jump', 'below target');

      expect(log.entries.length).toBe(1);
      expect(log.entries[0].type).toBe('ai');
      expect(log.entries[0].decision).toBe('jump');
      expect(log.entries[0].reason).toBe('below target');
    });

    it('should increment jump count on jump decision', () => {
      log.enable();
      const bird = { y: 200, velocity: 5 };

      log.logAIDecision(bird, null, null, 'jump', 'test');
      log.logAIDecision(bird, null, null, 'jump', 'test');
      log.logAIDecision(bird, null, null, 'wait', 'test');

      expect(log.summary.jumps).toBe(2);
    });
  });

  describe('logJump', () => {
    it('should not log when disabled', () => {
      const bird = { y: 200, velocity: 5 };
      log.logJump(bird, 'ai');
      expect(log.entries.length).toBe(0);
    });

    it('should log jump with source', () => {
      log.enable();
      const bird = { y: 200, velocity: 5 };

      log.logJump(bird, 'ai');

      expect(log.entries[0].type).toBe('jump');
      expect(log.entries[0].source).toBe('ai');
    });
  });

  describe('logPipeSpawn', () => {
    it('should not log when disabled', () => {
      const pipe = { x: 400, topHeight: 150, bottomY: 350 };
      log.logPipeSpawn(pipe);
      expect(log.entries.length).toBe(0);
    });

    it('should log pipe spawn and increment counter', () => {
      log.enable();
      const pipe = { x: 400, topHeight: 150, bottomY: 350 };

      log.logPipeSpawn(pipe);

      expect(log.entries[0].type).toBe('pipe_spawn');
      expect(log.summary.pipesSpawned).toBe(1);
    });
  });

  describe('logPipePassed', () => {
    it('should not log when disabled', () => {
      const pipe = { x: 100, topHeight: 150, bottomY: 350 };
      log.logPipePassed(pipe, 5);
      expect(log.entries.length).toBe(0);
    });

    it('should log pipe passed with score', () => {
      log.enable();
      const pipe = { x: 100, topHeight: 150, bottomY: 350 };

      log.logPipePassed(pipe, 5);

      expect(log.entries[0].type).toBe('pipe_passed');
      expect(log.entries[0].score).toBe(5);
      expect(log.summary.pipesPassed).toBe(1);
    });
  });

  describe('logCollision', () => {
    it('should not log when disabled', () => {
      const bird = { x: 100, y: 200, velocity: 5 };
      log.logCollision('floor', bird);
      expect(log.entries.length).toBe(0);
    });

    it('should log collision with type', () => {
      log.enable();
      const bird = { x: 100, y: 200, velocity: 5 };

      log.logCollision('floor', bird);

      expect(log.entries[0].type).toBe('collision');
      expect(log.entries[0].collisionType).toBe('floor');
      expect(log.summary.gameOverReason).toBe('floor');
    });

    it('should include pipe data when provided', () => {
      log.enable();
      const bird = { x: 100, y: 200, velocity: 5 };
      const pipe = { x: 150, topHeight: 100, bottomY: 300 };

      log.logCollision('pipe_top', bird, pipe);

      expect(log.entries[0].pipe).toBeDefined();
      expect(log.entries[0].pipe.x).toBe(150);
    });
  });

  describe('logGameStart', () => {
    it('should not log when disabled', () => {
      const bird = { x: 100, y: 200 };
      log.logGameStart(bird);
      expect(log.entries.length).toBe(0);
    });

    it('should log game start', () => {
      log.enable();
      const bird = { x: 100, y: 200 };

      log.logGameStart(bird);

      expect(log.entries[0].type).toBe('game_start');
      expect(log.entries[0].bird).toEqual({ x: 100, y: 200 });
    });
  });

  describe('logGameOver', () => {
    it('should not log when disabled', () => {
      log.logGameOver(10, 'floor');
      expect(log.entries.length).toBe(0);
    });

    it('should log game over with score and reason', () => {
      log.enable();

      log.logGameOver(10, 'floor');

      expect(log.entries[0].type).toBe('game_over');
      expect(log.entries[0].score).toBe(10);
      expect(log.entries[0].reason).toBe('floor');
      expect(log.summary.gameOverReason).toBe('floor');
    });
  });

  describe('getLog', () => {
    it('should return copy of summary and entries', () => {
      log.enable();
      log.summary.jumps = 5;
      log.entries.push({ type: 'test' });

      const result = log.getLog();

      expect(result.summary.jumps).toBe(5);
      expect(result.entries.length).toBe(1);

      // Verify it's a copy
      result.summary.jumps = 10;
      expect(log.summary.jumps).toBe(5);
    });
  });

  describe('getFormattedLog', () => {
    it('should format log as readable string', () => {
      log.enable();
      const bird = { x: 100, y: 200 };
      log.logGameStart(bird);

      const output = log.getFormattedLog();

      expect(output).toContain('=== AI DEBUG LOG ===');
      expect(output).toContain('game_start');
      expect(output).toContain('bird at (100, 200)');
    });

    it('should format different event types', () => {
      log.enable();
      vi.spyOn(performance, 'now').mockReturnValue(1100); // 100ms after start

      log.logGameStart({ x: 100, y: 200 });
      log.logAIDecision({ y: 200, velocity: 5 }, { x: 300, bottomY: 350 }, null, 'jump', 'test reason');
      log.logJump({ y: 200, velocity: 5 }, 'ai');
      log.logPipeSpawn({ x: 400, topHeight: 150, bottomY: 350 });
      log.logPipePassed({ x: 100 }, 5);
      log.logCollision('floor', { x: 100, y: 500, velocity: 10 });
      log.logGameOver(5, 'floor');

      const output = log.getFormattedLog();

      expect(output).toContain('game_start');
      expect(output).toContain('jump - test reason');
      expect(output).toContain('ai | bird y=200');
      expect(output).toContain('pipe_spawn');
      expect(output).toContain('pipe_passed');
      expect(output).toContain('collision');
      expect(output).toContain('game_over');
    });

    it('should format frame entries', () => {
      log.enable();

      // Log 10 frames to get an entry
      for (let i = 0; i < 10; i++) {
        log.logFrame({ x: 100, y: 200, velocity: 5 }, [], 60);
      }

      const output = log.getFormattedLog();
      expect(output).toContain('frame');
      expect(output).toContain('fps=60');
    });
  });

  describe('entry limit', () => {
    it('should limit entries to maxEntries', () => {
      log = new AIDebugLog(5);
      log.enable();

      for (let i = 0; i < 10; i++) {
        log.logGameStart({ x: i, y: i });
      }

      expect(log.entries.length).toBe(5);
      // Should keep the most recent entries
      expect(log.entries[0].bird.x).toBe(5);
    });
  });
});
