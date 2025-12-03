import { bench, describe } from 'vitest';
import { SynthGrid } from '../../public/js/background/SynthGrid.js';

// Mock canvas and context
const canvas = { width: 400, height: 600 };
const ctx = {
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  rect: () => {},
  clip: () => {},
  createLinearGradient: () => ({
    addColorStop: () => {}
  }),
  strokeStyle: '',
  lineWidth: 1
};

describe('SynthGrid Performance', () => {
  let grid;

  bench('constructor', () => {
    grid = new SynthGrid(canvas, ctx);
  });

  bench('update (single frame)', () => {
    grid = new SynthGrid(canvas, ctx);
    grid.update(3, 180, 1);
  });

  bench('update (100 frames)', () => {
    grid = new SynthGrid(canvas, ctx);
    for (let i = 0; i < 100; i++) {
      grid.update(3, 180, 1);
    }
  });

  bench('draw (single frame)', () => {
    grid = new SynthGrid(canvas, ctx);
    grid.draw(ctx, 180);
  });

  bench('draw (100 frames)', () => {
    grid = new SynthGrid(canvas, ctx);
    for (let i = 0; i < 100; i++) {
      grid.draw(ctx, 180 + i * 0.1);
    }
  });

  bench('draw (hue changing)', () => {
    grid = new SynthGrid(canvas, ctx);
    for (let i = 0; i < 100; i++) {
      grid.draw(ctx, i * 3.6); // Full hue rotation
    }
  });
});
