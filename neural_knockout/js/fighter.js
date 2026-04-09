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

        this.energy      = 0;    // 0 à 100
        this.isCharging  = false;
        this.chargeTime  = 0;    // secondes maintenu

        this.abilityTimer = 0;   // cooldown capacité spéciale
        this.hasShield    = false;
        this.isRaging     = false;
        this.rageDuration = 0;
        this.jumpCount    = 0;
    }

    update(dt) {
        if (gameState.clashActive || !gameState.roundActive) return;

        let dtSec = dt / 1000;

        if (this.hasPowerUp) {
            this.powerTimer -= dtSec;
            if (this.powerTimer <= 0) this.hasPowerUp = false;
        }

        if (this.abilityTimer > 0) this.abilityTimer -= dtSec;

        if (this.isRaging) {
            this.rageDuration -= dtSec;
            if (this.rageDuration <= 0) this.isRaging = false;
        }

        if (this.comboTimer > 0) {
            this.comboTimer -= dtSec;
            if (this.comboTimer <= 0) this.comboCount = 0;
        }

        // Charge : montée du timer si isCharging, déclenchement automatique à 2s
        if (this.isCharging && !gameState.clashActive && gameState.roundActive) {
            this.chargeTime += dtSec;
            if (this.chargeTime >= 2.0) {
                this.isCharging = false;
                this.chargeTime = 0;
                if (this.energy >= 50) triggerSurchargePuzzle(this);
            }
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

                if (keys.upJustPressed && this.state !== 'attack') {
                    if (this.isGrounded) {
                        this.vy = this.jumpForce;
                        this.isGrounded = false;
                        this.jumpCount = 1;
                    } else if (this.charId === 1 && this.jumpCount < 2) {
                        // DEMON : double saut
                        this.vy = this.jumpForce * 0.8;
                        this.jumpCount = 2;
                    }
                    keys.upJustPressed = false;
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
            const isAbove = this.y < other.y - otherH * 0.1;
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
            this.jumpCount = 0;
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
                this.energy = Math.min(100, this.energy + 8);

                // Coup spécial à 10 hits
                if (this.comboCount === 10) {
                    const specialDmg = 150;
                    showAnnouncement("★ COMBO ULTIME ! ★", this.charData.glow);
                    if (gameState.mode === 'MP' && this.isPlayer) p2p.conn.send({ type: 'I_HIT_YOU', damage: specialDmg, combo: this.comboCount });
                    target.takeHit(specialDmg);
                    this.comboCount = 0;
                    return;
                }

                let dmg = (this.hasPowerUp ? POWER_DMG : BASE_DMG) + (this.comboCount * 2);
                if (this.isRaging) dmg *= 2;

                if (gameState.mode === 'MP' && this.isPlayer) p2p.conn.send({ type: 'I_HIT_YOU', damage: dmg, combo: this.comboCount });
                target.takeHit(dmg);
            } else {
                if (gameState.mode === 'MP' && this.isPlayer) p2p.conn.send({ type: 'I_ATTACKED_AIR', dir: this.dir });
            }
        }
    }

    takeHit(dmg) {
        if (this.hasShield) {
            this.hasShield = false;
            showAnnouncement("BOUCLIER BRISÉ !", "#10b981");
            return;
        }
        this.state     = 'hit';
        this.animTimer = 200;
        this.hp       -= dmg;
        checkWinCondition();
    }

    useAbility() {
        if (this.abilityTimer > 0 || !gameState.roundActive || gameState.clashActive) return;
        const COOLDOWN = 8;

        switch (this.charId) {
            case 0: // BRAWLER — Rage ×2 dégâts pendant 4s
                this.isRaging = true;
                this.rageDuration = 4;
                this.abilityTimer = COOLDOWN;
                showAnnouncement("BRAWLER EN RAGE !", "#ff00ff");
                break;
            case 1: // DEMON — Double saut géré en passif ; E = mini-dash aérien
                if (!this.isGrounded) {
                    this.x += this.dir * 120;
                    this.x = Math.max(this.w / 2, Math.min(canvas.width - this.w / 2, this.x));
                    this.abilityTimer = COOLDOWN;
                    showAnnouncement("DASH DÉMONIAQUE !", "#00ffff");
                }
                break;
            case 2: // ASSASSIN — Téléport derrière l'adversaire
                {
                    const target = this.isPlayer ? enemy : player;
                    const offset = (this.x < target.x) ? -90 : 90;
                    this.x = Math.max(this.w / 2, Math.min(canvas.width - this.w / 2, target.x + offset));
                    this.abilityTimer = COOLDOWN;
                    showAnnouncement("ASSASSIN TÉLÉPORTE !", "#a855f7");
                }
                break;
            case 3: // PHOENIX — Zone de brûlure
                burnZones.push({ x: this.x, y: this.y, r: 80, timer: 3.0, owner: this });
                this.abilityTimer = COOLDOWN;
                showAnnouncement("ZONE DE FEU !", "#f97316");
                break;
            case 4: // CYBORG — Bouclier
                this.hasShield = true;
                this.abilityTimer = COOLDOWN;
                showAnnouncement("BOUCLIER ACTIVÉ !", "#10b981");
                break;
            case 5: // SHADOW — Clone fantôme visuel
                ghostClones.push({ x: this.x, y: this.y, charId: this.charId, dir: this.dir, timer: 2.0 });
                this.abilityTimer = COOLDOWN;
                showAnnouncement("CLONE INVOQUÉ !", "#eab308");
                break;
        }
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

        // Indicateur bouclier (CYBORG)
        if (this.hasShield) {
            ctx.save();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15; ctx.shadowColor = '#10b981';
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.h / 2, this.w * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Indicateur rage (BRAWLER)
        if (this.isRaging) {
            ctx.save();
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 20; ctx.shadowColor = '#ff00ff';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.h / 2, this.w * 0.65, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Barre de cooldown capacité spéciale
        if (this.abilityTimer > 0) {
            const cdMax = 8;
            const barW = this.w;
            const bx = this.x - barW / 2;
            const by = this.y + 14;
            ctx.save();
            ctx.fillStyle = '#333';
            ctx.fillRect(bx, by, barW, 4);
            ctx.fillStyle = this.charData.glow;
            ctx.fillRect(bx, by, barW * (1 - this.abilityTimer / cdMax), 4);
            ctx.restore();
        }

        // Barre d'énergie sous le personnage
        if (this.energy > 0) {
            const barW = this.w;
            const barH = 5;
            const bx   = this.x - barW / 2;
            const by   = this.y + 6;
            ctx.save();
            ctx.fillStyle = '#222';
            ctx.fillRect(bx, by, barW, barH);
            const energyColor = this.energy >= 50 ? '#00ffff' : '#0088aa';
            ctx.fillStyle = energyColor;
            ctx.shadowBlur = this.energy >= 50 ? 8 : 0;
            ctx.shadowColor = '#00ffff';
            ctx.fillRect(bx, by, barW * (this.energy / 100), barH);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, barW, barH);
            ctx.restore();
        }

        // Affichage de la charge en cours
        if (this.isCharging && this.chargeTime > 0) {
            ctx.save();
            ctx.font = '10px "Press Start 2P"';
            ctx.fillStyle = '#00ffff';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff';
            const pct = Math.min(this.chargeTime / 2.0, 1);
            ctx.fillText(`CHARGE ${Math.round(pct * 100)}%`, this.x, this.y - this.h - 10);
            ctx.restore();
        }

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
