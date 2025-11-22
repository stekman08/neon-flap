import { GameLoop } from './gameplay/GameLoop.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config/constants.js';

// Get canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Get UI elements
const uiElements = {
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    scoreHud: document.getElementById('score-hud'),
    finalScoreEl: document.getElementById('final-score'),
    bestScoreEl: document.getElementById('best-score')
};

// Get buttons
const startBtn = document.getElementById('start-btn');
const aiBtn = document.getElementById('ai-btn');
const restartBtn = document.getElementById('restart-btn');

// Create game instance
const game = new GameLoop(canvas, ctx, uiElements);

// Jump action
function jumpAction() {
    if (game.gameState === 'START') {
        game.gameState = 'PLAYING';
        uiElements.startScreen.classList.remove('active');
        uiElements.scoreHud.style.display = 'block';
        game.bird.jump();
    } else if (game.gameState === 'PLAYING') {
        game.bird.jump();
    }
}

// Event listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        jumpAction();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling
    jumpAction();
});

canvas.addEventListener('mousedown', () => {
    jumpAction();
});

startBtn.addEventListener('click', () => {
    game.isAutoPlay = false;
    jumpAction();
});

aiBtn.addEventListener('click', () => {
    game.isAutoPlay = true;
    jumpAction();
});

restartBtn.addEventListener('click', () => {
    game.init();
    game.gameState = 'START';
    uiElements.gameOverScreen.classList.remove('active');
    uiElements.startScreen.classList.add('active');
});

// Initialize and start
game.init();
game.loop();

// Expose game instance for E2E testing (only in localhost)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    window.__GAME__ = game;
}
