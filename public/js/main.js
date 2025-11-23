import { GameLoop } from './gameplay/GameLoop.js';
import { InputHandler } from './input/InputHandler.js';
import { ViewportManager } from './config/ViewportManager.js';
import { AudioController } from './audio/AudioController.js';

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
const muteIcon = muteBtn.querySelector('.icon');
const aiBtn = document.getElementById('ai-btn');
const restartBtn = document.getElementById('restart-btn');
const installBtn = document.getElementById('install-btn');
const versionInfo = document.getElementById('version-info');

// Helper function to ensure audio context is ready
function ensureAudioReady() {
    audioController.init();
    if (!audioController.isMuted && audioController.ctx && audioController.ctx.state === 'suspended') {
        audioController.ctx.resume();
    }
}

// Start Game Button
startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    ensureAudioReady();
    game.isAutoPlay = false;
    game.start();
});

// Mute Button
muteBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent game start if clicking mute
    const isMuted = audioController.toggleMute();
    muteIcon.textContent = isMuted ? '🔇' : '🔊';

    if (isMuted) {
        muteBtn.classList.remove('unmuted');
    } else {
        muteBtn.classList.add('unmuted');
    }
});

// Music Button
const musicBtn = document.getElementById('music-btn');
musicBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isPlaying = audioController.toggleMusic();

    if (isPlaying) {
        musicBtn.classList.add('playing');
    } else {
        musicBtn.classList.remove('playing');
    }
});

// Jump action (for input handlers)
function jumpAction() {
    if (game.gameState === 'START') {
        ensureAudioReady();
        game.start();
    } else if (game.gameState === 'PLAYING') {
        game.bird.jump();
    }
}


aiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    ensureAudioReady();
    game.isAutoPlay = true;
    game.start();
});

restartBtn.addEventListener('click', () => {
    game.init();
    game.gameState = 'START';
    uiElements.gameOverScreen.classList.remove('active');
    uiElements.startScreen.classList.add('active');
});

// Initialize and start
game.init();
// game.loop() is called when game starts or if we want an attract mode later
// For now, let's start the loop immediately for background animations (attract mode)
game.lastTimestamp = performance.now();
game.loop(game.lastTimestamp);

// Expose game instance for E2E testing (only in localhost)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    window.__GAME__ = game;
}

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('[PWA] Service Worker registered:', registration.scope);
            })
            .catch((error) => {
                console.log('[PWA] Service Worker registration failed:', error);
            });
    });
}

// Display version info
fetch('/version.json')
    .then(response => response.json())
    .then(data => {
        if (versionInfo) {
            versionInfo.innerText = `v${data.version}`;
        }
    })
    .catch(err => console.log('Version info not found'));

// PWA Install Prompt Handling
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Save the event for later use
    deferredPrompt = e;

    // Show the install button
    if (installBtn) {
        installBtn.style.display = 'block';
        console.log('[PWA] Install prompt available');
    }
});

// Handle install button click
if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
            console.log('[PWA] No install prompt available');
            return;
        }

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user's response
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] User response: ${outcome}`);

        // Clear the deferred prompt
        deferredPrompt = null;

        // Hide the install button
        installBtn.style.display = 'none';
    });
}

// Hide install button if app is already installed
window.addEventListener('appinstalled', () => {
    console.log('[PWA] App successfully installed');
    if (installBtn) {
        installBtn.style.display = 'none';
    }
    deferredPrompt = null;
});

// Check if app is running in standalone mode (already installed)
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    console.log('[PWA] Running in standalone mode');
    if (installBtn) {
        installBtn.style.display = 'none';
    }
}

// Load and display version info
if (versionInfo) {
    fetch('/version.json')
        .then(response => response.json())
        .then(data => {
            versionInfo.textContent = data.displayFull;
        })
        .catch(() => {
            // Silently fail if version.json doesn't exist
            versionInfo.textContent = '';
        });
}
