import Renderer from './Renderer.js';
import Input from './Input.js';
import AssetManager from './AssetManager.js';
import LevelManager from '../systems/LevelManager.js';
import MapRenderer from '../systems/MapRenderer.js';
import Player from '../entities/Player.js';
import Monster from '../entities/Monster.js';
import DeckManager from '../systems/DeckManager.js';
import GameStateManager from '../systems/GameStateManager.js';
import ParticleSystem from '../systems/ParticleSystem.js';

export default class Game {
    constructor(canvasId) {
        this.renderer = new Renderer(canvasId);
        this.input = new Input();
        this.assets = new AssetManager();
        this.levelManager = new LevelManager();
        this.mapRenderer = new MapRenderer(this.levelManager, this.assets);
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.stateManager = new GameStateManager(); // f1
        this.player = null;
        this.monster = null;
        this.turn = 'PLAYER'; // e2 : tour par tour
        this.monsterDelay = 0;  // e2 : délai avant action monstre
        this.deckManager = new DeckManager((dx, dy) => {
            if (this.turn !== 'PLAYER') return false; // e2 : bloquer si pas le tour du joueur
            if (this.player) {
                const moved = this.player.attemptMove(dx, dy);
                if (moved) {
                    // f1 : Vérifier sortie
                    if (this.player.hasWon) {
                        this.triggerLevelComplete();
                        return true;
                    }
                    // f1 : Vérifier piège
                    if (this.player.isDead) {
                        this.triggerPlayerDeath();
                        return true;
                    }
                    this.endPlayerTurn(); // e2
                }
                return moved;
            }
            return false;
        });
        this.lastTime = 0;
        this.particleSystem = new ParticleSystem(); // g1
    }

    // e2 : Fin du tour du joueur -> passer au monstre avec délai
    endPlayerTurn() {
        this.turn = 'MONSTER';
        this.monsterDelay = 0.3; // 300ms de délai
        this.stateManager.recordMove(); // f1 : compter les coups
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
            this.stateManager.updateHUD(); // f2 : afficher le HUD initial
            this.setupMenus(); // f3 : initialiser les menus transitoires
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
        if (this.turn === 'GAME_OVER' || this.turn === 'LEVEL_COMPLETE') return; // e5, f1

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
                    // f1 : Vérifier sortie avant de passer au monstre
                    if (this.player.hasWon) {
                        this.triggerLevelComplete();
                        return;
                    }
                    // f1 : Vérifier piège (mort)
                    if (this.player.isDead) {
                        this.triggerPlayerDeath();
                        return;
                    }
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

        // g1 : Particules de poussière (ambiance)
        if (this.player) {
            const ts = this.mapRenderer.tileSize * this.camera.zoom;
            this.particleSystem.emitDust(
                this.player.x * ts,
                this.player.y * ts,
                ts * 4 // rayon autour du joueur
            );
        }
        this.particleSystem.update(dt);
    }

    // e5 : Screamer et Game Over
    triggerGameOver() {
        this.turn = 'GAME_OVER';
        console.log('Vous avez perdu 1 PV');

        // g1 : Particules de sang à la position du joueur
        if (this.player) {
            const ts = this.mapRenderer.tileSize * this.camera.zoom;
            this.particleSystem.emitBlood(this.player.x * ts, this.player.y * ts, 25);
        }

        const screamer = document.getElementById('screamer');
        if (screamer) {
            // Afficher l'image du monstre dans le screamer
            const monsterImg = this.assets.getImage('monster');
            const imgEl = screamer.querySelector('#screamer-img');
            if (imgEl && monsterImg) {
                imgEl.src = monsterImg.src;
            }
            screamer.classList.add('active');

            // f1 : Perdre un PV via GameStateManager
            const alive = this.stateManager.loseLife();
            this.stateManager.updateHUD(); // f2

            // Masquer le screamer après 2 secondes, puis décider
            setTimeout(() => {
                screamer.classList.remove('active');
                if (!alive) {
                    // f3 : Plus de PV -> afficher l'écran Game Over
                    this.showGameOverScreen();
                } else {
                    // Respawn sur la même map
                    this.respawnCurrentLevel();
                }
            }, 2000);
        }
    }

    // f1 : Mort par piège (deathZone)
    triggerPlayerDeath() {
        this.turn = 'GAME_OVER';
        // g1 : Particules de sang
        if (this.player) {
            const ts = this.mapRenderer.tileSize * this.camera.zoom;
            this.particleSystem.emitBlood(this.player.x * ts, this.player.y * ts, 20);
        }
        const alive = this.stateManager.loseLife();
        this.stateManager.updateHUD(); // f2
        setTimeout(() => {
            if (!alive) {
                this.showGameOverScreen(); // f3
            } else {
                this.respawnCurrentLevel();
            }
        }, 1000);
    }

    // f1 : Niveau terminé
    triggerLevelComplete() {
        this.turn = 'LEVEL_COMPLETE';
        const movesUsed = this.stateManager.totalMoves;
        console.log(`Salle terminée en ${movesUsed} coups`);
        const nextIdx = this.stateManager.nextLevel();
        this.stateManager.updateHUD(); // f2

        // f3 : Afficher l'écran de fin de salle
        this.showLevelCompleteScreen(movesUsed, nextIdx);
    }

    // f1 : Charger un niveau
    loadLevel(mapIndex) {
        this.levelManager.loadMap(mapIndex, window.MAPS);
        this.player = new Player(0, 0, this.assets, this.levelManager);
        // Repositionner le monstre (position par défaut)
        this.monster = new Monster(10, 10, this.assets);
        this.turn = 'PLAYER';
        this.deckManager.generateHand();
        this.stateManager.updateHUD(); // f2
    }

    // f1 : Respawn après perte d'un PV (même niveau)
    respawnCurrentLevel() {
        this.loadLevel(this.stateManager.currentLevel);
    }

    // f3 : Initialiser les boutons des menus transitoires
    setupMenus() {
        const btnNext = document.getElementById('btn-next-level');
        if (btnNext) {
            btnNext.onclick = () => {
                document.getElementById('level-complete-screen').classList.remove('active');
                const nextIdx = this.stateManager.currentLevel;
                if (window.MAPS && window.MAPS[nextIdx]) {
                    this.loadLevel(nextIdx);
                } else {
                    // Plus de niveaux — victoire finale (reste sur l'écran)
                    console.log('Victoire totale !');
                }
            };
        }

        const btnRestart = document.getElementById('btn-restart');
        if (btnRestart) {
            btnRestart.onclick = () => {
                document.getElementById('game-over-screen').classList.remove('active');
                this.stateManager.reset();
                this.loadLevel(0);
            };
        }
    }

    // f3 : Afficher l'écran "Salle Terminée"
    showLevelCompleteScreen(movesUsed, nextIdx) {
        const screen = document.getElementById('level-complete-screen');
        const recap = document.getElementById('level-recap');
        const btnNext = document.getElementById('btn-next-level');
        if (recap) {
            recap.textContent = `Coups utilises : ${movesUsed}`;
        }
        if (btnNext) {
            if (window.MAPS && window.MAPS[nextIdx]) {
                btnNext.textContent = 'Niveau Suivant';
                btnNext.style.display = '';
            } else {
                btnNext.textContent = 'Victoire !';
            }
        }
        if (screen) {
            screen.classList.add('active');
        }
    }

    // f3 : Afficher l'écran "Game Over"
    showGameOverScreen() {
        const screen = document.getElementById('game-over-screen');
        if (screen) {
            screen.classList.add('active');
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

        // g1 : Particules (au-dessus de la lumière pour les étincelles)
        this.particleSystem.draw(this.renderer.ctx, this.camera, this.mapRenderer.tileSize);
    }
}
