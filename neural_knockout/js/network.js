/* =========================================================================
   MULTIJOUEUR (PEERJS)
   ========================================================================= */

function generateShortId() { return Math.random().toString(36).substring(2, 6).toUpperCase(); }

window.hostGame = function() {
    gameState.mode = 'MP'; p2p.isHost = true;
    const diffs = ['easy', 'normal', 'expert'];
    gameState.difficulty = diffs[Math.floor(Math.random() * diffs.length)];
    const shortId = "NK-" + generateShortId();

    showScreen('screen-lobby');
    document.getElementById('room-id-display').innerText = shortId;

    p2p.peer = new Peer(shortId);
    p2p.peer.on('open', () => document.getElementById('host-status').innerText = "Serveur prêt. Attente...");
    p2p.peer.on('connection', (c) => {
        p2p.conn = c; setupConnection();
        document.getElementById('host-status').innerText = "Adversaire connecté ! Échange des données...";
    });
};

window.joinGame = function() {
    gameState.mode = 'MP'; p2p.isHost = false;
    let roomId = document.getElementById('room-input').value.toUpperCase().trim();
    if (!roomId) return;

    if (!roomId.startsWith('NK-')) roomId = 'NK-' + roomId;

    document.getElementById('join-status').innerText = "Recherche...";
    p2p.peer = new Peer();
    p2p.peer.on('open', () => {
        p2p.conn = p2p.peer.connect(roomId);
        p2p.conn.on('open', () => {
            document.getElementById('join-status').innerText = "Connecté ! En attente...";
            setupConnection();
            p2p.conn.send({ type: 'HELLO', charId: gameState.localCharId });
        });
        p2p.conn.on('error', () => document.getElementById('join-status').innerText = "Échec.");
    });
};

function setupConnection() {
    p2p.conn.on('data', (msg) => {
        switch (msg.type) {
            case 'HELLO':
                gameState.remoteCharId = msg.charId;
                p2p.conn.send({ type: 'START', difficulty: gameState.difficulty, charId: gameState.localCharId, roundsToWin: gameState.roundsToWin });
                initMatch();
                break;
            case 'START':
                gameState.difficulty   = msg.difficulty;
                gameState.remoteCharId = msg.charId;
                gameState.roundsToWin  = msg.roundsToWin;
                initMatch();
                break;
            case 'SYNC_TIMER':
                gameState.timer = msg.time;
                break;
            case 'SYNC_STATE':
                enemy.x         = canvas.width - msg.x;
                enemy.y         = msg.y;
                enemy.dir       = -msg.dir;
                enemy.state     = msg.state;
                enemy.hasPowerUp = msg.power;
                enemy.hp        = msg.hp;
                enemy.comboCount = msg.combo;
                break;
            case 'I_HIT_YOU':
                player.takeHit(msg.damage);
                break;
            case 'I_ATTACKED_AIR':
                enemy.state = 'attack'; enemy.animTimer = 200; enemy.dir = -msg.dir;
                break;
            case 'CLASH_START':
                gameState.clashActive = true;
                gameState.clashTimer  = CLASH_INTERVAL;
                renderPuzzleOverlay(msg.data);
                break;
            case 'CLASH_RESOLVE':
                if (msg.winner === 'host') resolveClash('enemy');
                else resolveClash('player');
                break;
            case 'ROUND_SCORE':
                gameState.p1Score = msg.p2;
                gameState.p2Score = msg.p1;
                if (!gameState.roundActive) handleRoundEndGuest();
                break;
            case 'GAME_OVER':
                endGame(msg.res);
                break;
        }
    });
}

function handleRoundEndGuest() {
    if (gameState.p1Score >= gameState.roundsToWin || gameState.p2Score >= gameState.roundsToWin) {
        // endGame sera déclenché par le message GAME_OVER envoyé par le host
    } else {
        showAnnouncement("FIN DE LA MANCHE", "#ffffff");
        setTimeout(startNextRound, 3000);
    }
}
