/* =========================================================================
   ETAT GLOBAL ET MOTEUR DE JEU
   ========================================================================= */

window.getRandomInt = function(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

// Paramètres de combat
const BASE_DMG     = 5;
const POWER_DMG    = 30;
const ATTACK_RANGE = 140;
const CLASH_INTERVAL = 7; // Piratage toutes les 7s

let gameState = {
    targetMode: null,
    mode:       null,
    isActive:   false,
    roundActive: false,
    timer:      99,
    clashTimer: CLASH_INTERVAL,
    clashActive: false,
    currentAns: null,
    difficulty: 'normal',
    lastTime: 0, timerAcc: 0, syncAcc: 0,
    localCharId: 0, remoteCharId: 1,
    roundsToWin: 2,
    p1Score: 0, p2Score: 0
};

let aiTimer = null;
let p2p     = { peer: null, conn: null, isHost: false };

/* =========================================================================
   GESTION DES ENTREES
   ========================================================================= */
const keys = { left: false, right: false, up: false, down: false, attack: false };

window.addEventListener('keydown', (e) => {
    if (!gameState.isActive || gameState.clashActive || !gameState.roundActive) return;
    if (e.code === 'ArrowLeft'  || e.code === 'KeyA' || e.code === 'KeyQ') keys.left   = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD')                      keys.right  = true;
    if (e.code === 'ArrowUp'    || e.code === 'KeyW' || e.code === 'KeyZ') keys.up     = true;
    if (e.code === 'ArrowDown'  || e.code === 'KeyS' || e.code === 'KeyX') keys.down   = true;
    if (e.code === 'Space') { if (!keys.attack) { keys.attack = true; player.tryAttack(); } }
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft'  || e.code === 'KeyA' || e.code === 'KeyQ') keys.left   = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD')                      keys.right  = false;
    if (e.code === 'ArrowUp'    || e.code === 'KeyW' || e.code === 'KeyZ') keys.up     = false;
    if (e.code === 'ArrowDown'  || e.code === 'KeyS' || e.code === 'KeyX') keys.down   = false;
    if (e.code === 'Space') keys.attack = false;
});

const btnL = document.getElementById('btn-left');
const btnR = document.getElementById('btn-right');
const btnU = document.getElementById('btn-up');
const btnA = document.getElementById('btn-attack');
const btnD = document.getElementById('btn-down');

btnL.addEventListener('touchstart', (e) => { e.preventDefault(); keys.left  = true;  }); btnL.addEventListener('touchend', (e) => { e.preventDefault(); keys.left  = false; });
btnR.addEventListener('touchstart', (e) => { e.preventDefault(); keys.right = true;  }); btnR.addEventListener('touchend', (e) => { e.preventDefault(); keys.right = false; });
btnU.addEventListener('touchstart', (e) => { e.preventDefault(); keys.up    = true;  }); btnU.addEventListener('touchend', (e) => { e.preventDefault(); keys.up    = false; });
btnD.addEventListener('touchstart', (e) => { e.preventDefault(); keys.down  = true;  }); btnD.addEventListener('touchend', (e) => { e.preventDefault(); keys.down  = false; });
btnA.addEventListener('touchstart', (e) => { e.preventDefault(); player.tryAttack(); });

/* =========================================================================
   BOUCLE PRINCIPALE
   ========================================================================= */
function gameLoop(timestamp) {
    if (!gameState.isActive) return;

    let dt = timestamp - gameState.lastTime;
    gameState.lastTime = timestamp;

    player.update(dt);
    enemy.update(dt);

    if (!gameState.clashActive && gameState.roundActive) {
        gameState.timerAcc += dt;
        if (gameState.timerAcc >= 1000) {
            gameState.timerAcc -= 1000;
            if (gameState.mode === 'SP' || (gameState.mode === 'MP' && p2p.isHost)) {
                gameState.timer--;
                if (gameState.mode === 'MP') p2p.conn.send({ type: 'SYNC_TIMER', time: gameState.timer });
                if (gameState.timer <= 0) handleRoundTimeout();
            }
            gameState.clashTimer--;
            if (gameState.clashTimer <= 0) triggerClash();
        }

        if (gameState.mode === 'SP') updateAI(dt);

        if (gameState.mode === 'MP') {
            gameState.syncAcc += dt;
            if (gameState.syncAcc > 50) {
                gameState.syncAcc = 0;
                p2p.conn.send({ type: 'SYNC_STATE', x: player.x, y: player.y, dir: player.dir, state: player.state, power: player.hasPowerUp, hp: player.hp, combo: player.comboCount });
            }
        }
    }

    // Fond animé
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)'; ctx.lineWidth = 1;
    const gridY = (timestamp * 0.05) % 40;
    for (let y = gridY; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Sol
    ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 3;
    ctx.shadowBlur = 10; ctx.shadowColor = '#ff00ff';
    ctx.beginPath(); ctx.moveTo(0, canvas.height * 0.75); ctx.lineTo(canvas.width, canvas.height * 0.75); ctx.stroke();
    ctx.shadowBlur = 0;

    player.draw(ctx);
    enemy.draw(ctx);
    drawHUD();

    requestAnimationFrame(gameLoop);
}

/* =========================================================================
   IA
   ========================================================================= */
function updateAI(dt) {
    if (!enemy.isGrounded) return;

    let dx = enemy.x - player.x;
    enemy.dir = dx > 0 ? -1 : 1;

    if (Math.abs(dx) > ATTACK_RANGE + 10) {
        enemy.x   -= enemy.speed * (dt / 1000) * 0.6 * (dx > 0 ? 1 : -1);
        enemy.state = 'move';
    } else {
        enemy.state = 'idle';
        if (Math.random() < 0.04) enemy.tryAttack();
        if (Math.random() < 0.01 && enemy.isGrounded) {
            enemy.vy = enemy.jumpForce; enemy.isGrounded = false;
        }
    }
}

/* =========================================================================
   HUD
   ========================================================================= */
function drawScoreDots(score, maxScore, x, y, alignLeft) {
    ctx.save();
    ctx.fillStyle = '#ffff00'; ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2;
    let spacing = 15;
    for (let i = 0; i < maxScore; i++) {
        let dotX = alignLeft ? x + (i * spacing) : x - (i * spacing);
        ctx.beginPath(); ctx.arc(dotX, y, 6, 0, Math.PI * 2);
        if (i < score) ctx.fill(); else ctx.stroke();
    }
    ctx.restore();
}

function drawHUD() {
    ctx.save();
    const barWidth  = canvas.width * 0.35;
    const barHeight = 20;
    const topMargin = 20;

    ctx.fillStyle = '#ffff00'; ctx.font = '30px "Press Start 2P"';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.shadowBlur = 10; ctx.shadowColor = '#ffff00';
    ctx.fillText(gameState.timer, canvas.width / 2, topMargin);

    if (gameState.roundActive) {
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText(`PIRATAGE DANS : ${gameState.clashTimer}s`, canvas.width / 2, topMargin + 40);
    }

    // Jauge Joueur
    ctx.shadowBlur = 0; ctx.fillStyle = '#333';
    ctx.fillRect(20, topMargin, barWidth, barHeight);
    ctx.fillStyle = CHARS[gameState.localCharId].glow;
    let pRatio = Math.max(0, player.hp / player.maxHp);
    ctx.fillRect(20, topMargin, barWidth * pRatio, barHeight);
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
    ctx.strokeRect(20, topMargin, barWidth, barHeight);
    ctx.font = '14px "Press Start 2P"'; ctx.fillStyle = 'white'; ctx.textAlign = 'left';
    ctx.fillText(CHARS[gameState.localCharId].name, 20, topMargin + barHeight + 15);
    drawScoreDots(gameState.p1Score, gameState.roundsToWin, 20, topMargin + barHeight + 30, true);

    // Jauge Ennemi
    ctx.fillStyle = '#333';
    ctx.fillRect(canvas.width - 20 - barWidth, topMargin, barWidth, barHeight);
    ctx.fillStyle = CHARS[gameState.remoteCharId].glow;
    let eRatio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillRect(canvas.width - 20 - (barWidth * eRatio), topMargin, barWidth * eRatio, barHeight);
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width - 20 - barWidth, topMargin, barWidth, barHeight);
    ctx.textAlign = 'right';
    ctx.fillText(gameState.mode === 'SP' ? "I.A. " + CHARS[gameState.remoteCharId].name : CHARS[gameState.remoteCharId].name, canvas.width - 20, topMargin + barHeight + 15);
    drawScoreDots(gameState.p2Score, gameState.roundsToWin, canvas.width - 20, topMargin + barHeight + 30, false);

    ctx.restore();
}

/* =========================================================================
   GESTION DES MANCHES (ROUNDS)
   ========================================================================= */
function handleRoundTimeout() {
    gameState.roundActive = false;
    if      (player.hp > enemy.hp) { if (gameState.mode === 'SP' || p2p.isHost) finishRound('P1_WIN'); }
    else if (enemy.hp > player.hp) { if (gameState.mode === 'SP' || p2p.isHost) finishRound('P2_WIN'); }
    else                           { if (gameState.mode === 'SP' || p2p.isHost) finishRound('DRAW');   }
}

function checkWinCondition() {
    if (!gameState.roundActive) return false;
    if (player.hp <= 0 || enemy.hp <= 0) {
        gameState.roundActive = false;
        if (gameState.mode === 'SP' || p2p.isHost) {
            if (player.hp <= 0) finishRound('P2_WIN');
            else finishRound('P1_WIN');
        }
        return true;
    }
    return false;
}

function finishRound(result) {
    if (result === 'P1_WIN') gameState.p1Score++;
    else if (result === 'P2_WIN') gameState.p2Score++;

    if (gameState.mode === 'MP' && p2p.isHost) {
        p2p.conn.send({ type: 'ROUND_SCORE', p1: gameState.p1Score, p2: gameState.p2Score });
    }

    if (gameState.p1Score >= gameState.roundsToWin) {
        if (gameState.mode === 'MP' && p2p.isHost && p2p.conn) p2p.conn.send({ type: 'GAME_OVER', res: 'DÉFAITE' });
        setTimeout(() => endGame(p2p.isHost || gameState.mode === 'SP' ? 'VICTOIRE' : 'DÉFAITE'), 1500);
    } else if (gameState.p2Score >= gameState.roundsToWin) {
        if (gameState.mode === 'MP' && p2p.isHost && p2p.conn) p2p.conn.send({ type: 'GAME_OVER', res: 'VICTOIRE' });
        setTimeout(() => endGame(p2p.isHost || gameState.mode === 'SP' ? 'DÉFAITE' : 'VICTOIRE'), 1500);
    } else {
        showAnnouncement("FIN DE LA MANCHE", "#ffffff");
        setTimeout(startNextRound, 3000);
    }
}

function startNextRound() {
    player.hp = player.maxHp; enemy.hp = enemy.maxHp;
    player.x = player.startX; player.y = canvas.height * 0.75;
    enemy.x  = enemy.startX;  enemy.y  = canvas.height * 0.75;
    player.state = 'idle'; enemy.state = 'idle';
    player.vy = 0; enemy.vy = 0;
    player.hasPowerUp = false; enemy.hasPowerUp = false;
    player.comboCount = 0;    enemy.comboCount = 0;
    player.dir = 1; enemy.dir = -1;

    gameState.clashTimer  = CLASH_INTERVAL;
    gameState.timer       = 99;
    gameState.roundActive = true;

    showAnnouncement("FIGHT!", "#ff00ff");
}

/* =========================================================================
   NAVIGATION ET MENUS
   ========================================================================= */
function showScreen(id) {
    document.querySelectorAll('.menu-screen').forEach(el => el.style.display = 'none');
    if (id) document.getElementById(id).style.display = 'flex';
}

window.goToCharSelect = function(mode) {
    gameState.targetMode = mode;
    buildCharSelect();
    showScreen('screen-char-select');
};

window.selectChar = function(id) {
    gameState.localCharId = id;
    document.querySelectorAll('.char-card').forEach(el => el.classList.remove('selected'));
    document.getElementById('char-' + id).classList.add('selected');
};

window.confirmCharacter = function() {
    gameState.roundsToWin = parseInt(document.getElementById('rounds-select').value);

    if (gameState.targetMode === 'SP') {
        gameState.mode = 'SP';
        const diffs = ['easy', 'normal', 'expert'];
        gameState.difficulty   = diffs[Math.floor(Math.random() * diffs.length)];
        gameState.remoteCharId = Math.floor(Math.random() * 6);
        initMatch();
    } else if (gameState.targetMode === 'MP') {
        showScreen('screen-mp-menu');
    }
};

function initMatch() {
    showScreen(null);
    document.getElementById('gameCanvas').style.display     = 'block';
    document.getElementById('instructions').style.display   = 'block';
    if (isTouchDevice) document.getElementById('mobile-controls').style.display = 'flex';

    player = new Fighter(true,  gameState.localCharId);
    enemy  = new Fighter(false, gameState.remoteCharId);

    gameState.p1Score = 0;
    gameState.p2Score = 0;
    gameState.isActive = true;
    gameState.lastTime = performance.now();

    requestAnimationFrame(gameLoop);
    startNextRound();
}

function endGame(finalStr) {
    gameState.isActive    = false;
    gameState.roundActive = false;
    clearTimeout(aiTimer);
    document.getElementById('gameCanvas').style.display       = 'none';
    document.getElementById('puzzle-overlay').style.display   = 'none';
    document.getElementById('instructions').style.display     = 'none';
    document.getElementById('mobile-controls').style.display  = 'none';

    let coins = (finalStr === 'VICTOIRE') ? 150 : (finalStr === 'ÉGALITÉ') ? 50 : 25;
    let currentCoins = parseInt(localStorage.getItem('hubCurrency')) || 0;
    localStorage.setItem('hubCurrency', currentCoins + coins);

    const title = document.getElementById('end-title');
    title.innerText   = finalStr;
    title.style.color = (finalStr === 'VICTOIRE') ? 'var(--neon-yellow)' : 'var(--neon-pink)';
    document.getElementById('score-details').innerHTML = `GAINS : <br><span style="color:var(--neon-blue); font-size:2rem;">+${coins} NEURO-COINS</span>`;

    showScreen('screen-end');

    if (p2p.conn) p2p.conn.close();
    if (p2p.peer) p2p.peer.destroy();
}

// Lancement initial
buildCharSelect();
