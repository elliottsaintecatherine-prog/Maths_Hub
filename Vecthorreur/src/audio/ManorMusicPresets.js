/**
 * VECTHORREUR - Procedural Music Engine [MAP1-MANOIR]
 * Implementations of the 6 variants for A1 - Main Music
 */

export const MANOR_MUSIC_PRESETS = {
    V1_CHAMBER: {
        name: "Chamber Horror",
        bpm: 45,
        layers: [
            { type: 'harpsichord', style: 'dissonant_arpeggio', gain: 0.4 },
            { type: 'cello_drone', frequency: 55, gain: 0.6 },
            { type: 'sfx_wood_creak', interval: [2000, 8000], gain: 0.2 },
            { type: 'bell_carillon', interval: 15000, gain: 0.3 }
        ]
    },
    V2_TENSION: {
        name: "Psychological Tension",
        bpm: 30,
        layers: [
            { type: 'prepared_piano', style: 'isolated_staccato', gain: 0.3 },
            { type: 'strings_sul_ponticello', texture: 'shivering', gain: 0.5 },
            { type: 'silence_gap', duration: [5000, 8000] }
        ]
    },
    V3_AMBIENT: {
        name: "Dark Ambient",
        bpm: 0,
        layers: [
            { type: 'deep_sub_drone', frequency: 32, gain: 0.7 },
            { type: 'music_box_deformed', style: 'slow_lullaby', detune: -1200, gain: 0.3 },
            { type: 'rain_loop', filter: 'lowpass', gain: 0.4 },
            { type: 'funeral_bell_far', interval: 20000, gain: 0.2 }
        ]
    },
    V4_GOTHIC: {
        name: "Gothic Organ",
        bpm: 40,
        layers: [
            { type: 'cathedral_organ', chords: 'minor_suspended', gain: 0.6 },
            { type: 'ghost_choir', detune_oscillation: 50, gain: 0.4 },
            { type: 'funeral_bell_heavy', interval: 45000, gain: 0.5 }
        ]
    },
    V5_INDUSTRIAL: {
        name: "Ghost Industry",
        bpm: 50,
        layers: [
            { type: 'mechanical_beat', waveform: 'square_kick', gain: 0.5 },
            { type: 'steam_whistle', pitch: 'high_random', gain: 0.2 },
            { type: 'metal_grind', texture: 'periodic', gain: 0.3 }
        ]
    },
    V6_ROMANTIC: {
        name: "Corrupted Waltz",
        bpm: 60, // Variable
        layers: [
            { type: 'piano_waltz', scale: 'harmonic_minor', instability: 0.8, gain: 0.5 },
            { type: 'violin_solo', style: 'scratchy_intermittent', gain: 0.4 }
        ]
    }
};

/**
 * Note: These presets are used by the WebAudioSynthesizer 
 * to generate the real-time soundscape without external MP3 files.
 */
