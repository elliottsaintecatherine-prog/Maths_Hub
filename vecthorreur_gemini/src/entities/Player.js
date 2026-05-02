export default class Player {
    constructor(x, y, assets, levelManager) {
        this.x = x;
        this.y = y;
        this.assets = assets;
        this.levelManager = levelManager;
        this.isDead = false;
        this.hasWon = false;
    }

    update(dt, input) {
        if (this.isDead || this.hasWon) return;

        let dx = 0;
        let dy = 0;

        if (input.isJustPressed('ArrowUp')) dy = -1;
        else if (input.isJustPressed('ArrowDown')) dy = 1;
        else if (input.isJustPressed('ArrowLeft')) dx = -1;
        else if (input.isJustPressed('ArrowRight')) dx = 1;

        if (dx !== 0 || dy !== 0) {
            this.attemptMove(dx, dy);
        }
    }

    attemptMove(dx, dy) {
        if (this.isDead || this.hasWon) return false;

        const nx = this.x + dx;
        const ny = this.y + dy;

        // c3: Collisions Statiques
        if (this.levelManager.isWalkable(nx, ny)) {
            this.x = nx;
            this.y = ny;

            // c4: Pièges
            if (this.levelManager.isDeathZone(nx, ny)) {
                this.isDead = true;
                console.log("Joueur mort");
            }

            // c5: Sortie
            if (this.levelManager.isExit(nx, ny)) {
                this.hasWon = true;
                console.log("Niveau terminé");
            }
            return true;
        }
        return false;
    }

    draw(ctx, camera, tileSize) {
        const img = this.assets.getImage('hero');
        if (!img) return;

        const effectiveTileSize = tileSize * camera.zoom;
        const drawX = this.x * effectiveTileSize;
        const drawY = this.y * effectiveTileSize;

        ctx.save();
        ctx.translate(ctx.canvas.width / 2 - camera.x * effectiveTileSize, ctx.canvas.height / 2 - camera.y * effectiveTileSize);

        ctx.drawImage(img, drawX, drawY, effectiveTileSize, effectiveTileSize);

        ctx.restore();
    }
}
