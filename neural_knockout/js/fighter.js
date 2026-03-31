/* =========================================================================
   CLASSE COMBATTANT
   ========================================================================= */
class Fighter {
    constructor(isPlayer, charId) {
        this.isPlayer = isPlayer;
        this.charId   = charId;
        this.charData = CHARS[charId];
        this.maxHp    = 2500;
        this.hp       = this.maxHp;

        this.w = 120; this.h = 120;
        this.startX = isPlayer ? canvas.width * 0.2 : canvas.width * 0.8;
        this.x = this.startX;
        this.y = canvas.height * 0.75;

        this.speed     = 350;
        this.vy        = 0;
        this.gravity   = 1500;
        this.jumpForce = -750;
        this.isGrounded = true;

        this.state     = 'idle';
        this.animTimer = 0;
        this.dir       = isPlayer ? 1 : -1;

        this.hasPowerUp  = false;
        this.powerTimer  = 0;
        this.isCrouching = false;

        this.comboCount = 0;
        this.comboTimer = 0;
    }

    update(dt) {
        if (gameState.clashActive || !gameState.roundActive) return;

        let dtSec = dt / 1000;

        if (this.hasPowerUp) {
            this.powerTimer -= dtSec;
            if (this.powerTimer <= 0) this.hasPowerUp = false;
        }

        if (this.comboTimer > 0) {
            this.comboTimer -= dtSec;
            if (this.comboTimer <= 0) this.comboCount = 0;
        }

        if (this.isPlayer && this.state !== 'hit') {
            // Accroupissement (bloque déplacement et saut)
            if (keys.down && this.isGrounded) {
                this.isCrouching = true;
                this.state = 'idle';
            } else {
                this.isCrouching = false;
                let moved = false;
                if (keys.left)  { this.x -= this.speed * dtSec; this.dir = -1; moved = true; }
                if (keys.right) { this.x += this.speed * dtSec; this.dir =  1; moved = true; }

                if (keys.up && this.isGrounded && this.state !== 'attack') {
                    this.vy = this.jumpForce;
                    this.isGrounded = false;
                }
                if (this.state !== 'attack') this.state = moved ? 'move' : 'idle';
            }

            if (this.x < this.w / 2)                    this.x = this.w / 2;
            if (this.x > canvas.width - this.w / 2) this.x = canvas.width - this.w / 2;
        }

        // Séparation physique — tient compte de la hauteur réelle (accroupi = moitié)
        const other = this.isPlayer ? enemy : player;
        if (other) {
            const bodyW   = this.w * 0.45;
            const otherH  = other.isCrouching ? other.h * 0.5 : other.h;
            const isAbove = this.y < other.y - otherH * 0.6;
            if (!isAbove && Math.abs(this.x - other.x) < bodyW) {
                this.x = other.x + (this.x <= other.x ? -bodyW : bodyW);
            }
        }

        // Gravité
        this.vy += this.gravity * dtSec;
        this.y  += this.vy * dtSec;

        // Collision au sol
        if (this.y >= canvas.height * 0.75) {
            this.y = canvas.height * 0.75;
            this.vy = 0;
            this.isGrounded = true;
        }

        if (this.state === 'attack' || this.state === 'hit') {
            this.animTimer -= dt;
            if (this.animTimer <= 0) this.state = 'idle';
        }
    }

    tryAttack() {
        if (this.isCrouching) return; // impossible d'attaquer accroupi
        if (this.state !== 'attack' && this.state !== 'hit') {
            this.state     = 'attack';
            this.animTimer = 200;

            let target = this.isPlayer ? enemy : player;
            let dx     = target.x - this.x;

            // Hauteur du poing (~75 % du sprite depuis le sol)
            const myPunchY  = this.y - this.h * 0.75;
            // Hitbox cible : réduite de moitié si accroupie
            const targetTop = target.y - (target.isCrouching ? target.h * 0.5 : target.h);
            const vertHit   = myPunchY >= targetTop - 15 && myPunchY <= target.y + 15;

            let inRange = false;
            if (this.dir ===  1 && dx > 0 &&              dx  <= ATTACK_RANGE && vertHit) inRange = true;
            if (this.dir === -1 && dx < 0 && Math.abs(dx) <= ATTACK_RANGE && vertHit) inRange = true;

            if (inRange) {
                this.comboCount++;
                this.comboTimer = 1.5;

                let dmg = (this.hasPowerUp ? POWER_DMG : BASE_DMG) + (this.comboCount * 2);

                if (gameState.mode === 'MP' && this.isPlayer) p2p.conn.send({ type: 'I_HIT_YOU', damage: dmg, combo: this.comboCount });
                target.takeHit(dmg);
            } else {
                if (gameState.mode === 'MP' && this.isPlayer) p2p.conn.send({ type: 'I_ATTACKED_AIR', dir: this.dir });
            }
        }
    }

    takeHit(dmg) {
        this.state     = 'hit';
        this.animTimer = 200;
        this.hp       -= dmg;
        checkWinCondition();
    }

    draw(ctx) {
        ctx.save();

        let drawX = this.x - this.w / 2;
        let drawY = this.y - this.h;
        let pixW  = this.w / 16;
        let pixH  = this.h / 16;

        if (this.state === 'hit') drawX += (Math.random() * 10 - 5);

        ctx.translate(drawX, drawY);

        if (this.isCrouching) {
            // Écrase le sprite verticalement depuis les pieds
            ctx.translate(0,  this.h);
            ctx.scale(1, 0.5);
            ctx.translate(0, -this.h);
        }

        if (this.dir === -1) {
            ctx.translate(this.w, 0);
            ctx.scale(-1, 1);
        }

        ctx.shadowBlur  = this.hasPowerUp ? 25 : 15;
        ctx.shadowColor = this.hasPowerUp ? '#ffff00' : this.charData.glow;

        for (let r of this.charData.rects) {
            ctx.fillStyle = (this.state === 'hit') ? '#ffffff' : r[4];
            ctx.fillRect(r[0] * pixW, r[1] * pixH, r[2] * pixW, r[3] * pixH);
        }

        if (this.state === 'attack') {
            ctx.fillStyle = this.hasPowerUp ? '#ffff00' : this.charData.glow;
            ctx.fillRect(12 * pixW, 7 * pixH, 60, 20);
        }

        ctx.restore();

        // Affichage du Combo
        if (this.comboCount > 1) {
            ctx.save();
            ctx.fillStyle  = this.hasPowerUp ? '#ffff00' : this.charData.glow;
            ctx.font       = '20px "Press Start 2P"';
            ctx.textAlign  = 'center';
            ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle;
            let floatY = this.y - this.h - 30 - (Math.sin(Date.now() / 100) * 10);
            ctx.fillText(this.comboCount + " HITS!", this.x, floatY);
            ctx.restore();
        }
    }
}
