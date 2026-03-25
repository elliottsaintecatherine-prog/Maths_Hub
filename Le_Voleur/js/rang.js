// ════════════════════════════════════════════════════
// Le Voleur — SYSTÈME DE GRADES
// ════════════════════════════════════════════════════
'use strict';

        // --- SYSTÈME DE RANGS ---
        function calculerRang(score, tousLesScores) {
            if (!tousLesScores || tousLesScores.length === 0) return { grade: '?', label: '', color: '#94a3b8' };
            var nb = tousLesScores.filter(function(s) { return s <= score; }).length;
            var pct = (nb / tousLesScores.length) * 100;
            if (pct <= 50) return { grade: 'F',  label: 'Recrue',           color: '#64748b' };
            if (pct <= 65) return { grade: 'D',  label: 'Apprenti',         color: '#f59e0b' };
            if (pct <= 75) return { grade: 'C',  label: 'Voleur',           color: '#10b981' };
            if (pct <= 80) return { grade: 'B',  label: 'Cambrioleur',      color: '#3b82f6' };
            if (pct <= 90) return { grade: 'A',  label: 'Maître Voleur',    color: '#8b5cf6' };
            if (pct <= 97) return { grade: 'S',  label: 'Fantôme',          color: '#f97316' };
            return             { grade: 'SS', label: 'Ombre Légendaire',  color: '#f43f5e' };
        }

        function majAfficherGradeJoueur() {
            var badge = document.getElementById('player-grade-badge');
            if (!badge) return;
            var sLocal = JSON.parse(localStorage.getItem('hackerScores')) || [];
            if (sLocal.length === 0) { badge.style.display = 'none'; return; }
            var allScores = sLocal.map(function(s) { return s.score; });
            var bestScore = Math.max.apply(null, allScores);
            var rang = calculerRang(bestScore, allScores);
            badge.style.color = rang.color;
            badge.style.borderColor = rang.color;
            badge.style.textShadow = '0 0 8px ' + rang.color + ', 0 0 16px ' + rang.color + '55';
            if (playerGlobalRank && playerGlobalRank <= 100) {
                badge.innerHTML = '<span class="pb-grade">' + rang.grade + '</span><span class="pb-rank">#' + playerGlobalRank + '</span>';
                badge.style.display = 'inline-flex';
            } else {
                badge.innerHTML = rang.grade;
                badge.style.display = 'inline-block';
            }
        }
