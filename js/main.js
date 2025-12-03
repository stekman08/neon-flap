import { GameLoop } from './gameplay/GameLoop.js';
import { InputHandler } from './input/InputHandler.js';
import { ViewportManager } from './config/ViewportManager.js';
import { AudioController } from './audio/AudioController.js';
import { GameConfig } from './config/GameConfig.js';
import { playerIdentity } from './config/PlayerIdentity.js';
import { PWAManager } from './pwa/PWAManager.js';
import { AudioUIManager } from './ui/AudioUIManager.js';

// Initialize Core Systems
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency in background

// UI Elements
const uiElements = {
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    scoreHud: document.getElementById('score-hud'),
    finalScoreEl: document.getElementById('final-score'),
    bestScoreEl: document.getElementById('best-score')
};

// Audio System
const audioController = new AudioController();

// Game Loop
const game = new GameLoop(canvas, ctx, uiElements, audioController);
game.init();

// Input Handling
const inputHandler = new InputHandler(game);

// Viewport Management
const viewportManager = new ViewportManager(canvas, game);
viewportManager.onResize = () => {
    // Update all game entities when viewport changes
    if (game.handleResize) {
        game.handleResize();
    }
};

// Get buttons
const startBtn = document.getElementById('start-btn');
const muteBtn = document.getElementById('mute-btn');
const turtleModeBtn = document.getElementById('turtle-mode-btn');
const turtleModeIndicator = document.getElementById('turtle-mode-indicator');
const musicToggleBtn = document.getElementById('music-btn');
const musicOsd = document.getElementById('music-osd');
const aiBtn = document.getElementById('ai-btn');
const restartBtn = document.getElementById('restart-btn');
const installBtn = document.getElementById('install-btn');
const versionInfo = document.getElementById('version-info');

// Audio UI Manager
const audioUIManager = new AudioUIManager(audioController, muteBtn, musicToggleBtn, musicOsd);
audioUIManager.init();

// PWA Manager
const pwaManager = new PWAManager(installBtn);
pwaManager.init();

// Start Game Button
startBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await audioUIManager.ensureAudioReady();
    audioUIManager.autoStartMusic();
    game.isAutoPlay = false;
    game.start();
});

// Turtle Mode Button - Load from localStorage
let savedTurtleMode = false;
try {
    savedTurtleMode = localStorage.getItem('neonFlapTurtleMode') === 'true';
} catch (e) {
    // localStorage may be unavailable in private/incognito mode
}
GameConfig.toggleTurtleMode(savedTurtleMode);
if (savedTurtleMode) {
    turtleModeBtn.classList.add('active');
    turtleModeIndicator.style.display = 'block';
}

turtleModeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isTurtleMode = !GameConfig.isTurtleMode;
    GameConfig.toggleTurtleMode(isTurtleMode);
    try {
        localStorage.setItem('neonFlapTurtleMode', isTurtleMode);
    } catch (e) {
        // localStorage may be unavailable or quota exceeded
    }

    if (isTurtleMode) {
        turtleModeBtn.classList.add('active');
        turtleModeIndicator.style.display = 'block';
    } else {
        turtleModeBtn.classList.remove('active');
        turtleModeIndicator.style.display = 'none';
    }

    if (game.gameState === 'START') {
        game.init();
    }
});

// AI Button
aiBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await audioUIManager.ensureAudioReady();
    game.isAutoPlay = true;
    game.start();
});

// Train AI Button - Neuroevolution mode
const trainBtn = document.getElementById('train-btn');
if (trainBtn) {
    updateTrainButtonText();

    trainBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await audioUIManager.ensureAudioReady();
        game.startTraining();
    });
}

// Update Train AI button to show best score
function updateTrainButtonText() {
    if (!trainBtn) return;
    const btnText = trainBtn.querySelector('.btn-text');
    if (!btnText) return;

    try {
        const data = localStorage.getItem('neonFlapTrainedBrain');
        if (data) {
            const parsed = JSON.parse(data);
            if (parsed.score > 0) {
                btnText.textContent = `TRAIN AI (BEST: ${parsed.score})`;
                return;
            }
        }
    } catch (e) {
        // Ignore errors
    }
    btnText.textContent = 'TRAIN AI';
}

// Escape key to exit training/AI mode
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (game.isTraining || game.isAutoPlay)) {
        game.exitTraining();
        updateTrainButtonText();
    }
});

restartBtn.addEventListener('click', () => {
    // Hide AI stats if training mode was active
    const aiStats = document.getElementById('ai-stats');
    if (aiStats) aiStats.classList.remove('active');
    game.isTraining = false;

    game.init();
    game.gameState = 'START';
    uiElements.gameOverScreen.classList.remove('active');
    uiElements.startScreen.classList.add('active');
});

// Initialize and start
game.init();

// Initialize player identity (personalized greeting via ?name=)
if (playerIdentity.hasPlayer()) {
    playerIdentity.personalizeTagline();
    playerIdentity.injectGameOverGreeting();
}

// game.loop() is called when game starts or if we want an attract mode later
// For now, let's start the loop immediately for background animations (attract mode)
game.lastTimestamp = performance.now();
game.loop(game.lastTimestamp);

// Expose game instance for E2E testing (only in localhost)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    window.__GAME__ = game;
    window.__GAME__.audioController = audioController;
}

// Load and display version info
if (versionInfo) {
    fetch('./version.json')
        .then(response => response.json())
        .then(data => {
            // Try displayFull first, fallback to version, then empty
            versionInfo.textContent = data.displayFull || (data.version ? `v${data.version}` : '');
        })
        .catch(() => {
            // Silently fail if version.json doesn't exist
            versionInfo.textContent = '';
            console.log('[Version] version.json not found or failed to load');
        });
}

