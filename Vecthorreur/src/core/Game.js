import Renderer from './Renderer.js';
import Renderer3D from './Renderer3D.js';
import Input from './Input.js';
import AssetManager from './AssetManager.js';
import LevelManager from '../systems/LevelManager.js';
import MapRenderer from '../systems/MapRenderer.js';
import MapRenderer3D from '../systems/MapRenderer3D.js';
import Player from '../entities/Player.js';
import Monster from '../entities/Monster.js';
import DeckManager from '../systems/DeckManager.js';
import GameStateManager from '../systems/GameStateManager.js';
import ParticleSystem from '../systems/ParticleSystem.js';
import AudioManager from '../systems/AudioManager.js';

export default class Game {
    constructor(canvasId) {
        this.renderer = new Renderer(canvasId);
        this.renderer3D = new Renderer3D(canvasId); // h1
        this.input = new Input();
        this.assets = new AssetManager();
        this.levelManager = new LevelManager();
        this.mapRenderer = new MapRenderer(this.levelManager, this.assets);
        this.mapRenderer3D = new MapRenderer3D(this.levelManager); // h2
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.stateManager = new GameStateManager(); // f1
        this.player = null;
        this.monster = null;
        this.turn = 'PLAYER'; // e2 : tour par tour
        this.monsterDelay = 0;  // e2 : délai avant action monstre
        this.elapsedTime = 0; // h5 : temps total pour animations
        this.deckManager = new DeckManager((dx, dy) => {
            if (this.turn !== 'PLAYER') return false;
            if (this.player) {
                const moved = this.player.attemptMove(dx, dy);
                if (moved) {
                    if (this.player.hasWon) {
                        this.triggerLevelComplete();
                        return true;
                    }
                    if (this.player.isDead) {
                        this.triggerPlayerDeath();
                        return true;
                    }
                    this.endPlayerTurn();
                }
                return moved;
            }
            return false;
        });
        this.lastTime = 0;
        this.particleSystem = new ParticleSystem(); // g1
        this.audioManager = new AudioManager(); // g3
    }

    // e2 : Fin du tour du joueur -> passer au monstre avec délai
    endPlayerTurn() {
        this.turn = 'MONSTER';
        this.monsterDelay = 0.3; // 300ms de délai
        this.stateManager.recordMove(); // f1 : compter les coups
        this.audioManager.playStepSound(); // g3 : son de pas
        console.log('Tour : MONSTER');
    }

    async init(manifest) {
        try {
            await this.assets.loadAll(manifest);
            if (window.MAPS) {
                this.levelManager.loadMap(0, window.MAPS);
                const ps = this.levelManager.playerSpawn;
                const ms = this.levelManager.monsterSpawn;
                this.player = new Player(ps.x, ps.y, this.assets, this.levelManager);
                this.monster = new Monster(ms.x, ms.y, this.assets);

                // h2 : Construire la scène 3D
                this._buildScene3D();
            }
            this.deckManager.generateHand();
            this.stateManager.updateHUD();
            this.setupMenus();
            this.audioManager.init();
            this.audioManager.startDrone();

            // A1 : charger la musique du Manoir et la démarrer si on est sur map 0
            await this.audioManager.loadManorAudio();
            if (this.levelManager.currentMapIndex === 0) {
                this.audioManager.startManorMusic();
            }

            this.start();
        } catch (error) {
            console.error("Erreur fatale lors du chargement des assets:", error);
        }
    }

    // h7 : Construire la scène 3D complète
    _buildScene3D() {
        const map = this.levelManager.currentMap;
        if (!map) return;

        // Fog selon le thème
        const fogDensity = this._getFogDensity(map.theme);
        this.renderer3D.setFog(map.bgColor || '#000000', fogDensity);

        // Construire la map 3D
        this.mapRenderer3D.buildMap(this.renderer3D.scene);

        // Créer les meshes 3D des entités
        if (this.player) {
            const playerMesh = this.player.createMesh3D(this.levelManager.palette);
            if (playerMesh) this.renderer3D.scene.add(playerMesh);
        }
        if (this.monster) {
            const monsterMesh = this.monster.createMesh3D(this.levelManager.palette);
            if (monsterMesh) this.renderer3D.scene.add(monsterMesh);
        }
    }

    _getFogDensity(theme) {
        if (!theme) return 0.06;
        const t = theme.toLowerCase();
        if (t.includes('manoir') || t.includes('terreur')) return 0.07;
        if (t.includes('thalasso') || t.includes('sous-marin')) return 0.08;
        if (t.includes('gothic')) return 0.065;
        if (t.includes('sci-fi')) return 0.05;
        if (t.includes('liminal')) return 0.04;
        if (t.includes('bio') || t.includes('horror')) return 0.06;
        if (t.includes('métro')) return 0.07;
        if (t.includes('blizzard')) return 0.03;
        if (t.includes('psycho')) return 0.055;
        if (t.includes('lave')) return 0.04;
        return 0.06;
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
                this.audioManager.playMonsterMoveSound(); // g3 : son du monstre

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

        // g4 : Moduler le drone selon la distance joueur-monstre
        if (this.player && this.monster) {
            this.audioManager.updateDrone(this.player.x, this.player.y, this.monster.x, this.monster.y);
        }
    }

    // e5 : Screamer et Game Over
    triggerGameOver() {
        this.turn = 'GAME_OVER';
        console.log('Vous avez perdu 1 PV');
        this.audioManager.playScreamerSound(); // g3 : son de screamer

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
        // h7 : Nettoyer la scène 3D avant de reconstruire
        this.renderer3D.clearScene();

        this.levelManager.loadMap(mapIndex, window.MAPS);
        const ps = this.levelManager.playerSpawn;
        const ms = this.levelManager.monsterSpawn;
        this.player = new Player(ps.x, ps.y, this.assets, this.levelManager);
        this.monster = new Monster(ms.x, ms.y, this.assets);
        this.turn = 'PLAYER';
        this.deckManager.generateHand();
        this.stateManager.updateHUD();

        // A1 : démarrer/arrêter la musique du Manoir selon la map
        if (mapIndex === 0) {
            this.audioManager.startManorMusic();
        } else {
            this.audioManager.stopManorMusic();
        }

        // h7 : Reconstruire la scène 3D
        this._buildScene3D();
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
        this.elapsedTime += 0.016; // h5 : approximation pour les animations

        // h5 : Mettre à jour les positions 3D des entités
        if (this.player) {
            this.player.updateMesh3D();
            // h6 : Caméra suit le joueur
            this.renderer3D.updateCamera(this.player.x, this.player.y);
        }
        if (this.monster) {
            this.monster.updateMesh3D(0.016);
        }

        // h5 : Flicker de la lampe torche
        this.renderer3D.updateLightFlicker(this.elapsedTime);

        // h2 : Animer deathZones et exits
        this.mapRenderer3D.update(this.elapsedTime);

        // h7 : Rendu 3D
        this.renderer3D.render();
    }
}
