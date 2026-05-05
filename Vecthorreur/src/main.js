import Game from './core/Game.js';

window.addEventListener('error', function(e) {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = "position:fixed;top:0;left:0;z-index:9999;background:red;color:white;font-size:20px;padding:10px;";
    errDiv.textContent = `ERROR: ${e.message} at ${e.filename}:${e.lineno}`;
    document.body.appendChild(errDiv);
});
window.addEventListener('unhandledrejection', function(e) {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = "position:fixed;top:50px;left:0;z-index:9999;background:red;color:white;font-size:20px;padding:10px;";
    errDiv.textContent = `PROMISE ERROR: ${e.reason}`;
    document.body.appendChild(errDiv);
});

console.log("Vecthorreur Reborn Init");

const manifest = [
    { key: 'hero', url: 'assets/img/hero.png' },
    { key: 'monster', url: 'assets/img/monster.png' },
    { key: 'floor_tile', url: 'assets/img/floor_tile.png' },
    { key: 'wall_tile', url: 'assets/img/wall_tile.png' }
];

// f4 : Menu Principal — attendre le clic sur "JOUER" pour démarrer
const btnPlay = document.getElementById('btn-play');
if (btnPlay) {
    btnPlay.addEventListener('click', () => {
        // Cacher le menu principal
        document.getElementById('main-menu').classList.add('hidden');

        // Révéler les éléments de jeu
        document.querySelectorAll('.game-hidden').forEach(el => {
            el.classList.remove('game-hidden');
        });

        // Instancier et démarrer le jeu
        console.log("Avant new Game");
        const game = new Game('game-canvas');
        console.log("Apres new Game");
        game.init(manifest).then(() => {
            console.log("Init terminé");
        }).catch(err => {
            console.error("Erreur dans init:", err);
            const errDiv = document.createElement('div');
            errDiv.style.cssText = "position:fixed;top:100px;left:0;z-index:9999;background:red;color:white;font-size:20px;padding:10px;";
            errDiv.textContent = `INIT ERROR: ${err.message}`;
            document.body.appendChild(errDiv);
        });
    });
}
