import { bench, describe } from 'vitest';
import { CitySkyline } from '../../public/js/background/CitySkyline.js';

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
  rect: () => {},
  stroke: () => {},
  fillStyle: '',
  strokeStyle: '',
  shadowBlur: 0,
  shadowColor: '',
  globalAlpha: 1,
  lineWidth: 1
};

describe('CitySkyline Performance', () => {
  let city;

  bench('constructor', () => {
    city = new CitySkyline(canvas, ctx);
  });

  bench('update (single frame)', () => {
    city = new CitySkyline(canvas, ctx);
    city.update(3, 180, 1);
  });

  bench('update (100 frames)', () => {
    city = new CitySkyline(canvas, ctx);
    for (let i = 0; i < 100; i++) {
      city.update(3, 180, 1);
    }
  });

  bench('draw (single frame)', () => {
    city = new CitySkyline(canvas, ctx);
    city.draw(ctx, 180, 0);
  });

  bench('draw (100 frames)', () => {
    city = new CitySkyline(canvas, ctx);
    for (let i = 0; i < 100; i++) {
      city.draw(ctx, 180 + i * 0.1, i * 0.016);
    }
  });

  bench('updateColorCache', () => {
    city = new CitySkyline(canvas, ctx);
    city.updateColorCache(180);
  });

  bench('updateColorCache (hue changing)', () => {
    city = new CitySkyline(canvas, ctx);
    for (let i = 0; i < 100; i++) {
      city.updateColorCache(i * 3.6); // Full hue rotation
    }
  });

  bench('drawLayer (foreground)', () => {
    city = new CitySkyline(canvas, ctx);
    city.updateColorCache(180);
    city.drawLayer(ctx, city.foreground, 180, 0, false);
  });

  bench('drawLayer (background)', () => {
    city = new CitySkyline(canvas, ctx);
    city.updateColorCache(180);
    city.drawLayer(ctx, city.background, 180, 0, true);
  });
});
