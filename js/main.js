import { GameLoop } from './gameplay/GameLoop.js';
import { InputHandler } from './input/InputHandler.js';
import { ViewportManager } from './config/ViewportManager.js';
import { AudioController } from './audio/AudioController.js';
import { GameConfig } from './config/GameConfig.js';

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
const babyModeBtn = document.getElementById('baby-mode-btn');
const babyModeIndicator = document.getElementById('baby-mode-indicator');
const aiBtn = document.getElementById('ai-btn');
const restartBtn = document.getElementById('restart-btn');
const installBtn = document.getElementById('install-btn');
const versionInfo = document.getElementById('version-info');

// Helper function to ensure audio context is ready
async function ensureAudioReady() {
    audioController.init();
    if (audioController.ctx && audioController.ctx.state === 'suspended') {
        try {
            await audioController.ctx.resume();
            console.log('[Audio] Context resumed, state:', audioController.ctx.state);
        } catch (e) {
            console.error('[Audio] Failed to resume context:', e);
        }
    }
}

// iOS PWA Fix: Resume audio on ANY user interaction (especially important in standalone mode)
document.addEventListener('touchstart', ensureAudioReady, { once: true, passive: true });
document.addEventListener('click', ensureAudioReady, { once: true, passive: true });

// Start Game Button
startBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await ensureAudioReady();

    // Auto-start music when game starts (only if user hasn't made a choice and SFX not muted)
    if (!audioController.isPlayingMusic && !audioController.userHasInteractedWithMusic && !audioController.isSfxMuted) {
        const isPlaying = audioController.toggleMusic(true); // Enable fade-in
        if (isPlaying) {
            musicToggleBtn.classList.add('playing');

            // Show VCR OSD
            const track = audioController.getCurrentTrack();
            const index = audioController.currentTrackIndex + 1;
            const total = audioController.tracks.length;
            musicOsd.innerText = `▶ PLAY ${index}/${total}: ${track.name.toUpperCase()}`;
            musicOsd.classList.add('active');

            setTimeout(() => {
                musicOsd.classList.remove('active');
            }, 3000);
        }
    }

    game.isAutoPlay = false;
    game.start();
});

// Mute Button (Controls SFX only now)
// Initialize button state based on default (Unmuted)
muteBtn.classList.add('unmuted');
muteIcon.textContent = '🔊';

muteBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent game start if clicking mute
    const isSfxMuted = audioController.toggleMute();
    muteIcon.textContent = isSfxMuted ? '🔇' : '🔊';

    if (isSfxMuted) {
        muteBtn.classList.remove('unmuted');
    } else {
        muteBtn.classList.add('unmuted');
    }
});

// Baby Mode Button - Load from localStorage
const savedBabyMode = localStorage.getItem('neonFlapBabyMode') === 'true';
GameConfig.toggleBabyMode(savedBabyMode);
if (savedBabyMode) {
    babyModeBtn.classList.add('active');
    babyModeIndicator.style.display = 'block';
}

babyModeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isBabyMode = !GameConfig.isBabyMode;
    GameConfig.toggleBabyMode(isBabyMode);
    localStorage.setItem('neonFlapBabyMode', isBabyMode);

    if (isBabyMode) {
        babyModeBtn.classList.add('active');
        babyModeIndicator.style.display = 'block';
    } else {
        babyModeBtn.classList.remove('active');
        babyModeIndicator.style.display = 'none';
    }

    if (game.gameState === 'START') {
        game.init();
    }
});

// Music Button
const musicOsd = document.getElementById('music-osd');
const musicToggleBtn = document.getElementById('music-btn');

musicToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isPlaying = audioController.toggleMusic();

    if (isPlaying) {
        musicToggleBtn.classList.add('playing');

        // Show VCR OSD
        const track = audioController.getCurrentTrack();
        const index = audioController.currentTrackIndex + 1;
        const total = audioController.tracks.length;
        musicOsd.innerText = `▶ PLAY ${index}/${total}: ${track.name.toUpperCase()}`;
        musicOsd.classList.add('active');

        // Hide after 3 seconds
        setTimeout(() => {
            musicOsd.classList.remove('active');
        }, 3000);

    } else {
        musicToggleBtn.classList.remove('playing');

        // Show Stop OSD
        musicOsd.innerText = `■ STOP`;
        musicOsd.classList.add('active');
        setTimeout(() => {
            musicOsd.classList.remove('active');
        }, 1500);
    }
});

// Jump action (for input handlers)
async function jumpAction() {
    if (game.gameState === 'START') {
        await ensureAudioReady();
        game.start();
    } else if (game.gameState === 'PLAYING') {
        game.bird.jump();
    }
}


aiBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await ensureAudioReady();
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
    window.__GAME__.audioController = audioController;
}

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('[PWA] Service Worker registered:', registration.scope);
            })
            .catch((error) => {
                console.log('[PWA] Service Worker registration failed:', error);
            });
    });
}

// Display version info (removed duplicate, see bottom of file)

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

