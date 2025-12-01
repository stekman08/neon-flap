export class InputHandler {
    constructor(game) {
        this.game = game;
        this.bindEvents();
    }

    bindEvents() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent scrolling
                this.handleInput();
            }
        });

        // Touch
        this.game.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling/zooming
            this.handleInput();
        }, { passive: false });

        // Prevent default touch actions on the entire document to stop rubber-banding
        document.addEventListener('touchmove', (e) => {
            if (e.target === this.game.canvas) {
                e.preventDefault();
            }
        }, { passive: false });

        // Mouse
        this.game.canvas.addEventListener('mousedown', (e) => {
            this.handleInput();
        });
    }

    handleInput() {
        // Ensure audio is ready on first interaction
        if (this.game.audioController && !this.game.audioController.initialized) {
            this.game.audioController.init();
            if (!this.game.audioController.isMuted && this.game.audioController.ctx && this.game.audioController.ctx.state === 'suspended') {
                this.game.audioController.ctx.resume().catch(() => {
                    // Audio context resume failed - ignore silently
                });
            }
        }

        // Exit training mode on tap (mobile alternative to Escape key)
        // But allow jumping during Watch AI mode (isAutoPlay) to let player interfere
        if (this.game.isTraining) {
            this.game.exitTraining();
            return;
        }

        if (this.game.gameState === 'START' || this.game.gameState === 'GAMEOVER') {
            this.game.start();
        } else if (this.game.gameState === 'PLAYING') {
            // Trigger jump
            this.game.bird.jump();

            // Haptic feedback (light)
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
        }
    }
}
