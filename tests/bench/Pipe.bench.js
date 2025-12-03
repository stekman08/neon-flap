import { bench, describe } from 'vitest';
import { Pipe } from '../../public/js/gameplay/Pipe.js';

// Mock canvas and context
const canvas = { width: 400, height: 600 };
const ctx = {
  save: () => {},
  restore: () => {},
  fill: () => {},
  beginPath: () => {},
  fillRect: () => {},
  fillStyle: '',
  shadowBlur: 0,
  shadowColor: ''
};

// Mock bird for proximity calculations
const bird = {
  x: 50,
  y: 300,
  width: 30,
  height: 30
};

describe('Pipe Performance', () => {
  let pipe;
  let updateGapCenter = () => {};

  bench('constructor', () => {
    pipe = new Pipe(canvas, ctx, 150, 100, 300, 180, updateGapCenter);
  });

  bench('update', () => {
    pipe = new Pipe(canvas, ctx, 150, 100, 300, 180, updateGapCenter);
    pipe.update(3, 180, 1);
  });

  bench('update (100 frames)', () => {
    pipe = new Pipe(canvas, ctx, 150, 100, 300, 180, updateGapCenter);
    for (let i = 0; i < 100; i++) {
      pipe.update(3, 180 + i * 0.1, 1);
    }
  });

  bench('draw (bird far away)', () => {
    pipe = new Pipe(canvas, ctx, 150, 100, 300, 180, updateGapCenter);
    bird.x = 50;
    pipe.draw(ctx, 180, bird);
  });

  bench('draw (bird nearby - proximity glow)', () => {
    pipe = new Pipe(canvas, ctx, 150, 100, 300, 180, updateGapCenter);
    pipe.x = 80; // Put pipe close to bird
    bird.x = 50;
    pipe.draw(ctx, 180, bird);
  });

  bench('draw (no bird)', () => {
    pipe = new Pipe(canvas, ctx, 150, 100, 300, 180, updateGapCenter);
    pipe.draw(ctx, 180, null);
  });

  bench('updateColorCache', () => {
    pipe = new Pipe(canvas, ctx, 150, 100, 300, 180, updateGapCenter);
    pipe.updateColorCache(180, 50);
  });

  bench('updateColorCache (brightness changing)', () => {
    pipe = new Pipe(canvas, ctx, 150, 100, 300, 180, updateGapCenter);
    for (let i = 0; i < 100; i++) {
      pipe.updateColorCache(180, 50 + (i % 30)); // Varying brightness
    }
  });
});
