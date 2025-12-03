import { SFXManager } from './SFXManager.js';
import { MusicPlayer } from './MusicPlayer.js';

// Audio Constants
const MASTER_VOLUME = 0.4;
const DELAY_TIME = 0.375; // Dotted 8th note at 120BPM
const FEEDBACK_AMOUNT = 0.4;
const DELAY_WET_MIX = 0.3;

/**
 * Main audio controller coordinating SFX and Music
 */
export class AudioController {
    constructor() {
        this.ctx = null;
        this.isSfxMuted = false;
        this.initialized = false;

        // Audio nodes
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.delayNode = null;
        this.feedbackNode = null;
        this.delayGain = null;

        // Sub-modules (initialized after audio context)
        this.sfx = new SFXManager(null, null, null);
        this.music = new MusicPlayer(null, null, null);
    }

    /**
     * Initialize audio context and nodes
     */
    init() {
        if (this.initialized) {
            return;
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Master Chain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 1.0;

            // Sub-buses
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.isSfxMuted ? 0 : MASTER_VOLUME;

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = MASTER_VOLUME;

            // Connect Sub-buses to Master
            this.sfxGain.connect(this.masterGain);
            this.musicGain.connect(this.masterGain);

            // Delay Effect (Stereo Echo)
            this.delayNode = this.ctx.createDelay();
            this.delayNode.delayTime.value = DELAY_TIME;

            this.feedbackNode = this.ctx.createGain();
            this.feedbackNode.gain.value = FEEDBACK_AMOUNT;

            this.delayGain = this.ctx.createGain();
            this.delayGain.gain.value = DELAY_WET_MIX;

            this.delayNode.connect(this.feedbackNode);
            this.feedbackNode.connect(this.delayNode);
            this.delayNode.connect(this.delayGain);

            this.delayGain.connect(this.musicGain);
            this.masterGain.connect(this.ctx.destination);

            // Update sub-modules with audio context
            this.sfx.setContext(this.ctx, this.sfxGain, this.delayNode);
            this.music.setContext(this.ctx, this.musicGain, this.delayNode);

            this.initialized = true;
        } catch (e) {
            console.error('[Audio] Web Audio API not supported:', e);
        }
    }

    /**
     * Toggle SFX mute state
     */
    toggleMute() {
        this.isSfxMuted = !this.isSfxMuted;
        if (!this.initialized) {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        }
        if (this.ctx && this.sfxGain) {
            this.sfxGain.gain.setTargetAtTime(this.isSfxMuted ? 0 : MASTER_VOLUME, this.ctx.currentTime, 0.1);
        }
        return this.isSfxMuted;
    }

    // --- SFX Methods (delegated) ---

    playJump() {
        this.sfx.playJump(this.isSfxMuted);
    }

    playScore() {
        this.sfx.playScore(this.isSfxMuted);
    }

    playPerfectScore() {
        this.sfx.playPerfectScore(this.isSfxMuted);
    }

    playCrash() {
        this.sfx.playCrash(this.isSfxMuted, this.masterGain);
    }

    // --- Music Methods (delegated) ---

    playMusic(fadeIn = false) {
        this.music.play(fadeIn);
    }

    stopMusic() {
        this.music.stop();
    }

    toggleMusic(fadeIn = false) {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.music.toggle(fadeIn);
    }

    getCurrentTrack() {
        return this.music.getCurrentTrack();
    }

    // --- Expose music state for backwards compatibility ---

    get isPlayingMusic() {
        return this.music.isPlayingMusic;
    }

    set isPlayingMusic(value) {
        this.music.isPlayingMusic = value;
    }

    get userHasInteractedWithMusic() {
        return this.music.userHasInteractedWithMusic;
    }

    set userHasInteractedWithMusic(value) {
        this.music.userHasInteractedWithMusic = value;
    }

    get currentTrackIndex() {
        return this.music.currentTrackIndex;
    }

    set currentTrackIndex(value) {
        this.music.currentTrackIndex = value;
    }

    get tracks() {
        return this.music.tracks;
    }

    set tracks(value) {
        this.music.tracks = value;
    }

    get timerID() {
        return this.music.timerID;
    }

    set timerID(value) {
        this.music.timerID = value;
    }

    // --- Backwards-compatible music methods ---

    initTracks() {
        this.music.initTracks();
    }

    scheduleMusic() {
        this.music.scheduleMusic();
    }

    // --- Backwards-compatible drum methods ---

    playKick(time) {
        this.music.drums.playKick(time);
    }

    playSnare(time, bigReverb = false) {
        this.music.drums.playSnare(time, bigReverb);
    }

    playHiHat(time, open) {
        this.music.drums.playHiHat(time, open);
    }

    playBitKick(time) {
        this.music.drums.playBitKick(time);
    }

    playBitSnare(time, isHat = false) {
        this.music.drums.playBitSnare(time, isHat);
    }
}
