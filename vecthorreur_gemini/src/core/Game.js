import Renderer from './Renderer.js';
import Input from './Input.js';
import AssetManager from './AssetManager.js';

export default class Game {
    constructor(canvasId) {
        this.renderer = new Renderer(canvasId);
        this.input = new Input();
        this.assets = new AssetManager();
        this.lastTime = 0;
    }

    async init(manifest) {
        try {
            await this.assets.loadAll(manifest);
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
        // Logique de mise à jour à venir
    }

    draw() {
        this.renderer.clear();
        // Rendu à venir
    }
}
