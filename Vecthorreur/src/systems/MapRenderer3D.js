/**
 * h2 + h3 — MapRenderer3D
 * Construit la géométrie 3D de la map : sols par pièce, murs, meubles, deathZones, exits.
 */
const THREE = window.THREE;

export default class MapRenderer3D {
    constructor(levelManager) {
        this.levelManager = levelManager;
        this.mapGroup = new THREE.Group(); // Contient toute la map
    }

    /**
     * Construire la scène 3D complète pour la map courante.
     * @param {THREE.Scene} scene
     */
    buildMap(scene) {
        // Nettoyer l'ancien groupe
        if (this.mapGroup.parent) {
            scene.remove(this.mapGroup);
        }
        this._disposeGroup(this.mapGroup);
        this.mapGroup = new THREE.Group();

        const map = this.levelManager.currentMap;
        if (!map) return;

        this._buildFloor(map);
        this._buildWalls(map);
        this._buildObstacles(map);
        this._buildDeathZones(map);
        this._buildExits(map);
        this._buildCeiling(map);

        scene.add(this.mapGroup);
    }

    // ==================== SOL ====================

    _buildFloor(map) {
        const rooms = this.levelManager.rooms;

        if (rooms && rooms.length > 0) {
            // Map 0 : sol par pièce (détaillé)
            rooms.forEach(room => {
                this._buildRoomFloor(room);
            });
        } else {
            // Autres maps : un seul grand plan
            const geometry = new THREE.PlaneGeometry(40, 40);
            const color = new THREE.Color(map.bgColor || '#111111');
            const material = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.9,
                metalness: 0.1
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(0, 0, 0);
            mesh.receiveShadow = true;
            this.mapGroup.add(mesh);
        }

        // Grille discrète par-dessus
        this._buildGrid(map);
    }

    _buildRoomFloor(room) {
        const w = room.x2 - room.x1;
        const h = room.y2 - room.y1;
        const cx = (room.x1 + room.x2) / 2;
        const cy = (room.y1 + room.y2) / 2;

        // Générer la texture de sol selon le type
        const texture = this._generateFloorTexture(room.floor, w, h);
        
        const geometry = new THREE.PlaneGeometry(w, h);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.85,
            metalness: 0.05
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(cx, 0.01, cy); // Légèrement au-dessus de 0 pour éviter z-fighting
        mesh.receiveShadow = true;
        this.mapGroup.add(mesh);

        // Tapis si présent
        if (room.hasRug) {
            this._buildRug(room);
        }
    }

    _generateFloorTexture(floorData, w, h) {
        if (!floorData) {
            return null;
        }

        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const colorA = floorData.colorA || '#222';
        const colorB = floorData.colorB || '#333';
        const tileSize = Math.max(1, Math.floor(size / (floorData.tileSize || 2) / 4));

        switch (floorData.type) {
            case 'checkerboard':
                for (let x = 0; x < size; x += tileSize) {
                    for (let y = 0; y < size; y += tileSize) {
                        const isEven = ((x / tileSize) + (y / tileSize)) % 2 === 0;
                        ctx.fillStyle = isEven ? colorA : colorB;
                        ctx.fillRect(x, y, tileSize, tileSize);
                    }
                }
                break;

            case 'chevron':
            case 'planks':
                const plankH = tileSize * 0.6;
                for (let y = 0; y < size; y += plankH) {
                    const offset = (Math.floor(y / plankH) % 2) * (tileSize / 2);
                    for (let x = -tileSize; x < size + tileSize; x += tileSize) {
                        ctx.fillStyle = (Math.floor((x + offset) / tileSize) % 2 === 0) ? colorA : colorB;
                        ctx.fillRect(x + offset, y, tileSize - 1, plankH - 1);
                    }
                }
                break;

            case 'tiles':
            case 'hex_tiles':
                for (let x = 0; x < size; x += tileSize) {
                    for (let y = 0; y < size; y += tileSize) {
                        ctx.fillStyle = ((x + y) / tileSize % 2 < 1) ? colorA : colorB;
                        ctx.fillRect(x, y, tileSize - 1, tileSize - 1);
                        // Jointure
                        ctx.fillStyle = floorData.groutColor || '#00000044';
                        ctx.fillRect(x + tileSize - 1, y, 1, tileSize);
                        ctx.fillRect(x, y + tileSize - 1, tileSize, 1);
                    }
                }
                break;

            case 'carpet':
                ctx.fillStyle = colorA;
                ctx.fillRect(0, 0, size, size);
                // Motif subtil
                for (let i = 0; i < 200; i++) {
                    ctx.fillStyle = colorB;
                    ctx.fillRect(
                        Math.random() * size,
                        Math.random() * size,
                        2, 2
                    );
                }
                break;

            case 'marble_radial':
                const grd = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
                grd.addColorStop(0, colorA);
                grd.addColorStop(1, colorB);
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, size, size);
                break;

            case 'lacquered':
                ctx.fillStyle = colorA;
                ctx.fillRect(0, 0, size, size);
                // Reflets subtils
                for (let i = 0; i < 50; i++) {
                    ctx.fillStyle = 'rgba(255,255,255,0.02)';
                    ctx.fillRect(Math.random() * size, Math.random() * size, size * 0.3, 1);
                }
                break;

            case 'irregular_stones':
            case 'stoneMoss':
            default:
                ctx.fillStyle = colorA;
                ctx.fillRect(0, 0, size, size);
                for (let x = 0; x < size; x += tileSize) {
                    for (let y = 0; y < size; y += tileSize) {
                        const variation = Math.random() * 20 - 10;
                        const r = parseInt(colorB.slice(1, 3), 16) + variation;
                        const g = parseInt(colorB.slice(3, 5), 16) + variation;
                        const b = parseInt(colorB.slice(5, 7), 16) + variation;
                        ctx.fillStyle = `rgb(${Math.max(0,r)},${Math.max(0,g)},${Math.max(0,b)})`;
                        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
                    }
                }
                break;
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(w / 4, h / 4);
        return texture;
    }

    _buildRug(room) {
        const w = (room.rugX2 || 0) - (room.rugX1 || 0);
        const h = (room.rugY2 || 0) - (room.rugY1 || 0);
        if (w <= 0 || h <= 0) return;
        
        const cx = ((room.rugX1 || 0) + (room.rugX2 || 0)) / 2;
        const cy = ((room.rugY1 || 0) + (room.rugY2 || 0)) / 2;

        const geometry = new THREE.PlaneGeometry(w, h);
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(room.rugColor || '#8b0000'),
            roughness: 1,
            metalness: 0
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(cx, 0.02, cy);
        mesh.receiveShadow = true;
        this.mapGroup.add(mesh);
    }

    _buildGrid(map) {
        const gridColor = map.gridColor || 'rgba(255,255,255,0.1)';
        // Extraire opacité simple
        const material = new THREE.LineBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.06 
        });
        
        const points = [];
        for (let x = -20; x <= 20; x++) {
            points.push(new THREE.Vector3(x, 0.02, -20));
            points.push(new THREE.Vector3(x, 0.02, 20));
        }
        for (let z = -20; z <= 20; z++) {
            points.push(new THREE.Vector3(-20, 0.02, z));
            points.push(new THREE.Vector3(20, 0.02, z));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const grid = new THREE.LineSegments(geometry, material);
        this.mapGroup.add(grid);
    }

    // ==================== MURS ====================

    _buildWalls(map) {
        const walls = this.levelManager.walls;
        walls.forEach(wall => {
            this._buildBox(wall, 3, wall.color || '#1a1208', true);
        });
    }

    // ==================== OBSTACLES / MEUBLES ====================

    _buildObstacles(map) {
        const obstacles = this.levelManager.obstacles;
        obstacles.forEach(obs => {
            const height = this._getObstacleHeight(obs.label);
            this._buildBox(obs, height, obs.color || '#2a1a08', true);
        });
    }

    _getObstacleHeight(label) {
        if (!label) return 1.5;
        const l = label.toLowerCase();
        if (l.includes('lit') || l.includes('canapé') || l.includes('paillasse')) return 0.8;
        if (l.includes('table') || l.includes('bureau') || l.includes('console') || l.includes('coffre') || l.includes('banc')) return 1.0;
        if (l.includes('buffet') || l.includes('étagère') || l.includes('autel') || l.includes('bac')) return 1.2;
        if (l.includes('armure') || l.includes('horloge') || l.includes('armoire') || l.includes('miroir') || l.includes('gargouille') || l.includes('candélabre')) return 2.5;
        if (l.includes('cheminée')) return 2.0;
        if (l.includes('cage')) return 2.0;
        if (l.includes('trône')) return 2.2;
        if (l.includes('porte')) return 3.0;
        if (l.includes('colonne') || l.includes('sarcophage') || l.includes('sérac') || l.includes('cloison') || l.includes('sas') || l.includes('wagon') || l.includes('roncier')) return 2.5;
        return 1.5;
    }

    _buildBox(block, height, colorHex, castShadow) {
        const w = Math.max(0.1, block.w);
        const h = Math.max(0.1, block.h);
        const cx = block.x + w / 2;
        const cz = block.y + h / 2;

        const geometry = new THREE.BoxGeometry(w, height, h);
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(colorHex),
            roughness: 0.8,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(cx, height / 2, cz);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        this.mapGroup.add(mesh);
    }

    // ==================== DEATH ZONES ====================

    _buildDeathZones(map) {
        const zones = this.levelManager.deathZones;
        zones.forEach(zone => {
            const w = Math.max(0.1, zone.w);
            const h = Math.max(0.1, zone.h);
            const cx = zone.x + w / 2;
            const cz = zone.y + h / 2;

            const geometry = new THREE.PlaneGeometry(w, h);
            const material = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(cx, 0.05, cz);
            mesh.userData.isDeathZone = true;
            this.mapGroup.add(mesh);
        });
    }

    // ==================== EXITS ====================

    _buildExits(map) {
        const exits = this.levelManager.exits;
        exits.forEach(exit => {
            const w = Math.max(0.1, exit.w);
            const h = Math.max(0.1, exit.h);
            const cx = exit.x + w / 2;
            const cz = exit.y + h / 2;

            const geometry = new THREE.PlaneGeometry(w, h);
            const material = new THREE.MeshBasicMaterial({
                color: 0x44ff44,
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(cx, 0.05, cz);
            mesh.userData.isExit = true;
            this.mapGroup.add(mesh);
        });
    }

    // ==================== PLAFOND ====================

    _buildCeiling(map) {
        const theme = (map.theme || '').toLowerCase();
        // Extérieur ou semi-extérieur : pas de plafond
        const isOutdoor = theme.includes('blizzard') || theme.includes('bio-horror') || theme.includes('lave');
        if (isOutdoor) return;

        const rooms = this.levelManager.rooms;
        if (rooms && rooms.length > 0) {
            // Map 0 : plafond par pièce
            rooms.forEach(room => {
                const w = room.x2 - room.x1;
                const h = room.y2 - room.y1;
                const cx = (room.x1 + room.x2) / 2;
                const cy = (room.y1 + room.y2) / 2;
                const ceilingColor = (room.ceiling && room.ceiling.color) || '#1a1a1a';

                const geometry = new THREE.PlaneGeometry(w, h);
                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(ceilingColor),
                    roughness: 1,
                    metalness: 0,
                    side: THREE.BackSide
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.set(cx, 3, cy); // Hauteur de plafond = 3
                this.mapGroup.add(mesh);
            });
        } else {
            // Autres maps intérieures : un plafond global
            const geometry = new THREE.PlaneGeometry(40, 40);
            const material = new THREE.MeshStandardMaterial({
                color: 0x0a0a0a,
                roughness: 1,
                metalness: 0,
                side: THREE.BackSide
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(0, 3, 0);
            this.mapGroup.add(mesh);
        }
    }

    // ==================== ANIMATIONS ====================

    /**
     * Animer les deathZones (pulsation d'opacité) et les exits (glow).
     */
    update(time) {
        this.mapGroup.traverse(child => {
            if (child.userData.isDeathZone && child.material) {
                child.material.opacity = 0.1 + Math.sin(time * 3) * 0.08;
            }
            if (child.userData.isExit && child.material) {
                child.material.opacity = 0.2 + Math.sin(time * 2) * 0.1;
            }
        });
    }

    // ==================== UTILS ====================

    _disposeGroup(group) {
        while (group.children.length > 0) {
            const child = group.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
            group.remove(child);
        }
    }
}
