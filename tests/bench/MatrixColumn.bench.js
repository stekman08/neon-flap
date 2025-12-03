import { bench, describe } from 'vitest';
import { MatrixColumn } from '../../public/js/background/MatrixColumn.js';

// Mock canvas and context
const canvas = { width: 400, height: 600 };
const ctx = {
  save: () => {},
  restore: () => {},
  fillText: () => {},
  fillStyle: '',
  font: ''
};

describe('MatrixColumn Performance', () => {
  let column;

  bench('constructor', () => {
    column = new MatrixColumn(100, canvas, ctx);
  });

  bench('update (single frame)', () => {
    column = new MatrixColumn(100, canvas, ctx);
    column.update(180, 1);
  });

  bench('update (100 frames)', () => {
    column = new MatrixColumn(100, canvas, ctx);
    for (let i = 0; i < 100; i++) {
      column.update(180, 1);
    }
  });

  bench('draw (single frame)', () => {
    column = new MatrixColumn(100, canvas, ctx);
    column.draw(ctx, 180);
  });

  bench('draw (100 frames)', () => {
    column = new MatrixColumn(100, canvas, ctx);
    for (let i = 0; i < 100; i++) {
      column.draw(ctx, 180);
    }
  });

  bench('draw (hue changing)', () => {
    column = new MatrixColumn(100, canvas, ctx);
    for (let i = 0; i < 100; i++) {
      column.draw(ctx, i * 3.6); // Full hue rotation
    }
  });

  bench('10 columns draw (100 frames each)', () => {
    const columns = [];
    for (let i = 0; i < 10; i++) {
      columns.push(new MatrixColumn(i * 40, canvas, ctx));
    }
    for (let frame = 0; frame < 100; frame++) {
      for (let i = 0; i < columns.length; i++) {
        columns[i].draw(ctx, 180);
      }
    }
  });
});
