import Renderer from './Renderer.js';
import Input from './Input.js';
import AssetManager from './AssetManager.js';
import LevelManager from '../systems/LevelManager.js';
import MapRenderer from '../systems/MapRenderer.js';
import Player from '../entities/Player.js';
import Monster from '../entities/Monster.js';
import DeckManager from '../systems/DeckManager.js';

export default class Game {
    constructor(canvasId) {
        this.renderer = new Renderer(canvasId);
        this.input = new Input();
        this.assets = new AssetManager();
        this.levelManager = new LevelManager();
        this.mapRenderer = new MapRenderer(this.levelManager, this.assets);
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.player = null;
        this.monster = null;
        this.turn = 'PLAYER'; // e2 : tour par tour
        this.monsterDelay = 0;  // e2 : délai avant action monstre
        this.deckManager = new DeckManager((dx, dy) => {
            if (this.turn !== 'PLAYER') return false; // e2 : bloquer si pas le tour du joueur
            if (this.player) {
                const moved = this.player.attemptMove(dx, dy);
                if (moved) {
                    this.endPlayerTurn(); // e2
                }
                return moved;
            }
            return false;
        });
        this.lastTime = 0;
    }

    // e2 : Fin du tour du joueur -> passer au monstre avec délai
    endPlayerTurn() {
        this.turn = 'MONSTER';
        this.monsterDelay = 0.3; // 300ms de délai
        console.log('Tour : MONSTER');
    }

    async init(manifest) {
        try {
            await this.assets.loadAll(manifest);
            // Charger la première map par défaut si MAPS est dispo
            if (window.MAPS) {
                this.levelManager.loadMap(0, window.MAPS);
                // Le joueur commence en (0, 0)
                this.player = new Player(0, 0, this.assets, this.levelManager);
                // e1 : instancier le monstre (position en dur sur la map 0)
                this.monster = new Monster(10, 10, this.assets);
            }
            this.deckManager.generateHand();
            this.start();
        } catch (error) {
            console.error("Erreur fatale lors du chargement des assets:", error);
        }
    }

    start() {
        requestAnimationFrame((timestamp) => this.loop(timestamp));
    }

    loop(timestamp) {
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Plafonner le deltaTime (max 0.1s)
        if (dt > 0.1) dt = 0.1;

        this.update(dt);
        this.draw();

        // Réinitialiser les inputs "just pressed"
        this.input.update();

        requestAnimationFrame((ts) => this.loop(ts));
    }

    update(dt) {
        if (this.turn === 'GAME_OVER') return; // e5

        if (this.player) {
            // e2 : Bloquer inputs joueur si ce n'est pas son tour
            if (this.turn === 'PLAYER') {
                // Gérer les mouvements par flèche ici pour pouvoir déclencher endPlayerTurn
                let dx = 0;
                let dy = 0;
                if (this.input.isJustPressed('ArrowUp')) dy = -1;
                else if (this.input.isJustPressed('ArrowDown')) dy = 1;
                else if (this.input.isJustPressed('ArrowLeft')) dx = -1;
                else if (this.input.isJustPressed('ArrowRight')) dx = 1;

                if ((dx !== 0 || dy !== 0) && this.player.attemptMove(dx, dy)) {
                    this.endPlayerTurn();
                }
            }
            this.camera.x = this.player.x;
            this.camera.y = this.player.y;
        }

        // e2 : Tour du monstre avec délai
        if (this.turn === 'MONSTER' && this.monster) {
            this.monsterDelay -= dt;
            if (this.monsterDelay <= 0) {
                this.monster.takeTurn(this.player.x, this.player.y, this.levelManager);

                // e5 : Vérifier si le monstre a attrapé le joueur
                if (this.monster.x === this.player.x && this.monster.y === this.player.y) {
                    this.triggerGameOver();
                    return;
                }

                this.turn = 'PLAYER';
                console.log('Tour : PLAYER');
            }
        }

        // e4 : Mise à jour continue de l'animation du monstre
        if (this.monster) {
            this.monster.update(dt);
        }
    }

    // e5 : Screamer et Game Over
    triggerGameOver() {
        this.turn = 'GAME_OVER';
        console.log('Vous avez perdu 1 PV');

        const screamer = document.getElementById('screamer');
        if (screamer) {
            // Afficher l'image du monstre dans le screamer
            const monsterImg = this.assets.getImage('monster');
            const imgEl = screamer.querySelector('#screamer-img');
            if (imgEl && monsterImg) {
                imgEl.src = monsterImg.src;
            }
            screamer.classList.add('active');

            // Masquer le screamer après 2 secondes
            setTimeout(() => {
                screamer.classList.remove('active');
            }, 2000);
        }
    }

    draw() {
        this.renderer.clear();
        this.mapRenderer.drawFloor(this.renderer.ctx, this.camera);
        this.mapRenderer.drawObstacles(this.renderer.ctx, this.camera);
        
        if (this.player) {
            this.player.draw(this.renderer.ctx, this.camera, this.mapRenderer.tileSize);
        }

        // e1 : Dessiner le monstre
        if (this.monster) {
            this.monster.draw(this.renderer.ctx, this.camera, this.mapRenderer.tileSize);
        }

        // La lumière se dessine par-dessus tout
        this.mapRenderer.drawLighting(this.renderer.ctx, this.renderer.ctx.canvas.width / 2, this.renderer.ctx.canvas.height / 2);
    }
}
