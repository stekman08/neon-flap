import { GameConfig } from './GameConfig.js';

/**
 * ViewportManager - Handles responsive canvas sizing for mobile/desktop
 *
 * Responsibilities:
 * - Detect mobile vs desktop viewport (< 768px = mobile)
 * - Resize canvas to fill mobile viewport or keep at 400×600 for desktop
 * - Debounce resize events to prevent excessive recalculations
 * - Update GameConfig with new dimensions
 * - Notify GameLoop via onResize callback
 */
export class ViewportManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isMobile = false;
        this.resizeTimeoutId = null;
        this.DEBOUNCE_DELAY = 250; // ms
        this.MOBILE_BREAKPOINT = 768; // px

        // Optional callback for GameLoop to handle resize
        this.onResize = null;

        // Initial setup
        this.detectMobile();
        this.resizeCanvas();

        // Listen for resize events
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
    }

    /**
     * Detect if current viewport is mobile or desktop
     */
    detectMobile() {
        this.isMobile = window.innerWidth < this.MOBILE_BREAKPOINT;
    }

    /**
     * Resize canvas based on mobile/desktop detection
     */
    resizeCanvas() {
        if (this.isMobile) {
            // Mobile: Fill entire viewport
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        } else {
            // Desktop: Fixed 400×600
            this.canvas.width = 400;
            this.canvas.height = 600;
        }

        // Update GameConfig with new dimensions
        GameConfig.updateDimensions(this.canvas.width, this.canvas.height);

        // Notify GameLoop if callback is set
        if (this.onResize) {
            this.onResize();
        }
    }

    /**
     * Handle window resize events (debounced)
     */
    handleResize() {
        // Clear existing timeout
        if (this.resizeTimeoutId) {
            clearTimeout(this.resizeTimeoutId);
        }

        // Debounce resize to prevent excessive calls
        this.resizeTimeoutId = setTimeout(() => {
            this.detectMobile();
            this.resizeCanvas();
        }, this.DEBOUNCE_DELAY);
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        window.removeEventListener('resize', this.handleResize);
        if (this.resizeTimeoutId) {
            clearTimeout(this.resizeTimeoutId);
            this.resizeTimeoutId = null;
        }
    }
}
