/**
 * PlayerIdentity - Handles personalized player experience via URL parameters
 * Usage: ?name=Fredrik to personalize the game experience
 */
export class PlayerIdentity {
    constructor() {
        this.playerName = null;
        this.initialized = false;

        this.init();
    }

    init() {
        const params = new URLSearchParams(window.location.search);
        const name = params.get('name');

        if (name && name.trim().length > 0) {
            // Sanitize name (max 20 chars)
            this.playerName = this.sanitizeName(name.trim().slice(0, 20));
            this.initialized = true;
            // Save to cookie (shared between Safari and PWA on iOS)
            document.cookie = `neonflap_playerName=${encodeURIComponent(this.playerName)}; max-age=31536000; path=/; SameSite=Strict`;
        } else {
            // Read from cookie (works across Safari/PWA on iOS)
            const cookieMatch = document.cookie.match(/neonflap_playerName=([^;]+)/);
            if (cookieMatch) {
                this.playerName = decodeURIComponent(cookieMatch[1]);
                this.initialized = true;
            }
        }
    }

    sanitizeName(name) {
        // Remove any HTML/script tags for safety, keep alphanumeric and common chars
        return name
            .replace(/<[^>]*>/g, '')
            .replace(/[^\w\s\-åäöÅÄÖéèêëÉÈÊËüÜ]/gi, '')
            .trim();
    }

    hasPlayer() {
        return this.initialized && this.playerName !== null;
    }

    getName() {
        return this.playerName;
    }

    getUpperName() {
        return this.playerName ? this.playerName.toUpperCase() : null;
    }

    /**
     * Update the tagline with personalized message
     */
    personalizeTagline() {
        if (!this.hasPlayer()) return;

        const tagline = document.querySelector('.tagline');
        if (!tagline) return;

        tagline.setAttribute('data-original', tagline.textContent);
        tagline.innerHTML = `Welcome back, <span class="tagline-name">${this.playerName}</span>`;
    }

    /**
     * Create personalized game over message
     */
    injectGameOverGreeting() {
        if (!this.hasPlayer()) return;

        const gameOverContent = document.querySelector('.game-over-content');
        if (!gameOverContent) return;

        // Check if already injected
        if (gameOverContent.querySelector('.player-game-over')) return;

        const element = document.createElement('div');
        element.className = 'player-game-over';
        element.innerHTML = `<span class="player-go-text">NICE TRY, ${this.getUpperName()}</span>`;

        // Insert after the GAME OVER title
        const gameOverTitle = gameOverContent.querySelector('h1');
        if (gameOverTitle) {
            gameOverTitle.insertAdjacentElement('afterend', element);
        }
    }
}

// Export singleton instance
export const playerIdentity = new PlayerIdentity();
