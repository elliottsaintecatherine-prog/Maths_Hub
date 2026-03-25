// ════════════════════════════════════════════════════
// Le Voleur — VARIABLES GLOBALES + LOGIQUE JEU
// ════════════════════════════════════════════════════
'use strict';

        // Vérifie si une entrée du classement correspond à une partie locale
        function estEntreeLocale(entree) {
            var sLocal = JSON.parse(localStorage.getItem('hackerScores')) || [];
            return sLocal.some(function(l) {
                return String(l.name).toUpperCase() === String(entree.name).toUpperCase()
                    && Math.round(l.score) === Math.round(entree.score);
            });
        }

        window.getRandomInt = function(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };

        window.genererQuestionMath = function() {
            var a = window.getRandomInt(-9, 9);
            var b = window.getRandomInt(-9, 9);
            if(a===0) a=1; if(b===0) b=2;

            var rand = Math.random();
            var op, res;
            if (rand < 0.33) { op = '+'; res = a + b; }
            else if (rand < 0.66) { op = '-'; res = a - b; }
            else { op = '×'; res = a * b; }

            var textB = (b < 0) ? "(" + b + ")" : b;
            return { t: a + " " + op + " " + textB, r: res };
        };

        window.temps = 30 * 60;
        window.intervalle = null;
        window.timerPhase5 = null;
        window.compteurQ = 10;
        window.historique = ['ecran-accueil'];
        window.missionStartee = false;
        window.score = 0;
        window.multiplicateur = 3.00; // DÉPART À x3.00
        window.gameData = { p1: {}, drone: {}, voleur: {}, lectureG: {}, lectureG2: {} };
        window.graphesGeneres = false;
        window.phase5Init = false;
        window.mathQ = []; window.mathIndex = 0; window.inputMath = ""; window.currentQ = {};

        // LIEN GOOGLE SCRIPT MONDAL
        const GOOGLE_APP_URL = "https://script.google.com/macros/s/AKfycbxhLdAHHn9rtVDufA3asid6IrHMlcF7YxqT-yq07bKWv5KCeGKJpeTpSVa8AvBk1VOmsQ/exec";
        var allGlobalScoresFull = []; // full dataset (all ranks) from server
        var playerGlobalRank   = null; // rang mondial du joueur (top 100 uniquement)

        // LECTURE DU NOM DU JEU VIA L'URL
        const urlParams = new URLSearchParams(window.location.search);
        const NOM_DU_JEU = urlParams.get('jeu') || 'Voleur';

        // --- GESTION DYNAMIQUE DU SCORE ET MULTIPLICATEUR ---
        window.updateScoreUI = function() {
            var elScore = document.getElementById('score-display');
            if(elScore) elScore.innerText = Math.round(window.score);

            var elCombo = document.getElementById('combo-display');
            if(elCombo) {
                elCombo.innerText = "[x" + window.multiplicateur.toFixed(2) + "]";
                if (window.multiplicateur >= 2.5) elCombo.style.color = "#00ff41";
                else if (window.multiplicateur > 1.5) elCombo.style.color = "#eab308";
                else elCombo.style.color = "var(--alert)";
            }

            var elRank = document.getElementById('rank-display');
            if (elRank) {
                var sLocal = JSON.parse(localStorage.getItem('hackerScores')) || [];
                var allScores = sLocal.map(function(s) { return s.score; });
                allScores.push(Math.round(window.score));
                var rang = calculerRang(Math.round(window.score), allScores);
                elRank.innerText = rang.grade;
                elRank.style.color = rang.color;
                elRank.title = rang.label;
            }
        };

        window.retourAccueil = function() {
            document.body.classList.remove('alert-mode');
            document.getElementById('bg-music').pause();
            window.missionStartee = false;
            window.historique = ['ecran-accueil'];
            window.afficherEcran('ecran-accueil');
            majAfficherGradeJoueur();
        };

        window.afficherEcran = function(id) {
            var ecrans = document.querySelectorAll('.screen');
            ecrans.forEach(function(e){ e.classList.remove('active'); });
            var cible = document.getElementById(id);
            if(cible) cible.classList.add('active');
            window.majRetour();
            window.scrollTo(0,0);
        };

        window.lancerJeu = function() {
            window.missionStartee = true;
            window.majRetour();
            var gb = document.getElementById('player-grade-badge');
            if (gb) gb.style.display = 'none';
            // Lancement de la musique avec un volume réduit
            if(!window.isMuted) {
                var bgMusic = document.getElementById('bg-music');
                bgMusic.volume = 0.05; // <-- Règle le volume à 20% (0.0 à 1.0)
                bgMusic.play().catch(e => console.log("Son bloqué par le navigateur"));
            }
            // Lancement de la musique
            if(!window.isMuted) {
                document.getElementById('bg-music').play().catch(e => console.log("Son bloqué par le navigateur"));
            }


            window.score = 0; window.temps = 30 * 60;
            window.multiplicateur = 3.00; // DEPART A x3.00
            window.graphesGeneres = false; window.selection = []; window.phase5Init = false; window.mathIndex = 0;
            var inputs = document.querySelectorAll('input'); inputs.forEach(function(i){ i.value = ""; });
            window.updateScoreUI();

            var a1 = window.getRandomInt(2, 4); var b1 = window.getRandomInt(1, 10); var x1 = window.getRandomInt(0, 4);
            window.gameData.p1.c1 = { txt: "f(x)="+a1+"x+"+b1, q: "Image de "+x1, sol: (a1*x1)+b1 };
            var a2 = window.getRandomInt(2, 4); var sol2 = window.getRandomInt(1, 8); var y2 = a2 * sol2;
            window.gameData.p1.c2 = { txt: "g(x)="+a2+"x", q: "Antécédent de "+y2, sol: sol2 };
            var c3 = window.getRandomInt(0, 4); var x3 = window.getRandomInt(1, 4);
            window.gameData.p1.c3 = { txt: "h(x)=x²"+(c3>0?"+"+c3:""), q: "Image de "+x3, sol: (x3*x3)+c3 };
            var c4 = window.getRandomInt(1, 9); window.gameData.p1.c4 = { txt: "k(x)="+c4, q: "Image de 2024", sol: c4 };

            var t_final = window.getRandomInt(18, 25); var t_fictif = window.getRandomInt(-12, -5);
            var a_drone = window.getRandomInt(1, 3);
            var m_voleur = a_drone * (t_final + t_fictif); var p_voleur = -a_drone * (t_final * t_fictif);
            var txt_a = (a_drone === 1) ? "" : a_drone;
            window.gameData.drone = { txt: "f(x) = " + txt_a + "x²", f: function(x){ return a_drone * x * x; }, color: '#00f3ff' };
            var sign = p_voleur >= 0 ? "+" : "";
            window.gameData.voleur = { txt: "g(x) = " + m_voleur + "x " + sign + " " + p_voleur, f: function(x){ return m_voleur * x + p_voleur; }, color: '#ff3366' };

            var a_lec = window.getRandomInt(1, 2) * (Math.random() < 0.5 ? 1 : -1);
            var b_lec = window.getRandomInt(-2, 2);
            var xImg = window.getRandomInt(-3, 3); var yImg = a_lec * xImg + b_lec;
            var xAnt = window.getRandomInt(-4, 4); while(xAnt === xImg) xAnt = window.getRandomInt(-4, 4);
            var yAnt = a_lec * xAnt + b_lec;
            window.gameData.lectureG = { f: function(x) { return a_lec * x + b_lec; }, q1_txt: "Quelle est l'image de " + xImg + " ?", q1_sol: yImg, q2_txt: "Quel est l'antécédent de " + yAnt + " ?", q2_sol: xAnt };

            var x0 = window.getRandomInt(-2, 2);
            var d = window.getRandomInt(1, 2);
            var sign2 = Math.random() < 0.5 ? 1 : -1;
            var yTarget2 = window.getRandomInt(-2, 2);
            var f_para = function(x) { return sign2 * ( (x - x0)*(x - x0) - d*d ) + yTarget2; };

            var xImg2, yImg2;
            do {
                xImg2 = window.getRandomInt(x0 - 2, x0 + 2);
                yImg2 = f_para(xImg2);
            } while (yImg2 < -6 || yImg2 > 6 || xImg2 === x0 - d || xImg2 === x0 + d);

            window.gameData.lectureG2 = {
                f: f_para, q1_txt: "Quelle est l'image de " + xImg2 + " ?", q1_sol: yImg2,
                q2_txt: "Quels sont les antécédents de " + yTarget2 + " ?", q2_sol1: x0 - d, q2_sol2: x0 + d
            };

            document.getElementById('p1-txt-1').innerText = window.gameData.p1.c1.txt; document.getElementById('p1-q-1').innerText = window.gameData.p1.c1.q;
            document.getElementById('p1-txt-2').innerText = window.gameData.p1.c2.txt; document.getElementById('p1-q-2').innerText = window.gameData.p1.c2.q;
            document.getElementById('p1-txt-3').innerText = window.gameData.p1.c3.txt; document.getElementById('p1-q-3').innerText = window.gameData.p1.c3.q;
            document.getElementById('p1-txt-4').innerText = window.gameData.p1.c4.txt; document.getElementById('p1-q-4').innerText = window.gameData.p1.c4.q;
            document.getElementById('p2-drone-txt').innerText = window.gameData.drone.txt; document.getElementById('p2-voleur-txt').innerText = window.gameData.voleur.txt;
            document.getElementById('p3-drone-txt').innerText = window.gameData.drone.txt; document.getElementById('p3-voleur-txt').innerText = window.gameData.voleur.txt;
            document.getElementById('p4-q1').innerText = window.gameData.lectureG.q1_txt; document.getElementById('p4-q2').innerText = window.gameData.lectureG.q2_txt;
            document.getElementById('p4b-q1').innerText = window.gameData.lectureG2.q1_txt; document.getElementById('p4b-q2').innerText = window.gameData.lectureG2.q2_txt;

            if(window.intervalle) clearInterval(window.intervalle);
            window.intervalle = setInterval(function() {
                window.temps--; // Le chronomètre global de 30 minutes continue de tourner

                // NOUVEAU : On vérifie sur quel écran le joueur se trouve actuellement
                var ecranActuel = window.historique[window.historique.length - 1];
                var estUneEnigme = ['phase-1', 'phase-3', 'phase-4', 'phase-4b', 'phase-5'].includes(ecranActuel);

                // Le multiplicateur ne baisse QUE si on est sur une page d'énigme
                if (estUneEnigme) {
                    window.multiplicateur = Math.max(1.00, window.multiplicateur - 0.10);
                }

                window.updateScoreUI();

                var m = Math.floor(Math.abs(window.temps) / 60); var s = Math.abs(window.temps) % 60;
                document.getElementById('timer').innerText = (window.temps<0?"- ":"")+(m<10?"0":"")+m+":"+(s<10?"0":"")+s;
                if(window.temps<0) document.getElementById('timer').style.color="var(--alert)";
            }, 1000);

            window.naviguerVers('ecran-0');
        };

        window.debuterMission = function() { window.naviguerVers('story-1'); };

        window.naviguerVers = function(id) {
            window.afficherEcran(id);
            window.historique.push(id);
            window.majRetour();

            // --- NOUVEAUTÉ : On remet la pression (et le bonus) à fond à chaque nouvelle page ! ---
            window.multiplicateur = 3.00;
            window.updateScoreUI();

            if(id === 'phase-3') window.genererGraphes();
            if(id === 'phase-4') { setTimeout(function(){ window.dessinerGrilleLecture(document.getElementById('canvas-lecture'), window.gameData.lectureG.f, "#ff3366"); }, 50); }
            if(id === 'phase-4b') { setTimeout(function(){ window.dessinerGrilleLecture(document.getElementById('canvas-lecture-2'), window.gameData.lectureG2.f, "#00f3ff"); }, 50); }

            if(id === 'phase-5') {
                document.body.classList.add('alert-mode');
                window.lancerPhase5();
            } else {
                document.body.classList.remove('alert-mode');
            }
        };

        window.actionRetour = function() {
            if(window.historique.length > 1) {
                window.historique.pop();
                var prevId = window.historique[window.historique.length - 1];
                if(prevId !== 'phase-5') document.body.classList.remove('alert-mode');
                window.afficherEcran(prevId);
            }
        };

        window.majRetour = function() {
            var ecranActuel = window.historique[window.historique.length-1];
            var surAccueil = window.historique.length <= 1 || ecranActuel === 'ecran-accueil' || ecranActuel === 'ecran-classement';
            document.getElementById('btn-retour').style.visibility = surAccueil ? 'hidden' : 'visible';
            document.getElementById('top-bar-center').style.visibility = (!window.missionStartee) ? 'hidden' : 'visible';
        };

        majAfficherGradeJoueur();

        // --- PHASES DE JEU : VERIFICATIONS & PENALITÉS ---
        window.verifierPhase1 = function() {
            var d1 = parseInt(document.getElementById('digit1').value); var d2 = parseInt(document.getElementById('digit2').value);
            var d3 = parseInt(document.getElementById('digit3').value); var d4 = parseInt(document.getElementById('digit4').value);
            if(d1===window.gameData.p1.c1.sol && d2===window.gameData.p1.c2.sol && d3===window.gameData.p1.c3.sol && d4===window.gameData.p1.c4.sol) {
                window.score += (500 * window.multiplicateur);
                window.updateScoreUI(); window.naviguerVers('story-2');
            } else {
                alert("CODE INCORRECT ! Pénalité : Multiplicateur à x1.00 et -3 min.");
                window.temps-=180; window.score -= 250; window.multiplicateur = 1.0; window.updateScoreUI();
            }
        };

        window.genererGraphes = function() {
            if(window.graphesGeneres) return;
            var zone = document.getElementById('zone-graphes'); zone.innerHTML = "";
            var configs = [
                {id:'ok1', f: window.gameData.voleur.f},
                {id:'ok2', f: window.gameData.drone.f},
                {id:'no1', f:function(x){return -20 * x + 100;}},
                {id:'no2', f:function(x){return 150;}},
                {id:'no3', f:function(x){return -2 * x * x + 400;}},
                {id:'no4', f:function(x){return 35 * x;}},
                {id:'no5', f:function(x){return Math.abs(x) * 30;}},
                {id:'no6', f:function(x){return 2 * (x - 5) * (x - 5);}}
            ];
            configs.sort(function(){return 0.5 - Math.random()});
            configs.forEach(function(c) {
                var div = document.createElement('div'); div.className = 'card radar-wrapper'; div.dataset.id = c.id; div.dataset.state = "0"; div.style.marginBottom = "0";

                var scanner = document.createElement('div'); scanner.className = 'radar-scanner'; div.appendChild(scanner);

                var lbl = document.createElement('div'); lbl.className = 'label-overlay'; div.appendChild(lbl);
                var cvs = document.createElement('canvas'); div.appendChild(cvs); zone.appendChild(div);
                window.dessinerCourbe(cvs, c.f, "rgba(255,255,255,0.7)", true);

                div.onclick = function() {
                    window.jouerSon('click'); // <--- AJOUTER CETTE LIGNE ICI
                    var st = parseInt(div.dataset.state); var nst = (st+1)%3; div.dataset.state = nst;
                    div.classList.remove('selected-drone', 'selected-voleur'); lbl.innerText = ""; var col = "rgba(255,255,255,0.7)";
                    scanner.style.background = "var(--primary)"; scanner.style.boxShadow = "0 0 10px var(--primary)";

                    if(nst===1) {
                        div.classList.add('selected-drone'); lbl.innerText = "DRONE"; lbl.style.color="var(--primary)"; col = "var(--primary)";
                    } else if(nst===2) {
                        div.classList.add('selected-voleur'); lbl.innerText = "VOLEUR"; lbl.style.color="var(--alert)"; col = "var(--alert)";
                        scanner.style.background = "var(--alert)"; scanner.style.boxShadow = "0 0 10px var(--alert)";
                    } else {
                        scanner.style.background = "rgba(255,255,255,0.2)"; scanner.style.boxShadow = "none";
                    }
                    window.dessinerCourbe(cvs, c.f, col, true);
                };
            });
            window.graphesGeneres = true;
        };

        window.verifierPhase3 = function() {
            var dr = document.querySelector('.card.selected-drone'); var vo = document.querySelector('.card.selected-voleur');
            if(!dr || !vo) { alert("Associez un Drone (Bleu) et un Voleur (Rouge) pour continuer."); return; }
            if(dr.dataset.id === 'ok2' && vo.dataset.id === 'ok1') {
                var tot = document.querySelectorAll('.selected-drone, .selected-voleur').length;
                if(tot>2) { alert("Surcharge radar : Trop de cibles sélectionnées !"); return; }
                window.score += (300 * window.multiplicateur);
                window.updateScoreUI(); window.naviguerVers('story-4');
            } else {
                alert("Erreur d'identification ! Multiplicateur à x1.00 et -2 min.");
                window.temps-=120; window.score -= 150; window.multiplicateur = 1.0; window.updateScoreUI();
            }
        };

        window.verifierPhase4 = function() {
            var r1 = parseInt(document.getElementById('rep4-1').value);
            var r2 = parseInt(document.getElementById('rep4-2').value);
            if(r1 === window.gameData.lectureG.q1_sol && r2 === window.gameData.lectureG.q2_sol) {
                window.score += (200 * window.multiplicateur);
                window.updateScoreUI(); window.naviguerVers('story-4b');
            } else {
                alert("Échec du calibrage manuel. Multiplicateur à x1.00 et -2 min.");
                window.temps-=120; window.score -= 150; window.multiplicateur = 1.0; window.updateScoreUI();
            }
        };

        window.verifierPhase4b = function() {
            var r1 = parseInt(document.getElementById('rep4b-1').value);
            var r2a = parseInt(document.getElementById('rep4b-2a').value);
            var r2b = parseInt(document.getElementById('rep4b-2b').value);

            var sol1 = window.gameData.lectureG2.q1_sol;
            var sol2a = window.gameData.lectureG2.q2_sol1;
            var sol2b = window.gameData.lectureG2.q2_sol2;

            var imgOk = (r1 === sol1);
            var antOk = (r2a === sol2a && r2b === sol2b) || (r2a === sol2b && r2b === sol2a);

            if(imgOk && antOk) {
                window.score += (200 * window.multiplicateur);
                window.updateScoreUI(); window.naviguerVers('story-5');
            } else {
                alert("Impact manqué. Calibrage erroné. Multiplicateur à x1.00 et -2 min.");
                window.temps -= 120; window.score -= 150; window.multiplicateur = 1.0; window.updateScoreUI();
            }
        };

        window.lancerPhase5 = function() {
            if(window.phase5Init) { window.showQ(); return; }
            window.mathQ = []; for(var i=0; i<10; i++) window.mathQ.push(window.genererQuestionMath());
            document.getElementById('prog-bar').style.width = "0%"; window.phase5Init = true;
            window.updateScoreUI(); window.showQ();
        };

        window.showQ = function() {
            if(window.mathIndex>=window.mathQ.length) { window.fin(); return; }
            var percent = (window.mathIndex / window.mathQ.length) * 100;
            document.getElementById('prog-bar').style.width = percent + "%";

            if(window.timerPhase5) clearInterval(window.timerPhase5);
            window.compteurQ = 10; document.getElementById('q-timer-display').innerText = window.compteurQ; window.updateScoreUI();

            window.timerPhase5 = setInterval(function() {
                window.compteurQ--; document.getElementById('q-timer-display').innerText = window.compteurQ; window.updateScoreUI();

                if(window.compteurQ <= 0) {
                    clearInterval(window.timerPhase5);
                    document.getElementById('feedback').innerText = "DÉLAI DÉPASSÉ (-1 min)"; document.getElementById('feedback').style.color = "var(--alert)";
                    window.temps -= 60; window.score -= 150; window.multiplicateur = 1.0; window.updateScoreUI();

                    if(window.mathIndex > 0) window.mathIndex--;
                    window.mathQ[window.mathIndex] = window.genererQuestionMath(); setTimeout(window.showQ, 1000);
                }
            }, 1000);

            window.currentQ = window.mathQ[window.mathIndex];
            document.getElementById('question-math').innerText = window.currentQ.t + " = ?";
            window.inputMath = ""; document.getElementById('feedback').innerText = "";
        };

        window.touche = function(k) {
            if(k==='DEL') window.inputMath = window.inputMath.slice(0, -1);
            else if(k==='-') { if(window.inputMath.length===0) window.inputMath += "-"; }
            else if(k==='OK') {
                window.jouerSon('typing');
                if(parseInt(window.inputMath)===window.currentQ.r) {
                    clearInterval(window.timerPhase5);

                    var points = Math.round(100 * window.multiplicateur);
                    window.score += points;

                    // Récompense phase finale (Max x3.00)
                    window.multiplicateur = Math.min(3.00, window.multiplicateur + 0.20);
                    window.updateScoreUI();

                    document.getElementById('feedback').innerText = "+" + points + " pts"; document.getElementById('feedback').style.color = "#00ff41";
                    window.mathIndex++; window.showQ();
                } else {
                    document.getElementById('feedback').innerText="ERREUR DE CALCUL (-1 min)"; document.getElementById('feedback').style.color = "var(--alert)";
                    window.inputMath=""; window.temps-=60; window.score -= 150; window.multiplicateur = 1.0; window.updateScoreUI();
                    if(window.mathIndex > 0) window.mathIndex--;
                    window.mathQ[window.mathIndex] = window.genererQuestionMath(); setTimeout(window.showQ, 500);
                }
            } else { if(window.inputMath.length<5) window.inputMath+=k; }
            if(k!=='OK') document.getElementById('feedback').innerText=window.inputMath;
        };

        window.fin = function() {
            document.body.classList.remove('alert-mode');
            if(window.intervalle) clearInterval(window.intervalle);
            if(window.timerPhase5) clearInterval(window.timerPhase5);
            document.getElementById('bg-music').pause();

            window.afficherEcran('ecran-revelation');
            document.getElementById('btn-retour').style.visibility="hidden";

            var titre = document.getElementById('titre-revelation');
            var blocSuspect = document.getElementById('bloc-suspect');
            var blocEchec = document.getElementById('bloc-echec');

            if(window.temps > 0) {
                titre.innerText = "MISSION ACCOMPLIE"; titre.style.color = "var(--primary)"; titre.style.textShadow = "0 0 15px var(--primary-glow)";
                blocSuspect.style.display = "block"; blocEchec.style.display = "none";
                var timeBonus = window.temps * 5; window.score += timeBonus;
                document.getElementById('bonus-detail').innerText = "(Bonus temps d'extraction: " + timeBonus + " pts)";
            } else {
                titre.innerText = "ÉCHEC DE LA MISSION"; titre.style.color = "var(--alert)"; titre.style.textShadow = "0 0 15px var(--alert-glow)";
                blocSuspect.style.display = "none"; blocEchec.style.display = "block";
                document.getElementById('bonus-detail').innerText = "(Temps imparti écoulé)";
            }

            window.updateScoreUI(); document.getElementById('final-score-display').innerText = Math.round(window.score);
        };

        window.voirRapportScore = function() {
            var btn = document.querySelector("#ecran-fin .action-btn");
            if(btn) { btn.innerText = "SAUVEGARDER DANS LA BASE"; btn.disabled = false; }
            window.afficherEcran('ecran-fin');
        };
