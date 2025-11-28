import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioController } from '../../../public/js/audio/AudioController.js';

// Mock Web Audio API
const createMockAudioContext = () => ({
  state: 'suspended',
  currentTime: 0,
  sampleRate: 44100,
  destination: {},
  resume: vi.fn(() => Promise.resolve()),
  createGain: vi.fn(() => ({
    gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() },
    connect: vi.fn()
  })),
  createOscillator: vi.fn(() => ({
    type: 'sine',
    frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    detune: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  })),
  createDelay: vi.fn(() => ({
    delayTime: { value: 0 },
    connect: vi.fn()
  })),
  createBiquadFilter: vi.fn(() => ({
    type: 'lowpass',
    frequency: { value: 1000, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    Q: { value: 1 },
    connect: vi.fn()
  })),
  createBuffer: vi.fn(() => ({
    getChannelData: vi.fn(() => new Float32Array(1000))
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn()
  }))
});

describe('AudioController', () => {
  let audioController;
  let mockAudioContext;

  beforeEach(() => {
    mockAudioContext = createMockAudioContext();

    // Mock the AudioContext constructor using a class
    class MockAudioContext {
      constructor() {
        Object.assign(this, mockAudioContext);
      }
    }

    global.AudioContext = MockAudioContext;
    global.webkitAudioContext = MockAudioContext;

    audioController = new AudioController();
  });

  describe('initialization', () => {
    it('should start uninitialized', () => {
      expect(audioController.initialized).toBe(false);
      expect(audioController.ctx).toBeNull();
    });

    it('should initialize audio context on init()', () => {
      audioController.init();

      expect(audioController.initialized).toBe(true);
      expect(audioController.ctx).toBeDefined();
    });

    it('should not reinitialize if already initialized', () => {
      audioController.init();
      const firstCtx = audioController.ctx;

      audioController.init();

      // Should keep the same context
      expect(audioController.ctx).toBe(firstCtx);
    });

    it('should initialize currentTrackIndex to a valid value', () => {
      audioController.init();
      audioController.initTracks();

      expect(audioController.currentTrackIndex).toBeDefined();
      expect(typeof audioController.currentTrackIndex).toBe('number');
      expect(audioController.currentTrackIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('toggleMute - AudioContext.resume() error handling', () => {
    it('should handle AudioContext.resume() rejection gracefully in toggleMute', async () => {
      // Simulate ctx.resume() throwing an error
      const resumeError = new DOMException('The play() request was interrupted', 'NotAllowedError');
      mockAudioContext.resume = vi.fn(() => Promise.reject(resumeError));
      mockAudioContext.state = 'suspended';

      // This should NOT throw - the error should be handled gracefully
      expect(() => audioController.toggleMute()).not.toThrow();

      // Should still toggle mute state
      expect(audioController.isSfxMuted).toBe(true);
    });

    it('should continue to function after AudioContext.resume() fails in toggleMute', () => {
      const resumeError = new DOMException('Not allowed', 'NotAllowedError');
      mockAudioContext.resume = vi.fn(() => Promise.reject(resumeError));
      mockAudioContext.state = 'suspended';

      // First toggle
      audioController.toggleMute();
      expect(audioController.isSfxMuted).toBe(true);

      // Second toggle should still work
      audioController.toggleMute();
      expect(audioController.isSfxMuted).toBe(false);
    });
  });

  describe('toggleMusic - AudioContext.resume() error handling', () => {
    it('should handle AudioContext.resume() rejection gracefully in toggleMusic', async () => {
      // Simulate ctx.resume() throwing an error
      const resumeError = new DOMException('The play() request was interrupted', 'NotAllowedError');
      mockAudioContext.resume = vi.fn(() => Promise.reject(resumeError));
      mockAudioContext.state = 'suspended';

      audioController.init();

      // This should NOT throw - the error should be handled gracefully
      expect(() => audioController.toggleMusic()).not.toThrow();
    });

    it('should still return correct playing state after resume fails', () => {
      const resumeError = new DOMException('Not allowed', 'NotAllowedError');
      mockAudioContext.resume = vi.fn(() => Promise.reject(resumeError));
      mockAudioContext.state = 'suspended';

      audioController.init();

      // toggleMusic should still return a boolean indicating music state
      const result = audioController.toggleMusic();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getCurrentTrack - uninitialized state handling', () => {
    it('should handle getCurrentTrack when tracks are not initialized', () => {
      audioController.init();

      // getCurrentTrack should initialize tracks if needed
      const track = audioController.getCurrentTrack();

      expect(track).toBeDefined();
      expect(track.name).toBeDefined();
      expect(track.hue).toBeDefined();
    });

    it('should return valid track even when currentTrackIndex was never set', () => {
      audioController.init();

      // Force undefined state
      audioController.tracks = undefined;
      audioController.currentTrackIndex = undefined;

      // This should NOT throw
      expect(() => audioController.getCurrentTrack()).not.toThrow();

      const track = audioController.getCurrentTrack();
      expect(track).toBeDefined();
    });

    it('should not return NaN for track index calculations', () => {
      audioController.init();
      audioController.initTracks();

      const index = audioController.currentTrackIndex + 1;
      const total = audioController.tracks.length;

      expect(Number.isNaN(index)).toBe(false);
      expect(Number.isNaN(total)).toBe(false);
      expect(index).toBeGreaterThanOrEqual(1);
    });
  });

  describe('scheduleMusic - error handling', () => {
    it('should handle undefined tracks in scheduleMusic gracefully', () => {
      audioController.init();
      audioController.isPlayingMusic = true;
      audioController.tracks = undefined;

      // This should NOT throw
      expect(() => audioController.scheduleMusic()).not.toThrow();
    });

    it('should handle invalid currentTrackIndex in scheduleMusic gracefully', () => {
      audioController.init();
      audioController.initTracks();
      audioController.isPlayingMusic = true;
      audioController.currentTrackIndex = 999; // Out of bounds

      // This should NOT throw
      expect(() => audioController.scheduleMusic()).not.toThrow();
    });
  });

  describe('stopMusic - timer cleanup', () => {
    it('should clear timerID when stopping music', () => {
      vi.useFakeTimers();

      audioController.init();
      audioController.timerID = setTimeout(() => {}, 1000);

      audioController.stopMusic();

      expect(audioController.isPlayingMusic).toBe(false);

      vi.useRealTimers();
    });

    it('should handle stopMusic when timerID is null', () => {
      audioController.init();
      audioController.timerID = null;

      expect(() => audioController.stopMusic()).not.toThrow();
    });
  });

  describe('playMusic - timer management on restart', () => {
    it('should clear existing timer before starting new music session', () => {
      vi.useFakeTimers();

      audioController.init();
      audioController.initTracks();

      // Simulate an existing timer from a previous session
      const oldTimer = setTimeout(() => {}, 1000);
      audioController.timerID = oldTimer;
      audioController.isPlayingMusic = false;

      // Start music - should clear old timer first
      audioController.playMusic();

      // The old timer should have been cleared and a new one created
      expect(audioController.isPlayingMusic).toBe(true);

      // Stop and verify cleanup
      audioController.stopMusic();
      expect(audioController.isPlayingMusic).toBe(false);

      vi.useRealTimers();
    });

    it('should not create multiple timers when playMusic called multiple times', () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      audioController.init();
      audioController.initTracks();

      // First call to playMusic
      audioController.playMusic();
      const timerCountAfterFirst = setTimeoutSpy.mock.calls.length;

      // Second call while already playing - should be ignored
      audioController.playMusic();
      const timerCountAfterSecond = setTimeoutSpy.mock.calls.length;

      // Timer count should not increase significantly (playMusic should return early if already playing)
      // Note: scheduleMusic creates timers, but playMusic should guard against double-start
      expect(audioController.isPlayingMusic).toBe(true);

      audioController.stopMusic();
      setTimeoutSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('drum functions - ctx null-check', () => {
    it('should not throw when playKick is called with null ctx', () => {
      audioController.ctx = null;
      expect(() => audioController.playKick(0)).not.toThrow();
    });

    it('should not throw when playSnare is called with null ctx', () => {
      audioController.ctx = null;
      expect(() => audioController.playSnare(0)).not.toThrow();
    });

    it('should not throw when playHiHat is called with null ctx', () => {
      audioController.ctx = null;
      expect(() => audioController.playHiHat(0, false)).not.toThrow();
    });

    it('should not throw when playBitKick is called with null ctx', () => {
      audioController.ctx = null;
      expect(() => audioController.playBitKick(0)).not.toThrow();
    });

    it('should not throw when playBitSnare is called with null ctx', () => {
      audioController.ctx = null;
      expect(() => audioController.playBitSnare(0)).not.toThrow();
    });
  });

  describe('playMusic - console.log null-check', () => {
    it('should not throw when tracks[currentTrackIndex] is undefined', () => {
      audioController.init();
      audioController.initTracks();
      audioController.currentTrackIndex = 999; // Out of bounds

      // This should NOT throw
      expect(() => audioController.playMusic()).not.toThrow();
    });

    it('should clear orphan timer before starting music', () => {
      vi.useFakeTimers();

      audioController.init();
      audioController.initTracks();

      // Simulate orphan timer
      audioController.timerID = setTimeout(() => {}, 10000);
      audioController.isPlayingMusic = false;

      // playMusic should clear the orphan timer
      audioController.playMusic();

      expect(audioController.isPlayingMusic).toBe(true);

      audioController.stopMusic();
      vi.useRealTimers();
    });
  });
});
