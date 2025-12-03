import { bench, describe } from 'vitest';
import { Star } from '../../public/js/background/Star.js';

// Mock canvas and context
const canvas = { width: 400, height: 600 };
const ctx = {
  fillRect: () => {},
  fillStyle: '',
  globalAlpha: 1
};

describe('Star Performance', () => {
  let star;

  bench('constructor', () => {
    star = new Star(canvas, ctx);
  });

  bench('update', () => {
    star = new Star(canvas, ctx);
    star.update(3, 1);
  });

  bench('update (100 frames)', () => {
    star = new Star(canvas, ctx);
    for (let i = 0; i < 100; i++) {
      star.update(3, 1);
    }
  });

  bench('draw', () => {
    star = new Star(canvas, ctx);
    star.draw(ctx);
  });

  bench('50 stars update (typical frame)', () => {
    const stars = [];
    for (let i = 0; i < 50; i++) {
      stars.push(new Star(canvas, ctx));
    }
    for (let i = 0; i < 50; i++) {
      stars[i].update(3, 1);
    }
  });

  bench('50 stars draw (typical frame)', () => {
    const stars = [];
    for (let i = 0; i < 50; i++) {
      stars.push(new Star(canvas, ctx));
    }
    for (let i = 0; i < 50; i++) {
      stars[i].draw(ctx);
    }
  });
});
