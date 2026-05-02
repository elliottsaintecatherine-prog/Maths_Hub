export default class Monster {
    constructor(x, y, assets) {
        this.x = x;
        this.y = y;
        this.assets = assets;

        // Lerp (e4) : position visuelle pour l'interpolation
        this.visualX = x;
        this.visualY = y;
        this.lerpSpeed = 5; // Vitesse d'interpolation

        // Animation flottement (e4)
        this.floatTime = 0;
    }

    draw(ctx, camera, tileSize) {
        const img = this.assets.getImage('monster');
        if (!img) return;

        const effectiveTileSize = tileSize * camera.zoom;
        const drawX = this.visualX * effectiveTileSize;
        const drawY = this.visualY * effectiveTileSize;

        ctx.save();
        ctx.translate(ctx.canvas.width / 2 - camera.x * effectiveTileSize, ctx.canvas.height / 2 - camera.y * effectiveTileSize);

        // Aura rouge autour du monstre (shadowBlur)
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.shadowBlur = 25;

        // Oscillation verticale (flottement / respiration) — e4
        const floatOffset = Math.sin(this.floatTime) * 3;

        ctx.drawImage(img, drawX, drawY + floatOffset, effectiveTileSize, effectiveTileSize);

        // Reset du shadow pour ne pas affecter le reste
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        ctx.restore();
    }

    update(dt) {
        // Animation flottement continu (e4)
        this.floatTime += dt * 3;

        // Lerp de la position visuelle vers la position logique (e4)
        this.visualX += (this.x - this.visualX) * this.lerpSpeed * dt;
        this.visualY += (this.y - this.visualY) * this.lerpSpeed * dt;

        // Snap si très proche
        if (Math.abs(this.x - this.visualX) < 0.01) this.visualX = this.x;
        if (Math.abs(this.y - this.visualY) < 0.01) this.visualY = this.y;
    }

    /**
     * e3 — Pathfinding IA : le monstre se déplace d'une case vers le joueur.
     * Approche : tente de réduire la distance Manhattan. Si bloqué, tente les alternatives.
     * Le monstre peut traverser les deathZones sans mourir.
     */
    takeTurn(playerX, playerY, levelManager) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;

        // Directions candidates triées par priorité (la plus proche du joueur en premier)
        const candidates = this._getCandidateMoves(dx, dy);

        for (const move of candidates) {
            const nx = this.x + move.dx;
            const ny = this.y + move.dy;

            // Le monstre respecte les murs mais PAS les deathZones
            if (levelManager.isWalkable(nx, ny)) {
                this.x = nx;
                this.y = ny;
                return;
            }
        }
        // Aucune case valide : le monstre reste sur place
    }

    _getCandidateMoves(dx, dy) {
        const moves = [];

        // Direction idéale : réduire l'écart le plus grand d'abord
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const signX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
        const signY = dy > 0 ? 1 : dy < 0 ? -1 : 0;

        // Priorité 1 : diagonale directe (si les deux axes sont significatifs)
        if (signX !== 0 && signY !== 0) {
            moves.push({ dx: signX, dy: signY });
        }

        // Priorité 2 : axe dominant
        if (absDx >= absDy) {
            if (signX !== 0) moves.push({ dx: signX, dy: 0 });
            if (signY !== 0) moves.push({ dx: 0, dy: signY });
        } else {
            if (signY !== 0) moves.push({ dx: 0, dy: signY });
            if (signX !== 0) moves.push({ dx: signX, dy: 0 });
        }

        // Priorité 3 : diagonales alternatives (contournement)
        if (signX !== 0) {
            if (signY === 0) {
                moves.push({ dx: signX, dy: 1 });
                moves.push({ dx: signX, dy: -1 });
            }
        }
        if (signY !== 0) {
            if (signX === 0) {
                moves.push({ dx: 1, dy: signY });
                moves.push({ dx: -1, dy: signY });
            }
        }

        // Priorité 4 : perpendiculaire (si complètement bloqué)
        if (signX === 0 && signY !== 0) {
            moves.push({ dx: 1, dy: 0 });
            moves.push({ dx: -1, dy: 0 });
        }
        if (signY === 0 && signX !== 0) {
            moves.push({ dx: 0, dy: 1 });
            moves.push({ dx: 0, dy: -1 });
        }

        return moves;
    }
}
