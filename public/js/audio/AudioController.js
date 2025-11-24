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
        this.isSfxMuted = false; // Default SFX ON
        this.initialized = false;
        this.lastJumpTime = 0; // Throttling for jump sound

        // Music State
        this.isPlayingMusic = false;
        this.timerID = null;
        this.nextNoteTime = 0;
        this.beatCount = 0;
        this.userHasInteractedWithMusic = false;

        // Effects
        this.masterGain = null;
        this.sfxGain = null;   // New: Dedicated SFX channel
        this.musicGain = null; // New: Dedicated Music channel
        this.delayNode = null;
        this.feedbackNode = null;

        this.scale = {
            C2: 65.41, Db2: 69.30, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31,
            Gb2: 92.50, G2: 98.00, Ab2: 103.83, A2: 110.00, Bb2: 116.54, B2: 123.47,

            C3: 130.81, Db3: 138.59, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61,
            Gb3: 185.00, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,

            C4: 261.63, Db4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23,
            Gb4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,

            C5: 523.25, Db5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46,
            Gb5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77
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
            this.masterGain.gain.value = 1.0; // Master is full, control via sub-buses

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

            // Routing: Send bus style for delay
            this.delayGain = this.ctx.createGain();
            this.delayGain.gain.value = DELAY_WET_MIX;

            this.delayNode.connect(this.feedbackNode);
            this.feedbackNode.connect(this.delayNode);
            this.delayNode.connect(this.delayGain);

            // Delay output goes to Music Bus (mostly used for music/ambience)
            this.delayGain.connect(this.musicGain);

            this.masterGain.connect(this.ctx.destination);

            this.initialized = true;
        } catch (e) {
            console.error('Web Audio API not supported');
        }
    }

    toggleMute() {
        this.isSfxMuted = !this.isSfxMuted;
        if (!this.initialized) {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }
        // Immediate mute handling for SFX channel only
        if (this.ctx && this.sfxGain) {
            this.sfxGain.gain.setTargetAtTime(this.isSfxMuted ? 0 : MASTER_VOLUME, this.ctx.currentTime, 0.1);
        }
        return this.isSfxMuted;
    }

    playJump() {
        if (this.isSfxMuted || !this.ctx) return;

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
        gain.connect(this.sfxGain); // Route to SFX bus

        osc.start();
        osc.stop(now + 0.1);
    }

    playScore() {
        if (this.isSfxMuted || !this.ctx) return;
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
        gain.connect(this.sfxGain); // Route to SFX bus

        osc1.start();
        osc2.start();
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.2);
    }

    playPerfectScore() {
        if (this.isSfxMuted || !this.ctx) return;
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
            gain.connect(this.sfxGain); // Route to SFX bus
            gain.connect(this.delayNode); // Add delay for "shimmer"

            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    }

    playCrash() {
        if (this.isSfxMuted || !this.ctx) return;
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

    playMusic(fadeIn = false) {
        if (this.isPlayingMusic || !this.ctx) return;

        if (fadeIn && this.musicGain) {
            this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.musicGain.gain.value = 0.0001;
            this.musicGain.gain.exponentialRampToValueAtTime(MASTER_VOLUME, this.ctx.currentTime + 10.0);
        } else if (this.musicGain) {
            this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.musicGain.gain.value = MASTER_VOLUME;
        }

        this.isPlayingMusic = true;
        this.beatCount = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.2;

        if (!this.tracks) this.initTracks();

        console.log(`Now Playing: ${this.tracks[this.currentTrackIndex].name}`);

        this.scheduleMusic();
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.timerID) clearTimeout(this.timerID);

        if (this.musicGain && this.ctx) {
            this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        }
    }

    toggleMusic(fadeIn = false) {
        this.userHasInteractedWithMusic = true;

        if (this.isPlayingMusic) {
            this.stopMusic();
            // Advance track index for next play
            if (this.tracks) {
                this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
            }
            return false;
        } else {
            if (!this.initialized) this.init();
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            this.playMusic(fadeIn);
            return true;
        }
    }

    initTracks() {
        // Musical Constants
        const N = this.scale; // Use existing scale definitions

        this.tracks = [
            {
                name: "Neon Horizon",
                hue: 180, // Cyan
                tempo: 110,
                progression: [N.C2, N.Ab2, N.F2, N.G2], // Cm -> Ab -> Fm -> G
                scale: [N.C4, N.Eb4, N.F4, N.G4, N.Bb4], // Cm Pentatonic
                style: {
                    bass: 'rolling', // Octave bounce
                    drums: 'driving', // Standard rock beat
                    pad: 'sustained', // Full bar chords
                    lead: 'arpeggio' // Random arps
                }
            },
            {
                name: "Cyber Sprint",
                hue: 0, // Red
                tempo: 128,
                progression: [N.D2, N.F2, N.G2, N.Bb2], // Dm -> F -> G -> Bb
                scale: [N.D4, N.F4, N.G4, N.A4, N.C5], // Dm Pentatonic
                style: {
                    bass: 'gallop', // Iron Maiden style
                    drums: 'fast', // Fast hi-hats
                    pad: 'chopped', // Rhythmic gating
                    lead: 'fast' // 16th note runs
                }
            },
            {
                name: "Neon Funk",
                hue: 60, // Yellow/Gold
                tempo: 105,
                progression: [N.E2, N.G2, N.A2, N.B2], // Em -> G -> A -> B
                scale: [N.E4, N.G4, N.A4, N.B4, N.D5], // Em Pentatonic
                style: {
                    bass: 'funky', // Syncopated, octave jumps
                    drums: 'breakbeat', // Syncopated kick/snare
                    pad: 'stabs', // Short chord hits
                    lead: 'bluesy' // Slide/bend feel
                }
            },
            {
                name: "Neon Drift",
                hue: 300, // Magenta
                tempo: 112, // Similar energy to Horizon
                progression: [N.A2, N.F2, N.C2, N.G2], // Am -> F -> C -> G (Epic "Hero" progression)
                scale: [N.A4, N.C5, N.D5, N.E5, N.G5], // Am Pentatonic
                style: {
                    bass: 'rolling',
                    drums: 'driving',
                    pad: 'sustained',
                    lead: 'arpeggio'
                }
            },
            {
                name: "Midnight Drive",
                hue: 280, // Deep Purple
                tempo: 95,
                progression: [N.F2, N.Db2 || 69.30, N.Eb2, N.C2], // Fm -> Db -> Eb -> Cm
                scale: [N.F4, N.Ab4, N.Bb4, N.C5, N.Eb5], // Fm Pentatonic
                style: {
                    bass: 'sustained', // Long, deep notes
                    drums: 'heavy', // Slow, big reverb snare
                    pad: 'swelling', // Slow attack pads
                    lead: 'cinematic' // Slow, reverb-heavy melody
                }
            },
            {
                name: "Velocity X",
                hue: 120, // Matrix Green
                tempo: 135,
                progression: [N.Gb2, N.D2, N.A2, N.E2], // F#m -> D -> A -> E
                scale: [N.Gb4, N.A4, N.B4, N.Db5, N.E5], // F#m Pentatonic
                style: {
                    bass: 'pumping', // Off-beat sidechain
                    drums: 'techno', // 4-on-the-floor
                    pad: 'gated', // Rhythmic chopping
                    lead: 'trance' // Fast saw pluck
                }
            },
            {
                name: "System Override",
                hue: 30, // Neon Orange
                tempo: 170, // DnB Speed
                progression: [N.Eb2, N.B2, N.Gb2, N.Db2], // Ebm -> B -> Gb -> Db
                scale: [N.Eb4, N.Gb4, N.Ab4, N.Bb4, N.Db5], // Ebm Pentatonic
                style: {
                    bass: 'reese', // Detuned wobble
                    drums: 'dnb', // Breakbeat
                    pad: 'dark', // Low & Ominous
                    lead: 'acid' // Resonant
                }
            },
            {
                name: "Pixel Fury",
                hue: 330, // Hot Pink
                tempo: 160, // Boss Fight Speed
                progression: [N.C2, N.Bb2, N.Ab2, N.G2], // Cm -> Bb -> Ab -> G (Andalusian)
                scale: [N.C4, N.Eb4, N.F4, N.G4, N.Bb4], // Cm Pentatonic
                style: {
                    bass: 'square-bass', // Raw square
                    drums: 'bit-drums', // Noise & Pitch drops
                    pad: 'arpeggio-chord', // Fast arps instead of chords
                    lead: 'pure-square' // Raw square
                }
            },
            {
                name: "Bass Protocol",
                hue: 270, // Electric Violet
                tempo: 140, // Dubstep Speed
                progression: [N.F2, N.Db2, N.Bb2, N.C2], // Fm -> Db -> Bbm -> C
                scale: [N.F4, N.Ab4, N.Bb4, N.C5, N.Eb5], // Fm Pentatonic
                style: {
                    bass: 'wobble', // LFO modulated
                    drums: 'dubstep', // Half-time feel
                    pad: 'choir', // Eerie vocal
                    lead: 'screech' // High screech
                }
            },
            {
                name: "Neon Ascension",
                hue: 190, // Ice Blue
                tempo: 128, // Anthem Speed
                progression: [N.D2, N.Bb2, N.F2, N.C2], // Dm -> Bb -> F -> C (Epic)
                scale: [N.D4, N.F4, N.G4, N.A4, N.C5, N.D5], // Dm Pentatonic +
                style: {
                    bass: 'octave-sub', // Wall of sound
                    drums: 'cinematic', // Big hits
                    pad: 'strings', // Orchestral
                    lead: 'supersaw' // Detuned glory
                }
            },
            {
                name: "Black Swan",
                hue: 270, // Deep Purple/Violet (mysterious)
                tempo: 75, // Slow, haunting
                progression: [N.A2, N.F2, N.C2, N.E2], // Am -> F -> C -> E (Dark, cinematic)
                scale: [N.A4, N.C5, N.D5, N.E5, N.F5], // A minor (natural minor for darkness)
                style: {
                    bass: 'drone', // Deep, sustained root notes
                    drums: 'sparse', // Minimal, atmospheric
                    pad: 'ethereal', // Slow attack, lots of reverb
                    lead: 'haunting' // Sparse, reverb-heavy melody
                }
            },
            {
                name: "Neon Rush",
                hue: 320, // Hot Magenta/Pink (energetic, vibrant)
                tempo: 132, // Electro House speed - fast and driving
                progression: [N.E2, N.C2, N.G2, N.D2], // Em -> C -> G -> D (Powerful, uplifting)
                scale: [N.E4, N.G4, N.A4, N.B4, N.D5], // E minor pentatonic
                style: {
                    bass: 'syncopated', // Off-beat electro bass
                    drums: 'electro', // Four-on-floor with claps
                    pad: 'pulsing', // Rhythmic sidechain
                    lead: 'energetic' // Fast, bright synth lead
                }
            }
        ];
        this.currentTrackIndex = 0;
    }

    getCurrentTrack() {
        if (!this.tracks) this.initTracks();
        return this.tracks[this.currentTrackIndex];
    }

    scheduleMusic() {
        if (!this.isPlayingMusic) return;

        const track = this.tracks[this.currentTrackIndex];
        const secondsPerBeat = 60.0 / track.tempo;
        const lookahead = 0.1;

        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
            this.playBeat(this.nextNoteTime, this.beatCount, track);
            this.nextNoteTime += secondsPerBeat / 4; // 16th notes
            this.beatCount++;
        }

        this.timerID = setTimeout(() => this.scheduleMusic(), 25);
    }

    playBeat(time, beat16, track) {
        // 16th note counter (0-15 for a bar)
        const step = beat16 % 16;
        const bar = Math.floor(beat16 / 16);

        // Determine current chord based on bar index (loop of 4 bars)
        const chordIdx = bar % 4;
        const rootFreq = track.progression[chordIdx];
        const style = track.style;

        // --- BASS ---
        if (style.bass === 'rolling') {
            // Octave bounce: Root -> Octave -> Root -> Octave
            const bassFreq = (step % 2 === 0) ? rootFreq : rootFreq * 2;
            this.playBass(time, bassFreq, step === 0, 'sawtooth', 0.15); // Accent on 1
        } else if (style.bass === 'sustained') {
            if (step === 0) this.playBass(time, rootFreq, true, 'triangle', 2.0);
        } else if (style.bass === 'gallop') {
            // X . X X X . X X
            const isNote = [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15].includes(step);
            if (isNote) this.playBass(time, rootFreq, step % 4 === 0, 'square', 0.1);
        } else if (style.bass === 'funky') {
            // Syncopated: X . . X . X . .
            if (step === 0) this.playBass(time, rootFreq, true, 'sawtooth', 0.2);
            if (step === 3) this.playBass(time, rootFreq * 2, false, 'sawtooth', 0.1); // Octave pop
            if (step === 5) this.playBass(time, rootFreq, false, 'sawtooth', 0.1);
            if (step === 10) this.playBass(time, rootFreq * 2, false, 'sawtooth', 0.1);
            if (step === 12) this.playBass(time, rootFreq, true, 'sawtooth', 0.2);
        } else if (style.bass === 'drone') {
            if (step === 0 && bar % 2 === 0) this.playBass(time, rootFreq, true, 'sine', 4.0); // 2 bars
        } else if (style.bass === 'pumping') {
            // Off-beat bass (Sidechain feel): . X . X . X . X
            if (step % 4 === 2) this.playBass(time, rootFreq, true, 'sawtooth', 0.2);
        } else if (style.bass === 'reese') {
            // Long, wobbling bass notes
            if (step === 0) this.playBass(time, rootFreq, true, 'sawtooth', 2.0, true); // Special reese mode
        } else if (style.bass === 'square-bass') {
            // 8-bit staccato bass: X X X X X X X X
            this.playBass(time, rootFreq, step % 4 === 0, 'square', 0.1);
        } else if (style.bass === 'wobble') {
            // Dubstep Wobble: LFO on filter
            // Rhythm: X . . X X . X . (Syncopated)
            if (step === 0) this.playBass(time, rootFreq, true, 'sawtooth', 0.4, false, true); // Wobble
            if (step === 3) this.playBass(time, rootFreq, false, 'sawtooth', 0.2, false, true);
            if (step === 4) this.playBass(time, rootFreq, true, 'sawtooth', 0.2, false, true);
            if (step === 7) this.playBass(time, rootFreq, false, 'sawtooth', 0.2, false, true);
        } else if (style.bass === 'octave-sub') {
            // Wall of sound: Root + Octave sustained
            if (step === 0 || step === 8) {
                this.playBass(time, rootFreq, true, 'sawtooth', 0.4);
                this.playBass(time, rootFreq / 2, true, 'sine', 0.4); // Sub
            }
        } else if (style.bass === 'syncopated') {
            // Electro house syncopated bass: X . X . . X . X
            if (step === 0 || step === 2 || step === 5 || step === 7) {
                this.playBass(time, rootFreq, step === 0, 'sawtooth', 0.15);
            }
            if (step === 8 || step === 10 || step === 13 || step === 15) {
                this.playBass(time, rootFreq, step === 8, 'sawtooth', 0.15);
            }
        }

        // --- DRUMS ---
        if (style.drums === 'driving') {
            if (step === 0 || step === 8) this.playKick(time); // Kick on 1 and 3
            if (step === 4 || step === 12) this.playSnare(time); // Snare on 2 and 4
            if (step % 2 === 0) this.playHiHat(time, step % 4 === 2); // Hats on 8ths, open on off-beat
        } else if (style.drums === 'heavy') {
            if (step === 0) this.playKick(time);
            if (step === 8) this.playSnare(time, true); // Big reverb
            if (step === 14) this.playKick(time);
            if (step % 4 === 0) this.playHiHat(time, false);
        } else if (style.drums === 'fast') {
            if (step === 0 || step === 8) this.playKick(time);
            if (step === 4 || step === 12) this.playSnare(time);
            this.playHiHat(time, step % 4 === 2); // Every 16th
        } else if (style.drums === 'breakbeat') {
            if (step === 0 || step === 10) this.playKick(time);
            if (step === 4 || step === 12) this.playSnare(time);
            if (step === 14) this.playSnare(time); // Ghost note
            if (step % 2 === 0) this.playHiHat(time, step === 2 || step === 10);
        } else if (style.drums === 'sparse') {
            if (step === 0) this.playKick(time);
            if (step === 8 && Math.random() > 0.5) this.playHiHat(time, true); // Occasional shimmer
        } else if (style.drums === 'techno') {
            if (step % 4 === 0) this.playKick(time); // 4-on-the-floor
            if (step % 4 === 2) this.playHiHat(time, true); // Open hat on off-beat
            if (step % 2 === 1) this.playHiHat(time, false); // Closed hat on 16ths
        } else if (style.drums === 'dnb') {
            // Amen Break-ish: Kick on 0, 10. Snare on 4, 12.
            if (step === 0 || step === 10) this.playKick(time);
            if (step === 4 || step === 12) this.playSnare(time);
            if (step === 15) this.playSnare(time); // Ghost note
            this.playHiHat(time, step % 2 === 0); // Fast hats
        } else if (style.drums === 'bit-drums') {
            // 8-bit drums: Kick (Pitch drop) and Snare (Noise)
            if (step % 4 === 0) this.playBitKick(time);
            if (step % 4 === 2) this.playBitSnare(time);
            if (step % 2 === 1) this.playBitSnare(time, true); // Hi-hat (short noise)
        } else if (style.drums === 'dubstep') {
            // Half-time feel: Kick on 1, Snare on 3 (step 0 and 8 in 16th grid)
            if (step === 0) this.playKick(time);
            if (step === 8) this.playSnare(time, true); // Big snare
            if (step === 14) this.playKick(time); // Kick pickup
            if (step % 2 === 0) this.playHiHat(time, step % 4 === 2); // Fast hats
        } else if (style.drums === 'cinematic') {
            // Big Anthem Beat
            if (step % 4 === 0) this.playKick(time); // 4-on-the-floor
            if (step === 4 || step === 12) this.playSnare(time, true); // Big Reverb Snare
            if (step === 14 || step === 15) this.playKick(time); // Taiko fill
            if (step % 2 === 0) this.playHiHat(time, true); // Open hats driving
        } else if (style.drums === 'electro') {
            // Electro house: 4-on-floor with claps
            if (step % 4 === 0) this.playKick(time); // Every quarter note
            if (step === 4 || step === 12) this.playSnare(time); // Clap on 2 and 4
            if (step % 2 === 0) this.playHiHat(time, false); // Closed hats on 8ths
            if (step === 6 || step === 14) this.playHiHat(time, true); // Open hat accents
        }

        // --- PADS ---
        if (style.pad === 'sustained') {
            if (step === 0) this.playPad(time, rootFreq, 4 * (60 / track.tempo), 'sawtooth'); // Sustain for full bar
        } else if (style.pad === 'swelling') {
            if (step === 0) this.playPad(time, rootFreq, 4 * (60 / track.tempo), 'triangle', true); // Slow attack
        } else if (style.pad === 'chopped') {
            if (step % 4 === 0) this.playPad(time, rootFreq, 0.2, 'square'); // Staccato
        } else if (style.pad === 'stabs') {
            if (step === 4 || step === 12) this.playPad(time, rootFreq * 2, 0.1, 'sawtooth'); // Off-beat hits
        } else if (style.pad === 'massive') {
            if (step === 0) this.playPad(time, rootFreq, 8 * (60 / track.tempo), 'sine', true); // Long drone
        } else if (style.pad === 'gated') {
            // Trance gate: X . X . X . X .
            if (step % 2 === 0) this.playPad(time, rootFreq, 0.1, 'sawtooth');
        } else if (style.pad === 'dark') {
            if (step === 0) this.playPad(time, rootFreq / 2, 8 * (60 / track.tempo), 'triangle', true); // Low octave
        } else if (style.pad === 'arpeggio-chord') {
            // Arpeggio chord simulation: Root-3rd-5th-Octave fast loop
            // We'll simulate this by playing short blips
            const arpNotes = [rootFreq, rootFreq * 1.2, rootFreq * 1.5, rootFreq * 2];
            const note = arpNotes[step % 4];
            this.playMelodyNote(time, note, 0.1, 'triangle'); // Use melody synth for arp
        } else if (style.pad === 'choir') {
            if (step === 0) this.playPad(time, rootFreq, 8 * (60 / track.tempo), 'sine', true); // Eerie sine
        } else if (style.pad === 'strings') {
            if (step === 0) this.playPad(time, rootFreq, 4 * (60 / track.tempo), 'sawtooth', true); // Slow attack strings
        } else if (style.pad === 'ethereal') {
            if (step === 0) this.playPad(time, rootFreq, 8 * (60 / track.tempo), 'sine', true); // Very slow attack, long sustain
        } else if (style.pad === 'pulsing') {
            // Sidechain-style pulsing: Play on off-beats for pumping effect
            if (step % 4 === 2) this.playPad(time, rootFreq, 0.15, 'sawtooth'); // Short stabs
        }

        // --- MELODY ---
        const melodyChance = style.lead === 'fast' || style.lead === 'energetic' ? 0.5 : (style.lead === 'random' || style.lead === 'haunting' ? 0.15 : 0.3);
        if (step % 2 === 0 && Math.random() > (1 - melodyChance)) {
            const note = track.scale[Math.floor(Math.random() * track.scale.length)];
            const finalNote = Math.random() > 0.8 ? note * 2 : note;

            let type = 'square';
            let duration = 0.2;

            if (style.lead === 'cinematic') { type = 'triangle'; duration = 0.6; }
            if (style.lead === 'haunting') { type = 'triangle'; duration = 0.8; }
            if (style.lead === 'energetic') { type = 'sawtooth'; duration = 0.15; } // Fast, bright
            if (style.lead === 'bluesy') { type = 'sawtooth'; duration = 0.3; }
            if (style.lead === 'random') { type = 'sine'; duration = 1.0; }
            if (style.lead === 'trance') { type = 'sawtooth'; duration = 0.15; } // Plucky
            if (style.lead === 'acid') { type = 'sawtooth'; duration = 0.1; } // Short & Resonant
            if (style.lead === 'pure-square') { type = 'square'; duration = 0.15; } // 8-bit
            if (style.lead === 'screech') { type = 'sawtooth'; duration = 0.4; } // Long & Gliding
            if (style.lead === 'supersaw') { type = 'sawtooth'; duration = 0.4; } // Big & Detuned

            this.playMelodyNote(time, finalNote, duration, type, style.lead === 'acid', style.lead === 'screech', style.lead === 'supersaw');
        }
    }

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
            osc2.detune.value = 15; // Detune for wobble
            osc2.connect(filter);
            osc2.start(time);
            osc2.stop(time + duration);
        }

        // Filter envelope for "pluck" sound
        filter.type = 'lowpass';

        if (isWobble) {
            // Wobble Bass: LFO on Filter
            const lfo = this.ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 4; // 4Hz wobble (adjust for tempo sync later if needed)

            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 500; // Filter sweep depth

            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            lfo.start(time);
            lfo.stop(time + duration);

            filter.frequency.setValueAtTime(600, time); // Center freq
            filter.Q.value = 5; // Resonant wobble
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
        gain.connect(this.musicGain); // Route to Music bus

        osc.start(time);
        osc.stop(time + duration);
    }

    playPad(time, rootFreq, duration, type = 'sawtooth', slowAttack = false) {
        // Create a rich pad using 2 detuned oscillators
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = type;
        osc2.type = type;

        // Chord voicing: Root + Minor 3rd + 5th (Basic Triad)
        // But for pad, let's just do Root + 5th for power chord feel + Octave
        osc1.frequency.setValueAtTime(rootFreq * 2, time); // Octave up
        osc2.frequency.setValueAtTime(rootFreq * 3, time); // Fifth (approx)

        // Detune for chorus effect
        osc2.detune.value = 10;

        gain.gain.setValueAtTime(0, time);
        if (slowAttack) {
            gain.gain.linearRampToValueAtTime(0.05, time + 1.0); // Slower attack
            gain.gain.setValueAtTime(0.05, time + duration - 1.0); // Hold
        } else {
            gain.gain.linearRampToValueAtTime(0.05, time + 0.1); // Faster attack
            gain.gain.setValueAtTime(0.05, time + duration - 0.1); // Hold
        }
        gain.gain.linearRampToValueAtTime(0, time + duration); // Slow release

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.musicGain); // Route to Music bus
        // Also send to delay for space
        gain.connect(this.delayNode);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);
    }

    playMelodyNote(time, freq, duration = 0.2, type = 'square', isAcid = false, isScreech = false, isSupersaw = false) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Filter for acid
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = isAcid ? 15 : 1; // High resonance for acid

        osc.type = type;

        if (isScreech) {
            // Glide from lower note
            osc.frequency.setValueAtTime(freq * 0.5, time);
            osc.frequency.linearRampToValueAtTime(freq, time + 0.1); // Portamento
        } else {
            osc.frequency.setValueAtTime(freq, time);
        }

        if (isSupersaw) {
            // Supersaw: Add 2 more detuned oscillators
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
            filter.frequency.value = 20000; // Open
        }

        // Vibrato
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 5; // 5Hz vibrato
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 5; // Depth
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(time);

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain); // Route to Music bus for fade-in
        gain.connect(this.delayNode); // Echo on melody

        osc.start(time);
        osc.stop(time + duration);
        lfo.stop(time + duration);
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.musicGain); // Route to Music bus for fade-in

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time, bigReverb = false) {
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
        gain.connect(this.musicGain); // Route to Music bus for fade-in
        gain.connect(this.delayNode); // Reverb-ish snare

        if (bigReverb) {
            // Send more to delay for "big" sound
            const reverbSend = this.ctx.createGain();
            reverbSend.gain.value = 0.5; // More wet signal
            gain.connect(reverbSend);
            reverbSend.connect(this.delayNode);
        }

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
        gain.connect(this.musicGain); // Route to Music bus for fade-in

        noise.start(time);
    }

    playBitKick(time) {
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

    playBitSnare(time, isHat = false) {
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
}
