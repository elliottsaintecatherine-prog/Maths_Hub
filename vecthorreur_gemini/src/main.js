import Game from './core/Game.js';

console.log("Vecthorreur Reborn Init");

const game = new Game('game-canvas');

const manifest = [
    { key: 'hero', url: 'assets/img/hero.png' },
    { key: 'monster', url: 'assets/img/monster.png' },
    { key: 'floor', url: 'assets/img/floor_tile.png' },
    { key: 'wall', url: 'assets/img/wall_tile.png' }
];

game.init(manifest);
