export default class LevelManager {
    constructor() {
        this.currentMap = null;
        this.currentMapIndex = -1; // h0
        this.walls = [];
        this.obstacles = [];
        this.deathZones = [];
        this.exits = [];
        this.palette = {};
        this.walkableGrid = null;
        this.playerSpawn = { x: 0, y: 0 };   // h0
        this.monsterSpawn = { x: 10, y: 10 }; // h0
        this.rooms = [];                       // h0 : données ROOMS pour la map 0
    }

    loadMap(mapIndex, rawData) {
        const mapData = rawData[mapIndex];
        if (!mapData) {
            console.error(`Map index ${mapIndex} not found.`);
            return;
        }

        this.currentMap = mapData;
        this.currentMapIndex = mapIndex; // h0
        this.palette = mapData.palette || {};

        // h0 : Stocker les positions de spawn
        this.playerSpawn = mapData.playerSpawn || { x: 0, y: 0 };
        this.monsterSpawn = mapData.monsterSpawn || { x: 10, y: 10 };

        // h0 : Stocker les données de pièces (ROOMS) si disponibles
        if (window.ROOMS && mapIndex === 0) {
            this.rooms = window.ROOMS;
        } else {
            this.rooms = [];
        }

        // Normaliser les coordonnées {x, y, w, h}
        this.walls = this._normalizeRects(mapData.walls || []);
        this.obstacles = this._normalizeRects(mapData.obstacles || []);
        this.deathZones = this._normalizeRects(mapData.deathZones || []);
        this.exits = this._normalizeRects(mapData.exits || []);

        this._buildCollisionGrid(mapData);
    }

    _normalizeRects(items) {
        return items.map(item => {
            const x1 = item.x1;
            const y1 = item.y1;
            const x2 = item.x2;
            const y2 = item.y2;
            
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);

            return {
                ...item,
                x: minX,
                y: minY,
                w: maxX - minX,
                h: maxY - minY,
                // On garde les originales au cas où
                origX1: x1,
                origY1: y1,
                origX2: x2,
                origY2: y2
            };
        });
    }

    _buildCollisionGrid(mapData) {
        // Choix : on conserve les coordonnées d'origine (-20 à 20) pour rester fidèle au système de jeu mathématique.
        // La grille fait 41x41 pour inclure les bords. Index = valeur + 20.
        this.walkableGrid = Array(41).fill(null).map(() => Array(41).fill(true));

        const blockItems = [...this.walls, ...this.obstacles];
        
        blockItems.forEach(block => {
            const minX = Math.max(-20, block.x);
            const maxX = Math.min(20, block.x + block.w);
            const minY = Math.max(-20, block.y);
            const maxY = Math.min(20, block.y + block.h);

            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    this.walkableGrid[x + 20][y + 20] = false;
                }
            }
        });

        // Les deathZones ne bloquent pas le mouvement mais tuent, on ne les met pas dans walkableGrid.
    }

    isWalkable(x, y) {
        // Si en dehors des limites (-20 à 20), ce n'est pas walkable
        if (x < -20 || x > 20 || y < -20 || y > 20) {
            return false;
        }
        return this.walkableGrid[x + 20][y + 20];
    }

    isDeathZone(x, y) {
        return this.deathZones.some(zone => 
            x >= zone.x && x <= zone.x + zone.w && 
            y >= zone.y && y <= zone.y + zone.h
        );
    }

    isExit(x, y) {
        return this.exits.some(exit => 
            x >= exit.x && x <= exit.x + exit.w && 
            y >= exit.y && y <= exit.y + exit.h
        );
    }
}
