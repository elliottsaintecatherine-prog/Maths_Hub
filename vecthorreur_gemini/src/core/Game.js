import Renderer from './Renderer.js';
import Input from './Input.js';
import AssetManager from './AssetManager.js';
import LevelManager from '../systems/LevelManager.js';
import MapRenderer from '../systems/MapRenderer.js';
import Player from '../entities/Player.js';
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
        this.deckManager = new DeckManager((dx, dy) => {
            if (this.player) {
                return this.player.attemptMove(dx, dy);
            }
            return false;
        });
        this.lastTime = 0;
    }

    async init(manifest) {
        try {
            await this.assets.loadAll(manifest);
            // Charger la première map par défaut si MAPS est dispo
            if (window.MAPS) {
                this.levelManager.loadMap(0, window.MAPS);
                // Le joueur commence en (0, 0)
                this.player = new Player(0, 0, this.assets, this.levelManager);
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
        if (this.player) {
            this.player.update(dt, this.input);
            this.camera.x = this.player.x;
            this.camera.y = this.player.y;
        }
    }

    draw() {
        this.renderer.clear();
        this.mapRenderer.drawFloor(this.renderer.ctx, this.camera);
        this.mapRenderer.drawObstacles(this.renderer.ctx, this.camera);
        
        if (this.player) {
            this.player.draw(this.renderer.ctx, this.camera, this.mapRenderer.tileSize);
        }

        // La lumière se dessine par-dessus tout
        this.mapRenderer.drawLighting(this.renderer.ctx, this.renderer.ctx.canvas.width / 2, this.renderer.ctx.canvas.height / 2);
    }
}
