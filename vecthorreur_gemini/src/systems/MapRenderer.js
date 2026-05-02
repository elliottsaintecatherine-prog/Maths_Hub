export default class MapRenderer {
    constructor(levelManager, assetManager) {
        this.levelManager = levelManager;
        this.assetManager = assetManager;
        this.tileSize = 32; // Pixels per unit
    }

    drawFloor(ctx, camera) {
        const floorTile = this.assetManager.images['floor_tile'];
        const map = this.levelManager.currentMap;

        if (!map) return;

        // Configuration de la caméra (offset simple pour commencer)
        // camera = { x: 0, y: 0, zoom: 1 } par exemple
        const camX = camera ? camera.x : 0;
        const camY = camera ? camera.y : 0;
        const zoom = camera ? camera.zoom : 1;

        const effectiveTileSize = this.tileSize * zoom;

        // Sauvegarder le contexte
        ctx.save();
        
        // Appliquer la transformation de caméra
        ctx.translate(ctx.canvas.width / 2 - camX * effectiveTileSize, ctx.canvas.height / 2 - camY * effectiveTileSize);

        // Limites de la carte (-20 à 20)
        const minX = -20;
        const maxX = 20;
        const minY = -20;
        const maxY = 20;

        // 1. Dessiner le sol répété
        if (floorTile) {
            const pattern = ctx.createPattern(floorTile, 'repeat');
            ctx.fillStyle = pattern;
            ctx.save();
            // L'image de pattern sera alignée par défaut avec le (0,0) du canvas (ici modifié par translate)
            // On peut s'assurer que ça commence bien sur la grille.
            ctx.scale(zoom, zoom); // si on veut que la texture se scale aussi, à voir, restons simples
            ctx.translate(minX * this.tileSize, minY * this.tileSize);
            ctx.fillRect(0, 0, (maxX - minX) * this.tileSize, (maxY - minY) * this.tileSize);
            ctx.restore();
        } else {
            // Fallback si pas d'image
            ctx.fillStyle = map.bgColor || '#111';
            ctx.fillRect(minX * effectiveTileSize, minY * effectiveTileSize, (maxX - minX) * effectiveTileSize, (maxY - minY) * effectiveTileSize);
        }

        // 2. Dessiner la grille
        ctx.strokeStyle = map.gridColor || 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = minX; x <= maxX; x++) {
            ctx.moveTo(x * effectiveTileSize, minY * effectiveTileSize);
            ctx.lineTo(x * effectiveTileSize, maxY * effectiveTileSize);
        }
        for (let y = minY; y <= maxY; y++) {
            ctx.moveTo(minX * effectiveTileSize, y * effectiveTileSize);
            ctx.lineTo(maxX * effectiveTileSize, y * effectiveTileSize);
        }
        ctx.stroke();

        ctx.restore();
    }

    drawObstacles(ctx, camera) {
        const wallTile = this.assetManager.images['wall_tile'];
        const map = this.levelManager.currentMap;

        if (!map) return;

        const camX = camera ? camera.x : 0;
        const camY = camera ? camera.y : 0;
        const zoom = camera ? camera.zoom : 1;
        const effectiveTileSize = this.tileSize * zoom;

        ctx.save();
        ctx.translate(ctx.canvas.width / 2 - camX * effectiveTileSize, ctx.canvas.height / 2 - camY * effectiveTileSize);

        ctx.shadowBlur = 10;
        ctx.shadowColor = 'black';

        // Fonction locale pour dessiner une liste de blocs
        const drawBlocks = (blocks, defaultColor) => {
            blocks.forEach(block => {
                const x = block.x * effectiveTileSize;
                const y = block.y * effectiveTileSize;
                const w = block.w * effectiveTileSize;
                const h = block.h * effectiveTileSize;

                if (wallTile) {
                    ctx.save();
                    const pattern = ctx.createPattern(wallTile, 'repeat');
                    ctx.fillStyle = pattern;
                    // Aligner le pattern
                    ctx.translate(x, y);
                    ctx.fillRect(0, 0, w, h);
                    ctx.restore();
                } else {
                    ctx.fillStyle = block.color || defaultColor;
                    ctx.fillRect(x, y, w, h);
                }

                // Contour
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
            });
        };

        drawBlocks(this.levelManager.walls, '#222');
        drawBlocks(this.levelManager.obstacles, '#333');

        // Les deathZones ne sont pas des murs pleins mais on peut les dessiner si besoin (sinon elles sont invisibles ou gérées à part)

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    drawLighting(ctx, playerScreenX, playerScreenY) {
        ctx.save();

        const time = Date.now() / 150;
        const flicker = Math.sin(time) * Math.sin(time * 0.5) * 10;
        const baseRadius = 250;
        const radius = baseRadius + flicker;

        const x = playerScreenX || (ctx.canvas.width / 2);
        const y = playerScreenY || (ctx.canvas.height / 2);

        // Dessiner le brouillard de guerre via un gradient transparent -> noir
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');

        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.restore();
    }
}
