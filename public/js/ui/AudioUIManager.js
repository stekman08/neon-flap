/**
 * Audio UI manager - handles audio buttons, icons, and on-screen display
 */
export class AudioUIManager {
    constructor(audioController, muteBtn, musicToggleBtn, musicOsd) {
        this.audioController = audioController;
        this.muteBtn = muteBtn;
        this.musicToggleBtn = musicToggleBtn;
        this.musicOsd = musicOsd;
    }

    /**
     * Initialize audio UI
     */
    init() {
        this.setupIOSAudioFix();
        this.setupMuteButton();
        this.setupMusicButton();
    }

    /**
     * Ensure audio context is ready (resume if suspended)
     */
    async ensureAudioReady() {
        this.audioController.init();
        if (this.audioController.ctx && this.audioController.ctx.state === 'suspended') {
            try {
                await this.audioController.ctx.resume();
                console.log('[Audio] Context resumed, state:', this.audioController.ctx.state);
            } catch (e) {
                console.error('[Audio] Failed to resume context:', e);
            }
        }
    }

    /**
     * iOS PWA Fix: Resume audio on ANY user interaction
     */
    setupIOSAudioFix() {
        const handler = () => this.ensureAudioReady();
        document.addEventListener('touchstart', handler, { once: true, passive: true });
        document.addEventListener('click', handler, { once: true, passive: true });
    }

    /**
     * Update mute button SVG icon
     */
    updateMuteIcon(isMuted) {
        const svg = this.muteBtn?.querySelector('svg');
        if (!svg) return;

        if (isMuted) {
            svg.innerHTML = `
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            `;
        } else {
            svg.innerHTML = `
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="currentColor" stroke-width="2" />
            `;
        }
    }

    /**
     * Setup mute button (controls SFX)
     */
    setupMuteButton() {
        if (!this.muteBtn) return;

        this.muteBtn.classList.add('unmuted');
        this.updateMuteIcon(false);

        this.muteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isSfxMuted = this.audioController.toggleMute();
            this.updateMuteIcon(isSfxMuted);

            if (isSfxMuted) {
                this.muteBtn.classList.remove('unmuted');
            } else {
                this.muteBtn.classList.add('unmuted');
            }
        });
    }

    /**
     * Update music button SVG icon
     */
    updateMusicIcon(isPlaying) {
        const svg = this.musicToggleBtn?.querySelector('svg');
        if (!svg) return;

        if (isPlaying) {
            svg.innerHTML = `
                <rect x="6" y="4" width="4" height="16" fill="currentColor" rx="1" />
                <rect x="14" y="4" width="4" height="16" fill="currentColor" rx="1" />
            `;
        } else {
            svg.innerHTML = `
                <path d="M8 18V5l12-2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="5" cy="18" r="3" fill="currentColor" />
                <circle cx="17" cy="16" r="3" fill="currentColor" />
            `;
        }
    }

    /**
     * Show VCR-style OSD for music
     */
    showMusicOSD(text, duration = 3000) {
        if (!this.musicOsd) return;
        this.musicOsd.innerText = text;
        this.musicOsd.classList.add('active');
        setTimeout(() => {
            this.musicOsd.classList.remove('active');
        }, duration);
    }

    /**
     * Setup music toggle button
     */
    setupMusicButton() {
        if (!this.musicToggleBtn) return;

        this.musicToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isPlaying = this.audioController.toggleMusic();
            this.updateMusicIcon(isPlaying);

            if (isPlaying) {
                this.musicToggleBtn.classList.add('playing');
                this.showPlayingOSD();
            } else {
                this.musicToggleBtn.classList.remove('playing');
                this.showMusicOSD('■ STOP', 1500);
            }
        });
    }

    /**
     * Show "now playing" OSD with track info
     */
    showPlayingOSD() {
        const track = this.audioController.getCurrentTrack();
        if (track && this.audioController.tracks) {
            const index = this.audioController.currentTrackIndex + 1;
            const total = this.audioController.tracks.length;
            this.showMusicOSD(`▶ PLAY ${index}/${total}: ${track.name.toUpperCase()}`);
        }
    }

    /**
     * Auto-start music on game start (if conditions met)
     */
    autoStartMusic() {
        if (!this.audioController.isPlayingMusic &&
            !this.audioController.userHasInteractedWithMusic &&
            !this.audioController.isSfxMuted) {

            const isPlaying = this.audioController.toggleMusic(true);
            if (isPlaying) {
                this.musicToggleBtn?.classList.add('playing');
                this.updateMusicIcon(true);
                this.showPlayingOSD();
                return true;
            }
        }
        return false;
    }
}
