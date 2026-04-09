/* =========================================================================
   LE CLASH ET ENIGMES
   ========================================================================= */

let surchargeTarget = null;
let clashStartTime  = 0;

function triggerSurchargePuzzle(fighter) {
    if (gameState.clashActive || !gameState.roundActive) return;
    surchargeTarget = fighter;
    gameState.clashActive = true;

    const puzzle = generateSurchargePuzzle();
    gameState.currentAns   = puzzle.correct;
    gameState.isSurcharge  = true;

    const content = document.getElementById('puzzle-content');
    let html = '<div class="clash-title" style="color:#00ffff;">⚡ SURCHARGE ⚡</div>';
    html += '<p style="color:#aaa; font-size:0.8rem; margin-top:-10px; margin-bottom:20px;">Résous pour déclencher une attaque dévastatrice !</p>';
    html += `<div class="puzzle-question">Résoudre : <span style="color:var(--neon-blue)">${puzzle.a}x + ${puzzle.b} = ${puzzle.c}</span></div>`;
    html += '<div class="math-expr" style="font-size:0.9rem;">x = ?</div>';
    html += '<div class="answers-grid">';
    puzzle.opts.forEach(opt => { html += `<button class="answer-btn" onclick="submitSurcharge(${opt})">${opt}</button>`; });
    html += '</div>';
    html += `<p style="color:#ff4444; font-size:0.7rem; margin-top:10px;">⏱ 5 secondes ou tu es vulnérable !</p>`;
    content.innerHTML = html;
    document.getElementById('puzzle-overlay').style.display = 'flex';

    surchargeTarget._surchargeTimeout = setTimeout(() => {
        resolveSurcharge(false);
    }, 5000);
}

window.submitSurcharge = function(ans) {
    if (!gameState.clashActive || !gameState.isSurcharge) return;
    clearTimeout(surchargeTarget._surchargeTimeout);
    resolveSurcharge(ans === gameState.currentAns);
};

function resolveSurcharge(success) {
    document.getElementById('puzzle-overlay').style.display = 'none';
    gameState.clashActive = false;
    gameState.isSurcharge = false;

    if (success) {
        const target = surchargeTarget.isPlayer ? enemy : player;
        surchargeTarget.energy = 0;
        target.takeHit(200);
        showAnnouncement("⚡ SURCHARGE !<br>COUP DÉVASTATEUR !", "#00ffff");
    } else {
        surchargeTarget.energy = Math.max(0, surchargeTarget.energy - 30);
        showAnnouncement("ÉCHEC !<br>VULNÉRABLE 1s", "#ff4444");
        surchargeTarget.state = 'hit';
        surchargeTarget.animTimer = 1000;
    }
    surchargeTarget = null;
}

function generateSurchargePuzzle() {
    const a = window.getRandomInt(2, 5);
    const x = window.getRandomInt(-6, 6);
    const b = window.getRandomInt(-10, 10);
    const c = a * x + b;
    const opts = getWrongAnswers(x, 3, 4);
    return { a, b, c, correct: x, opts };
}

function triggerClash() {
    if (!gameState.isActive || !gameState.roundActive) return;
    gameState.clashActive = true;
    gameState.clashTimer  = CLASH_INTERVAL;

    if (gameState.mode === 'SP' || (gameState.mode === 'MP' && p2p.isHost)) {
        let round = (gameState.p1Score + gameState.p2Score);
        let puzzle = generatePuzzleData(round);
        if (gameState.mode === 'MP') p2p.conn.send({ type: 'CLASH_START', data: puzzle });
        renderPuzzleOverlay(puzzle);
    }

    if (gameState.mode === 'SP') {
        let baseThinkTime = gameState.difficulty === 'easy' ? 8000 : gameState.difficulty === 'normal' ? 5000 : 3000;
        let thinkTime = baseThinkTime + Math.random() * 2000;
        aiTimer = setTimeout(() => {
            if (!gameState.clashActive) return;
            resolveClash('enemy');
        }, thinkTime);
    }
}

window.submitAnswer = function(ans) {
    if (!gameState.clashActive || gameState.isSurcharge) return;

    const elapsed = (performance.now() - clashStartTime) / 1000;
    const speedBonus = elapsed < 2.0;

    if (ans === gameState.currentAns) {
        if (gameState.mode === 'SP') {
            clearTimeout(aiTimer); resolveClash('player', speedBonus);
        } else if (gameState.mode === 'MP') {
            p2p.conn.send({ type: 'CLASH_RESOLVE', winner: 'host' });
            resolveClash('player', speedBonus);
        }
    } else {
        if (gameState.mode === 'SP') {
            clearTimeout(aiTimer); resolveClash('enemy', false);
        } else if (gameState.mode === 'MP') {
            p2p.conn.send({ type: 'CLASH_RESOLVE', winner: 'guest' });
            resolveClash('enemy', false);
        }
    }
};

function showAnnouncement(msg, color) {
    const ann = document.getElementById('announcement');
    ann.innerHTML = msg;
    ann.style.color   = color;
    ann.style.display = 'block';
    ann.classList.remove('anim-announce');
    void ann.offsetWidth;
    ann.classList.add('anim-announce');
    setTimeout(() => { if (ann.innerHTML === msg) ann.style.display = 'none'; }, 2000);
}

function resolveClash(winnerId, speedBonus) {
    clearTimeout(aiTimer);
    document.getElementById('puzzle-overlay').style.display = 'none';
    gameState.clashActive = false;

    const boostDuration = speedBonus ? 10 : 5;

    if (winnerId === 'player') {
        player.hasPowerUp = true; player.powerTimer = boostDuration;
        if (speedBonus) showAnnouncement("⚡ SPEED BONUS !<br>BOOST ×2 DURÉE !", "#ffff00");
        else            showAnnouncement("SURCHARGE<br>ACTIVÉE !", "#ffff00");
    } else {
        enemy.hasPowerUp = true; enemy.powerTimer = boostDuration;
        showAnnouncement("ATTENTION<br>ADVERSAIRE BOOSTÉ", "#ff0000");
    }

    gameState.clashTimer = CLASH_INTERVAL;
}

function getWrongAnswers(correct, count, range) {
    let ans = [correct];
    while (ans.length < count + 1) {
        let fake = correct + window.getRandomInt(-range, range);
        if (fake !== correct && !ans.includes(fake)) ans.push(fake);
    }
    return ans.sort(() => Math.random() - 0.5);
}

function generatePuzzleData(round) {
    round = round || 0;
    const types = [
        'math_antecedent', 'math_image',
        'math_arithmetic', 'math_percent',
        'visual_intruder',  'visual_reaction'
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    let p = { cat: type };

    // Les coefficients augmentent avec le round
    const aMax   = Math.min(2 + round, 9);
    const bRange = Math.min(10 + round * 3, 20);
    const xRange = Math.min(5 + round, 10);

    if (type === 'math_antecedent') {
        const a = window.getRandomInt(2, aMax), b = window.getRandomInt(-bRange, bRange), correctX = window.getRandomInt(-xRange, xRange);
        p.y = (a * correctX) + b; p.a = a; p.b = b; p.correct = correctX;
        p.opts = getWrongAnswers(correctX, 3, 5 + round);
    }
    else if (type === 'math_image') {
        const a = window.getRandomInt(2, aMax), b = window.getRandomInt(-bRange, bRange), x = window.getRandomInt(-xRange, xRange);
        p.correct = (a * x) + b; p.a = a; p.b = b; p.x = x;
        p.opts = getWrongAnswers(p.correct, 3, 10 + round * 2);
    }
    else if (type === 'math_arithmetic') {
        const ops = round >= 2 ? ['+', '-', '*'] : ['+', '-', '*'];
        const op  = ops[Math.floor(Math.random() * ops.length)];
        let n1, n2, ans;
        const scale = 1 + round;
        if      (op === '+') { n1 = window.getRandomInt(15 * scale, 80 * scale); n2 = window.getRandomInt(15 * scale, 80 * scale); ans = n1 + n2; }
        else if (op === '-') { n1 = window.getRandomInt(30 * scale, 90 * scale); n2 = window.getRandomInt(10, Math.max(n1 - 5, 15)); ans = n1 - n2; }
        else                 { n1 = window.getRandomInt(3, 12 + round); n2 = window.getRandomInt(3, 12 + round); ans = n1 * n2; }
        p.expr = `${n1} ${op} ${n2}`; p.correct = ans;
        p.opts = getWrongAnswers(ans, 3, op === '*' ? 10 + round * 5 : 15 + round * 10);
    }
    else if (type === 'math_percent') {
        const percs = [10, 20, 25, 30, 40, 50, 75];
        const vals  = [20, 40, 50, 60, 80, 100, 120, 150, 200];
        const perc  = percs[Math.floor(Math.random() * percs.length)];
        const val   = vals[Math.floor(Math.random() * vals.length)];
        const ans   = (perc * val) / 100;
        p.perc = perc; p.val = val; p.correct = ans;
        p.opts = getWrongAnswers(ans, 3, 15);
    }
    else if (type === 'visual_intruder') {
        const cols = ['#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00'];
        const tc   = cols[Math.floor(Math.random() * cols.length)];
        const ic   = cols.filter(c => c !== tc)[0];
        const iIdx = window.getRandomInt(0, 8);
        p.main = tc; p.diff = ic; p.correct = iIdx;
    }
    else if (type === 'visual_reaction') {
        p.correct = Math.floor(Math.random() * 4);
    }
    return p;
}

function renderPuzzleOverlay(p) {
    const content = document.getElementById('puzzle-content');
    gameState.currentAns = p.correct;

    let html = '<div class="clash-title">!! PIRATAGE DETECTÉ !!</div>';
    html += '<p style="color:#aaa; font-size:0.8rem; margin-top:-10px; margin-bottom:20px;">Le 1er à répondre gagne un boost !</p>';

    if (p.cat === 'math_antecedent') {
        html += `<div class="puzzle-question">Antécédent de <span style="color:var(--neon-blue)">${p.y}</span> ?</div><div class="math-expr">f(x) = ${p.a}x ${p.b >= 0 ? '+ ' + p.b : '- ' + Math.abs(p.b)}</div>`;
        html += `<div class="answers-grid">`; p.opts.forEach(opt => { html += `<button class="answer-btn" onclick="submitAnswer(${opt})">${opt}</button>`; }); html += `</div>`;
    }
    else if (p.cat === 'math_image') {
        html += `<div class="puzzle-question">Image de <span style="color:var(--neon-blue)">${p.x}</span> ?</div><div class="math-expr">f(x) = ${p.a}x ${p.b >= 0 ? '+ ' + p.b : '- ' + Math.abs(p.b)}</div>`;
        html += `<div class="answers-grid">`; p.opts.forEach(opt => { html += `<button class="answer-btn" onclick="submitAnswer(${opt})">${opt}</button>`; }); html += `</div>`;
    }
    else if (p.cat === 'math_arithmetic') {
        html += `<div class="puzzle-question">Calcul Rapide</div><div class="math-expr">${p.expr} = ?</div>`;
        html += `<div class="answers-grid">`; p.opts.forEach(opt => { html += `<button class="answer-btn" onclick="submitAnswer(${opt})">${opt}</button>`; }); html += `</div>`;
    }
    else if (p.cat === 'math_percent') {
        html += `<div class="puzzle-question">Pourcentage</div><div class="math-expr">${p.perc}% de ${p.val}</div>`;
        html += `<div class="answers-grid">`; p.opts.forEach(opt => { html += `<button class="answer-btn" onclick="submitAnswer(${opt})">${opt}</button>`; }); html += `</div>`;
    }
    else if (p.cat === 'visual_intruder') {
        html += `<div class="puzzle-question">Vise l'intrus !</div><div class="visual-grid">`;
        for (let i = 0; i < 9; i++) {
            let col = (i === p.correct) ? p.diff : p.main;
            html += `<div class="visual-cell" style="background:${col}" onclick="submitAnswer(${i})"></div>`;
        }
        html += `</div>`;
    }
    else if (p.cat === 'visual_reaction') {
        html += `<div class="puzzle-question" style="color:red;">RÉFLEXE ! FRAPPE LA CIBLE !</div><div class="answers-grid">`;
        for (let i = 0; i < 4; i++) {
            if (i === p.correct) html += `<button class="answer-btn" style="background:#00ffff; color:black;" onclick="submitAnswer(${i})">CIBLE !</button>`;
            else                 html += `<button class="answer-btn" style="color:red; border-color:red;" onclick="submitAnswer(${i})">FAUSSE</button>`;
        }
        html += `</div>`;
    }

    // Timer barre
    html += `<div id="puzzle-timer-bar" style="margin-top:16px; height:8px; background:#333; border-radius:4px; overflow:hidden;">
        <div id="puzzle-timer-fill" style="height:100%; background:var(--neon-pink); width:100%; transition:width 5s linear;"></div>
    </div>`;

    clashStartTime = performance.now();

    content.innerHTML = html;
    document.getElementById('puzzle-overlay').style.display = 'flex';

    // Anime la barre (déclenche après 30ms pour que la transition CSS parte bien)
    requestAnimationFrame(() => requestAnimationFrame(() => {
        const fill = document.getElementById('puzzle-timer-fill');
        if (fill) fill.style.width = '0%';
    }));
}
