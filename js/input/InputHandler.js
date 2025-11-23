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
            e.preventDefault(); // Prevent scrolling
            this.handleInput();
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
                this.game.audioController.ctx.resume();
            }
        }

        if (this.game.gameState === 'START' || this.game.gameState === 'GAMEOVER') {
            this.game.start();
        } else if (this.game.gameState === 'PLAYING') {
            this.game.bird.jump();
        }
    }
}
