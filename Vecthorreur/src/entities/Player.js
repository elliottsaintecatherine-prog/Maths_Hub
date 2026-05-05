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

    // h4 : Créer le mesh 3D du joueur
    createMesh3D(palette) {
        const THREE = window.THREE;
        if (!THREE) return null;

        this.mesh3D = new THREE.Group();

        // Corps (cylindre)
        const bodyColor = palette.player || '#f5d070';
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.35, 1.2, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(bodyColor),
            roughness: 0.6,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        this.mesh3D.add(body);

        // Tête (sphère)
        const headColor = palette.playerHead || palette.player || '#f0c840';
        const headGeometry = new THREE.SphereGeometry(0.25, 8, 6);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(headColor),
            roughness: 0.5,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.45;
        head.castShadow = true;
        this.mesh3D.add(head);

        // Position initiale
        this.mesh3D.position.set(this.x, 0, this.y);

        return this.mesh3D;
    }

    // h4 : Mettre à jour la position 3D
    updateMesh3D() {
        if (!this.mesh3D) return;
        // Lerp vers la position logique
        this.mesh3D.position.x += (this.x - this.mesh3D.position.x) * 0.2;
        this.mesh3D.position.z += (this.y - this.mesh3D.position.z) * 0.2;
    }
}
