// ════════════════════════════════════════════════════
// Le Voleur — SCORES, GOOGLE SHEETS, FILTRES
// ════════════════════════════════════════════════════
'use strict';

        window.sauvegarderScore = function() {
            var name = document.getElementById('player-name').value;
            if(!name) { alert("Saisie identifiant obligatoire."); return; }

            var btn = document.querySelector("#ecran-fin .action-btn");
            btn.innerText = "ENVOI EN COURS...";
            btn.disabled = true;

            var elapsed = Math.max(0, 30 * 60 - window.temps);
            var m = Math.floor(elapsed / 60);
            var s = elapsed % 60;
            var sStr = (s < 10 ? "0" : "") + s;
            var tempsFormate = m + "m " + sStr + "s";

            var sLocal = JSON.parse(localStorage.getItem('hackerScores')) || [];
            sLocal.push({ name: name, score: Math.round(window.score), date: new Date().toLocaleDateString('fr-FR'), time: tempsFormate });
            sLocal.sort((a,b) => b.score - a.score);
            localStorage.setItem('hackerScores', JSON.stringify(sLocal.slice(0, 10)));
            majAfficherGradeJoueur();

            if(GOOGLE_APP_URL.includes("library")) {
                alert("Archive locale mise à jour.");
                window.retourAccueil(); return;
            }

            var urlSauvegarde = GOOGLE_APP_URL
                + "?action=save"
                + "&Jeu=" + encodeURIComponent(NOM_DU_JEU)
                + "&Name=" + encodeURIComponent(name)
                + "&Score=" + Math.round(window.score)
                + "&Date=" + encodeURIComponent(new Date().toLocaleDateString('fr-FR'))
                + "&Time=" + encodeURIComponent(tempsFormate);

            fetch(urlSauvegarde, { method: 'GET', mode: 'no-cors' })
            .then(() => {
                alert("Données transmises à la base centrale.");
                window.retourAccueil();
            })
            .catch(error => {
                alert("Échec réseau distant. Enregistré localement.");
                window.retourAccueil();
            });
        };

        // ─── Helpers filtres ────────────────────────────────────────

        function escapeHTML(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function parseTempsSecs(str) {
            if (!str) return null;
            var m1 = str.match(/^(\d+)m\s*(\d+)s$/);
            if (m1) return parseInt(m1[1]) * 60 + parseInt(m1[2]);
            var m2 = str.match(/(\d+)\s*min\s*(\d+)s/);
            if (m2) return parseInt(m2[1]) * 60 + parseInt(m2[2]);
            return null;
        }

        function parseDateEntry(str) {
            if (!str) return null;
            if (str.includes('T')) return new Date(str);
            var p = str.split('/');
            if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
            return null;
        }

        function getPeriodRange(periode) {
            var now = new Date();
            var y = now.getFullYear(), mo = now.getMonth(), d = now.getDate();
            if (periode === 'today')  return { from: new Date(y,mo,d,0,0,0),  to: new Date(y,mo,d,23,59,59) };
            if (periode === 'week')   { var diff = (now.getDay() === 0 ? 6 : now.getDay() - 1); return { from: new Date(y,mo,d-diff,0,0,0), to: new Date(y,mo,d,23,59,59) }; }
            if (periode === 'month')  return { from: new Date(y,mo,1,0,0,0),  to: new Date(y,mo,d,23,59,59) };
            if (periode === 'year')   return { from: new Date(y,0,1,0,0,0),   to: new Date(y,mo,d,23,59,59) };
            return null;
        }

        // Génère la cellule de rang selon la position globale
        function cellRang(rank, score, allScoreValues) {
            if (rank === 1) return '<td class="rc rc-medal rc-gold">🥇</td>';
            if (rank === 2) return '<td class="rc rc-medal rc-silver">🥈</td>';
            if (rank === 3) return '<td class="rc rc-medal rc-bronze">🥉</td>';
            var r = calculerRang(score, allScoreValues);
            var c = r.color;
            var glow = c + '44';
            if (rank <= 100) {
                return '<td class="rc"><div class="rc-badge" style="color:'+c+';border-color:'+c+';box-shadow:0 0 8px '+glow+'">' +
                       '<span class="rc-grade">'+r.grade+'</span>' +
                       '<span class="rc-num">#'+rank+'</span>' +
                       '</div></td>';
            }
            // rang > 100 : badge grade seul, sans numéro
            return '<td class="rc"><div class="rc-icon" style="color:'+c+';border-color:'+c+'66">'+r.grade+'</div></td>';
        }

        function afficherTableauMondial(scores, totalFull, filteredTotal) {
            var div = document.getElementById('liste-scores');

            // Valeurs de score pour calcul percentile (sur le dataset complet)
            var allScoreValues = allGlobalScoresFull.map(function(s) { return s.score; });

            // Joueur local hors top-200 ?
            var playerBeyond = null;
            allGlobalScoresFull.forEach(function(x) {
                if (!playerBeyond && x._grank > 200 && estEntreeLocale(x)) playerBeyond = x;
            });

            var html = '<table><tr><th>RANG</th><th>AGENT</th><th>SCORE</th><th>TEMPS</th><th>DATE</th></tr>';
            scores.forEach(function(x) {
                var tempsAffiche = x.time ? escapeHTML(x.time) : '—';
                var dateAffiche  = x.date;
                if (dateAffiche && dateAffiche.includes('T')) dateAffiche = new Date(dateAffiche).toLocaleDateString('fr-FR');
                else dateAffiche = escapeHTML(dateAffiche) || '—';
                var safeName  = escapeHTML(x.name);
                var isLocal   = estEntreeLocale(x);
                var trClass   = isLocal ? ' class="local-entry"' : '';
                var nameCell  = isLocal ? '<span class="agent-name">'+safeName+'</span>' : safeName;
                html += '<tr'+trClass+'>'+cellRang(x._grank, x.score, allScoreValues)+'<td>'+nameCell+'</td><td class="score-num">'+escapeHTML(x.score)+'</td><td>'+tempsAffiche+'</td><td>'+dateAffiche+'</td></tr>';
            });

            // Ligne joueur hors top-200
            if (playerBeyond) {
                var pTemps    = playerBeyond.time ? escapeHTML(playerBeyond.time) : '—';
                var pDate     = playerBeyond.date;
                if (pDate && pDate.includes('T')) pDate = new Date(pDate).toLocaleDateString('fr-FR');
                else pDate = escapeHTML(pDate) || '—';
                var pSafeName = escapeHTML(playerBeyond.name);
                html += '<tr class="beyond-rank-row local-entry">'+cellRang(playerBeyond._grank, playerBeyond.score, allScoreValues)+'<td><span class="agent-name">'+pSafeName+'</span><span class="beyond-rank-label">Votre classement : #'+playerBeyond._grank+'</span></td><td class="score-num">'+escapeHTML(playerBeyond.score)+'</td><td>'+pTemps+'</td><td>'+pDate+'</td></tr>';
            }

            var shownCount  = filteredTotal !== undefined ? filteredTotal : scores.length;
            var displayedNb = scores.length;
            html += '</table>';
            html += '<p class="filtre-count">'+displayedNb+' joueur'+(displayedNb>1?'s':'')+' affiché'+(displayedNb>1?'s':'')+' · '+shownCount+' correspondant'+(shownCount>1?'s':'')+' · '+totalFull+' en base</p>';
            div.innerHTML = html;
        }

        window.appliquerFiltres = function() {
            if (!allGlobalScoresFull.length) return;

            var nom     = (document.getElementById('filtre-nom').value || '').trim().toLowerCase();
            var dateDe  = document.getElementById('filtre-date-de').value;
            var dateA   = document.getElementById('filtre-date-a').value;
            var tpsMin  = document.getElementById('filtre-tps-min').value.trim();
            var tpsMax  = document.getElementById('filtre-tps-max').value.trim();
            var activePer = document.querySelector('.filtre-periode.active');
            var periode = activePer ? activePer.dataset.periode : 'all';

            var periodRange = (periode !== 'all' && !dateDe && !dateA) ? getPeriodRange(periode) : null;
            var customFrom  = dateDe ? new Date(dateDe + 'T00:00:00') : null;
            var customTo    = dateA  ? new Date(dateA  + 'T23:59:59') : null;

            var tpsMinSecs = null, tpsMaxSecs = null;
            if (tpsMin) { var p=tpsMin.split(':'); tpsMinSecs = (parseInt(p[0])||0)*60+(parseInt(p[1])||0); }
            if (tpsMax) { var q=tpsMax.split(':'); tpsMaxSecs = (parseInt(q[0])||0)*60+(parseInt(q[1])||0); }

            // Filtrer SUR LE TABLEAU COMPLET, puis couper à 200 pour l'affichage
            var filtered = allGlobalScoresFull.filter(function(x) {
                if (nom && x.name.toLowerCase().indexOf(nom) === -1) return false;
                var xDate = parseDateEntry(x.date);
                if (periodRange && xDate) {
                    if (periodRange.from && xDate < periodRange.from) return false;
                    if (periodRange.to   && xDate > periodRange.to)   return false;
                }
                if (customFrom && xDate && xDate < customFrom) return false;
                if (customTo   && xDate && xDate > customTo)   return false;
                if (tpsMinSecs !== null || tpsMaxSecs !== null) {
                    var xSecs = parseTempsSecs(x.time);
                    if (xSecs !== null) {
                        if (tpsMinSecs !== null && xSecs < tpsMinSecs) return false;
                        if (tpsMaxSecs !== null && xSecs > tpsMaxSecs) return false;
                    }
                }
                return true;
            });

            // Cap à 200 après filtrage (pas avant)
            var display200 = filtered.slice(0, 200);

            majFiltreBadge();
            afficherTableauMondial(display200, allGlobalScoresFull.length, filtered.length);
        };

        window.setPeriode = function(btn, periode) {
            document.querySelectorAll('.filtre-periode').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            document.getElementById('filtre-date-de').value = '';
            document.getElementById('filtre-date-a').value  = '';
            majFiltreBadge();
            window.appliquerFiltres();
        };

        window.onDateCustomChange = function() {
            document.querySelectorAll('.filtre-periode').forEach(function(b) { b.classList.remove('active'); });
            majFiltreBadge();
            window.appliquerFiltres();
        };

        function majFiltreBadge() {
            var badge = document.getElementById('filtre-toggle-badge');
            if (!badge) return;
            var n = 0;
            var nom    = document.getElementById('filtre-nom');
            var dateDe = document.getElementById('filtre-date-de');
            var dateA  = document.getElementById('filtre-date-a');
            var tMin   = document.getElementById('filtre-tps-min');
            var tMax   = document.getElementById('filtre-tps-max');
            var per    = document.querySelector('.filtre-periode.active');
            if (nom    && nom.value.trim())       n++;
            if (dateDe && dateDe.value)           n++;
            if (dateA  && dateA.value)            n++;
            if (tMin   && tMin.value.trim())      n++;
            if (tMax   && tMax.value.trim())      n++;
            if (per    && per.dataset.periode !== 'all') n++;
            if (n > 0) {
                badge.textContent = n + ' actif' + (n > 1 ? 's' : '');
                badge.className = 'filtre-badge-on';
            } else {
                badge.className = 'filtre-badge-off';
            }
        }

        window.toggleFiltres = function() {
            document.getElementById('filtre-barre').classList.toggle('open');
        };

        window.reinitialiserFiltres = function() {
            document.getElementById('filtre-nom').value     = '';
            document.getElementById('filtre-date-de').value = '';
            document.getElementById('filtre-date-a').value  = '';
            document.getElementById('filtre-tps-min').value = '';
            document.getElementById('filtre-tps-max').value = '';
            document.querySelectorAll('.filtre-periode').forEach(function(b) { b.classList.remove('active'); });
            document.querySelector('.filtre-periode[data-periode="all"]').classList.add('active');
            majFiltreBadge();
            window.appliquerFiltres();
        };

        // ─── voirScores ─────────────────────────────────────────────

        window.voirScores = function(mode) {
            window.naviguerVers('ecran-classement');
            var div   = document.getElementById('liste-scores');
            var titre = document.getElementById('titre-classement');
            var filtreBarre = document.getElementById('filtre-barre');

            if (mode === 'local') {
                titre.innerText = "ARCHIVES LOCALES";
                filtreBarre.classList.remove('visible');
                filtreBarre.classList.remove('open');
                affichageLocalSeulement(div); return;
            }

            titre.innerText = "RÉSEAU MONDIAL";
            filtreBarre.classList.add('visible');
            filtreBarre.classList.remove('open');
            // reset filters state
            document.querySelectorAll('.filtre-periode').forEach(function(b) { b.classList.remove('active'); });
            document.querySelector('.filtre-periode[data-periode="all"]').classList.add('active');
            document.getElementById('filtre-nom').value     = '';
            document.getElementById('filtre-date-de').value = '';
            document.getElementById('filtre-date-a').value  = '';
            document.getElementById('filtre-tps-min').value = '';
            document.getElementById('filtre-tps-max').value = '';
            majFiltreBadge();

            div.innerHTML = "<p style='text-align:center; animation: blink 1s infinite;'>Connexion à la base de données...</p>";

            if (GOOGLE_APP_URL.includes("library")) {
                div.innerHTML = "<p style='text-align:center; color:red;'>Liaison montante rompue.</p>"; return;
            }

            var urlLecture = GOOGLE_APP_URL + "?action=read&Jeu=" + encodeURIComponent(NOM_DU_JEU);

            fetch(urlLecture)
                .then(function(res) { return res.json(); })
                .then(function(raw) {
                    // Normaliser : certains Apps Scripts enveloppent dans { data: [...] }
                    var scores = Array.isArray(raw) ? raw : (raw.data || raw.scores || Object.values(raw));
                    if (!scores || scores.length === 0) { div.innerHTML = "<p style='text-align:center'>Base de données vierge.</p>"; return; }
                    scores.sort(function(a,b) { return b.score - a.score; });
                    // Pré-assigner le rang global sur chaque objet — évite indexOf()
                    scores.forEach(function(x, i) { x._grank = i + 1; });
                    allGlobalScoresFull = scores;
                    // Détecter le meilleur rang mondial du joueur local
                    playerGlobalRank = null;
                    for (var ri = 0; ri < allGlobalScoresFull.length; ri++) {
                        if (estEntreeLocale(allGlobalScoresFull[ri])) {
                            playerGlobalRank = allGlobalScoresFull[ri]._grank;
                            break; // premier = meilleur rang (déjà trié)
                        }
                    }
                    majAfficherGradeJoueur();
                    window.appliquerFiltres();
                })
                .catch(function() {
                    div.innerHTML = "<p style='text-align:center; color:red;'>Échec de l'extraction des données.</p>";
                });
        };

        function affichageLocalSeulement(div) {
            var sLocal = JSON.parse(localStorage.getItem('hackerScores')) || [];
            if(sLocal.length === 0) { div.innerHTML = "<p style='text-align:center; color:#94a3b8;'>Aucune archive locale trouvée.</p>"; return; }
            var allScores = sLocal.map(function(s) { return s.score; });
            var html = "<table><tr><th>#</th><th>AGENT</th><th>SCORE</th><th>TEMPS PRIS</th><th>DATE</th></tr>";
            sLocal.forEach(function(x, i) {
                var tempsAffiche = x.time ? x.time : "-- min --s";
                // Toutes les entrées locales sont "les miennes"
                html += '<tr class="local-entry"><td>#'+(i+1)+'</td><td><span class="agent-name">'+x.name+'</span></td><td class="score-num">'+x.score+'</td><td>'+tempsAffiche+'</td><td>'+x.date+'</td></tr>';
            });
            div.innerHTML = html + "</table>";
        }

        window.ouvrirRankModal = function() {
            document.getElementById('rank-modal').classList.add('open');
        };
        window.fermerRankModal = function() {
            document.getElementById('rank-modal').classList.remove('open');
        };
