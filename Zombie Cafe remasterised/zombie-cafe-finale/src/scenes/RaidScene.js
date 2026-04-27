import CLIENT_TYPES from '../data/clientTypes.js';

const CLIENT_TYPE_LIST = Object.values(CLIENT_TYPES);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomClientType() {
  return CLIENT_TYPE_LIST[randInt(0, CLIENT_TYPE_LIST.length - 1)];
}

function makeEnemyZombie() {
  const t = pickRandomClientType();
  return {
    type: t.id,
    label: t.label,
    x: 0,
    y: 0,
    radius: 16,
    energyCurrent: t.energy,
    energyMax: t.energy,
    atkStrength: t.atkStrength,
    speed: t.speed,
    side: 'enemy',
    alive: true
  };
}

function makeEnemyClient() {
  const t = pickRandomClientType();
  return {
    type: t.id,
    label: t.label,
    x: 0,
    y: 0,
    radius: 14,
    energyCurrent: t.energy,
    energyMax: t.energy,
    atkStrength: t.atkStrength,
    side: 'client',
    alive: true
  };
}

function makeBoss() {
  return {
    type: 'boss',
    label: 'Raid Boss',
    x: 0,
    y: 0,
    radius: 24,
    energyCurrent: 200,
    energyMax: 200,
    atkStrength: 15,
    side: 'enemy',
    alive: true
  };
}

function normalizeAlly(ally) {
  const energyMax = ally.energy != null ? ally.energy : (ally.energyMax != null ? ally.energyMax : 100);
  const energyCur = ally.energyCurrent != null ? ally.energyCurrent : energyMax;
  return {
    ...ally,
    type: ally.id || ally.type || 'ally',
    x: ally.x != null ? ally.x : 0,
    y: ally.y != null ? ally.y : 0,
    radius: 16,
    energyCurrent: energyCur,
    energyMax: energyMax,
    atkStrength: ally.atkStrength != null ? ally.atkStrength : 0,
    side: 'ally',
    alive: ally.alive !== undefined ? ally.alive : true
  };
}

function distributeY(count, yMin, yMax) {
  if (count <= 0) return [];
  if (count === 1) return [(yMin + yMax) / 2];
  const step = (yMax - yMin) / (count - 1);
  const ys = [];
  for (let i = 0; i < count; i++) ys.push(yMin + i * step);
  return ys;
}

function computeDamage(atkStrength, randFn) {
  const r = (typeof randFn === 'function') ? randFn() : Math.random();
  const variance = 0.8 + r * 0.4;
  return Math.round(atkStrength * variance);
}

const COLOR_BG = 0x1a1a1a;
const COLOR_ALLY = 0x33cc33;
const COLOR_ENEMY = 0xcc3333;
const COLOR_BOSS = 0xff4444;
const COLOR_CLIENT = 0xe8d8a8;
const COLOR_TABLE = 0x6b4423;
const COLOR_BAR_BG = 0x661111;
const COLOR_BAR_FILL = 0x22cc22;
const BAR_WIDTH = 40;
const BAR_HEIGHT = 6;
const BAR_OFFSET_Y = 10;

const ALLY_X = 150;
const ENEMY_X = 810;
const BOSS_X = 810;
const BOSS_Y = 80;
const ALLY_Y_MIN = 120;
const ALLY_Y_MAX = 560;
const ENEMY_Y_MIN = 170;
const ENEMY_Y_MAX = 600;
const TABLE_W = 60;
const TABLE_H = 40;
const TABLE_SPACING = 90;
const CLIENT_TABLE_OFFSET = 45;

const HALO_COLOR = 0x4488ff;
const HALO_ALPHA = 0.6;
const HALO_RADIUS = 22;
const ATTACK_DURATION = 400;

const COLOR_FLASH = 0xff0000;
const FLASH_ALPHA = 0.6;
const FLASH_DURATION = 300;
const DEATH_FADE_DURATION = 300;
const ALLY_DEATH_ANGLE = 90;

const GOLD_PER_CLIENT = 5;
const RETREAT_BTN_W = 120;
const RETREAT_BTN_H = 36;
const RETREAT_BTN_X = 10;
const RETREAT_BTN_Y = 10;
const COLOR_RETREAT_BG = 0xffffff;
const COLOR_RETREAT_TEXT = '#000000';

export default class RaidScene extends Phaser.Scene {
  constructor() { super('RaidScene'); }

  init(data) {
    const incomingAllies = (data && Array.isArray(data.allies)) ? data.allies : [];
    this.allies = incomingAllies.map(normalizeAlly);

    this.enemyCafe = (data && data.enemyCafe) ? data.enemyCafe : null;

    const enemyCount = randInt(3, 6);
    this.enemies = [];
    for (let i = 0; i < enemyCount; i++) {
      this.enemies.push(makeEnemyZombie());
    }

    this.boss = makeBoss();

    const clientCount = randInt(2, 4);
    this.clients = [];
    for (let i = 0; i < clientCount; i++) {
      this.clients.push(makeEnemyClient());
    }
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, COLOR_BG);

    const cafeName = this.enemyCafe && this.enemyCafe.name ? this.enemyCafe.name : 'cafe inconnu';
    this.add.text(width / 2, 20, `Raid sur ${cafeName}`, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff'
    }).setOrigin(0.5, 0);

    const summary =
      `Allies : ${this.allies.length}   `
      + `Enemies : ${this.enemies.length}   `
      + `Clients : ${this.clients.length}   `
      + `Boss : ${this.boss.energyCurrent}/${this.boss.energyMax} HP, atk ${this.boss.atkStrength}`;
    this.add.text(width / 2, 56, summary, {
      fontFamily: 'monospace', fontSize: '13px', color: '#cccccc'
    }).setOrigin(0.5, 0);

    this.add.text(width / 2, 84, '(4b5 : clients ennemis + bouton Retraite)', {
      fontFamily: 'monospace', fontSize: '11px', color: '#888888', fontStyle: 'italic'
    }).setOrigin(0.5, 0);

    this._layoutEntities(width, height);

    this.selectedAlly = null;
    this.attackInProgress = false;
    this.tempGold = 0;

    this.allies.forEach(a => this._drawEntity(a, COLOR_ALLY));
    this.enemies.forEach(e => this._drawEntity(e, COLOR_ENEMY));
    this.clients.forEach(c => this._drawEntity(c, COLOR_CLIENT));
    this._drawEntity(this.boss, COLOR_BOSS);

    this.allies.forEach(a => this._bindAllySelect(a));
    this.enemies.forEach(e => this._bindEnemyAttack(e));
    this._bindEnemyAttack(this.boss);
    this.clients.forEach(c => this._bindClientEat(c));

    this._addRetreatButton();

    console.log('[RaidScene 4b5] retreat + clients ready', {
      allies: this.allies.length,
      enemies: this.enemies.length,
      clients: this.clients.length,
      boss: { x: this.boss.x, y: this.boss.y, hp: this.boss.energyCurrent }
    });
  }

  _bindAllySelect(ally) {
    if (!ally.sprite) return;
    ally.sprite.setInteractive(
      new Phaser.Geom.Circle(0, 0, ally.radius),
      Phaser.Geom.Circle.Contains
    );
    ally.sprite.on('pointerdown', () => this._selectAlly(ally));
  }

  _bindEnemyAttack(target) {
    if (!target.sprite) return;
    target.sprite.setInteractive(
      new Phaser.Geom.Circle(0, 0, target.radius),
      Phaser.Geom.Circle.Contains
    );
    target.sprite.on('pointerdown', () => this._attackTarget(target));
  }

  _bindClientEat(client) {
    if (!client.sprite) return;
    client.sprite.setInteractive(
      new Phaser.Geom.Circle(0, 0, client.radius),
      Phaser.Geom.Circle.Contains
    );
    client.sprite.on('pointerdown', () => this._eatClient(client));
  }

  _addRetreatButton() {
    const w = RETREAT_BTN_W;
    const h = RETREAT_BTN_H;
    const cx = RETREAT_BTN_X + w / 2;
    const cy = RETREAT_BTN_Y + h / 2;
    const bg = this.add.rectangle(cx, cy, w, h, COLOR_RETREAT_BG);
    this.add.text(cx, cy, 'Retraite', {
      fontFamily: 'monospace', fontSize: '14px', color: COLOR_RETREAT_TEXT, fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );
    bg.on('pointerdown', () => this._retreat());
  }

  _eatClient(client) {
    if (this.attackInProgress) return;
    if (!this.selectedAlly) return;
    if (!client.alive) return;

    const ally = this.selectedAlly;
    const startX = ally.x;
    const startY = ally.y;
    const cursor = { x: startX, y: startY };
    this.attackInProgress = true;

    this.tweens.add({
      targets: cursor,
      x: client.x,
      y: client.y,
      duration: ATTACK_DURATION,
      yoyo: true,
      onUpdate: () => this._setEntityVisualPosition(ally, cursor.x, cursor.y),
      onYoyo: () => this._resolveEat(client),
      onComplete: () => {
        this._setEntityVisualPosition(ally, startX, startY);
        this.attackInProgress = false;
      }
    });
  }

  _resolveEat(client) {
    if (!client.alive) return;
    client.alive = false;
    this.tempGold += GOLD_PER_CLIENT;

    const visuals = [client.sprite, client.barBg, client.barFill].filter(o => o);
    if (visuals.length > 0) {
      this.tweens.add({
        targets: visuals,
        alpha: 0,
        duration: DEATH_FADE_DURATION,
        onComplete: () => {
          if (client.sprite) { client.sprite.destroy(); client.sprite = null; }
          if (client.barBg) { client.barBg.destroy(); client.barBg = null; }
          if (client.barFill) { client.barFill.destroy(); client.barFill = null; }
        }
      });
    }
    const idx = this.clients.indexOf(client);
    if (idx >= 0) this.clients.splice(idx, 1);
  }

  _retreat() {
    console.log('[RaidScene 4b5] Retraite — survivors return with current energy', {
      survivors: this.allies.filter(a => a.state !== 'dead_in_raid').length,
      tempGoldDiscarded: this.tempGold
    });
    this.scene.stop();
  }

  _selectAlly(ally) {
    if (this.attackInProgress) return;
    if (ally.state === 'dead_in_raid') return;
    if (this.selectedAlly === ally) return;
    if (this.selectedAlly && this.selectedAlly.halo) {
      this.selectedAlly.halo.destroy();
      this.selectedAlly.halo = null;
    }
    this.selectedAlly = ally;
    ally.halo = this.add.circle(ally.x, ally.y, HALO_RADIUS, HALO_COLOR, HALO_ALPHA);
    ally.halo.setDepth(ally.sprite.depth - 1);
  }

  _attackTarget(target) {
    if (this.attackInProgress) return;
    if (!this.selectedAlly) return;
    if (target.side !== 'enemy') return;
    if (!target.alive) return;

    const ally = this.selectedAlly;
    const startX = ally.x;
    const startY = ally.y;
    const cursor = { x: startX, y: startY };
    this.attackInProgress = true;

    this.tweens.add({
      targets: cursor,
      x: target.x,
      y: target.y,
      duration: ATTACK_DURATION,
      yoyo: true,
      onUpdate: () => this._setEntityVisualPosition(ally, cursor.x, cursor.y),
      onYoyo: () => this._resolveCombat(ally, target),
      onComplete: () => {
        this._setEntityVisualPosition(ally, startX, startY);
        this.attackInProgress = false;
      }
    });
  }

  _resolveCombat(ally, target) {
    const dmg = computeDamage(ally.atkStrength);
    target.energyCurrent = Math.max(0, target.energyCurrent - dmg);
    this._updateEnergyBar(target);

    if (target.energyCurrent <= 0) {
      this._killEnemy(target);
      return;
    }

    const counter = computeDamage(target.atkStrength);
    ally.energyCurrent = Math.max(0, ally.energyCurrent - counter);
    this._updateEnergyBar(ally);
    this._flashRed(ally);

    if (ally.energyCurrent <= 0) {
      this._killAlly(ally);
    }
  }

  _updateEnergyBar(e) {
    if (!e.barFill) return;
    const ratio = Math.max(0, Math.min(1, e.energyCurrent / e.energyMax));
    const fillW = Math.max(0, BAR_WIDTH * ratio);
    e.barFill.width = fillW;
  }

  _flashRed(ally) {
    if (!ally.sprite) return;
    const flash = this.add.circle(ally.sprite.x, ally.sprite.y, ally.radius, COLOR_FLASH, FLASH_ALPHA);
    flash.setDepth(ally.sprite.depth + 1);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: FLASH_DURATION,
      onComplete: () => flash.destroy()
    });
  }

  _killEnemy(enemy) {
    enemy.alive = false;
    const visuals = [enemy.sprite, enemy.barBg, enemy.barFill].filter(o => o);
    if (visuals.length > 0) {
      this.tweens.add({
        targets: visuals,
        alpha: 0,
        duration: DEATH_FADE_DURATION,
        onComplete: () => {
          if (enemy.sprite) { enemy.sprite.destroy(); enemy.sprite = null; }
          if (enemy.barBg) { enemy.barBg.destroy(); enemy.barBg = null; }
          if (enemy.barFill) { enemy.barFill.destroy(); enemy.barFill = null; }
        }
      });
    }
    const idx = this.enemies.indexOf(enemy);
    if (idx >= 0) this.enemies.splice(idx, 1);
  }

  _killAlly(ally) {
    ally.state = 'dead_in_raid';
    if (ally.sprite) {
      this.tweens.add({
        targets: ally.sprite,
        angle: ALLY_DEATH_ANGLE,
        duration: DEATH_FADE_DURATION
      });
    }
    if (this.selectedAlly === ally) {
      if (ally.halo) {
        ally.halo.destroy();
        ally.halo = null;
      }
      this.selectedAlly = null;
    }
  }

  _setEntityVisualPosition(e, x, y) {
    if (e.sprite) { e.sprite.x = x; e.sprite.y = y; }
    const barY = y - e.radius - BAR_OFFSET_Y;
    if (e.barBg) { e.barBg.x = x; e.barBg.y = barY; }
    if (e.barFill) { e.barFill.x = x - BAR_WIDTH / 2; e.barFill.y = barY; }
    if (e.halo) { e.halo.x = x; e.halo.y = y; }
  }

  _layoutEntities(width, height) {
    const allyYs = distributeY(this.allies.length, ALLY_Y_MIN, ALLY_Y_MAX);
    this.allies.forEach((a, i) => { a.x = ALLY_X; a.y = allyYs[i]; });

    const enemyYs = distributeY(this.enemies.length, ENEMY_Y_MIN, ENEMY_Y_MAX);
    this.enemies.forEach((e, i) => { e.x = ENEMY_X; e.y = enemyYs[i]; });

    this.boss.x = BOSS_X;
    this.boss.y = BOSS_Y;

    const centerX = width / 2;
    const centerY = height / 2;
    const numTables = Math.max(2, Math.min(4, this.clients.length));
    const tableY = centerY;
    for (let i = 0; i < numTables; i++) {
      const tx = centerX + (i - (numTables - 1) / 2) * TABLE_SPACING;
      this.add.rectangle(tx, tableY, TABLE_W, TABLE_H, COLOR_TABLE);
    }

    this.clients.forEach((c, i) => {
      const cx = centerX + (i - (this.clients.length - 1) / 2) * TABLE_SPACING;
      const above = i % 2 === 0;
      c.x = cx;
      c.y = above ? (tableY - CLIENT_TABLE_OFFSET) : (tableY + CLIENT_TABLE_OFFSET);
    });
  }

  _drawEntity(e, color) {
    e.sprite = this.add.circle(e.x, e.y, e.radius, color);

    const barY = e.y - e.radius - BAR_OFFSET_Y;
    e.barBg = this.add.rectangle(e.x, barY, BAR_WIDTH, BAR_HEIGHT, COLOR_BAR_BG);

    const ratio = Math.max(0, Math.min(1, e.energyCurrent / e.energyMax));
    const fillW = Math.max(0, BAR_WIDTH * ratio);
    e.barFill = this.add
      .rectangle(e.x - BAR_WIDTH / 2, barY, fillW, BAR_HEIGHT, COLOR_BAR_FILL)
      .setOrigin(0, 0.5);
  }
}
