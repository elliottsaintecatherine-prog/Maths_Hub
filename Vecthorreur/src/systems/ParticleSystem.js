/**
 * g1 — ParticleSystem
 * Gère des particules visuelles : poussière flottante + sang/étincelles.
 * Utilise un Object Pool pour recycler les particules et éviter les allocations.
 */
export default class ParticleSystem {
    constructor(poolSize = 200) {
        this.particles = [];
        this.poolSize = poolSize;

        // Pré-allouer le pool
        for (let i = 0; i < poolSize; i++) {
            this.particles.push(this._createParticle());
        }
    }

    _createParticle() {
        return {
            active: false,
            x: 0, y: 0,
            vx: 0, vy: 0,
            life: 0, maxLife: 0,
            size: 1,
            color: 'rgba(255,255,255,0.3)',
            type: 'dust' // 'dust' ou 'blood'
        };
    }

    _getInactive() {
        for (const p of this.particles) {
            if (!p.active) return p;
        }
        return null; // Pool plein
    }

    /**
     * Génère des particules de poussière flottant dans la lumière (autour du joueur).
     * Appelée chaque frame avec un faible taux.
     */
    emitDust(cx, cy, radius) {
        // ~1 particule tous les 3-4 frames
        if (Math.random() > 0.3) return;

        const p = this._getInactive();
        if (!p) return;

        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;

        p.active = true;
        p.x = cx + Math.cos(angle) * dist;
        p.y = cy + Math.sin(angle) * dist;
        p.vx = (Math.random() - 0.5) * 8;
        p.vy = -Math.random() * 12 - 4; // Flotte vers le haut
        p.life = 0;
        p.maxLife = 2 + Math.random() * 3; // 2-5 secondes
        p.size = 1 + Math.random() * 2;
        p.type = 'dust';
        p.color = ''; // Calculé au draw
    }

    /**
     * Explosion de particules rouges (sang/étincelles) à une position donnée.
     */
    emitBlood(worldX, worldY, count = 15) {
        for (let i = 0; i < count; i++) {
            const p = this._getInactive();
            if (!p) return;

            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 80;

            p.active = true;
            p.x = worldX;
            p.y = worldY;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = 0;
            p.maxLife = 0.5 + Math.random() * 0.8;
            p.size = 2 + Math.random() * 3;
            p.type = 'blood';
            p.color = '';
        }
    }

    update(dt) {
        for (const p of this.particles) {
            if (!p.active) continue;

            p.life += dt;
            if (p.life >= p.maxLife) {
                p.active = false;
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Dust : légère oscillation horizontale
            if (p.type === 'dust') {
                p.vx += (Math.random() - 0.5) * 2 * dt;
            }

            // Blood : gravité et friction
            if (p.type === 'blood') {
                p.vy += 60 * dt; // Gravité
                p.vx *= 0.98;
                p.vy *= 0.98;
            }
        }
    }

    /**
     * Dessiner les particules sur le canvas.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} camera - {x, y, zoom}
     * @param {number} tileSize
     */
    draw(ctx, camera, tileSize) {
        const effectiveTileSize = tileSize * camera.zoom;

        ctx.save();
        ctx.translate(
            ctx.canvas.width / 2 - camera.x * effectiveTileSize,
            ctx.canvas.height / 2 - camera.y * effectiveTileSize
        );

        for (const p of this.particles) {
            if (!p.active) continue;

            const alpha = 1 - (p.life / p.maxLife);

            if (p.type === 'dust') {
                ctx.fillStyle = `rgba(200, 190, 160, ${alpha * 0.35})`;
            } else {
                // Blood : rouge vif -> rouge sombre
                const r = Math.floor(220 - p.life * 80);
                ctx.fillStyle = `rgba(${r}, 20, 10, ${alpha * 0.9})`;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
