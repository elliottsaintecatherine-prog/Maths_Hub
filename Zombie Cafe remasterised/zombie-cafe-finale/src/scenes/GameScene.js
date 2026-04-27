import CLIENT_TYPES from '../data/clientTypes.js';
import { infectionCost, createZombieFromClient } from '../data/zombieStats.js';
import { getRandomZombieName } from '../data/zombieNames.js';
import {
  RECIPE_TYPES,
  COOKBOOKS,
  COOKBOOK_COLORS,
  DISHES,
  isDishUnlocked,
  getSelectableDishes,
  getBurnIn
} from '../data/recipes.js';
import Cookbook from '../ui/Cookbook.js';
import PathfindingSystem from '../systems/PathfindingSystem.js';

const CLIENT_COLORS = {
  construction_worker: 0x888888,
  teenager: 0xffa500,
  office_worker: 0x3b82f6,
  supermodel: 0xff69b4,
  fire_chief: 0xef4444,
  celebrity: 0xa855f7
};

const CHAIR_POSITIONS = [
  { col: 8, row: 5 },
  { col: 10, row: 5 },
  { col: 12, row: 5 },
  { col: 8, row: 7 },
  { col: 10, row: 7 },
  { col: 12, row: 7 }
];

const STAFF_ZONE = { col: 2, row: 3 };
const STAFF_SPACING = 44;

const STOVE_POSITIONS = [
  { x: 260, y: 560 },
  { x: 340, y: 560 }
];
const STOVE_W = 60;
const STOVE_H = 60;
const CLEAN_DURATION_MS = 2000;

const COUNTER_CAPACITY = 1;
const COUNTER_W = 80;
const COUNTER_H = 30;
const CLIENT_MAX_WAIT_MS = 60000;
const CLIENT_NO_TIP_AFTER_MS = 30000;
const FANCY_TYPES = ['fancy', 'veryFancy'];

const SINK_CAPACITY = 8;
const SINK_W = 60;
const SINK_H = 40;
const SINK_X = 440;
const SINK_Y = 560;
const EATING_DURATION_MS = 10000;
const WASH_DURATION_MS = 5000;
const REST_ENERGY_RATIO = 0.3;

function shortDishName(label) {
  if (!label) return '';
  return label.length > 12 ? label.slice(0, 11) + '…' : label;
}

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

    this.toxines = 1000;
    this.rating = 5;
    this.playerLevel = 3;
    this.clients = [];
    this.staff = [];
    this.staffCount = 0;
    this.activePopup = null;
    this.activeEnergyUI = null;
    this.activeActionPopup = null;
    this.activeRecipeList = null;

    this.fridgeContents = [];
    this.fridgeCapacity = 5;

    this.gold = 0;
    this.xp = 0;
    this.counterContents = [];
    this.counterCapacity = COUNTER_CAPACITY;

    this.stoves = [];

    this.sinkContents = [];
    this.sinkCapacity = SINK_CAPACITY;
    this.tablesDirty = [];

    this.createToxinesHUD();
    this.createGoldHUD();
    this.createFridge();
    this.createCounter();
    this.createStoves();
    this.createSink();
    this.createRestZone();
    this.createDebugClientTable();
    this.cookbook = new Cookbook(this);
    this.createCarteButton();

    this.enemyCafes = this.generateEnemyCafes();

    this.pathfinding = new PathfindingSystem(this);
    const isoTest = this.pathfinding.isoToScreen(5, 5);
    const screenTest = this.pathfinding.screenToIso(480, 260);
    this.add.text(
      width - 10,
      10,
      `isoToScreen(5,5) = (${isoTest.x}, ${isoTest.y})\nscreenToIso(480,260) = (${screenTest.col}, ${screenTest.row})`,
      { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', align: 'right' }
    ).setOrigin(1, 0).setDepth(500);

    const pathMain = this.pathfinding.findPath(1, 1, 18, 12);
    console.log('[Pathfinding] findPath(1,1,18,12) length=', pathMain.length, 'first=', pathMain[0], 'last=', pathMain[pathMain.length - 1]);
    const pathSame = this.pathfinding.findPath(5, 5, 5, 5);
    console.log('[Pathfinding] findPath(5,5,5,5) =', pathSame);
    const pathBlocked = this.pathfinding.findPath(0, 0, 5, 5);
    console.log('[Pathfinding] findPath(0,0,5,5) length=', pathBlocked.length, '(attendu 0)');
    const pathValid = this.pathfinding.findPath(2, 2, 18, 12);
    console.log('[Pathfinding] findPath(2,2,18,12) length=', pathValid.length, 'first=', pathValid[0], 'last=', pathValid[pathValid.length - 1]);

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
      if (this.activeRecipeList && (!targets || targets.length === 0)) {
        this.closeRecipeList();
      }
    });

    this.debugMode = false;
    this.debugContainer = this.add.container(0, 0);
    this.debugContainer.setDepth(1000);
    this.debugTilesGraphics = this.add.graphics();
    this.debugPathsGraphics = this.add.graphics();
    this.debugContainer.add(this.debugTilesGraphics);
    this.debugContainer.add(this.debugPathsGraphics);

    const dbgX = 10;
    const dbgY = this.scale.height - 10;
    this.debugInfoBg = this.add.rectangle(dbgX, dbgY, 220, 20, 0x000000, 0.5);
    this.debugInfoBg.setOrigin(0, 1);
    this.debugInfoText = this.add.text(dbgX + 6, dbgY - 4, 'Entités: 0 | Chemin max: 0 cases', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff'
    }).setOrigin(0, 1);
    this.debugContainer.add(this.debugInfoBg);
    this.debugContainer.add(this.debugInfoText);

    this.debugContainer.setVisible(false);

    this.input.keyboard.on('keydown-D', () => {
      this.debugMode = !this.debugMode;
      this.debugContainer.setVisible(this.debugMode);
    });
  }

  update(time, delta) {
    const dt = delta / 1000;
    for (const client of this.clients) {
      this.updateEntityMovement(client, delta);
    }
    for (const zombie of this.staff) {
      this.updateEntityMovement(zombie, delta);
      this.updateZombieEnergy(zombie, dt);
      this.updateZombieDaydream(zombie);
      this.updateZombieVisuals(zombie);
    }
    if (this.activeEnergyUI) this.refreshEnergyUI();
    if (this.activeActionPopup) this.refreshActionPopup();
    this.updateStoves();
    this.updateClientsWaiting();
    this.updateEatingClients();
    this.updateSink();
    this.trySendServer();
    this.trySendCleanup();
    this.tryAutoRest();
    this.updateZSort();
    if (this.debugMode) this.updateDebugOverlay();
  }

  updateDebugOverlay() {
    if (!this.debugTilesGraphics || !this.debugPathsGraphics) return;
    this.debugTilesGraphics.clear();
    this.debugPathsGraphics.clear();

    const cols = this.pathfinding.cols;
    const rows = this.pathfinding.rows;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const walkable = this.pathfinding.isWalkable(c, r);
        const pos = this.pathfinding.isoToScreen(c, r);
        const color = walkable ? 0x00ff00 : 0xff0000;
        const alpha = walkable ? 0.3 : 0.4;
        this.debugTilesGraphics.fillStyle(color, alpha);
        this.debugTilesGraphics.beginPath();
        this.debugTilesGraphics.moveTo(pos.x, pos.y - 16);
        this.debugTilesGraphics.lineTo(pos.x + 32, pos.y);
        this.debugTilesGraphics.lineTo(pos.x, pos.y + 16);
        this.debugTilesGraphics.lineTo(pos.x - 32, pos.y);
        this.debugTilesGraphics.closePath();
        this.debugTilesGraphics.fillPath();
      }
    }

    let maxPath = 0;
    let entityCount = 0;
    this.debugPathsGraphics.lineStyle(2, 0xffff00, 1);
    const drawPath = (entity) => {
      if (!entity || !entity.circle) return;
      entityCount++;
      if (!entity.path || entity.path.length === 0) return;
      if (entity.path.length > maxPath) maxPath = entity.path.length;
      this.debugPathsGraphics.beginPath();
      this.debugPathsGraphics.moveTo(entity.circle.x, entity.circle.y);
      for (const wp of entity.path) {
        const pos = this.pathfinding.isoToScreen(wp.col, wp.row);
        this.debugPathsGraphics.lineTo(pos.x, pos.y);
      }
      this.debugPathsGraphics.strokePath();
    };
    for (const z of this.staff) drawPath(z);
    for (const c of this.clients) drawPath(c);

    if (this.debugInfoText) {
      this.debugInfoText.setText(`Entités: ${entityCount} | Chemin max: ${maxPath} cases`);
    }
  }

  updateZSort() {
    for (const client of this.clients) {
      if (client.circle && client.circle.active) {
        client.circle.setDepth(client.circle.y);
      }
    }
    for (const zombie of this.staff) {
      if (zombie.circle && zombie.circle.active) {
        zombie.circle.setDepth(zombie.circle.y);
      }
    }
    for (const stove of this.stoves) {
      if (stove.body) {
        stove.body.setDepth(stove.body.y);
        if (stove.burners) stove.burners.setDepth(stove.body.y + 1);
      }
    }
    if (this.fridgeSprite) this.fridgeSprite.setDepth(this.fridgeSprite.y);
    if (this.counterSprite) this.counterSprite.setDepth(this.counterSprite.y);
    if (this.sinkSprite) this.sinkSprite.setDepth(this.sinkSprite.y);
  }

  updateEntityMovement(entity, delta) {
    if (!entity || !entity.circle) return;
    if (!entity.path || entity.path.length === 0) return;
    if (entity.pathIndex === undefined) entity.pathIndex = 0;

    if (entity.pathIndex >= entity.path.length) {
      const cb = entity.onArrive;
      entity.path = [];
      entity.pathIndex = 0;
      entity.onArrive = null;
      if (typeof cb === 'function') cb();
      return;
    }

    const waypoint = entity.path[entity.pathIndex];
    const now = this.time.now;

    const isSelfCase = (waypoint.col === entity.col && waypoint.row === entity.row);
    if (!isSelfCase) {
      const occupied = this.isCaseOccupied(waypoint.col, waypoint.row, entity);
      if (occupied) {
        if (!entity.waitUntil) {
          entity.waitUntil = now + 500;
          return;
        }
        if (now < entity.waitUntil) {
          return;
        }
        entity.waitUntil = 0;
        entity.collisionRetries = (entity.collisionRetries || 0) + 1;
        if (entity.collisionRetries > 5) {
          const tc = (entity.targetCol !== undefined) ? entity.targetCol : waypoint.col;
          const tr = (entity.targetRow !== undefined) ? entity.targetRow : waypoint.row;
          const tp = this.pathfinding.isoToScreen(tc, tr);
          entity.circle.x = tp.x;
          entity.circle.y = tp.y;
          entity.col = tc;
          entity.row = tr;
          entity.path = [];
          entity.pathIndex = 0;
          entity.collisionRetries = 0;
          const cb = entity.onArrive;
          entity.onArrive = null;
          if (typeof cb === 'function') cb();
          return;
        }
        this.moveEntityTo(entity, entity.targetCol, entity.targetRow);
        return;
      }
      if (entity.waitUntil) entity.waitUntil = 0;
    }

    const target = this.pathfinding.isoToScreen(waypoint.col, waypoint.row);

    const dx = target.x - entity.circle.x;
    const dy = target.y - entity.circle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const speed = (typeof entity.speed === 'number' && entity.speed > 0) ? entity.speed : 1;
    const step = speed * 8 * (delta / 1000);

    if (distance <= step) {
      entity.circle.x = target.x;
      entity.circle.y = target.y;
      entity.col = waypoint.col;
      entity.row = waypoint.row;
      entity.pathIndex++;
      if (!isSelfCase) entity.collisionRetries = 0;
      if (entity.pathIndex >= entity.path.length) {
        const cb = entity.onArrive;
        entity.path = [];
        entity.pathIndex = 0;
        entity.onArrive = null;
        if (typeof cb === 'function') cb();
      }
    } else {
      const ratio = step / distance;
      entity.circle.x += dx * ratio;
      entity.circle.y += dy * ratio;
    }
  }

  isCaseOccupied(col, row, excludeEntity) {
    for (const c of this.clients) {
      if (c === excludeEntity) continue;
      if (!c.circle || !c.circle.active) continue;
      if (c.col === col && c.row === row) return true;
    }
    for (const s of this.staff) {
      if (s === excludeEntity) continue;
      if (!s.circle || !s.circle.active) continue;
      if (s.col === col && s.row === row) return true;
    }
    return false;
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
      if (zombie.energyCurrent >= zombie.energy) zombie.state = 'idle';
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
          this.destroyOrderBubble(target);
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
    this.destroyOrderBubble(client);
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
    const dirtyChairs = new Set(this.tablesDirty.map(p => p.chairIndex));
    let chairIndex = -1;
    for (let i = 0; i < CHAIR_POSITIONS.length; i++) {
      if (!occupied.has(i) && !dirtyChairs.has(i)) { chairIndex = i; break; }
    }
    if (chairIndex === -1) {
      this.spawnUnhappyNoChair();
      return;
    }

    const keys = Object.keys(CLIENT_TYPES);
    const typeKey = keys[Math.floor(Math.random() * keys.length)];
    const clientType = CLIENT_TYPES[typeKey];
    const color = CLIENT_COLORS[clientType.id] || 0xffffff;
    const chairData = CHAIR_POSITIONS[chairIndex];
    const pos = this.pathfinding.isoToScreen(chairData.col, chairData.row);

    const circle = this.add.circle(pos.x, pos.y, 18, color);
    circle.setStrokeStyle(2, 0xffffff, 1);
    circle.setInteractive({ useHandCursor: true });

    const client = {
      circle,
      clientType,
      chairIndex,
      infected: false,
      arrivalTime: Date.now(),
      orderDish: null,
      served: false,
      beingServed: false,
      orderBubble: null,
      patienceBg: null,
      patienceBar: null
    };
    client.orderDish = this.pickClientOrderDish(clientType);
    this.clients.push(client);

    if (client.orderDish) this.createOrderBubble(client);

    circle.on('pointerdown', () => this.openClientPopup(client));
  }

  pickClientOrderDish(clientType) {
    const selectable = getSelectableDishes(this.playerLevel).filter(d => isDishUnlocked(d, this.playerLevel));
    if (selectable.length === 0) return null;
    const isFancyOnly = clientType.id === 'supermodel' || clientType.id === 'celebrity';
    let pool = selectable;
    if (isFancyOnly) {
      const fancy = selectable.filter(d => FANCY_TYPES.includes(d.type));
      if (fancy.length > 0) pool = fancy;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  createOrderBubble(client) {
    const c = client.circle;
    const container = this.add.container(c.x, c.y - 40);
    container.setDepth(140);

    const rect = this.add.rectangle(0, 0, 50, 30, 0xffffff);
    rect.setStrokeStyle(1, 0x000000, 1);
    const tail = this.add.triangle(0, 18, -5, 0, 5, 0, 0, 8, 0xffffff);
    tail.setStrokeStyle(1, 0x000000, 1);
    const txt = this.add.text(0, 0, shortDishName(client.orderDish.label), {
      fontFamily: 'monospace', fontSize: '12px', color: '#000000'
    }).setOrigin(0.5);
    container.add([rect, tail, txt]);

    const barY = 22;
    const barBg = this.add.rectangle(0, barY, 48, 3, 0x888888);
    const barFg = this.add.rectangle(-24, barY, 48, 3, 0x888888);
    barFg.setOrigin(0, 0.5);
    container.add([barBg, barFg]);

    client.orderBubble = container;
    client.patienceBg = barBg;
    client.patienceBar = barFg;
  }

  updateClientsWaiting() {
    const now = Date.now();
    const toRemove = [];
    for (const client of this.clients) {
      if (client.infected || client.fleeing || client.served) continue;
      if (client.orderBubble) {
        client.orderBubble.x = client.circle.x;
        client.orderBubble.y = client.circle.y - 40;
      }
      const waited = now - client.arrivalTime;
      if (client.patienceBar) {
        const ratio = Math.max(0, Math.min(1, 1 - waited / CLIENT_MAX_WAIT_MS));
        client.patienceBar.width = 48 * ratio;
        client.patienceBar.fillColor = waited >= CLIENT_NO_TIP_AFTER_MS ? 0xfb923c : 0x888888;
      }
      if (waited >= CLIENT_MAX_WAIT_MS && !client.beingServed) {
        toRemove.push(client);
      }
    }
    for (const c of toRemove) this.clientLeavesUnhappy(c);
  }

  clientLeavesUnhappy(client) {
    this.rating = Math.max(0, this.rating - 0.1);
    this.showUnhappyBubble(client);
    this.destroyOrderBubble(client);
    client.fleeing = true;
    client.circle.disableInteractive();
    const { width } = this.scale;
    this.tweens.add({
      targets: client.circle,
      x: width + 30,
      duration: 2000,
      onComplete: () => {
        client.circle.destroy();
        this.clients = this.clients.filter(c => c !== client);
      }
    });
  }

  spawnUnhappyNoChair() {
    const { width } = this.scale;
    const entranceX = width - 40;
    const entranceY = 230;
    const circle = this.add.circle(width + 30, entranceY, 18, 0xaaaaaa);
    circle.setStrokeStyle(2, 0xffffff, 1);

    this.tweens.add({
      targets: circle,
      x: entranceX,
      duration: 700,
      onComplete: () => {
        const bubble = this.add.container(circle.x, circle.y - 40);
        bubble.setDepth(160);
        const rect = this.add.rectangle(0, 0, 30, 20, 0xef4444);
        rect.setStrokeStyle(1, 0x000000, 1);
        const txt = this.add.text(0, 0, '!', {
          fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
        }).setOrigin(0.5);
        bubble.add([rect, txt]);

        this.time.delayedCall(600, () => {
          this.tweens.add({
            targets: circle,
            x: width + 40,
            duration: 1200,
            onComplete: () => circle.destroy()
          });
          this.tweens.add({
            targets: bubble,
            x: width + 40,
            duration: 1200,
            onComplete: () => bubble.destroy()
          });
        });

        this.rating = Math.max(0, this.rating - 0.1);
      }
    });
  }

  showUnhappyBubble(client) {
    const bubble = this.add.container(client.circle.x, client.circle.y - 40);
    bubble.setDepth(160);
    const rect = this.add.rectangle(0, 0, 30, 20, 0xef4444);
    rect.setStrokeStyle(1, 0x000000, 1);
    const txt = this.add.text(0, 0, '!', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    bubble.add([rect, txt]);
    this.time.delayedCall(1500, () => bubble.destroy());
  }

  destroyOrderBubble(client) {
    if (client.orderBubble) {
      client.orderBubble.destroy();
      client.orderBubble = null;
      client.patienceBg = null;
      client.patienceBar = null;
    }
  }

  trySendServer() {
    if (this.counterContents.length === 0 && this.fridgeContents.length === 0) return;
    const idleZombie = this.staff.find(z => z.state === 'idle' && !z.attacking && !z.serving);
    if (!idleZombie) return;

    let source = null;
    let dish = null;
    for (const d of this.counterContents) {
      const match = this.findWaitingClientFor(d);
      if (match) { source = 'counter'; dish = d; this.counterContents = this.counterContents.filter(x => x !== d); break; }
    }
    if (!dish) {
      for (const d of this.fridgeContents) {
        const match = this.findWaitingClientFor(d);
        if (match) { source = 'fridge'; dish = d; this.fridgeContents = this.fridgeContents.filter(x => x !== d); break; }
      }
    }
    if (!dish) return;

    this.updateCounterDisplay();
    this.updateFridgeCounter();

    const client = this.findWaitingClientFor(dish);
    if (!client) {
      if (source === 'counter') this.counterContents.push(dish);
      else this.fridgeContents.push(dish);
      this.updateCounterDisplay();
      this.updateFridgeCounter();
      return;
    }
    this.serveClient(idleZombie, dish, client);
  }

  findWaitingClientFor(dish) {
    return this.clients.find(c =>
      !c.infected && !c.fleeing && !c.served && !c.beingServed &&
      c.orderDish && c.orderDish.id === dish.id
    );
  }

  serveClient(zombie, dish, client) {
    zombie.state = 'serving';
    zombie.serving = true;
    client.beingServed = true;
    this.tweens.killTweensOf(zombie.circle);
    this.tweens.add({
      targets: zombie.circle,
      x: client.circle.x - 30,
      y: client.circle.y,
      duration: 500,
      onComplete: () => {
        this.onDishDelivered(zombie, dish, client);
      }
    });
  }

  onDishDelivered(zombie, dish, client) {
    zombie.serving = false;
    if (zombie.state === 'serving') zombie.state = 'idle';
    client.beingServed = false;
    client.served = true;
    client.dishReceived = dish;
    client.eatingStart = Date.now();

    this.destroyOrderBubble(client);
    this.createEatingBubble(client);

    this.time.delayedCall(EATING_DURATION_MS, () => {
      if (!this.clients.includes(client)) return;
      this.finishEating(client);
    });
  }

  finishEating(client) {
    this.destroyEatingBubble(client);

    const dish = client.dishReceived;
    const waited = (client.eatingStart || Date.now()) - client.arrivalTime;
    const type = dish ? RECIPE_TYPES[dish.type] : null;
    const price = type ? type.pricePerPortion * type.portions : 0;
    const xpGain = type ? type.xp : 0;

    let tip = 0;
    if (waited <= CLIENT_NO_TIP_AFTER_MS) {
      const denom = 50 - 4.5 * client.clientType.tipRating;
      if (denom > 0) tip = Math.max(1, Math.ceil(price / denom));
    }

    this.gold += price + tip;
    this.xp += xpGain;
    this.updateGoldHUD();

    this.showPaymentBubble(client, price, tip);
    this.createDirtyPlate(client);

    this.time.delayedCall(1500, () => {
      if (!this.clients.includes(client)) return;
      client.fleeing = true;
      client.circle.disableInteractive();
      const { width } = this.scale;
      this.tweens.add({
        targets: client.circle,
        x: width + 30,
        duration: 2000,
        onComplete: () => {
          client.circle.destroy();
          this.clients = this.clients.filter(c => c !== client);
        }
      });
    });
  }

  createEatingBubble(client) {
    if (client.eatingBubble) return;
    const bubble = this.add.container(client.circle.x, client.circle.y - 40);
    bubble.setDepth(140);
    const rect = this.add.rectangle(0, 0, 30, 18, 0xffffff);
    rect.setStrokeStyle(1, 0x000000, 1);
    const tail = this.add.triangle(0, 12, -4, 0, 4, 0, 0, 6, 0xffffff);
    tail.setStrokeStyle(1, 0x000000, 1);
    const txt = this.add.text(0, 0, '...', {
      fontFamily: 'monospace', fontSize: '14px', color: '#000000'
    }).setOrigin(0.5);
    bubble.add([rect, tail, txt]);
    client.eatingBubble = bubble;
  }

  destroyEatingBubble(client) {
    if (client.eatingBubble) {
      client.eatingBubble.destroy();
      client.eatingBubble = null;
    }
  }

  updateEatingClients() {
    for (const client of this.clients) {
      if (!client.served || client.fleeing) continue;
      if (client.eatingBubble) {
        client.eatingBubble.x = client.circle.x;
        client.eatingBubble.y = client.circle.y - 40;
      }
    }
  }

  createDirtyPlate(client) {
    if (client.chairIndex === undefined || client.chairIndex < 0) return;
    const chairData = CHAIR_POSITIONS[client.chairIndex];
    if (!chairData) return;
    const pos = this.pathfinding.isoToScreen(chairData.col, chairData.row);
    const px = pos.x - 6;
    const py = pos.y + 20;
    const circle = this.add.circle(px, py, 8, 0x888888);
    circle.setStrokeStyle(1, 0x444444, 1);
    circle.setDepth(50);
    const exclam = this.add.text(px, py, '!', {
      fontFamily: 'monospace', fontSize: '10px', color: '#555555'
    }).setOrigin(0.5);
    exclam.setDepth(51);
    const plate = {
      chairIndex: client.chairIndex,
      x: px,
      y: py,
      circle,
      exclam,
      pickingZombie: null
    };
    this.tablesDirty.push(plate);
  }

  trySendCleanup() {
    if (this.tablesDirty.length === 0) return;
    if (this.sinkContents.length >= this.sinkCapacity) return;
    const idleZombie = this.staff.find(z =>
      z.state === 'idle' && !z.attacking && !z.serving && !z.cleaning
    );
    if (!idleZombie) return;
    const plate = this.tablesDirty.find(p => !p.pickingZombie);
    if (!plate) return;
    this.startZombieCleanup(idleZombie, plate);
  }

  startZombieCleanup(zombie, plate) {
    zombie.state = 'cleaning';
    zombie.cleaning = true;
    plate.pickingZombie = zombie;
    this.tweens.killTweensOf(zombie.circle);
    this.tweens.add({
      targets: zombie.circle,
      x: plate.x + 20,
      y: plate.y,
      duration: 500,
      onComplete: () => {
        this.onPickupDirtyPlate(zombie, plate);
      }
    });
  }

  onPickupDirtyPlate(zombie, plate) {
    if (plate.circle) { plate.circle.destroy(); plate.circle = null; }
    if (plate.exclam) { plate.exclam.destroy(); plate.exclam = null; }
    this.tablesDirty = this.tablesDirty.filter(p => p !== plate);

    zombie.carriedPlate = this.add.circle(zombie.circle.x, zombie.circle.y - 14, 5, 0x888888);
    zombie.carriedPlate.setStrokeStyle(1, 0x444444, 1);
    zombie.carriedPlate.setDepth(120);

    this.tweens.add({
      targets: zombie.circle,
      x: this.sinkX,
      y: this.sinkY - 30,
      duration: 800,
      onUpdate: () => {
        if (zombie.carriedPlate) {
          zombie.carriedPlate.x = zombie.circle.x;
          zombie.carriedPlate.y = zombie.circle.y - 14;
        }
      },
      onComplete: () => {
        this.depositInSink(zombie);
      }
    });
  }

  depositInSink(zombie) {
    if (zombie.carriedPlate) {
      zombie.carriedPlate.destroy();
      zombie.carriedPlate = null;
    }

    const slotIndex = this.sinkContents.length;
    const cols = 4;
    const col = slotIndex % cols;
    const row = Math.floor(slotIndex / cols);
    const offsetX = (col - 1.5) * 12;
    const offsetY = (row - 0.5) * 12;
    const visual = this.add.circle(this.sinkX + offsetX, this.sinkY + offsetY, 5, 0x888888);
    visual.setStrokeStyle(1, 0x444444, 1);
    visual.setDepth(45);

    const plateInSink = {
      washStart: Date.now(),
      visual
    };
    this.sinkContents.push(plateInSink);
    this.updateSinkCounter();

    zombie.cleaning = false;
    if (zombie.state === 'cleaning') zombie.state = 'idle';
  }

  updateSink() {
    if (this.sinkContents.length === 0) return;
    const now = Date.now();
    const toRemove = [];
    for (const plate of this.sinkContents) {
      if (now - plate.washStart >= WASH_DURATION_MS) {
        toRemove.push(plate);
      }
    }
    if (toRemove.length === 0) return;
    for (const plate of toRemove) {
      if (plate.visual) plate.visual.destroy();
    }
    this.sinkContents = this.sinkContents.filter(p => !toRemove.includes(p));
    this.repositionSinkPlates();
    this.updateSinkCounter();
  }

  repositionSinkPlates() {
    const cols = 4;
    for (let i = 0; i < this.sinkContents.length; i++) {
      const plate = this.sinkContents[i];
      if (!plate.visual) continue;
      const col = i % cols;
      const row = Math.floor(i / cols);
      plate.visual.x = this.sinkX + (col - 1.5) * 12;
      plate.visual.y = this.sinkY + (row - 0.5) * 12;
    }
  }

  tryAutoRest() {
    for (const z of this.staff) {
      if (z.state !== 'idle' || z.attacking || z.serving || z.cleaning) continue;
      if (z.energyCurrent < z.energy * REST_ENERGY_RATIO) {
        this.sendZombieToRest(z);
      }
    }
  }

  showPaymentBubble(client, price, tip) {
    const bubble = this.add.container(client.circle.x, client.circle.y - 40);
    bubble.setDepth(160);
    const rect = this.add.rectangle(0, 0, 40, 24, 0xffd700);
    rect.setStrokeStyle(1, 0x000000, 1);
    const txt = this.add.text(0, 0, `+${price} or`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#000000'
    }).setOrigin(0.5);
    bubble.add([rect, txt]);
    if (tip > 0) {
      const tipRect = this.add.rectangle(30, 0, 34, 20, 0xffe58a);
      tipRect.setStrokeStyle(1, 0x000000, 1);
      const tipTxt = this.add.text(30, 0, `+${tip}`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#000000'
      }).setOrigin(0.5);
      bubble.add([tipRect, tipTxt]);
    }
    this.tweens.add({
      targets: bubble,
      y: bubble.y - 20,
      alpha: 0,
      duration: 1500,
      onComplete: () => bubble.destroy()
    });
  }

  createCounter() {
    const { width } = this.scale;
    const cx = width / 2;
    const cy = 460;
    this.counterX = cx;
    this.counterY = cy;
    this.counterSprite = this.add.rectangle(cx, cy, COUNTER_W, COUNTER_H, 0xd2a679);
    this.counterSprite.setStrokeStyle(2, 0xffffff, 1);
    this.counterDishText = this.add.text(cx, cy, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffffff'
    }).setOrigin(0.5);
    this.counterLabel = this.add.text(cx, cy - COUNTER_H / 2 - 10, 'Comptoir', {
      fontFamily: 'monospace', fontSize: '10px', color: '#cccccc'
    }).setOrigin(0.5);
  }

  addToCounter(dish) {
    if (this.counterContents.length >= this.counterCapacity) return false;
    this.counterContents.push(dish);
    this.updateCounterDisplay();
    return true;
  }

  updateCounterDisplay() {
    if (!this.counterDishText) return;
    if (this.counterContents.length === 0) {
      this.counterDishText.setText('');
    } else {
      this.counterDishText.setText(shortDishName(this.counterContents[0].name));
    }
  }

  createGoldHUD() {
    this.goldText = this.add.text(80, 60, `Or : 0`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffd700'
    }).setOrigin(0, 0.5);
  }

  updateGoldHUD() {
    if (this.goldText) this.goldText.setText(`Or : ${this.gold}`);
  }

  createCarteButton() {
    const { height } = this.scale;
    const btnW = 120;
    const btnH = 36;
    const btnX = 12 + 120 + 8 + btnW / 2;
    const btnY = height - btnH / 2 - 6;

    this.carteButtonBg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x1E5C2E);
    this.carteButtonBg.setStrokeStyle(2, 0xffffff, 1);
    this.carteButtonBg.setInteractive({ useHandCursor: true });
    this.carteButtonBg.setDepth(50);

    this.carteButtonText = this.add.text(btnX, btnY, 'Carte', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    this.carteButtonText.setDepth(51);

    this.carteButtonBg.on('pointerdown', (pointer, lx, ly, ev) => {
      if (this.scene.isActive('RaidMapScene')) {
        this.scene.bringToTop('RaidMapScene');
      } else {
        this.scene.launch('RaidMapScene');
      }
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });
  }

  generateEnemyCafes() {
    const names = ['Café des Rampants', 'La Cantine Putride', 'Le Festin Mort', 'Bistrot Pourri'];
    const cafes = [];
    for (let i = 0; i < names.length; i++) {
      const offset = Phaser.Math.Between(-2, 2);
      const level = Phaser.Math.Clamp((this.playerLevel || 1) + offset, 1, 5);
      cafes.push({
        name: names[i],
        level: level,
        closedUntil: 0
      });
    }
    return cafes;
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
    this.destroyOrderBubble(client);
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
      const staffPos = this.pathfinding.isoToScreen(STAFF_ZONE.col, STAFF_ZONE.row);
      const targetX = staffPos.x;
      const targetY = staffPos.y + this.staffCount * STAFF_SPACING;
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

  createSink() {
    this.sinkX = SINK_X;
    this.sinkY = SINK_Y;

    this.sinkSprite = this.add.rectangle(SINK_X, SINK_Y, SINK_W, SINK_H, 0xb0b0b0);
    this.sinkSprite.setStrokeStyle(2, 0xffffff, 1);

    const innerW = SINK_W - 10;
    const innerH = SINK_H - 10;
    this.sinkBasin = this.add.rectangle(SINK_X, SINK_Y, innerW, innerH, 0x707070);
    this.sinkBasin.setStrokeStyle(1, 0x333333, 1);

    const tapX = SINK_X;
    const tapY = SINK_Y - SINK_H / 2 - 4;
    this.sinkTap = this.add.rectangle(tapX, tapY, 6, 8, 0x888888);
    this.sinkTap.setStrokeStyle(1, 0x333333, 1);

    const counterY = SINK_Y - SINK_H / 2 - 18;
    this.sinkCounterBg = this.add.rectangle(SINK_X, counterY, 70, 18, 0x000000, 0.6);
    this.sinkCounterBg.setStrokeStyle(1, 0xffffff, 0.6);
    this.sinkCounterText = this.add.text(SINK_X, counterY, `Évier : 0/${this.sinkCapacity}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff'
    }).setOrigin(0.5);
  }

  updateSinkCounter() {
    if (!this.sinkCounterText) return;
    this.sinkCounterText.setText(`Évier : ${this.sinkContents.length}/${this.sinkCapacity}`);
    const saturated = this.sinkContents.length >= this.sinkCapacity;
    this.sinkCounterText.setColor(saturated ? '#ef4444' : '#ffffff');
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

  createStoves() {
    for (const pos of STOVE_POSITIONS) {
      this.stoves.push(this.createSingleStove(pos.x, pos.y));
    }
  }

  createSingleStove(x, y) {
    const body = this.add.rectangle(x, y, STOVE_W, STOVE_H, 0x555555);
    body.setStrokeStyle(2, 0xffffff, 1);
    body.setInteractive({ useHandCursor: true });

    const burners = this.add.graphics();
    burners.setDepth(body.depth + 1);

    const stove = {
      x, y,
      body,
      burners,
      state: 'idle',
      dish: null,
      cookStart: null,
      cookEnd: null,
      burnAt: null,
      progressBg: null,
      progressBar: null,
      timerText: null,
      readyMark: null,
      smoke: null,
      cleanBg: null,
      cleanBar: null,
      cleanStart: null,
      cleanPointerId: null
    };

    this.drawStoveBurners(stove, 0x222222);

    body.on('pointerdown', (pointer, lx, ly, ev) => {
      this.handleStovePointerDown(stove, pointer);
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });
    body.on('pointerup', (pointer) => {
      this.handleStovePointerUp(stove, pointer);
    });
    body.on('pointerout', (pointer) => {
      this.handleStovePointerUp(stove, pointer);
    });

    return stove;
  }

  drawStoveBurners(stove, color) {
    stove.burners.clear();
    stove.burners.fillStyle(color, 1);
    stove.burners.lineStyle(1, 0x000000, 1);
    const offsets = [[-14, -14], [14, -14], [-14, 14], [14, 14]];
    for (const [ox, oy] of offsets) {
      stove.burners.fillCircle(stove.x + ox, stove.y + oy, 6);
      stove.burners.strokeCircle(stove.x + ox, stove.y + oy, 6);
    }
  }

  handleStovePointerDown(stove, pointer) {
    if (stove.state === 'idle') {
      this.openRecipeList(stove);
    } else if (stove.state === 'ready') {
      this.collectCookedDish(stove);
    } else if (stove.state === 'burned') {
      this.startCleaning(stove, pointer);
    }
  }

  handleStovePointerUp(stove, pointer) {
    if (stove.state !== 'burned') return;
    if (stove.cleanPointerId === null) return;
    if (pointer && pointer.id !== undefined && pointer.id !== stove.cleanPointerId) return;
    this.cancelCleaning(stove);
  }

  openRecipeList(stove) {
    this.closeRecipeList();
    const { width, height } = this.scale;
    const popupW = 360;
    const popupH = 420;

    const container = this.add.container(width / 2, height / 2);
    container.setDepth(120);

    const bg = this.add.rectangle(0, 0, popupW, popupH, 0x2a2a2a);
    bg.setStrokeStyle(2, 0xffffff, 1);
    bg.setInteractive();
    container.add(bg);

    const title = this.add.text(0, -popupH / 2 + 18, 'Recettes', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff'
    }).setOrigin(0.5, 0);
    container.add(title);

    const levelTxt = this.add.text(-popupW / 2 + 14, -popupH / 2 + 18, `Niv. ${this.playerLevel}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#cccccc'
    }).setOrigin(0, 0);
    container.add(levelTxt);

    const closeBg = this.add.rectangle(popupW / 2 - 20, -popupH / 2 + 20, 28, 24, 0x555555);
    closeBg.setStrokeStyle(1, 0xffffff, 1);
    closeBg.setInteractive({ useHandCursor: true });
    const closeTxt = this.add.text(popupW / 2 - 20, -popupH / 2 + 20, 'X', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    closeBg.on('pointerdown', (pointer, lx, ly, ev) => {
      this.closeRecipeList();
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });
    container.add([closeBg, closeTxt]);

    const dishes = getSelectableDishes(this.playerLevel);
    let yRow = -popupH / 2 + 52;
    for (const dish of dishes) {
      const type = RECIPE_TYPES[dish.type];
      const unlocked = isDishUnlocked(dish, this.playerLevel);
      const cookbook = COOKBOOKS[dish.cookbook];
      const iconColor = COOKBOOK_COLORS[cookbook.icon] || 0xffffff;

      const rowBg = this.add.rectangle(0, yRow, popupW - 20, 26, unlocked ? 0x3a3a3a : 0x242424);
      rowBg.setStrokeStyle(1, unlocked ? 0xffffff : 0x555555, 1);
      container.add(rowBg);

      const icon = this.add.rectangle(-popupW / 2 + 22, yRow, 10, 10, iconColor);
      icon.setStrokeStyle(1, 0xffffff, 0.8);
      container.add(icon);

      const labelColor = unlocked ? '#ffffff' : '#666666';
      const info = `${dish.label}  [${type.cookTime}s, ${type.portions}x${type.pricePerPortion}$, xp ${type.xp}]`;
      const rowTxt = this.add.text(-popupW / 2 + 36, yRow, info, {
        fontFamily: 'monospace', fontSize: '11px', color: labelColor
      }).setOrigin(0, 0.5);
      container.add(rowTxt);

      if (!unlocked) {
        const lockTxt = this.add.text(popupW / 2 - 20, yRow, `Niv. ${dish.minLevel || '?'}`, {
          fontFamily: 'monospace', fontSize: '10px', color: '#ef4444'
        }).setOrigin(1, 0.5);
        container.add(lockTxt);
      } else {
        rowBg.setInteractive({ useHandCursor: true });
        rowBg.on('pointerover', () => rowBg.setFillStyle(0x4a4a4a));
        rowBg.on('pointerout', () => rowBg.setFillStyle(0x3a3a3a));
        rowBg.on('pointerdown', (pointer, lx, ly, ev) => {
          this.closeRecipeList();
          this.startCooking(stove, dish);
          if (ev && ev.stopPropagation) ev.stopPropagation();
        });
      }

      yRow += 28;
    }

    this.activeRecipeList = container;
  }

  closeRecipeList() {
    if (this.activeRecipeList) {
      this.activeRecipeList.destroy();
      this.activeRecipeList = null;
    }
  }

  startCooking(stove, dish) {
    const type = RECIPE_TYPES[dish.type];
    if (!type) return;
    if (this.counterContents.length >= this.counterCapacity &&
        this.fridgeContents.length >= this.fridgeCapacity) {
      const msg = this.add.text(stove.x, stove.y - STOVE_H / 2 - 30, 'Complet', {
        fontFamily: 'monospace', fontSize: '11px', color: '#ef4444',
        backgroundColor: '#000000', padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(310);
      this.time.delayedCall(1500, () => msg.destroy());
      return;
    }
    stove.state = 'cooking';
    stove.dish = dish;
    stove.cookStart = Date.now();
    stove.cookEnd = stove.cookStart + type.cookTime * 1000;
    stove.burnAt = null;

    this.drawStoveBurners(stove, 0xff6a00);

    const barY = stove.y + STOVE_H / 2 + 10;
    stove.progressBg = this.add.rectangle(stove.x, barY, STOVE_W, 6, 0x333333);
    stove.progressBg.setStrokeStyle(1, 0xffffff, 1);
    stove.progressBar = this.add.rectangle(stove.x - STOVE_W / 2, barY, 0, 6, 0x22c55e);
    stove.progressBar.setOrigin(0, 0.5);

    const timerY = stove.y - STOVE_H / 2 - 12;
    stove.timerText = this.add.text(stove.x, timerY, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffffff',
      backgroundColor: '#000000', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
  }

  updateStoves() {
    const now = Date.now();
    for (const stove of this.stoves) {
      if (stove.state === 'cooking') {
        const type = RECIPE_TYPES[stove.dish.type];
        const totalMs = type.cookTime * 1000;
        const elapsed = now - stove.cookStart;
        const ratio = Math.max(0, Math.min(1, elapsed / totalMs));
        if (stove.progressBar) stove.progressBar.width = STOVE_W * ratio;
        const remaining = Math.max(0, Math.ceil((stove.cookEnd - now) / 1000));
        if (stove.timerText) stove.timerText.setText(`${remaining}s`);
        if (now >= stove.cookEnd) this.finishCooking(stove);
      } else if (stove.state === 'ready') {
        if (stove.burnAt !== null && now >= stove.burnAt) {
          this.burnStove(stove);
        } else if (stove.timerText) {
          if (stove.burnAt !== null) {
            const rem = Math.max(0, Math.ceil((stove.burnAt - now) / 1000));
            stove.timerText.setText(`Prêt (${rem}s)`);
          } else {
            stove.timerText.setText('Prêt');
          }
        }
      } else if (stove.state === 'burned') {
        if (stove.smoke) {
          stove.smoke.alpha = 0.55 + 0.25 * Math.sin(now / 250);
        }
        if (stove.cleanStart !== null) {
          const elapsed = now - stove.cleanStart;
          const ratio = Math.max(0, Math.min(1, elapsed / CLEAN_DURATION_MS));
          if (stove.cleanBar) stove.cleanBar.width = STOVE_W * ratio;
          if (ratio >= 1) {
            this.resetStove(stove);
          }
        }
      }
    }
  }

  finishCooking(stove) {
    const dish = stove.dish;
    stove.state = 'ready';

    this.drawStoveBurners(stove, 0x222222);

    if (stove.progressBar) {
      stove.progressBar.width = STOVE_W;
      stove.progressBar.fillColor = 0xffd700;
    }

    const burnIn = getBurnIn(dish);
    if (typeof burnIn !== 'number' || !isFinite(burnIn)) {
      stove.burnAt = null;
    } else {
      stove.burnAt = Date.now() + burnIn * 1000;
    }

    stove.readyMark = this.add.circle(stove.x, stove.y - 2, 14, 0xffd700, 0);
    stove.readyMark.setStrokeStyle(2, 0xffd700, 1);
    this.tweens.add({
      targets: stove.readyMark,
      alpha: { from: 0.2, to: 0.9 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    const flash = this.add.rectangle(stove.x, stove.y, STOVE_W + 10, STOVE_H + 10, 0xffffff, 0.8);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 350,
      onComplete: () => flash.destroy()
    });
  }

  collectCookedDish(stove) {
    const dish = stove.dish;
    if (!dish) { this.resetStove(stove); return; }
    const payload = { id: dish.id, name: dish.label };
    let added = this.addToCounter(payload);
    if (!added) added = this.addToFridge(payload);
    if (!added) {
      const msg = this.add.text(stove.x, stove.y - STOVE_H / 2 - 30, 'Complet', {
        fontFamily: 'monospace', fontSize: '11px', color: '#ef4444',
        backgroundColor: '#000000', padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(310);
      this.time.delayedCall(1500, () => msg.destroy());
      return;
    }
    this.resetStove(stove);
  }

  burnStove(stove) {
    stove.state = 'burned';
    stove.burnAt = null;

    if (stove.progressBar) { stove.progressBar.destroy(); stove.progressBar = null; }
    if (stove.progressBg) { stove.progressBg.destroy(); stove.progressBg = null; }
    if (stove.readyMark) {
      this.tweens.killTweensOf(stove.readyMark);
      stove.readyMark.destroy();
      stove.readyMark = null;
    }

    stove.smoke = this.add.rectangle(stove.x, stove.y, STOVE_W - 8, STOVE_H - 8, 0x111111, 0.8);
    stove.smoke.setStrokeStyle(1, 0x333333, 1);

    this.drawStoveBurners(stove, 0x111111);

    if (stove.timerText) {
      stove.timerText.setText('Brûlé');
      stove.timerText.setColor('#ef4444');
    }
  }

  startCleaning(stove, pointer) {
    if (stove.cleanStart !== null) return;
    stove.cleanStart = Date.now();
    stove.cleanPointerId = (pointer && pointer.id !== undefined) ? pointer.id : 0;

    const barY = stove.y + STOVE_H / 2 + 10;
    stove.cleanBg = this.add.rectangle(stove.x, barY, STOVE_W, 6, 0x333333);
    stove.cleanBg.setStrokeStyle(1, 0xffffff, 1);
    stove.cleanBar = this.add.rectangle(stove.x - STOVE_W / 2, barY, 0, 6, 0x3b82f6);
    stove.cleanBar.setOrigin(0, 0.5);

    if (stove.timerText) {
      stove.timerText.setText('Nettoyage...');
      stove.timerText.setColor('#3b82f6');
    }
  }

  cancelCleaning(stove) {
    stove.cleanStart = null;
    stove.cleanPointerId = null;
    if (stove.cleanBar) { stove.cleanBar.destroy(); stove.cleanBar = null; }
    if (stove.cleanBg) { stove.cleanBg.destroy(); stove.cleanBg = null; }
    if (stove.timerText) {
      stove.timerText.setText('Brûlé');
      stove.timerText.setColor('#ef4444');
    }
  }

  resetStove(stove) {
    stove.state = 'idle';
    stove.dish = null;
    stove.cookStart = null;
    stove.cookEnd = null;
    stove.burnAt = null;
    stove.cleanStart = null;
    stove.cleanPointerId = null;

    if (stove.progressBar) { stove.progressBar.destroy(); stove.progressBar = null; }
    if (stove.progressBg) { stove.progressBg.destroy(); stove.progressBg = null; }
    if (stove.timerText) { stove.timerText.destroy(); stove.timerText = null; }
    if (stove.readyMark) {
      this.tweens.killTweensOf(stove.readyMark);
      stove.readyMark.destroy();
      stove.readyMark = null;
    }
    if (stove.smoke) { stove.smoke.destroy(); stove.smoke = null; }
    if (stove.cleanBar) { stove.cleanBar.destroy(); stove.cleanBar = null; }
    if (stove.cleanBg) { stove.cleanBg.destroy(); stove.cleanBg = null; }

    this.drawStoveBurners(stove, 0x222222);
  }

  moveEntityTo(entity, targetCol, targetRow) {
    if (!entity || !entity.circle) return;

    let startCol, startRow;
    if (entity.col !== undefined && entity.row !== undefined) {
      startCol = entity.col;
      startRow = entity.row;
    } else {
      const cur = this.pathfinding.screenToIso(entity.circle.x, entity.circle.y);
      startCol = cur.col;
      startRow = cur.row;
      entity.col = startCol;
      entity.row = startRow;
    }

    entity.targetCol = targetCol;
    entity.targetRow = targetRow;
    entity.path = [];
    entity.pathIndex = 0;

    const attemptPath = (attemptsLeft) => {
      const path = this.pathfinding.findPath(startCol, startRow, targetCol, targetRow);
      if (path && path.length > 0) {
        entity.path = path;
        entity.pathIndex = 0;
        return;
      }
      if (attemptsLeft > 0) {
        this.time.delayedCall(150, () => attemptPath(attemptsLeft - 1));
        return;
      }
      console.warn('moveEntityTo : chemin introuvable, teleport vers', targetCol, targetRow);
      const tp = this.pathfinding.isoToScreen(targetCol, targetRow);
      entity.circle.x = tp.x;
      entity.circle.y = tp.y;
      entity.col = targetCol;
      entity.row = targetRow;
      entity.path = [];
      entity.pathIndex = 0;
    };

    attemptPath(3);
  }
}
