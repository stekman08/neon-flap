// Audio Constants
const MASTER_VOLUME = 0.4;
const DELAY_TIME = 0.375; // Dotted 8th note at 120BPM
const FEEDBACK_AMOUNT = 0.4;
const DELAY_WET_MIX = 0.3;
const JUMP_THROTTLE_MS = 100;
const TEMPO_BPM = 110;

export class AudioController {
    constructor() {
        this.ctx = null;
        this.isMuted = true; // Default muted
        this.initialized = false;
        this.lastJumpTime = 0; // Throttling for jump sound

        // Music State
        this.isPlayingMusic = false;
        this.timerID = null;
        this.nextNoteTime = 0;
        this.beatCount = 0; // Track beats for chord progression

        // Effects
        this.masterGain = null;
        this.delayNode = null;
        this.feedbackNode = null;

        // Musical Constants (C Minor: C, D, Eb, F, G, Ab, Bb)
        this.scale = {
            C2: 65.41, Eb2: 77.78, F2: 87.31, G2: 98.00, Ab2: 103.83, Bb2: 116.54,
            C3: 130.81, D3: 146.83, Eb3: 155.56, F3: 174.61, G3: 196.00, Ab3: 207.65, Bb3: 233.08,
            C4: 261.63, D4: 293.66, Eb4: 311.13, F4: 349.23, G4: 392.00, Ab4: 415.30, Bb4: 466.16,
            C5: 523.25
        };

        // Chord Progression: Cm -> Ab -> Fm -> G (4 bars each)
        // Root notes for bass
        this.progression = [
            this.scale.C2,  // Cm
            this.scale.Ab2, // Ab
            this.scale.F2,  // Fm
            this.scale.G2   // G
        ];

        // Chord tones for pads/arps (Offsets from root)
        // Minor: 0, 3, 7 (semitones) -> approx freq ratios: 1, 1.2, 1.5
        this.chordType = 'minor';
    }

    init() {
        if (this.initialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Master Chain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = MASTER_VOLUME;

            // Delay Effect (Stereo Echo)
            this.delayNode = this.ctx.createDelay();
            this.delayNode.delayTime.value = DELAY_TIME;

            this.feedbackNode = this.ctx.createGain();
            this.feedbackNode.gain.value = FEEDBACK_AMOUNT;

            // Routing: Send bus style for delay
            this.delayGain = this.ctx.createGain();
            this.delayGain.gain.value = DELAY_WET_MIX;

            this.delayNode.connect(this.feedbackNode);
            this.feedbackNode.connect(this.delayNode);
            this.delayNode.connect(this.delayGain);
            this.delayGain.connect(this.masterGain);

            this.masterGain.connect(this.ctx.destination);

            this.initialized = true;
        } catch (e) {
            console.error('Web Audio API not supported');
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (!this.isMuted && !this.initialized) {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }
        // Immediate mute handling
        if (this.ctx && this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : MASTER_VOLUME, this.ctx.currentTime, 0.1);
        }
        return this.isMuted;
    }

    playJump() {
        if (this.isMuted || !this.ctx) return;

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
        gain.connect(this.masterGain); // Route to master

        osc.start();
        osc.stop(now + 0.1);
    }

    playScore() {
        if (this.isMuted || !this.ctx) return;
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
        gain.connect(this.masterGain);

        osc1.start();
        osc2.start();
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.2);
    }

    playPerfectScore() {
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Major Triad Arpeggio (C5 - E5 - G5)
        // C5 = 523.25, E5 = 659.25, G5 = 783.99
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
            gain.connect(this.masterGain);
            gain.connect(this.delayNode); // Add delay for "shimmer"

            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    }

    playCrash() {
        if (this.isMuted || !this.ctx) return;
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
        gain.connect(this.masterGain);

        noise.start();
    }

    // --- Synthwave Music Engine ---

    playMusic() {
        if (this.isPlayingMusic || !this.ctx) return;
        this.isPlayingMusic = true;
        this.beatCount = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.scheduleMusic();
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.timerID) clearTimeout(this.timerID);
    }

    toggleMusic() {
        if (this.isPlayingMusic) {
            this.stopMusic();
            return false;
        } else {
            if (!this.initialized) this.init();
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            this.playMusic();
            return true;
        }
    }

    scheduleMusic() {
        if (!this.isPlayingMusic) return;

        const secondsPerBeat = 60.0 / TEMPO_BPM;
        const lookahead = 0.1;

        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
            this.playBeat(this.nextNoteTime, this.beatCount);
            this.nextNoteTime += secondsPerBeat / 4; // 16th notes
            this.beatCount++;
        }

        this.timerID = setTimeout(() => this.scheduleMusic(), 25);
    }

    playBeat(time, beat16) {
        // 16th note counter (0-15 for a bar)
        const step = beat16 % 16;
        const bar = Math.floor(beat16 / 16);

        // Determine current chord based on bar index (loop of 4 bars)
        const chordIdx = bar % 4;
        const rootFreq = this.progression[chordIdx];

        // --- 1. Rolling Bassline (16th notes) ---
        // Octave bounce: Root -> Octave -> Root -> Octave
        const bassFreq = (step % 2 === 0) ? rootFreq : rootFreq * 2;
        this.playBass(time, bassFreq, step === 0); // Accent on 1

        // --- 2. Drums ---
        if (step === 0 || step === 8) this.playKick(time); // Kick on 1 and 3
        if (step === 4 || step === 12) this.playSnare(time); // Snare on 2 and 4
        if (step % 2 === 0) this.playHiHat(time, step % 4 === 2); // Hats on 8ths, open on off-beat

        // --- 3. Pads (Sustained chords) ---
        if (step === 0) {
            // Play a chord every bar
            this.playPad(time, rootFreq, 4 * (60 / TEMPO_BPM)); // Sustain for full bar
        }

        // --- 4. Procedural Melody ---
        // Play sparse melody notes, mostly on 8th notes
        if (step % 2 === 0 && Math.random() > 0.4) {
            this.playMelodyNote(time, rootFreq);
        }
    }

    playBass(time, freq, accent) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        // Filter envelope for "pluck" sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(accent ? 800 : 400, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.15);
        filter.Q.value = 2;

        gain.gain.setValueAtTime(accent ? 0.25 : 0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    playPad(time, rootFreq, duration) {
        // Create a rich pad using 2 detuned oscillators
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sawtooth';

        // Chord voicing: Root + Minor 3rd + 5th (Basic Triad)
        // But for pad, let's just do Root + 5th for power chord feel + Octave
        osc1.frequency.setValueAtTime(rootFreq * 2, time); // Octave up
        osc2.frequency.setValueAtTime(rootFreq * 3, time); // Fifth (approx)

        // Detune for chorus effect
        osc2.detune.value = 10;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.05, time + 0.5); // Slow attack
        gain.gain.setValueAtTime(0.05, time + duration - 0.5);
        gain.gain.linearRampToValueAtTime(0, time + duration); // Slow release

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);
        // Also send to delay for space
        gain.connect(this.delayNode);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);
    }

    playMelodyNote(time, rootFreq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Pick a random note from C Minor Pentatonic for safety
        // C, Eb, F, G, Bb
        const intervals = [1, 1.2, 1.33, 1.5, 1.78];
        const interval = intervals[Math.floor(Math.random() * intervals.length)];
        const freq = rootFreq * 2 * interval; // 2 octaves up

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);

        // Vibrato
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 5; // 5Hz vibrato
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 5; // Depth
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(time);

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);
        gain.connect(this.delayNode); // Echo on melody

        osc.start(time);
        osc.stop(time + 0.3);
        lfo.stop(time + 0.3);
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time) {
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
        gain.connect(this.masterGain);
        gain.connect(this.delayNode); // Reverb-ish snare

        noise.start(time);
    }

    playHiHat(time, open) {
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
        gain.connect(this.masterGain);

        noise.start(time);
    }
}
