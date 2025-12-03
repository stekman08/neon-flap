/**
 * Drum machine with various drum sounds for music tracks
 */
export class DrumMachine {
    constructor(ctx, musicGain, delayNode) {
        this.ctx = ctx;
        this.musicGain = musicGain;
        this.delayNode = delayNode;
    }

    /**
     * Update audio context reference
     */
    setContext(ctx, musicGain, delayNode) {
        this.ctx = ctx;
        this.musicGain = musicGain;
        this.delayNode = delayNode;
    }

    /**
     * Play kick drum
     */
    playKick(time) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    /**
     * Play snare drum
     */
    playSnare(time, bigReverb = false) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        gain.connect(this.delayNode); // Reverb-ish snare

        if (bigReverb) {
            // Send more to delay for "big" sound
            const reverbSend = this.ctx.createGain();
            reverbSend.gain.value = 0.5;
            gain.connect(reverbSend);
            reverbSend.connect(this.delayNode);
        }

        noise.start(time);
    }

    /**
     * Play hi-hat
     */
    playHiHat(time, open) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * (open ? 0.3 : 0.05);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.2 : 0.05));

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
    }

    /**
     * Play 8-bit style kick
     */
    playBitKick(time) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square'; // Square wave for 8-bit kick
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.1); // Fast drop

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.1);
    }

    /**
     * Play 8-bit style snare/hat
     */
    playBitSnare(time, isHat = false) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * (isHat ? 0.05 : 0.1);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isHat ? 0.1 : 0.2, time);
        gain.gain.linearRampToValueAtTime(0, time + (isHat ? 0.05 : 0.1)); // Sharp cutoff

        // No filter for raw 8-bit noise
        noise.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
    }

    /**
     * Play drum pattern based on style
     */
    playDrumPattern(time, step, style) {
        if (style === 'driving') {
            if (step === 0 || step === 8) this.playKick(time);
            if (step === 4 || step === 12) this.playSnare(time);
            if (step % 2 === 0) this.playHiHat(time, step % 4 === 2);
        } else if (style === 'heavy') {
            if (step === 0) this.playKick(time);
            if (step === 8) this.playSnare(time, true);
            if (step === 14) this.playKick(time);
            if (step % 4 === 0) this.playHiHat(time, false);
        } else if (style === 'fast') {
            if (step === 0 || step === 8) this.playKick(time);
            if (step === 4 || step === 12) this.playSnare(time);
            this.playHiHat(time, step % 4 === 2);
        } else if (style === 'breakbeat') {
            if (step === 0 || step === 10) this.playKick(time);
            if (step === 4 || step === 12) this.playSnare(time);
            if (step === 14) this.playSnare(time);
            if (step % 2 === 0) this.playHiHat(time, step === 2 || step === 10);
        } else if (style === 'sparse') {
            if (step === 0) this.playKick(time);
            if (step === 8 && Math.random() > 0.5) this.playHiHat(time, true);
        } else if (style === 'techno') {
            if (step % 4 === 0) this.playKick(time);
            if (step % 4 === 2) this.playHiHat(time, true);
            if (step % 2 === 1) this.playHiHat(time, false);
        } else if (style === 'dnb') {
            if (step === 0 || step === 10) this.playKick(time);
            if (step === 4 || step === 12) this.playSnare(time);
            if (step === 15) this.playSnare(time);
            this.playHiHat(time, step % 2 === 0);
        } else if (style === 'bit-drums') {
            if (step % 4 === 0) this.playBitKick(time);
            if (step % 4 === 2) this.playBitSnare(time);
            if (step % 2 === 1) this.playBitSnare(time, true);
        } else if (style === 'dubstep') {
            if (step === 0) this.playKick(time);
            if (step === 8) this.playSnare(time, true);
            if (step === 14) this.playKick(time);
            if (step % 2 === 0) this.playHiHat(time, step % 4 === 2);
        } else if (style === 'cinematic') {
            if (step % 4 === 0) this.playKick(time);
            if (step === 4 || step === 12) this.playSnare(time, true);
            if (step === 14 || step === 15) this.playKick(time);
            if (step % 2 === 0) this.playHiHat(time, true);
        } else if (style === 'electro') {
            if (step % 4 === 0) this.playKick(time);
            if (step === 4 || step === 12) this.playSnare(time);
            if (step % 2 === 0) this.playHiHat(time, false);
            if (step === 6 || step === 14) this.playHiHat(time, true);
        }
    }
}
