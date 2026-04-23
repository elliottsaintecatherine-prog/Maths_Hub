import CLIENT_TYPES from '../data/clientTypes.js';
import { infectionCost, createZombieFromClient } from '../data/zombieStats.js';
import { getRandomZombieName } from '../data/zombieNames.js';

const CLIENT_COLORS = {
  construction_worker: 0x888888,
  teenager: 0xffa500,
  office_worker: 0x3b82f6,
  supermodel: 0xff69b4,
  fire_chief: 0xef4444,
  celebrity: 0xa855f7
};

const CHAIR_POSITIONS = [
  { x: 420, y: 280 },
  { x: 520, y: 280 },
  { x: 620, y: 280 },
  { x: 420, y: 380 },
  { x: 520, y: 380 },
  { x: 620, y: 380 }
];

const STAFF_ZONE = { x: 80, y: 200 };
const STAFF_SPACING = 44;

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  preload() {
    this.fridgeLoadFailed = false;
    this.load.image('fridge', 'assets/images/fridge.png');
    this.load.once('loaderror', (file) => {
      if (file && file.key === 'fridge') this.fridgeLoadFailed = true;
    });
  }

  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'GameScene — stub', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5);

    this.toxines = 10;
    this.rating = 5;
    this.clients = [];
    this.staff = [];
    this.staffCount = 0;
    this.activePopup = null;
    this.activeEnergyUI = null;
    this.activeActionPopup = null;

    this.fridgeContents = [];
    this.fridgeCapacity = 5;

    this.createToxinesHUD();
    this.createFridge();
    this.createRestZone();
    this.createDebugClientTable();

    this.spawnClient();
    this.spawnTimer = this.time.addEvent({
      delay: 15000,
      callback: () => this.spawnClient(),
      loop: true
    });

    this.attackCheckTimer = this.time.addEvent({
      delay: 1000,
      callback: () => this.checkZombieAttacks(),
      loop: true
    });

    this.input.on('pointerdown', (pointer, targets) => {
      if (this.activeEnergyUI && (!targets || targets.length === 0)) {
        this.closeEnergyUI();
      }
      if (this.activeActionPopup && (!targets || targets.length === 0)) {
        this.closeActionPopup();
      }
    });
  }

  update(time, delta) {
    const dt = delta / 1000;
    for (const zombie of this.staff) {
      this.updateZombieEnergy(zombie, dt);
      this.updateZombieDaydream(zombie);
      this.updateZombieVisuals(zombie);
    }
    if (this.activeEnergyUI) this.refreshEnergyUI();
    if (this.activeActionPopup) this.refreshActionPopup();
  }

  updateZombieDaydream(zombie) {
    if (zombie.state === 'working') {
      if (!zombie.daydreamNext) {
        zombie.daydreamNext = Date.now() + zombie.focus * 60 * 1000;
      }
      if (Date.now() >= zombie.daydreamNext) {
        this.enterDaydream(zombie);
      }
    } else if (zombie.state === 'daydreaming') {
      if (Date.now() >= zombie.daydreamEnd) {
        this.exitDaydream(zombie);
      } else if (zombie.daydreamBubble) {
        zombie.daydreamBubble.x = zombie.circle.x + 20;
        zombie.daydreamBubble.y = zombie.circle.y - 30;
      }
    } else {
      zombie.daydreamNext = null;
      if (zombie.daydreamBubble) {
        zombie.daydreamBubble.destroy();
        zombie.daydreamBubble = null;
      }
    }
  }

  enterDaydream(zombie) {
    zombie.state = 'daydreaming';
    zombie.daydreamEnd = Date.now() + 3000;
    this.tweens.killTweensOf(zombie.circle);

    const bubble = this.add.container(zombie.circle.x + 20, zombie.circle.y - 30);
    bubble.setDepth(160);

    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.lineStyle(1, 0x000000, 1);
    g.fillCircle(-8, 2, 8);
    g.strokeCircle(-8, 2, 8);
    g.fillCircle(0, -4, 10);
    g.strokeCircle(0, -4, 10);
    g.fillCircle(10, 2, 8);
    g.strokeCircle(10, 2, 8);
    bubble.add(g);

    const tail = this.add.graphics();
    tail.fillStyle(0xffffff, 1);
    tail.lineStyle(1, 0x000000, 1);
    tail.fillCircle(-10, 14, 2);
    tail.strokeCircle(-10, 14, 2);
    tail.fillCircle(-14, 20, 1.5);
    tail.strokeCircle(-14, 20, 1.5);
    bubble.add(tail);

    const dot1 = this.add.circle(-6, 0, 1.5, 0xffffff);
    dot1.setStrokeStyle(1, 0x000000, 1);
    const dot2 = this.add.circle(1, -2, 1.5, 0xffffff);
    dot2.setStrokeStyle(1, 0x000000, 1);
    const dot3 = this.add.circle(8, 0, 1.5, 0xffffff);
    dot3.setStrokeStyle(1, 0x000000, 1);
    bubble.add([dot1, dot2, dot3]);

    zombie.daydreamBubble = bubble;
  }

  exitDaydream(zombie) {
    if (zombie.daydreamBubble) {
      zombie.daydreamBubble.destroy();
      zombie.daydreamBubble = null;
    }
    zombie.state = 'working';
    zombie.daydreamNext = Date.now() + zombie.focus * 60 * 1000;
  }

  updateZombieEnergy(zombie, dt) {
    if (zombie.state === 'reanimating') {
      const remaining = zombie.reanimationEnd - Date.now();
      if (remaining <= 0) {
        zombie.state = 'idle';
        zombie.reanimationEnd = null;
        zombie.energyCurrent = zombie.energy;
      }
      return;
    }
    if (zombie.state === 'working') {
      zombie.energyCurrent -= (zombie.energy / 300) * dt;
      if (zombie.energyCurrent <= 0) {
        zombie.energyCurrent = 0;
        zombie.state = 'reanimating';
        zombie.reanimationEnd = Date.now() + 60 * 60 * 1000;
      }
    } else if (zombie.state === 'daydreaming') {
      // pas de perte d'énergie pendant la rêvasserie
    } else if (zombie.state === 'resting') {
      zombie.energyCurrent += (zombie.energy / 180) * dt;
      if (zombie.energyCurrent > zombie.energy) zombie.energyCurrent = zombie.energy;
    }
  }

  updateZombieVisuals(zombie) {
    const threshold = this.getPatienceThreshold(zombie);
    const critical = zombie.energyCurrent < threshold && zombie.state !== 'reanimating';

    if (critical) {
      if (!zombie.halo) {
        zombie.halo = this.add.circle(zombie.circle.x, zombie.circle.y, 26, 0xef4444, 0.5);
        zombie.halo.setDepth(zombie.circle.depth - 1);
        this.tweens.add({
          targets: zombie.halo,
          alpha: { from: 0.3, to: 0.8 },
          duration: 500,
          yoyo: true,
          repeat: -1
        });
      } else {
        zombie.halo.x = zombie.circle.x;
        zombie.halo.y = zombie.circle.y;
      }
    } else if (zombie.halo) {
      this.tweens.killTweensOf(zombie.halo);
      zombie.halo.destroy();
      zombie.halo = null;
    }

    if (zombie.label) {
      zombie.label.x = zombie.circle.x;
      zombie.label.y = zombie.circle.y - 26;
    }

    if (zombie.state === 'reanimating') {
      const minutes = Math.max(0, Math.ceil((zombie.reanimationEnd - Date.now()) / 60000));
      if (!zombie.reanimText) {
        zombie.reanimText = this.add.text(zombie.circle.x, zombie.circle.y - 40, '', {
          fontFamily: 'monospace', fontSize: '10px', color: '#ef4444'
        }).setOrigin(0.5);
      }
      zombie.reanimText.setText(`Réanim. ${minutes}min`);
      zombie.reanimText.x = zombie.circle.x;
      zombie.reanimText.y = zombie.circle.y - 40;

      if (!zombie.skipBtnBg) {
        zombie.skipBtnBg = this.add.rectangle(zombie.circle.x + 40, zombie.circle.y, 90, 20, 0x444444);
        zombie.skipBtnBg.setStrokeStyle(1, 0xffffff, 1);
        zombie.skipBtnBg.setInteractive({ useHandCursor: true });
        zombie.skipBtnText = this.add.text(zombie.circle.x + 40, zombie.circle.y, 'Skip (5 Tox.)', {
          fontFamily: 'monospace', fontSize: '10px', color: '#ffffff'
        }).setOrigin(0.5);
        zombie.skipBtnBg.on('pointerdown', () => this.skipReanimation(zombie));
      } else {
        zombie.skipBtnBg.x = zombie.circle.x + 40;
        zombie.skipBtnBg.y = zombie.circle.y;
        zombie.skipBtnText.x = zombie.circle.x + 40;
        zombie.skipBtnText.y = zombie.circle.y;
      }
    } else {
      if (zombie.reanimText) { zombie.reanimText.destroy(); zombie.reanimText = null; }
      if (zombie.skipBtnBg) { zombie.skipBtnBg.destroy(); zombie.skipBtnBg = null; }
      if (zombie.skipBtnText) { zombie.skipBtnText.destroy(); zombie.skipBtnText = null; }
    }
  }

  getPatienceThreshold(zombie) {
    return (11 - zombie.patience) * 2 / 100 * zombie.energy;
  }

  checkZombieAttacks() {
    for (const zombie of this.staff) {
      if (zombie.state === 'reanimating' || zombie.attacking) continue;
      const threshold = this.getPatienceThreshold(zombie);
      if (zombie.energyCurrent > threshold) continue;
      const seated = this.clients.filter(c => !c.infected && !c.fleeing);
      if (seated.length === 0) continue;
      this.performAttack(zombie, seated);
    }
  }

  performAttack(zombie, seatedClients) {
    zombie.attacking = true;
    let target = seatedClients[0];
    let bestDist = Infinity;
    for (const c of seatedClients) {
      const dx = c.circle.x - zombie.circle.x;
      const dy = c.circle.y - zombie.circle.y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; target = c; }
    }

    this.tweens.add({
      targets: zombie.circle,
      x: target.circle.x,
      y: target.circle.y,
      duration: 300,
      onComplete: () => {
        const flash = this.add.rectangle(target.circle.x, target.circle.y, 40, 40, 0xef4444, 0.6);
        flash.setDepth(150);

        this.time.delayedCall(200, () => {
          flash.destroy();
          target.circle.destroy();
          this.clients = this.clients.filter(c => c !== target);

          zombie.energyCurrent = Math.min(zombie.energy, zombie.energyCurrent + zombie.energy * 0.2);
          this.rating = Math.max(0, this.rating - 1);

          const witnesses = this.clients.filter(c => !c.infected && !c.fleeing);
          for (const w of witnesses) this.makeClientFlee(w);

          zombie.attacking = false;
          if (zombie.state !== 'reanimating') zombie.state = 'idle';
        });
      }
    });
  }

  makeClientFlee(client) {
    client.fleeing = true;
    client.circle.disableInteractive();

    const bubble = this.add.container(client.circle.x, client.circle.y - 30);
    bubble.setDepth(160);
    const rect = this.add.rectangle(0, 0, 30, 20, 0xffffff);
    rect.setStrokeStyle(1, 0x000000, 1);
    const tail = this.add.triangle(0, 14, -4, 0, 4, 0, 0, 6, 0xffffff);
    tail.setStrokeStyle(1, 0x000000, 1);
    const txt = this.add.text(0, 0, '!', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ef4444'
    }).setOrigin(0.5);
    bubble.add([rect, tail, txt]);

    const { width } = this.scale;
    const exitX = width + 30;

    this.tweens.add({
      targets: client.circle,
      x: exitX,
      duration: 3000,
      onComplete: () => {
        client.circle.destroy();
        this.clients = this.clients.filter(c => c !== client);
      }
    });
    this.tweens.add({
      targets: bubble,
      x: exitX,
      duration: 3000,
      onComplete: () => bubble.destroy()
    });
  }

  skipReanimation(zombie) {
    if (this.toxines < 5) { this.showInsufficientToxines(); return; }
    this.toxines -= 5;
    this.updateToxinesHUD();
    zombie.state = 'idle';
    zombie.reanimationEnd = null;
    zombie.energyCurrent = zombie.energy;
  }

  createRestZone() {
    const { width } = this.scale;
    const rw = 80;
    const rh = 60;
    const rx = width - rw / 2 - 10;
    const ry = rh / 2 + 60;
    this.restZone = this.add.rectangle(rx, ry, rw, rh, 0xcccccc, 0.6);
    this.restZone.setStrokeStyle(2, 0xffffff, 1);
    this.restZoneBounds = { x: rx - rw / 2, y: ry - rh / 2, w: rw, h: rh };
    this.add.text(rx, ry, 'Repos', {
      fontFamily: 'monospace', fontSize: '12px', color: '#000000'
    }).setOrigin(0.5);
  }

  openEnergyUI(zombie) {
    this.closeEnergyUI();
    const container = this.add.container(zombie.circle.x, zombie.circle.y - 44);
    container.setDepth(150);

    const barBg = this.add.rectangle(0, 0, 60, 8, 0x555555);
    barBg.setStrokeStyle(1, 0xffffff, 1);
    const barFill = this.add.rectangle(-30, 0, 60, 8, 0x22c55e);
    barFill.setOrigin(0, 0.5);
    container.add([barBg, barFill]);

    const stateText = this.add.text(0, -14, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffffff'
    }).setOrigin(0.5);
    container.add(stateText);

    const states = [
      { key: 'idle', label: 'Idle', x: -40 },
      { key: 'working', label: 'Work', x: 0 },
      { key: 'resting', label: 'Rest', x: 40 }
    ];
    const btns = [];
    for (const s of states) {
      const bg = this.add.rectangle(s.x, 18, 36, 14, 0x444444);
      bg.setStrokeStyle(1, 0xffffff, 1);
      bg.setInteractive({ useHandCursor: true });
      const txt = this.add.text(s.x, 18, s.label, {
        fontFamily: 'monospace', fontSize: '9px', color: '#ffffff'
      }).setOrigin(0.5);
      bg.on('pointerdown', (pointer, lx, ly, ev) => {
        if (zombie.state !== 'reanimating') zombie.state = s.key;
        if (ev && ev.stopPropagation) ev.stopPropagation();
      });
      container.add([bg, txt]);
      btns.push({ bg, key: s.key });
    }

    this.activeEnergyUI = { container, zombie, barFill, stateText, btns };
    this.refreshEnergyUI();
  }

  refreshEnergyUI() {
    const ui = this.activeEnergyUI;
    if (!ui) return;
    const z = ui.zombie;
    if (!this.staff.includes(z)) { this.closeEnergyUI(); return; }
    ui.container.x = z.circle.x;
    ui.container.y = z.circle.y - 44;
    const ratio = Math.max(0, Math.min(1, z.energyCurrent / z.energy));
    ui.barFill.width = 60 * ratio;
    let color = 0x22c55e;
    if (ratio < 0.2) color = 0xef4444;
    else if (ratio < 0.6) color = 0xf59e0b;
    ui.barFill.fillColor = color;
    ui.stateText.setText(`${z.state} ${Math.round(z.energyCurrent)}/${z.energy}`);
    for (const b of ui.btns) {
      b.bg.fillColor = (z.state === b.key) ? 0x22c55e : 0x444444;
    }
  }

  closeEnergyUI() {
    if (this.activeEnergyUI) {
      this.activeEnergyUI.container.destroy();
      this.activeEnergyUI = null;
    }
  }

  openZombieActionPopup(zombie) {
    this.closeActionPopup();
    const popupW = 200;
    const popupH = 120;
    const container = this.add.container(zombie.circle.x, zombie.circle.y - popupH / 2 - 30);
    container.setDepth(150);

    const bg = this.add.rectangle(0, 0, popupW, popupH, 0x2a2a2a);
    bg.setStrokeStyle(2, 0xffffff, 1);
    bg.setInteractive();
    container.add(bg);

    const statsText = this.add.text(0, -popupH / 2 + 14, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', align: 'center'
    }).setOrigin(0.5, 0);
    container.add(statsText);

    const btnRestBg = this.add.rectangle(0, -8, 140, 32, 0x3b82f6);
    btnRestBg.setStrokeStyle(1, 0xffffff, 1);
    btnRestBg.setInteractive({ useHandCursor: true });
    const btnRestTxt = this.add.text(0, -8, 'Repos', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffffff'
    }).setOrigin(0.5);
    container.add([btnRestBg, btnRestTxt]);

    const btnWorkBg = this.add.rectangle(0, 30, 140, 32, 0x22c55e);
    btnWorkBg.setStrokeStyle(1, 0xffffff, 1);
    btnWorkBg.setInteractive({ useHandCursor: true });
    const btnWorkTxt = this.add.text(0, 30, 'Travailler', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffffff'
    }).setOrigin(0.5);
    container.add([btnWorkBg, btnWorkTxt]);

    btnRestBg.on('pointerdown', (pointer, lx, ly, ev) => {
      if (zombie.state !== 'reanimating') this.sendZombieToRest(zombie);
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });
    btnWorkBg.on('pointerdown', (pointer, lx, ly, ev) => {
      if (zombie.state !== 'reanimating') {
        zombie.state = 'working';
        zombie.daydreamNext = Date.now() + zombie.focus * 60 * 1000;
      }
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });

    this.activeActionPopup = { container, zombie, statsText };
    this.refreshActionPopup();
  }

  refreshActionPopup() {
    const ui = this.activeActionPopup;
    if (!ui) return;
    const z = ui.zombie;
    if (!this.staff.includes(z)) { this.closeActionPopup(); return; }
    ui.container.x = z.circle.x;
    ui.container.y = z.circle.y - 60 - 30;
    ui.statsText.setText(`${z.name}\nÉnergie : ${Math.round(z.energyCurrent)}/${z.energy}\nÉtat : ${z.state}`);
  }

  closeActionPopup() {
    if (this.activeActionPopup) {
      this.activeActionPopup.container.destroy();
      this.activeActionPopup = null;
    }
  }

  sendZombieToRest(zombie) {
    zombie.state = 'resting';
    if (zombie.daydreamBubble) {
      zombie.daydreamBubble.destroy();
      zombie.daydreamBubble = null;
    }
    if (this.restZoneBounds) {
      const rb = this.restZoneBounds;
      const tx = rb.x + rb.w / 2;
      const ty = rb.y + rb.h / 2;
      this.tweens.killTweensOf(zombie.circle);
      this.tweens.add({
        targets: zombie.circle,
        x: tx,
        y: ty,
        duration: 600
      });
    }
  }

  createToxinesHUD() {
    const cx = 32;
    const cy = 32;
    const r = 14;

    const g = this.add.graphics();
    g.fillStyle(0x22c55e, 1);
    g.lineStyle(2, 0xffffff, 1);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
    this.toxinesHex = g;

    this.toxinesText = this.add.text(cx + r + 10, cy, String(this.toxines), {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff'
    }).setOrigin(0, 0.5);
  }

  updateToxinesHUD() {
    this.toxinesText.setText(String(this.toxines));
  }

  spawnClient() {
    const occupied = new Set(this.clients.map(c => c.chairIndex));
    let chairIndex = -1;
    for (let i = 0; i < CHAIR_POSITIONS.length; i++) {
      if (!occupied.has(i)) { chairIndex = i; break; }
    }
    if (chairIndex === -1) return;

    const keys = Object.keys(CLIENT_TYPES);
    const typeKey = keys[Math.floor(Math.random() * keys.length)];
    const clientType = CLIENT_TYPES[typeKey];
    const color = CLIENT_COLORS[clientType.id] || 0xffffff;
    const pos = CHAIR_POSITIONS[chairIndex];

    const circle = this.add.circle(pos.x, pos.y, 18, color);
    circle.setStrokeStyle(2, 0xffffff, 1);
    circle.setInteractive({ useHandCursor: true });

    const client = {
      circle,
      clientType,
      chairIndex,
      infected: false
    };
    this.clients.push(client);

    circle.on('pointerdown', () => this.openClientPopup(client));
  }

  openClientPopup(client) {
    if (this.activePopup) return;
    if (client.infected) return;

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const popupW = 360;
    const popupH = 280;

    const container = this.add.container(cx, cy);
    container.setDepth(100);

    const bg = this.add.rectangle(0, 0, popupW, popupH, 0x2a2a2a);
    bg.setStrokeStyle(2, 0xffffff, 1);
    container.add(bg);

    const title = this.add.text(0, -popupH / 2 + 18, client.clientType.label, {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff'
    }).setOrigin(0.5, 0);
    container.add(title);

    const c = client.clientType;
    const stats = [
      `Energy   : ${c.energy}`,
      `Tip      : ${c.tipRating}`,
      `Speed    : ${c.speed}`,
      `Attack   : ${c.atkStrength}`,
      `Patience : ${c.patience}`,
      `Focus    : ${c.focus}`
    ];
    const statsText = this.add.text(-popupW / 2 + 24, -popupH / 2 + 54, stats.join('\n'), {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', lineSpacing: 4
    });
    container.add(statsText);

    const cost = infectionCost(c);
    const costText = this.add.text(0, popupH / 2 - 86, `Coût d'infection : ${cost} Toxines`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#22c55e'
    }).setOrigin(0.5, 0);
    container.add(costText);

    const btnCloseBg = this.add.rectangle(-70, popupH / 2 - 36, 120, 36, 0x555555);
    btnCloseBg.setStrokeStyle(1, 0xffffff, 1);
    btnCloseBg.setInteractive({ useHandCursor: true });
    const btnCloseTxt = this.add.text(-70, popupH / 2 - 36, 'Fermer', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    container.add([btnCloseBg, btnCloseTxt]);

    const btnInfectBg = this.add.rectangle(70, popupH / 2 - 36, 120, 36, 0x22c55e);
    btnInfectBg.setStrokeStyle(1, 0xffffff, 1);
    btnInfectBg.setInteractive({ useHandCursor: true });
    const btnInfectTxt = this.add.text(70, popupH / 2 - 36, 'Infecter', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    container.add([btnInfectBg, btnInfectTxt]);

    this.activePopup = container;

    btnCloseBg.on('pointerdown', () => this.closePopup());
    btnInfectBg.on('pointerdown', () => this.attemptInfect(client, cost));
  }

  closePopup() {
    if (this.activePopup) {
      this.activePopup.destroy();
      this.activePopup = null;
    }
  }

  attemptInfect(client, cost) {
    if (this.toxines < cost) {
      this.closePopup();
      this.showInsufficientToxines();
      return;
    }
    this.toxines -= cost;
    this.updateToxinesHUD();
    this.closePopup();
    this.performInfection(client);
  }

  performInfection(client) {
    client.infected = true;
    client.circle.disableInteractive();
    const { width, height } = this.scale;

    const flash = this.add.rectangle(0, 0, width, height, 0x22c55e, 0.5);
    flash.setOrigin(0, 0);
    flash.setDepth(200);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy()
    });

    client.circle.setFillStyle(0x22c55e);

    this.time.delayedCall(500, () => {
      const targetX = STAFF_ZONE.x;
      const targetY = STAFF_ZONE.y + this.staffCount * STAFF_SPACING;
      this.staffCount++;

      this.tweens.add({
        targets: client.circle,
        x: targetX,
        y: targetY,
        duration: 600,
        onComplete: () => {
          const zombie = createZombieFromClient(client.clientType);
          zombie.name = getRandomZombieName();
          zombie.circle = client.circle;

          const label = this.add.text(targetX, targetY - 26, zombie.name, {
            fontFamily: 'monospace', fontSize: '11px', color: '#ffffff'
          }).setOrigin(0.5);
          zombie.label = label;

          client.circle.setInteractive({ useHandCursor: true });
          client.circle.removeAllListeners('pointerdown');
          client.circle.on('pointerdown', (pointer, lx, ly, ev) => {
            this.openZombieActionPopup(zombie);
            if (ev && ev.stopPropagation) ev.stopPropagation();
          });

          this.staff.push(zombie);
          this.clients = this.clients.filter(c => c !== client);
        }
      });
    });
  }

  showInsufficientToxines() {
    const { width, height } = this.scale;
    const msg = this.add.text(width / 2, height / 2, 'Toxines insuffisantes', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ef4444',
      backgroundColor: '#000000', padding: { x: 14, y: 10 }
    }).setOrigin(0.5).setDepth(300);
    this.time.delayedCall(2000, () => msg.destroy());
  }

  createFridge() {
    const fx = 60;
    const fy = 560;
    const fw = 60;
    const fh = 80;

    if (!this.fridgeLoadFailed && this.textures.exists('fridge')) {
      this.fridgeSprite = this.add.image(fx, fy, 'fridge').setOrigin(0.5);
      this.fridgeSprite.setDisplaySize(fw, fh);
    } else {
      this.fridgeSprite = this.add.rectangle(fx, fy, fw, fh, 0x4a2c1a);
      this.fridgeSprite.setStrokeStyle(2, 0xffffff, 1);
    }

    const counterY = fy - fh / 2 - 14;
    this.fridgeCounterBg = this.add.rectangle(fx, counterY, 70, 18, 0x000000, 0.6);
    this.fridgeCounterBg.setStrokeStyle(1, 0xffffff, 0.6);
    this.fridgeCounterText = this.add.text(fx, counterY, `Frigo : 0/${this.fridgeCapacity}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff'
    }).setOrigin(0.5);

    const btnX = fx + 90;
    const btnY = fy;
    this.fridgeTestBtnBg = this.add.rectangle(btnX, btnY, 140, 28, 0x444444);
    this.fridgeTestBtnBg.setStrokeStyle(1, 0xffffff, 1);
    this.fridgeTestBtnBg.setInteractive({ useHandCursor: true });
    this.fridgeTestBtnText = this.add.text(btnX, btnY, 'Ajouter plat (test)', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff'
    }).setOrigin(0.5);

    this.fridgeTestBtnBg.on('pointerdown', () => {
      if (this.fridgeContents.length >= this.fridgeCapacity) {
        this.fridgeTestBtnText.setText('Frigo plein');
        this.fridgeTestBtnText.setColor('#ef4444');
        return;
      }
      this.addToFridge({ id: 'test_dish', name: 'Plat test' });
    });
  }

  addToFridge(dish) {
    if (this.fridgeContents.length >= this.fridgeCapacity) return false;
    this.fridgeContents.push(dish);
    this.updateFridgeCounter();
    return true;
  }

  removeFromFridge() {
    if (this.fridgeContents.length === 0) return null;
    const dish = this.fridgeContents.shift();
    this.updateFridgeCounter();
    return dish;
  }

  updateFridgeCounter() {
    this.fridgeCounterText.setText(`Frigo : ${this.fridgeContents.length}/${this.fridgeCapacity}`);
    if (this.fridgeContents.length < this.fridgeCapacity && this.fridgeTestBtnText) {
      this.fridgeTestBtnText.setText('Ajouter plat (test)');
      this.fridgeTestBtnText.setColor('#ffffff');
    }
  }

  createDebugClientTable() {
    const x = this.scale.width - 10;
    const y = 10;
    const style = { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' };

    const header = 'Label            | E   | Tip | Spd | Atk | Pat | Foc | Cost';
    const lines = [header, '-'.repeat(header.length)];

    for (const key of Object.keys(CLIENT_TYPES)) {
      const c = CLIENT_TYPES[key];
      const label = c.label.padEnd(16, ' ').slice(0, 16);
      const row = `${label} | ${String(c.energy).padStart(3)} | ${String(c.tipRating).padStart(3)} | ${String(c.speed).padStart(3)} | ${String(c.atkStrength).padStart(3)} | ${String(c.patience).padStart(3)} | ${String(c.focus).padStart(3)} | ${String(infectionCost(c)).padStart(4)}`;
      lines.push(row);
    }

    this.debugClientText = this.add.text(x, y, lines.join('\n'), style).setOrigin(1, 0);
  }
}
