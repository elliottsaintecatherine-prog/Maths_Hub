// ════════════════════════════════════════════════════
// Le Voleur — TOUS LES EVENT LISTENERS
// ════════════════════════════════════════════════════
'use strict';

        // ══════════════════════════════════════════════════════════
        // RACCOURCIS CLAVIER — PAVÉ NUMÉRIQUE, ENTRÉE, SUPPRIMER
        // ══════════════════════════════════════════════════════════
        document.addEventListener('keydown', function(e) {
            var screenActive = document.querySelector('.screen.active');
            if (!screenActive) return;
            var phaseId = screenActive.id;

            // ── PHASE 5 : clavier virtuel (tout le clavier physique mappé) ──
            if (phaseId === 'phase-5') {
                if (e.key === 'Enter' || e.code === 'NumpadEnter') {
                    e.preventDefault();
                    window.jouerSon('click'); window.touche('OK');
                } else if (e.key === 'Delete' || e.key === 'Backspace' || e.code === 'NumpadDecimal') {
                    e.preventDefault();
                    window.jouerSon('click'); window.touche('DEL');
                } else if (e.key === '-' || e.code === 'NumpadSubtract' || e.code === 'Minus') {
                    e.preventDefault();
                    window.jouerSon('click'); window.touche('-');
                } else {
                    var digit = null;
                    if (e.code && e.code.startsWith('Numpad') && /^[0-9]$/.test(e.code.replace('Numpad',''))) {
                        digit = parseInt(e.code.replace('Numpad', ''));
                    } else if (/^[0-9]$/.test(e.key)) {
                        digit = parseInt(e.key);
                    }
                    if (digit !== null) {
                        e.preventDefault();
                        window.jouerSon('click'); window.touche(digit);
                    }
                }
                return;
            }

            // ── PHASES 1, 4, 4b : inputs numériques ──────────────────────
            var inputsMap = {
                'phase-1':  ['digit1','digit2','digit3','digit4'],
                'phase-4':  ['rep4-1','rep4-2'],
                'phase-4b': ['rep4b-1','rep4b-2a','rep4b-2b']
            };
            var validateMap = {
                'phase-1':  function() { window.jouerSon('click'); window.verifierPhase1(); },
                'phase-4':  function() { window.jouerSon('click'); window.verifierPhase4(); },
                'phase-4b': function() { window.jouerSon('click'); window.verifierPhase4b(); }
            };
            if (!inputsMap[phaseId]) return;

            var inputs = inputsMap[phaseId].map(function(id){ return document.getElementById(id); }).filter(Boolean);
            var validate = validateMap[phaseId];
            var focused = document.activeElement;
            var focusedIdx = inputs.indexOf(focused);

            // Entrée / Numpad Entrée → valider la phase
            if (e.key === 'Enter' || e.code === 'NumpadEnter') {
                e.preventDefault();
                validate();
                return;
            }

            // Tab → passer au champ suivant (cyclique)
            if (e.key === 'Tab') {
                e.preventDefault();
                var nextIdx = focusedIdx >= 0 ? (focusedIdx + 1) % inputs.length : 0;
                inputs[nextIdx].focus(); inputs[nextIdx].select();
                return;
            }

            // Supprimer hors d'un input → effacer le dernier champ rempli
            if (e.key === 'Delete' && focusedIdx < 0) {
                e.preventDefault();
                for (var i = inputs.length - 1; i >= 0; i--) {
                    if (inputs[i].value !== '') { inputs[i].value = ''; inputs[i].focus(); return; }
                }
                return;
            }

            // Pavé numérique hors input focalisé → focaliser le premier champ vide et saisir le chiffre
            var isNumpadDigit = e.code && e.code.startsWith('Numpad') && /^[0-9]$/.test(e.code.replace('Numpad',''));
            var isNumpadMinus = e.code === 'NumpadSubtract';
            if ((isNumpadDigit || isNumpadMinus) && focusedIdx < 0) {
                e.preventDefault();
                var target = inputs.find(function(inp){ return inp.value === ''; }) || inputs[0];
                target.focus();
                target.value = isNumpadMinus ? '-' : e.code.replace('Numpad','');
                target.dispatchEvent(new Event('input'));
            }
        });
