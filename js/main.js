import { GameLoop } from './gameplay/GameLoop.js';
import { InputHandler } from './input/InputHandler.js';
import { ViewportManager } from './config/ViewportManager.js';
import { AudioController } from './audio/AudioController.js';
import { GameConfig } from './config/GameConfig.js';
import { playerIdentity } from './config/PlayerIdentity.js';

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
            updateMusicIcon(true);

            // Show VCR OSD
            const track = audioController.getCurrentTrack();
            if (track && audioController.tracks) {
                const index = audioController.currentTrackIndex + 1;
                const total = audioController.tracks.length;
                musicOsd.innerText = `▶ PLAY ${index}/${total}: ${track.name.toUpperCase()}`;
                musicOsd.classList.add('active');

                setTimeout(() => {
                    musicOsd.classList.remove('active');
                }, 3000);
            }
        }
    }

    game.isAutoPlay = false;
    game.start();
});

// Helper function to update mute button SVG icon
function updateMuteIcon(isMuted) {
    const svg = muteBtn.querySelector('svg');
    if (!svg) return;

    if (isMuted) {
        // Muted icon (speaker with X)
        svg.innerHTML = `
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
            <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        `;
    } else {
        // Unmuted icon (speaker with sound waves)
        svg.innerHTML = `
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="currentColor" stroke-width="2" />
        `;
    }
}

// Mute Button (Controls SFX only now)
// Initialize button state based on default (Unmuted)
muteBtn.classList.add('unmuted');
updateMuteIcon(false);

muteBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent game start if clicking mute
    const isSfxMuted = audioController.toggleMute();
    updateMuteIcon(isSfxMuted);

    if (isSfxMuted) {
        muteBtn.classList.remove('unmuted');
    } else {
        muteBtn.classList.add('unmuted');
    }
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

// Helper function to update music button SVG icon
function updateMusicIcon(isPlaying) {
    const svg = musicToggleBtn.querySelector('svg');
    if (!svg) return;

    if (isPlaying) {
        // Playing icon (pause symbol)
        svg.innerHTML = `
            <rect x="6" y="4" width="4" height="16" fill="currentColor" rx="1" />
            <rect x="14" y="4" width="4" height="16" fill="currentColor" rx="1" />
        `;
    } else {
        // Stopped icon (musical note)
        svg.innerHTML = `
            <path d="M8 18V5l12-2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="5" cy="18" r="3" fill="currentColor" />
            <circle cx="17" cy="16" r="3" fill="currentColor" />
        `;
    }
}

// Music Button
musicToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isPlaying = audioController.toggleMusic();
    updateMusicIcon(isPlaying);

    if (isPlaying) {
        musicToggleBtn.classList.add('playing');

        // Show VCR OSD
        const track = audioController.getCurrentTrack();
        if (track && audioController.tracks) {
            const index = audioController.currentTrackIndex + 1;
            const total = audioController.tracks.length;
            musicOsd.innerText = `▶ PLAY ${index}/${total}: ${track.name.toUpperCase()}`;
            musicOsd.classList.add('active');

            // Hide after 3 seconds
            setTimeout(() => {
                musicOsd.classList.remove('active');
            }, 3000);
        }
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

// Train AI Button - Neuroevolution mode
const trainBtn = document.getElementById('train-btn');
if (trainBtn) {
    // Update button text if trained brain exists
    updateTrainButtonText();

    trainBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await ensureAudioReady();
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

