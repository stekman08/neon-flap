import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParticleSystem } from '../../../public/js/gameplay/ParticleSystem.js';

describe('ParticleSystem', () => {
  let ctx, particleSystem;

  beforeEach(() => {
    ctx = {
      globalAlpha: 1,
      fillStyle: '',
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn()
    };
    particleSystem = new ParticleSystem(ctx);
  });

  describe('particle creation', () => {
    it('should create jump particles', () => {
      particleSystem.createJumpParticles(100, 200);

      expect(particleSystem.particles.length).toBe(10);
      expect(particleSystem.particles[0].x).toBe(100);
      expect(particleSystem.particles[0].y).toBe(200);
    });

    it('should create explosion particles', () => {
      particleSystem.createExplosion(150, 250);

      expect(particleSystem.particles.length).toBe(50);
      expect(particleSystem.particles[0].x).toBe(150);
      expect(particleSystem.particles[0].y).toBe(250);
    });
  });

  describe('reset', () => {
    it('should clear all particles', () => {
      particleSystem.createJumpParticles(100, 200);
      expect(particleSystem.particles.length).toBe(10);

      particleSystem.reset();

      expect(particleSystem.particles.length).toBe(0);
    });
  });

  describe('particle lifecycle', () => {
    it('should remove dead particles', () => {
      particleSystem.createJumpParticles(100, 200);

      // Set all particles to dead
      particleSystem.particles.forEach(p => p.life = 0);

      particleSystem.update(1);

      expect(particleSystem.particles.length).toBe(0);
    });

    it('should decrease particle life over time', () => {
      particleSystem.createJumpParticles(100, 200);
      const initialLife = particleSystem.particles[0].life;

      particleSystem.update(1);

      expect(particleSystem.particles[0].life).toBeLessThan(initialLife);
    });
  });

  describe('frame rate independence', () => {
    it('should move particles consistently across different frame rates', () => {
      // Test at 60fps
      const ps60 = new ParticleSystem(ctx);
      ps60.createExplosion(200, 200);

      // Store initial state
      const initialParticle60 = { ...ps60.particles[0] };

      // Run 60 frames at 60fps (deltaTime = 1)
      for (let i = 0; i < 60; i++) {
        ps60.update(1);
      }
      const position60fps = ps60.particles.length > 0 ? ps60.particles[0] : null;

      // Test at 120fps
      const ps120 = new ParticleSystem(ctx);
      ps120.createExplosion(200, 200);

      // Ensure same initial state
      ps120.particles[0] = { ...initialParticle60 };

      // Run 120 frames at 120fps (deltaTime = 0.5, same real time)
      for (let i = 0; i < 120; i++) {
        ps120.update(0.5);
      }
      const position120fps = ps120.particles.length > 0 ? ps120.particles[0] : null;

      // If particles still exist, positions should be approximately equal
      if (position60fps && position120fps) {
        expect(Math.abs(position60fps.x - position120fps.x)).toBeLessThan(2);
        expect(Math.abs(position60fps.y - position120fps.y)).toBeLessThan(2);
        expect(Math.abs(position60fps.life - position120fps.life)).toBeLessThan(0.1);
      }

      // Particle counts should be similar (some variance due to random initial velocities)
      expect(Math.abs(ps60.particles.length - ps120.particles.length)).toBeLessThan(5);
    });

    it('should decay particle size consistently regardless of frame rate', () => {
      // At 60fps
      const ps60 = new ParticleSystem(ctx);
      ps60.particles.push({
        x: 100, y: 100, vx: 0, vy: 0,
        life: 1.0, color: '#fff', size: 10
      });
      const initialSize = ps60.particles[0].size;

      // Run 30 frames at 60fps
      for (let i = 0; i < 30; i++) {
        ps60.update(1);
      }
      const size60fps = ps60.particles[0].size;

      // At 120fps
      const ps120 = new ParticleSystem(ctx);
      ps120.particles.push({
        x: 100, y: 100, vx: 0, vy: 0,
        life: 1.0, color: '#fff', size: 10
      });

      // Run 60 frames at 120fps (same real time)
      for (let i = 0; i < 60; i++) {
        ps120.update(0.5);
      }
      const size120fps = ps120.particles[0].size;

      // Sizes should be approximately equal
      expect(Math.abs(size60fps - size120fps)).toBeLessThan(0.5);

      // Both should be smaller than initial
      expect(size60fps).toBeLessThan(initialSize);
      expect(size120fps).toBeLessThan(initialSize);
    });

    it('should update particle life at consistent rate across frame rates', () => {
      // At 60fps
      const ps60 = new ParticleSystem(ctx);
      ps60.particles.push({
        x: 100, y: 100, vx: 0, vy: 0,
        life: 1.0, color: '#fff', size: 5
      });

      // Run 20 frames at 60fps (0.4 life consumed)
      for (let i = 0; i < 20; i++) {
        ps60.update(1);
      }
      const life60fps = ps60.particles[0].life;

      // At 120fps
      const ps120 = new ParticleSystem(ctx);
      ps120.particles.push({
        x: 100, y: 100, vx: 0, vy: 0,
        life: 1.0, color: '#fff', size: 5
      });

      // Run 40 frames at 120fps (same real time)
      for (let i = 0; i < 40; i++) {
        ps120.update(0.5);
      }
      const life120fps = ps120.particles[0].life;

      // Life values should be approximately equal
      expect(Math.abs(life60fps - life120fps)).toBeLessThan(0.05);
    });
  });
});
