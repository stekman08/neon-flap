import { bench, describe } from 'vitest';
import { Bird } from '../../public/js/gameplay/Bird.js';

// Mock canvas and context
const canvas = { width: 400, height: 600 };
const ctx = {
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  fill: () => {},
  arc: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  fillRect: () => {},
  stroke: () => {},
  fillStyle: '',
  strokeStyle: '',
  shadowBlur: 0,
  shadowColor: '',
  globalAlpha: 1,
  lineWidth: 1,
  lineCap: '',
  lineJoin: ''
};
const createParticles = () => {};
const gameOver = () => {};

describe('Bird Performance', () => {
  let bird;

  bench('constructor', () => {
    bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
  });

  bench('update (single frame)', () => {
    bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
    bird.update(180, 1, 3);
  });

  bench('update (100 frames)', () => {
    bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
    for (let i = 0; i < 100; i++) {
      bird.y = 300; // Reset to prevent game over
      bird.update(180, 1, 3);
    }
  });

  bench('draw (single frame)', () => {
    bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
    bird.update(180, 1, 3); // Need to update first to populate data
    bird.draw(ctx, 180);
  });

  bench('draw (after 40 updates - full contrail)', () => {
    bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
    for (let i = 0; i < 40; i++) {
      bird.y = 300;
      bird.update(180, 1, 3);
    }
    bird.draw(ctx, 180);
  });

  bench('updateColorCache', () => {
    bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
    bird.updateColorCache(180);
  });

  bench('updateColorCache (no change needed)', () => {
    bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
    bird.updateColorCache(180);
    bird.updateColorCache(181); // Within threshold, should skip
  });

  bench('jump', () => {
    bird = new Bird(canvas, ctx, 0, createParticles, gameOver);
    bird.jump();
  });
});
