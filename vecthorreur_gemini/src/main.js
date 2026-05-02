import Game from './core/Game.js';

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
        const game = new Game('game-canvas');
        game.init(manifest);
    });
}
