import { bench, describe, beforeEach } from 'vitest';
import { GameLoop } from '../../public/js/gameplay/GameLoop.js';

// Mock canvas and context
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
  clearRect: () => {},
  rect: () => {},
  stroke: () => {},
  fillText: () => {},
  measureText: () => ({ width: 100 }),
  createLinearGradient: () => ({
    addColorStop: () => {}
  }),
  fillStyle: '',
  strokeStyle: '',
  shadowBlur: 0,
  shadowColor: '',
  globalAlpha: 1,
  lineWidth: 1,
  lineCap: '',
  lineJoin: '',
  font: '',
  textAlign: '',
  textBaseline: ''
};

const canvas = {
  width: 400,
  height: 600,
  getContext: () => ctx
};

// Mock UI elements
const uiElements = {
  startScreen: { classList: { add: () => {}, remove: () => {} }, style: {} },
  gameOverScreen: { classList: { add: () => {}, remove: () => {} }, style: {} },
  scoreHud: {
    classList: { add: () => {}, remove: () => {} },
    style: {}
  },
  currentScoreEl: { textContent: '' },
  finalScoreEl: { textContent: '' },
  bestScoreEl: { textContent: '' },
  aiStatusEl: { textContent: '', classList: { add: () => {}, remove: () => {} } },
  aiGenerationEl: { textContent: '' },
  aiFitnessEl: { textContent: '' }
};

// Mock audio controller
const audioController = {
  playJump: () => {},
  playCrash: () => {},
  playScore: () => {},
  playDrum: () => {}
};

describe('GameLoop Performance', () => {
  let game;

  bench('constructor', () => {
    game = new GameLoop(canvas, ctx, uiElements, audioController);
  });

  bench('init', () => {
    game = new GameLoop(canvas, ctx, uiElements, audioController);
    game.init();
  });

  bench('update (START state)', () => {
    game = new GameLoop(canvas, ctx, uiElements, audioController);
    game.init();
    game.update(1);
  });

  bench('update (PLAYING state, no pipes)', () => {
    game = new GameLoop(canvas, ctx, uiElements, audioController);
    game.init();
    game.gameState = 'PLAYING';
    game.update(1);
  });

  bench('update (PLAYING state, with pipes)', () => {
    game = new GameLoop(canvas, ctx, uiElements, audioController);
    game.init();
    game.gameState = 'PLAYING';
    // Simulate some pipes
    game.timeSinceLastPipe = 10000; // Force pipe spawn
    for (let i = 0; i < 5; i++) {
      game.update(1);
      game.bird.y = 300; // Prevent game over
    }
    game.update(1);
  });

  bench('draw (START state)', () => {
    game = new GameLoop(canvas, ctx, uiElements, audioController);
    game.init();
    game.draw(0);
  });

  bench('draw (PLAYING state)', () => {
    game = new GameLoop(canvas, ctx, uiElements, audioController);
    game.init();
    game.gameState = 'PLAYING';
    game.draw(0);
  });

  bench('full frame (update + draw)', () => {
    game = new GameLoop(canvas, ctx, uiElements, audioController);
    game.init();
    game.gameState = 'PLAYING';
    game.update(1);
    game.bird.y = 300; // Prevent game over
    game.draw(0);
  });

  bench('100 frames simulation', () => {
    game = new GameLoop(canvas, ctx, uiElements, audioController);
    game.init();
    game.gameState = 'PLAYING';
    for (let i = 0; i < 100; i++) {
      game.update(1);
      game.bird.y = 300; // Prevent game over
      game.draw(i * 0.016);
    }
  });
});
