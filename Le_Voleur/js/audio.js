// ════════════════════════════════════════════════════
// Le Voleur — AUDIO ENGINE
// ════════════════════════════════════════════════════

        // --- FORCER L'AUTOPLAY DE LA MUSIQUE ---
        window.addEventListener('DOMContentLoaded', (event) => {
            let bgm = document.getElementById('bg-music');
            bgm.volume = document.getElementById('vol-bgm').value;

            // On essaie de forcer la lecture instantanément (marche souvent si on vient du Hub)
            let playPromise = bgm.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // SI (et seulement si) le navigateur bloque pour des raisons de sécurité,
                    // on attend le premier clic du joueur n'importe où sur l'écran.
                    console.log("Autoplay bloqué, attente d'interaction...");
                    document.body.addEventListener('click', function() {
                        if (bgm.paused && !window.isMuted) bgm.play();
                    }, { once: true });
                });
            }
        });
// Variables globales de volume
        window.sfxVolume = 0.8; // SFX à 80% par défaut


        // Initialiser le volume BGM au chargement
        document.getElementById('bg-music').volume = document.getElementById('vol-bgm').value;

        // Écouter les changements du curseur BGM
        document.getElementById('vol-bgm').addEventListener('input', function(e) {
            document.getElementById('bg-music').volume = e.target.value/4;
            if(window.isMuted) window.toggleMute(); // Enlève le mode "muet" si on touche au curseur
        });

        // Écouter les changements du curseur SFX
        document.getElementById('vol-sfx').addEventListener('input', function(e) {
            window.sfxVolume = e.target.value;
            window.jouerSon('click'); // Fait un petit clic pour tester le volume !
            if(window.isMuted) window.toggleMute();
        });
            // ==========================================
// MOTEUR AUDIO AVANCÉ (CHEMINS RELATIFS & ALÉATOIRE)
// ==========================================
const cheminSons = "Son/";
window.sfx = {
    // Les sons avec plusieurs variations sont mis dans des tableaux (arrays)
    click: [
        new Audio(cheminSons + 'mouseclick1.mp3'),
        new Audio(cheminSons + 'mouseclick2.mp3'),
        new Audio(cheminSons + 'mouseclick3.mp3')
    ],
    typing: [
        new Audio(cheminSons + 'typing1.mp3'),
        new Audio(cheminSons + 'typing2.mp3'),
        new Audio(cheminSons + 'typing3.mp3')
    ],
    // Les sons uniques
    error: new Audio(cheminSons + 'error.mp3'),
    success: new Audio(cheminSons + 'success.mp3')
};

        window.jouerSon = function(type) {
            if (window.isMuted) return;

            let sonAJouer;
            if (Array.isArray(window.sfx[type])) {
                const indexAleatoire = Math.floor(Math.random() * window.sfx[type].length);
                sonAJouer = window.sfx[type][indexAleatoire];
            } else {
                sonAJouer = window.sfx[type];
            }

            if (sonAJouer) {
                sonAJouer.currentTime = 0;
                sonAJouer.volume = window.sfxVolume;
                sonAJouer.play().catch(e => console.log("Son bloqué :", e));
                if (type === 'typing') {
                    var stopDelay = (sonAJouer.duration > 0 ? sonAJouer.duration : 1) * 1000 / 3;
                    setTimeout(function() { sonAJouer.pause(); }, stopDelay);
                }
            }
        };
// ==========================================
        // --- DROPDOWN PARAMÈTRES AUDIO ---
        window.toggleAudioDropdown = function() {
            document.getElementById('audio-dropdown').classList.toggle('open');
        };

        // --- NAVIGATION DEPUIS LE DROPDOWN ---
        document.getElementById('btn-dd-accueil').onclick = function() {
            document.getElementById('audio-dropdown').classList.remove('open');
            document.getElementById('bg-music').pause();
            window.historique = ['ecran-accueil'];
            window.afficherEcran('ecran-accueil');
        };
        document.getElementById('btn-dd-hub').onclick = function() {
            if (document.referrer !== '') history.back();
            else location.href = '../index.html';
        };
        document.addEventListener('click', function(e) {
            var wrapper = document.getElementById('audio-gear-wrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                document.getElementById('audio-dropdown').classList.remove('open');
            }
        });

        // --- GESTION DU BOUTON MUSIQUE ---
        window.isMuted = false;
            window.toggleMute = function() {
            window.isMuted = !window.isMuted;
            var btn = document.getElementById('btn-mute');
            var bgMusic = document.getElementById('bg-music');

            if(window.isMuted) {
                btn.innerText = "🔇";
                bgMusic.pause();
            } else {
                btn.innerText = "🔊";
                // Relance la musique uniquement si le joueur n'est pas sur le menu d'accueil
                if(window.historique[window.historique.length-1] !== 'ecran-accueil') {
                    bgMusic.play();
                }
            }
        };
