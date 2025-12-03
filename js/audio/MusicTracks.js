/**
 * Musical scale frequencies and track definitions
 */

export const MUSIC_SCALE = {
    C2: 65.41, Db2: 69.30, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31,
    Gb2: 92.50, G2: 98.00, Ab2: 103.83, A2: 110.00, Bb2: 116.54, B2: 123.47,

    C3: 130.81, Db3: 138.59, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61,
    Gb3: 185.00, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,

    C4: 261.63, Db4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23,
    Gb4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,

    C5: 523.25, Db5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46,
    Gb5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77
};

/**
 * Generate track definitions
 * @param {Object} N - Scale frequencies (MUSIC_SCALE)
 * @returns {Array} Array of track objects
 */
export function MUSIC_TRACKS(N) {
    return [
        {
            name: "Neon Horizon",
            hue: 180, // Cyan
            tempo: 110,
            progression: [N.C2, N.Ab2, N.F2, N.G2],
            scale: [N.C4, N.Eb4, N.F4, N.G4, N.Bb4],
            style: {
                bass: 'rolling',
                drums: 'driving',
                pad: 'sustained',
                lead: 'arpeggio'
            }
        },
        {
            name: "Cyber Sprint",
            hue: 0, // Red
            tempo: 128,
            progression: [N.D2, N.F2, N.G2, N.Bb2],
            scale: [N.D4, N.F4, N.G4, N.A4, N.C5],
            style: {
                bass: 'gallop',
                drums: 'fast',
                pad: 'chopped',
                lead: 'fast'
            }
        },
        {
            name: "Neon Drift",
            hue: 300, // Magenta
            tempo: 112,
            progression: [N.A2, N.F2, N.C2, N.G2],
            scale: [N.A4, N.C5, N.D5, N.E5, N.G5],
            style: {
                bass: 'rolling',
                drums: 'driving',
                pad: 'sustained',
                lead: 'arpeggio'
            }
        },
        {
            name: "Velocity X",
            hue: 120, // Matrix Green
            tempo: 135,
            progression: [N.Gb2, N.D2, N.A2, N.E2],
            scale: [N.Gb4, N.A4, N.B4, N.Db5, N.E5],
            style: {
                bass: 'pumping',
                drums: 'techno',
                pad: 'gated',
                lead: 'trance'
            }
        },
        {
            name: "System Override",
            hue: 30, // Neon Orange
            tempo: 170, // DnB Speed
            progression: [N.Eb2, N.B2, N.Gb2, N.Db2],
            scale: [N.Eb4, N.Gb4, N.Ab4, N.Bb4, N.Db5],
            style: {
                bass: 'reese',
                drums: 'dnb',
                pad: 'dark',
                lead: 'acid'
            }
        },
        {
            name: "Pixel Fury",
            hue: 330, // Hot Pink
            tempo: 160, // Boss Fight Speed
            progression: [N.C2, N.Bb2, N.Ab2, N.G2],
            scale: [N.C4, N.Eb4, N.F4, N.G4, N.Bb4],
            style: {
                bass: 'square-bass',
                drums: 'bit-drums',
                pad: 'arpeggio-chord',
                lead: 'pure-square'
            }
        },
        {
            name: "Neon Ascension",
            hue: 190, // Ice Blue
            tempo: 128, // Anthem Speed
            progression: [N.D2, N.Bb2, N.F2, N.C2],
            scale: [N.D4, N.F4, N.G4, N.A4, N.C5, N.D5],
            style: {
                bass: 'octave-sub',
                drums: 'cinematic',
                pad: 'strings',
                lead: 'supersaw'
            }
        },
        {
            name: "Neon Rush",
            hue: 320, // Hot Magenta/Pink
            tempo: 132, // Electro House speed
            progression: [N.E2, N.C2, N.G2, N.D2],
            scale: [N.E4, N.G4, N.A4, N.B4, N.D5],
            style: {
                bass: 'syncopated',
                drums: 'electro',
                pad: 'pulsing',
                lead: 'energetic'
            }
        }
    ];
}
