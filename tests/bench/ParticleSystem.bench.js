import { bench, describe } from 'vitest';
import { ParticleSystem } from '../../public/js/gameplay/ParticleSystem.js';

// Mock context
const ctx = {
  save: () => {},
  restore: () => {},
  fill: () => {},
  arc: () => {},
  beginPath: () => {},
  fillStyle: '',
  globalAlpha: 1
};

describe('ParticleSystem Performance', () => {
  let ps;

  bench('constructor', () => {
    ps = new ParticleSystem(ctx);
  });

  bench('createJumpParticles', () => {
    ps = new ParticleSystem(ctx);
    ps.createJumpParticles(200, 300);
  });

  bench('createExplosion', () => {
    ps = new ParticleSystem(ctx);
    ps.createExplosion(200, 300);
  });

  bench('createPipeClearedEffect', () => {
    ps = new ParticleSystem(ctx);
    ps.createPipeClearedEffect(200, 300, 180);
  });

  bench('update (10 particles)', () => {
    ps = new ParticleSystem(ctx);
    ps.createJumpParticles(200, 300);
    ps.update(1);
  });

  bench('update (50 particles)', () => {
    ps = new ParticleSystem(ctx);
    ps.createExplosion(200, 300);
    ps.update(1);
  });

  bench('update (100 particles)', () => {
    ps = new ParticleSystem(ctx);
    ps.createExplosion(200, 300);
    ps.createExplosion(200, 300);
    ps.update(1);
  });

  bench('draw (10 particles)', () => {
    ps = new ParticleSystem(ctx);
    ps.createJumpParticles(200, 300);
    ps.draw();
  });

  bench('draw (50 particles)', () => {
    ps = new ParticleSystem(ctx);
    ps.createExplosion(200, 300);
    ps.draw();
  });

  bench('draw (100 particles)', () => {
    ps = new ParticleSystem(ctx);
    ps.createExplosion(200, 300);
    ps.createExplosion(200, 300);
    ps.draw();
  });

  bench('full lifecycle (create, update 30 frames, draw)', () => {
    ps = new ParticleSystem(ctx);
    ps.createExplosion(200, 300);
    for (let i = 0; i < 30; i++) {
      ps.update(1);
    }
    ps.draw();
  });
});
