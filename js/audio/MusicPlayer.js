import { DrumMachine } from './DrumMachine.js';
import { SynthEngine } from './SynthEngine.js';
import { MUSIC_SCALE, MUSIC_TRACKS } from './MusicTracks.js';

const MASTER_VOLUME = 0.4;

/**
 * Music player managing tracks, scheduling, and playback
 */
export class MusicPlayer {
    constructor(ctx, musicGain, delayNode) {
        this.ctx = ctx;
        this.musicGain = musicGain;
        this.delayNode = delayNode;

        // Music State
        this.isPlayingMusic = false;
        this.timerID = null;
        this.nextNoteTime = 0;
        this.beatCount = 0;
        this.userHasInteractedWithMusic = false;

        // Tracks
        this.tracks = null;
        this.currentTrackIndex = 0;

        // Sub-modules
        this.drums = new DrumMachine(ctx, musicGain, delayNode);
        this.synth = new SynthEngine(ctx, musicGain, delayNode);
    }

    /**
     * Update audio context reference
     */
    setContext(ctx, musicGain, delayNode) {
        this.ctx = ctx;
        this.musicGain = musicGain;
        this.delayNode = delayNode;
        this.drums.setContext(ctx, musicGain, delayNode);
        this.synth.setContext(ctx, musicGain, delayNode);
    }

    /**
     * Initialize track definitions
     */
    initTracks() {
        this.tracks = MUSIC_TRACKS(MUSIC_SCALE);
        this.currentTrackIndex = 0;
    }

    /**
     * Get current track
     */
    getCurrentTrack() {
        if (!this.tracks) this.initTracks();
        return this.tracks[this.currentTrackIndex];
    }

    /**
     * Start music playback
     */
    play(fadeIn = false) {
        if (this.isPlayingMusic || !this.ctx) return;

        if (fadeIn && this.musicGain) {
            this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.musicGain.gain.value = 0.0001;
            this.musicGain.gain.exponentialRampToValueAtTime(MASTER_VOLUME, this.ctx.currentTime + 10.0);
        } else if (this.musicGain) {
            this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.musicGain.gain.value = MASTER_VOLUME;
        }

        // Clear any orphan timer
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }

        this.isPlayingMusic = true;
        this.beatCount = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.2;

        if (!this.tracks) this.initTracks();

        this.scheduleMusic();
    }

    /**
     * Stop music playback
     */
    stop() {
        this.isPlayingMusic = false;
        if (this.timerID) clearTimeout(this.timerID);

        if (this.musicGain && this.ctx) {
            this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        }
    }

    /**
     * Toggle music on/off
     */
    toggle(fadeIn = false) {
        this.userHasInteractedWithMusic = true;

        if (this.isPlayingMusic) {
            this.stop();
            // Advance track index for next play
            if (this.tracks) {
                this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
            }
            return false;
        } else {
            this.play(fadeIn);
            return true;
        }
    }

    /**
     * Schedule music beats
     */
    scheduleMusic() {
        if (!this.isPlayingMusic) return;

        if (!this.tracks || !this.tracks.length) return;
        if (this.currentTrackIndex < 0 || this.currentTrackIndex >= this.tracks.length) {
            this.currentTrackIndex = 0;
        }

        const track = this.tracks[this.currentTrackIndex];
        if (!track) return;

        const secondsPerBeat = 60.0 / track.tempo;
        const lookahead = 0.1;

        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
            this.playBeat(this.nextNoteTime, this.beatCount, track);
            this.nextNoteTime += secondsPerBeat / 4; // 16th notes
            this.beatCount++;
        }

        this.timerID = setTimeout(() => this.scheduleMusic(), 25);
    }

    /**
     * Play a single beat with all instruments
     */
    playBeat(time, beat16, track) {
        const step = beat16 % 16;
        const bar = Math.floor(beat16 / 16);
        const chordIdx = bar % 4;
        const rootFreq = track.progression[chordIdx];
        const style = track.style;

        // Bass
        this.synth.playBassPattern(time, step, rootFreq, style.bass);

        // Drums
        this.drums.playDrumPattern(time, step, style.drums);

        // Pads
        this.synth.playPadPattern(time, step, rootFreq, style.pad, track.tempo);

        // Melody
        this.synth.playMelodyPattern(time, step, track.scale, style.lead);
    }
}
