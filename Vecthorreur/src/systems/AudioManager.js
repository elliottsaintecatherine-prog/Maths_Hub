/**
 * g3 — AudioManager
 * Génère des SFX procéduraux via Web Audio API (pas de fichiers audio).
 * L'AudioContext doit être démarré après une interaction utilisateur.
 */
export default class AudioManager {
    constructor() {
        this.ctx = null; // AudioContext, initialisé au premier appel
        this.masterGain = null;
        this.droneOsc = null;     // g4 : oscillateur de drone
        this.droneGain = null;    // g4 : gain du drone
        this.droneLFO = null;     // g4 : LFO modulant le drone

        // Manor music (A1) : 4 layers — 2 superposés en boucle + 2 en alternance random
        this.manorBuffers = {};       // { name: AudioBuffer }
        this.manorLoopSources = [];   // sources des layers en boucle
        this.manorLoopGain = null;    // gain global des layers superposés
        this.manorAltGain = null;     // gain global des sons en alternance
        this.manorAltTimeout = null;  // timeout pour le prochain son alterné
        this.manorAltActive = false;  // true = manor music en cours
        this.manorAltLastIdx = -1;    // index du dernier son joué (pour ne pas répéter)
    }

    /**
     * Initialise l'AudioContext (doit être appelé après une interaction utilisateur).
     */
    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        this.masterGain.connect(this.ctx.destination);
    }

    /**
     * g3 — Son de pas : bruit blanc très court avec filtre passe-bas.
     */
    playStepSound() {
        if (!this.ctx) return;

        const duration = 0.08;
        const now = this.ctx.currentTime;

        // Bruit blanc
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.3;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        // Filtre passe-bas pour étouffer le son (pas feutré)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        filter.Q.value = 1;

        // Enveloppe de volume
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        source.start(now);
        source.stop(now + duration);
    }

    /**
     * g3 — Son de screamer : accord dissonant d'oscillateurs sawtooth aigus.
     */
    playScreamerSound() {
        if (!this.ctx) return;

        const duration = 1.5;
        const now = this.ctx.currentTime;
        const frequencies = [880, 1100, 1400]; // Accord dissonant aigu

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.exponentialRampToValueAtTime(0.5, now + 0.05); // Montée rapide
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        gainNode.connect(this.masterGain);

        for (const freq of frequencies) {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            // Glissando vers le haut pour plus d'angoisse
            osc.frequency.linearRampToValueAtTime(freq * 1.5, now + duration * 0.3);

            osc.connect(gainNode);
            osc.start(now);
            osc.stop(now + duration);
        }
    }

    /**
     * g3 — Son de mouvement du monstre : grondement sourd.
     */
    playMonsterMoveSound() {
        if (!this.ctx) return;

        const duration = 0.2;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.linearRampToValueAtTime(40, now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    // ===== g4 : Drone ambiant (sera implémenté dans le prompt g4) =====

    /**
     * g4 — Démarrer le drone d'ambiance.
     */
    startDrone() {
        if (!this.ctx || this.droneOsc) return;

        const now = this.ctx.currentTime;

        // Oscillateur principal (basse fréquence)
        this.droneOsc = this.ctx.createOscillator();
        this.droneOsc.type = 'triangle';
        this.droneOsc.frequency.setValueAtTime(50, now);

        // Volume du drone (faible)
        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.setValueAtTime(0.06, now);

        // LFO pour moduler la fréquence (palpitation)
        this.droneLFO = this.ctx.createOscillator();
        this.droneLFO.type = 'sine';
        this.droneLFO.frequency.setValueAtTime(0.3, now); // Très lente palpitation

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(8, now); // Amplitude de modulation en Hz

        this.droneLFO.connect(lfoGain);
        lfoGain.connect(this.droneOsc.frequency);

        this.droneOsc.connect(this.droneGain);
        this.droneGain.connect(this.masterGain);

        this.droneOsc.start(now);
        this.droneLFO.start(now);
    }

    /**
     * g4 — Moduler le drone selon la distance joueur-monstre.
     * Plus le monstre est proche, plus le drone est aigu et rapide.
     */
    updateDrone(playerX, playerY, monsterX, monsterY) {
        if (!this.droneOsc || !this.ctx) return;

        const dx = playerX - monsterX;
        const dy = playerY - monsterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Distance max ~28 (diagonale de la grille 41x41)
        const normalizedDist = Math.min(dist / 20, 1); // 0 = collé, 1 = loin

        const now = this.ctx.currentTime;

        // Fréquence : 50Hz (loin) -> 120Hz (proche)
        const targetFreq = 50 + (1 - normalizedDist) * 70;
        this.droneOsc.frequency.linearRampToValueAtTime(targetFreq, now + 0.5);

        // Vitesse LFO : 0.3Hz (loin) -> 2Hz (proche)
        const targetLFORate = 0.3 + (1 - normalizedDist) * 1.7;
        this.droneLFO.frequency.linearRampToValueAtTime(targetLFORate, now + 0.5);

        // Volume : 0.04 (loin) -> 0.12 (proche)
        const targetVol = 0.04 + (1 - normalizedDist) * 0.08;
        this.droneGain.gain.linearRampToValueAtTime(targetVol, now + 0.5);
    }

    // ===== A1 : Musique Manoir Blackwood (4 fichiers WAV) =====

    /**
     * Charge les 4 fichiers audio du Manoir.
     * 2 layers superposés en boucle continue : cursed_music_box, spectral_whispers
     * 2 sons en alternance random (5-20s gap) : storm_outside, midnight_bell
     */
    async loadManorAudio() {
        if (!this.ctx) return;
        const files = {
            cursed_music_box: 'assets/audio/manor/cursed_music_box.wav',
            spectral_whispers: 'assets/audio/manor/spectral_whispers.wav',
            storm_outside: 'assets/audio/manor/storm_outside.wav',
            midnight_bell: 'assets/audio/manor/midnight_bell.wav',
        };
        const promises = Object.entries(files).map(async ([key, url]) => {
            try {
                const res = await fetch(url);
                const arr = await res.arrayBuffer();
                const buf = await this.ctx.decodeAudioData(arr);
                this.manorBuffers[key] = buf;
            } catch (err) {
                console.warn(`[AudioManager] Échec chargement ${key}:`, err);
            }
        });
        await Promise.all(promises);
    }

    /**
     * Démarre la musique du Manoir : superposition + alternance.
     */
    startManorMusic() {
        if (!this.ctx || this.manorAltActive) return;
        this.manorAltActive = true;

        // Gain global pour les layers superposés (boucle continue)
        this.manorLoopGain = this.ctx.createGain();
        this.manorLoopGain.gain.value = 0.5;
        this.manorLoopGain.connect(this.masterGain);

        // Démarrer les 2 layers en boucle
        const loopLayers = [
            { name: 'cursed_music_box', gain: 0.45 },
            { name: 'spectral_whispers', gain: 0.55 },
        ];
        for (const layer of loopLayers) {
            const buf = this.manorBuffers[layer.name];
            if (!buf) continue;
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            src.loop = true;
            const g = this.ctx.createGain();
            g.gain.value = layer.gain;
            src.connect(g);
            g.connect(this.manorLoopGain);
            src.start();
            this.manorLoopSources.push(src);
        }

        // Gain global pour les sons en alternance
        this.manorAltGain = this.ctx.createGain();
        this.manorAltGain.gain.value = 0.6;
        this.manorAltGain.connect(this.masterGain);

        // Démarrer le cycle d'alternance avec un premier délai random
        this._scheduleNextAltSound();
    }

    /**
     * Stoppe la musique du Manoir (loop + alternance).
     */
    stopManorMusic() {
        this.manorAltActive = false;

        // Stopper les loops
        for (const src of this.manorLoopSources) {
            try { src.stop(); } catch (e) { /* ignore */ }
        }
        this.manorLoopSources = [];

        // Annuler le prochain son alterné
        if (this.manorAltTimeout) {
            clearTimeout(this.manorAltTimeout);
            this.manorAltTimeout = null;
        }

        // Déconnecter les gains
        if (this.manorLoopGain) {
            this.manorLoopGain.disconnect();
            this.manorLoopGain = null;
        }
        if (this.manorAltGain) {
            this.manorAltGain.disconnect();
            this.manorAltGain = null;
        }
    }

    /**
     * Programme la lecture du prochain son alterné après un délai random 5-20s.
     */
    _scheduleNextAltSound() {
        if (!this.manorAltActive) return;
        const delayMs = 5000 + Math.random() * 15000; // 5-20s
        this.manorAltTimeout = setTimeout(() => this._playNextAltSound(), delayMs);
    }

    /**
     * Joue un des sons d'alternance (storm_outside ou midnight_bell), pas le même que le précédent.
     */
    _playNextAltSound() {
        if (!this.manorAltActive || !this.ctx) return;
        const altKeys = ['storm_outside', 'midnight_bell'];
        // Choisir un index différent du précédent
        let idx;
        if (this.manorAltLastIdx === -1) {
            idx = Math.floor(Math.random() * altKeys.length);
        } else {
            idx = (this.manorAltLastIdx + 1) % altKeys.length;
        }
        this.manorAltLastIdx = idx;

        const buf = this.manorBuffers[altKeys[idx]];
        if (buf) {
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            src.connect(this.manorAltGain);
            src.start();
            // Quand le son finit, programmer le prochain
            src.onended = () => this._scheduleNextAltSound();
        } else {
            // Buffer manquant : programmer le prochain quand même
            this._scheduleNextAltSound();
        }
    }
}
