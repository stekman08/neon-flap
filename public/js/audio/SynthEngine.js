/**
 * Synthesizer engine for bass, pad, and melody sounds
 */
export class SynthEngine {
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
     * Play bass note
     */
    playBass(time, freq, accent, type = 'sawtooth', duration = 0.15, isReese = false, isWobble = false) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        if (isReese) {
            // Reese Bass: Add a second detuned oscillator
            const osc2 = this.ctx.createOscillator();
            osc2.type = type;
            osc2.frequency.setValueAtTime(freq, time);
            osc2.detune.value = 15;
            osc2.connect(filter);
            osc2.start(time);
            osc2.stop(time + duration);
        }

        filter.type = 'lowpass';

        if (isWobble) {
            // Wobble Bass: LFO on Filter
            const lfo = this.ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 4;

            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 500;

            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            lfo.start(time);
            lfo.stop(time + duration);

            filter.frequency.setValueAtTime(600, time);
            filter.Q.value = 5;
        } else {
            filter.frequency.setValueAtTime(accent ? 800 : 400, time);
            if (!isReese) {
                filter.frequency.exponentialRampToValueAtTime(100, time + duration);
            }
            filter.Q.value = 2;
        }

        gain.gain.setValueAtTime(accent ? 0.25 : 0.15, time);
        if (isReese) {
            gain.gain.linearRampToValueAtTime(0.2, time + 0.1);
            gain.gain.linearRampToValueAtTime(0, time + duration);
        } else if (isWobble) {
            gain.gain.setValueAtTime(0.3, time);
            gain.gain.linearRampToValueAtTime(0, time + duration);
        } else {
            gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        }

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    /**
     * Play bass pattern based on style
     */
    playBassPattern(time, step, rootFreq, style) {
        if (style === 'rolling') {
            const bassFreq = (step % 2 === 0) ? rootFreq : rootFreq * 2;
            this.playBass(time, bassFreq, step === 0, 'sawtooth', 0.15);
        } else if (style === 'sustained') {
            if (step === 0) this.playBass(time, rootFreq, true, 'triangle', 2.0);
        } else if (style === 'gallop') {
            const isNote = [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15].includes(step);
            if (isNote) this.playBass(time, rootFreq, step % 4 === 0, 'square', 0.1);
        } else if (style === 'funky') {
            if (step === 0) this.playBass(time, rootFreq, true, 'sawtooth', 0.2);
            if (step === 3) this.playBass(time, rootFreq * 2, false, 'sawtooth', 0.1);
            if (step === 5) this.playBass(time, rootFreq, false, 'sawtooth', 0.1);
            if (step === 10) this.playBass(time, rootFreq * 2, false, 'sawtooth', 0.1);
            if (step === 12) this.playBass(time, rootFreq, true, 'sawtooth', 0.2);
        } else if (style === 'drone') {
            // Note: bar check should be done by caller
            if (step === 0) this.playBass(time, rootFreq, true, 'sine', 4.0);
        } else if (style === 'pumping') {
            if (step % 4 === 2) this.playBass(time, rootFreq, true, 'sawtooth', 0.2);
        } else if (style === 'reese') {
            if (step === 0) this.playBass(time, rootFreq, true, 'sawtooth', 2.0, true);
        } else if (style === 'square-bass') {
            this.playBass(time, rootFreq, step % 4 === 0, 'square', 0.1);
        } else if (style === 'wobble') {
            if (step === 0) this.playBass(time, rootFreq, true, 'sawtooth', 0.4, false, true);
            if (step === 3) this.playBass(time, rootFreq, false, 'sawtooth', 0.2, false, true);
            if (step === 4) this.playBass(time, rootFreq, true, 'sawtooth', 0.2, false, true);
            if (step === 7) this.playBass(time, rootFreq, false, 'sawtooth', 0.2, false, true);
        } else if (style === 'octave-sub') {
            if (step === 0 || step === 8) {
                this.playBass(time, rootFreq, true, 'sawtooth', 0.4);
                this.playBass(time, rootFreq / 2, true, 'sine', 0.4);
            }
        } else if (style === 'syncopated') {
            if (step === 0 || step === 2 || step === 5 || step === 7) {
                this.playBass(time, rootFreq, step === 0, 'sawtooth', 0.15);
            }
            if (step === 8 || step === 10 || step === 13 || step === 15) {
                this.playBass(time, rootFreq, step === 8, 'sawtooth', 0.15);
            }
        }
    }

    /**
     * Play pad chord
     */
    playPad(time, rootFreq, duration, type = 'sawtooth', slowAttack = false) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = type;
        osc2.type = type;

        osc1.frequency.setValueAtTime(rootFreq * 2, time);
        osc2.frequency.setValueAtTime(rootFreq * 3, time);
        osc2.detune.value = 10;

        gain.gain.setValueAtTime(0, time);
        if (slowAttack) {
            gain.gain.linearRampToValueAtTime(0.05, time + 1.0);
            gain.gain.setValueAtTime(0.05, time + duration - 1.0);
        } else {
            gain.gain.linearRampToValueAtTime(0.05, time + 0.1);
            gain.gain.setValueAtTime(0.05, time + duration - 0.1);
        }
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.musicGain);
        gain.connect(this.delayNode);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);
    }

    /**
     * Play pad pattern based on style
     */
    playPadPattern(time, step, rootFreq, style, tempo) {
        const beatDuration = 60 / tempo;

        if (style === 'sustained') {
            if (step === 0) this.playPad(time, rootFreq, 4 * beatDuration, 'sawtooth');
        } else if (style === 'swelling') {
            if (step === 0) this.playPad(time, rootFreq, 4 * beatDuration, 'triangle', true);
        } else if (style === 'chopped') {
            if (step % 4 === 0) this.playPad(time, rootFreq, 0.2, 'square');
        } else if (style === 'stabs') {
            if (step === 4 || step === 12) this.playPad(time, rootFreq * 2, 0.1, 'sawtooth');
        } else if (style === 'massive') {
            if (step === 0) this.playPad(time, rootFreq, 8 * beatDuration, 'sine', true);
        } else if (style === 'gated') {
            if (step % 2 === 0) this.playPad(time, rootFreq, 0.1, 'sawtooth');
        } else if (style === 'dark') {
            if (step === 0) this.playPad(time, rootFreq / 2, 8 * beatDuration, 'triangle', true);
        } else if (style === 'arpeggio-chord') {
            const arpNotes = [rootFreq, rootFreq * 1.2, rootFreq * 1.5, rootFreq * 2];
            const note = arpNotes[step % 4];
            this.playMelodyNote(time, note, 0.1, 'triangle');
        } else if (style === 'choir') {
            if (step === 0) this.playPad(time, rootFreq, 8 * beatDuration, 'sine', true);
        } else if (style === 'strings') {
            if (step === 0) this.playPad(time, rootFreq, 4 * beatDuration, 'sawtooth', true);
        } else if (style === 'ethereal') {
            if (step === 0) this.playPad(time, rootFreq, 8 * beatDuration, 'sine', true);
        } else if (style === 'pulsing') {
            if (step % 4 === 2) this.playPad(time, rootFreq, 0.15, 'sawtooth');
        }
    }

    /**
     * Play melody note
     */
    playMelodyNote(time, freq, duration = 0.2, type = 'square', isAcid = false, isScreech = false, isSupersaw = false) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.Q.value = isAcid ? 15 : 1;

        osc.type = type;

        if (isScreech) {
            osc.frequency.setValueAtTime(freq * 0.5, time);
            osc.frequency.linearRampToValueAtTime(freq, time + 0.1);
        } else {
            osc.frequency.setValueAtTime(freq, time);
        }

        if (isSupersaw) {
            const osc2 = this.ctx.createOscillator();
            const osc3 = this.ctx.createOscillator();

            osc2.type = 'sawtooth';
            osc3.type = 'sawtooth';

            osc2.frequency.setValueAtTime(freq, time);
            osc3.frequency.setValueAtTime(freq, time);

            osc2.detune.value = -15;
            osc3.detune.value = 15;

            osc2.connect(filter);
            osc3.connect(filter);

            osc2.start(time);
            osc3.start(time);

            osc2.stop(time + duration);
            osc3.stop(time + duration);
        }

        if (isAcid) {
            filter.frequency.setValueAtTime(freq * 4, time);
            filter.frequency.exponentialRampToValueAtTime(freq, time + duration);
        } else {
            filter.frequency.value = 20000;
        }

        // Vibrato
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 5;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 5;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(time);

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        gain.connect(this.delayNode);

        osc.start(time);
        osc.stop(time + duration);
        lfo.stop(time + duration);
    }

    /**
     * Play melody based on style with random note selection
     */
    playMelodyPattern(time, step, scale, style) {
        const melodyChance = style === 'fast' || style === 'energetic' ? 0.5 : (style === 'random' || style === 'haunting' ? 0.15 : 0.3);

        if (step % 2 === 0 && Math.random() > (1 - melodyChance)) {
            const note = scale[Math.floor(Math.random() * scale.length)];
            const finalNote = Math.random() > 0.8 ? note * 2 : note;

            let type = 'square';
            let duration = 0.2;

            if (style === 'cinematic') { type = 'triangle'; duration = 0.6; }
            if (style === 'haunting') { type = 'triangle'; duration = 0.8; }
            if (style === 'energetic') { type = 'sawtooth'; duration = 0.15; }
            if (style === 'bluesy') { type = 'sawtooth'; duration = 0.3; }
            if (style === 'random') { type = 'sine'; duration = 1.0; }
            if (style === 'trance') { type = 'sawtooth'; duration = 0.15; }
            if (style === 'acid') { type = 'sawtooth'; duration = 0.1; }
            if (style === 'pure-square') { type = 'square'; duration = 0.15; }
            if (style === 'screech') { type = 'sawtooth'; duration = 0.4; }
            if (style === 'supersaw') { type = 'sawtooth'; duration = 0.4; }

            this.playMelodyNote(time, finalNote, duration, type, style === 'acid', style === 'screech', style === 'supersaw');
        }
    }
}
