/**
 * Manages game sound effects (jump, score, crash)
 */

const JUMP_THROTTLE_MS = 100;

export class SFXManager {
    constructor(ctx, sfxGain, delayNode) {
        this.ctx = ctx;
        this.sfxGain = sfxGain;
        this.delayNode = delayNode;
        this.lastJumpTime = 0;
    }

    /**
     * Update audio context reference (for lazy init)
     */
    setContext(ctx, sfxGain, delayNode) {
        this.ctx = ctx;
        this.sfxGain = sfxGain;
        this.delayNode = delayNode;
    }

    /**
     * Play jump sound effect
     */
    playJump(isMuted) {
        if (isMuted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const throttleSeconds = JUMP_THROTTLE_MS / 1000;
        if (now - this.lastJumpTime < throttleSeconds) return;
        this.lastJumpTime = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square'; // Retro jump sound
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(now + 0.1);
    }

    /**
     * Play score sound effect
     */
    playScore(isMuted) {
        if (isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';

        // Coin/Sparkle sound (High pitch arpeggio)
        osc1.frequency.setValueAtTime(1200, now);
        osc1.frequency.setValueAtTime(1800, now + 0.05);

        osc2.frequency.setValueAtTime(1205, now); // Detune
        osc2.frequency.setValueAtTime(1805, now + 0.05);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        osc1.start();
        osc2.start();
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.2);
    }

    /**
     * Play perfect score sound effect (major triad arpeggio)
     */
    playPerfectScore(isMuted) {
        if (isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Major Triad Arpeggio (C5 - E5 - G5)
        const notes = [523.25, 659.25, 783.99];

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = now + (i * 0.05); // Staggered start

            // Bell-like envelope
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02); // Fast attack
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5); // Long release

            osc.connect(gain);
            gain.connect(this.sfxGain);
            gain.connect(this.delayNode); // Add delay for "shimmer"

            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    }

    /**
     * Play crash/death sound effect
     */
    playCrash(isMuted, masterGain) {
        if (isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;

        // White noise buffer
        const bufferSize = this.ctx.sampleRate * 0.8;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.linearRampToValueAtTime(100, now + 0.8);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain); // Crash goes to master, not SFX bus

        noise.start();
    }
}
