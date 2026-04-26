import { COOKBOOKS, COOKBOOK_COLORS, RECIPE_TYPES, DISHES } from '../data/recipes.js';

const PANEL_W = 560;
const PANEL_H = 420;
const SIDEBAR_W = 140;
const RIGHT_W = 400;
const RIGHT_H = 320;

const COLOR_PANEL_BG = 0xe8d9b5;
const COLOR_DARK_BROWN = 0x5c3a1e;
const COLOR_ENTRY_BG = 0xd4c19a;
const COLOR_ENTRY_LOCKED_BG = 0x9a9a9a;
const COLOR_ACTIVE_BORDER = 0xfb923c;
const COLOR_CARD_BG = 0xefe5cc;
const COLOR_SEPARATOR = 0xc4a77a;

const ENTRY_W = 130;
const ENTRY_H = 36;
const ENTRY_SPACING = 8;

const BUTTON_W = 120;
const BUTTON_H = 36;
const BUTTON_BOTTOM_MARGIN = 6;

const CARD_H = 80;
const CARD_W = 380;

const TYPE_CATEGORY = {
  quick: 'quick',
  veryQuick: 'quick',
  fresh: 'standard',
  frozen: 'standard',
  bulk: 'standard',
  spicy: 'fancy',
  verySpicy: 'fancy',
  fancy: 'fancy',
  veryFancy: 'premium'
};

const CATEGORY_COLORS = {
  quick: 0x22c55e,
  standard: 0xeab308,
  fancy: 0xa855f7,
  premium: 0xffd700
};

const TYPE_LABELS = {
  quick: 'Quick',
  veryQuick: 'Very Quick',
  fresh: 'Fresh',
  frozen: 'Frozen',
  bulk: 'Bulk',
  spicy: 'Spicy',
  verySpicy: 'Very Spicy',
  fancy: 'Fancy',
  veryFancy: 'Very Fancy'
};

function formatCookTime(seconds) {
  if (seconds == null || !isFinite(seconds)) return '?';
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${min}min`;
  return `${min}min${s}s`;
}

export default class Cookbook {
  constructor(scene) {
    this.scene = scene;
    this.cookbookActifId = 'standard';
    this.entries = [];
    this.recipeListContainer = null;
    this.recipeMask = null;
    this.recipeMaskGraphics = null;
    this.recipeContentHeight = 0;
    this.recipeMaxScroll = 0;
    this.recipeScrollY = 0;
    this.wheelHandlerAttached = false;
    this.createButton();
    this.createPanel();
  }

  createButton() {
    const { height } = this.scene.scale;
    const x = BUTTON_W / 2 + 12;
    const y = height - BUTTON_H / 2 - BUTTON_BOTTOM_MARGIN;

    this.buttonBg = this.scene.add.rectangle(x, y, BUTTON_W, BUTTON_H, COLOR_DARK_BROWN);
    this.buttonBg.setStrokeStyle(2, 0xffffff, 1);
    this.buttonBg.setInteractive({ useHandCursor: true });
    this.buttonBg.setDepth(50);

    this.buttonText = this.scene.add.text(x, y, 'Cookbook', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    this.buttonText.setDepth(51);

    this.buttonBg.on('pointerdown', (pointer, lx, ly, ev) => {
      this.toggle();
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });
  }

  createPanel() {
    const { width, height } = this.scene.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.panel = this.scene.add.container(cx, cy);
    this.panel.setDepth(120);
    this.panel.setVisible(false);

    this.panelBg = this.scene.add.rectangle(0, 0, PANEL_W, PANEL_H, COLOR_PANEL_BG);
    this.panelBg.setStrokeStyle(4, COLOR_DARK_BROWN, 1);
    this.panelBg.setInteractive();
    this.panelBg.on('pointerdown', (pointer, lx, ly, ev) => {
      if (!this.panel.visible) return;
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });
    this.panel.add(this.panelBg);

    const title = this.scene.add.text(0, -PANEL_H / 2 + 20, 'Livre de Cuisine', {
      fontFamily: 'monospace', fontSize: '20px', color: '#5c3a1e'
    }).setOrigin(0.5, 0);
    this.panel.add(title);

    const sidebarX = -PANEL_W / 2 + SIDEBAR_W / 2 + 5;
    this.sidebarContainer = this.scene.add.container(sidebarX, 0);
    this.panel.add(this.sidebarContainer);

    const rightX = PANEL_W / 2 - RIGHT_W / 2 - 10;
    this.rightContainer = this.scene.add.container(rightX, 0);
    this.panel.add(this.rightContainer);

    this.createSidebarEntries();
    this.renderRecipes();
    this.createCloseButton();
    this.createCounter();

    this.scene.input.on('wheel', (pointer, currentlyOver, dx, dy) => {
      this.handleWheel(dy);
    });
  }

  createCloseButton() {
    const btnY = PANEL_H / 2 - 22;
    this.closeButtonBg = this.scene.add.rectangle(0, btnY, 100, 32, 0xa07442);
    this.closeButtonBg.setStrokeStyle(2, COLOR_DARK_BROWN, 1);
    this.closeButtonBg.setInteractive({ useHandCursor: true });
    this.closeButtonBg.on('pointerdown', (pointer, lx, ly, ev) => {
      if (!this.panel.visible) return;
      this.hide();
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });
    this.panel.add(this.closeButtonBg);

    this.closeButtonText = this.scene.add.text(0, btnY, 'Fermer', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    this.panel.add(this.closeButtonText);
  }

  createCounter() {
    this.counterText = this.scene.add.text(PANEL_W / 2 - 8, PANEL_H / 2 - 6, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#5c3a1e'
    }).setOrigin(1, 1);
    this.panel.add(this.counterText);
    this.updateCounter();
  }

  computeUnlockedCount() {
    let count = 0;
    for (const dish of DISHES) {
      const lockInfo = this.computeDishLockState(dish);
      if (lockInfo.state === 'unlocked') count++;
    }
    return count;
  }

  updateCounter() {
    if (!this.counterText) return;
    const total = DISHES.length;
    const unlocked = this.computeUnlockedCount();
    this.counterText.setText(`Recettes débloquées : ${unlocked} / ${total}`);
  }

  onLevelUp() {
    this.updateCounter();
    if (this.sidebarContainer) {
      this.sidebarContainer.removeAll(true);
      this.createSidebarEntries();
    }
    this.renderRecipes();
  }

  createSidebarEntries() {
    const playerLevel = this.scene.playerLevel || 1;
    const cookbookIds = Object.keys(COOKBOOKS);
    const totalH = cookbookIds.length * ENTRY_H + (cookbookIds.length - 1) * ENTRY_SPACING;
    const startY = -totalH / 2 + ENTRY_H / 2;

    this.entries = [];

    for (let i = 0; i < cookbookIds.length; i++) {
      const id = cookbookIds[i];
      const cb = COOKBOOKS[id];
      const minLevel = cb.minLevel || 0;
      const locked = minLevel > playerLevel;

      const ey = startY + i * (ENTRY_H + ENTRY_SPACING);
      const container = this.scene.add.container(0, ey);

      const entryColor = locked ? COLOR_ENTRY_LOCKED_BG : COLOR_ENTRY_BG;
      const bg = this.scene.add.rectangle(0, 0, ENTRY_W, ENTRY_H, entryColor);
      bg.setStrokeStyle(2, COLOR_DARK_BROWN, 1);
      container.add(bg);

      const iconColor = COOKBOOK_COLORS[cb.icon] || 0xffffff;
      const icon = this.scene.add.rectangle(-ENTRY_W / 2 + 14, 0, 16, 16, iconColor);
      icon.setStrokeStyle(1, 0x000000, 1);
      if (locked) icon.setAlpha(0.5);
      container.add(icon);

      const nameColor = locked ? '#555555' : '#5c3a1e';
      const text = this.scene.add.text(-ENTRY_W / 2 + 26, 0, cb.label, {
        fontFamily: 'monospace', fontSize: '10px', color: nameColor
      }).setOrigin(0, 0.5);
      container.add(text);

      if (locked) {
        const levelText = this.scene.add.text(ENTRY_W / 2 - 6, 0, `Niv ${minLevel}`, {
          fontFamily: 'monospace', fontSize: '10px', color: '#3a2a1a'
        }).setOrigin(1, 0.5);
        container.add(levelText);
      }

      if (!locked) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', (pointer, lx, ly, ev) => {
          if (!this.panel.visible) return;
          this.selectCookbook(id);
          if (ev && ev.stopPropagation) ev.stopPropagation();
        });
      }

      this.sidebarContainer.add(container);
      this.entries.push({ id, container, bg, locked, minLevel });
    }

    this.refreshActiveBorder();
  }

  selectCookbook(id) {
    if (id === this.cookbookActifId) return;
    this.cookbookActifId = id;
    this.refreshActiveBorder();
    this.renderRecipes();
  }

  refreshActiveBorder() {
    for (const entry of this.entries) {
      if (entry.locked) {
        entry.bg.setStrokeStyle(2, COLOR_DARK_BROWN, 1);
        continue;
      }
      if (entry.id === this.cookbookActifId) {
        entry.bg.setStrokeStyle(2, COLOR_ACTIVE_BORDER, 1);
      } else {
        entry.bg.setStrokeStyle(2, COLOR_DARK_BROWN, 1);
      }
    }
  }

  renderRecipes() {
    if (this.recipeListContainer) {
      this.recipeListContainer.destroy();
      this.recipeListContainer = null;
    }

    const dishes = DISHES.filter(d => d.cookbook === this.cookbookActifId);

    this.recipeListContainer = this.scene.add.container(0, -RIGHT_H / 2);
    this.rightContainer.add(this.recipeListContainer);

    for (let i = 0; i < dishes.length; i++) {
      const card = this.createDishCard(dishes[i]);
      card.y = i * CARD_H + CARD_H / 2;
      this.recipeListContainer.add(card);

      if (i < dishes.length - 1) {
        const sep = this.scene.add.rectangle(0, (i + 1) * CARD_H, CARD_W, 1, COLOR_SEPARATOR);
        this.recipeListContainer.add(sep);
      }
    }

    if (!this.recipeMask) {
      const cx = this.scene.scale.width / 2;
      const cy = this.scene.scale.height / 2;
      const rightCenterX = cx + (PANEL_W / 2 - RIGHT_W / 2 - 10);
      const maskX = rightCenterX - RIGHT_W / 2;
      const maskY = cy - RIGHT_H / 2;

      this.recipeMaskGraphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
      this.recipeMaskGraphics.fillStyle(0xffffff);
      this.recipeMaskGraphics.fillRect(maskX, maskY, RIGHT_W, RIGHT_H);
      this.recipeMask = this.recipeMaskGraphics.createGeometryMask();
    }
    this.recipeListContainer.setMask(this.recipeMask);

    this.recipeContentHeight = dishes.length * CARD_H;
    this.recipeMaxScroll = Math.max(0, this.recipeContentHeight - RIGHT_H);
    this.recipeScrollY = 0;
    this.recipeListContainer.y = -RIGHT_H / 2;
  }

  computeDishLockState(dish) {
    const cookbook = COOKBOOKS[dish.cookbook];
    const playerLevel = this.scene.playerLevel || 1;
    const unlockedRecipes = this.scene.unlockedRecipes;
    const isUnlockedByRaid = !!(unlockedRecipes && typeof unlockedRecipes.has === 'function' && unlockedRecipes.has(dish.id));
    const isRaidOnly = !!(cookbook && cookbook.raidOnly === true);

    if (isUnlockedByRaid) return { state: 'unlocked', hint: null };
    if (isRaidOnly) return { state: 'raid', hint: 'Volable en raid' };
    if (dish.minLevel != null && playerLevel < dish.minLevel) {
      return { state: 'level', hint: `Niv ${dish.minLevel} requis` };
    }
    if (dish.minLevel == null) return { state: 'level', hint: 'Niveau requis inconnu' };
    return { state: 'unlocked', hint: null };
  }

  createDishCard(dish) {
    const container = this.scene.add.container(0, 0);
    const recipe = RECIPE_TYPES[dish.type] || {};

    const lockInfo = this.computeDishLockState(dish);
    const isLocked = lockInfo.state !== 'unlocked';

    const bg = this.scene.add.rectangle(0, 0, CARD_W, CARD_H, COLOR_CARD_BG);
    container.add(bg);

    const cat = TYPE_CATEGORY[dish.type] || 'standard';
    const iconColor = CATEGORY_COLORS[cat];
    const iconX = -CARD_W / 2 + 40;
    const icon = this.scene.add.rectangle(iconX, 0, 60, 60, iconColor);
    icon.setStrokeStyle(1, COLOR_DARK_BROWN, 1);
    container.add(icon);

    const textX = -CARD_W / 2 + 80;
    const topY = -CARD_H / 2;

    const textLines = [];

    const name = this.scene.add.text(textX, topY + 6, dish.label, {
      fontFamily: 'monospace', fontSize: '16px', color: '#5c3a1e', fontStyle: 'bold'
    }).setOrigin(0, 0);
    container.add(name);
    textLines.push(name);

    const typeLabel = TYPE_LABELS[dish.type] || dish.type;
    const cookTimeStr = formatCookTime(recipe.cookTime);
    const typeLine = this.scene.add.text(textX, topY + 28, `${typeLabel} — ${cookTimeStr} cuisson`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#3a2a1a'
    }).setOrigin(0, 0);
    container.add(typeLine);
    textLines.push(typeLine);

    const portions = recipe.portions != null ? recipe.portions : '?';
    const price = recipe.pricePerPortion != null ? recipe.pricePerPortion : '?';
    const xp = recipe.xp != null ? recipe.xp : '?';
    const statsLine = this.scene.add.text(textX, topY + 44, `Portions : ${portions} | Prix/portion : ${price} or | XP : ${xp}`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#3a2a1a'
    }).setOrigin(0, 0);
    container.add(statsLine);
    textLines.push(statsLine);

    if (dish.minLevel != null) {
      const lvlLine = this.scene.add.text(textX, topY + 60, `Niveau requis : Niv ${dish.minLevel}`, {
        fontFamily: 'monospace', fontSize: '11px', color: '#3a2a1a'
      }).setOrigin(0, 0);
      container.add(lvlLine);
      textLines.push(lvlLine);
    }

    if (isLocked) {
      for (const t of textLines) {
        const strikeY = t.y + t.displayHeight / 2;
        const strikeX = t.x + t.displayWidth / 2;
        const strike = this.scene.add.rectangle(strikeX, strikeY, t.displayWidth, 1, 0x5c3a1e);
        container.add(strike);
      }

      if (lockInfo.hint) {
        const hintText = this.scene.add.text(CARD_W / 2 - 8, CARD_H / 2 - 6, lockInfo.hint, {
          fontFamily: 'monospace', fontSize: '11px', color: '#5c3a1e', fontStyle: 'italic'
        }).setOrigin(1, 1);
        container.add(hintText);
      }

      container.setAlpha(0.4);
    }

    return container;
  }

  handleWheel(dy) {
    if (!this.panel.visible) return;
    if (this.recipeMaxScroll === 0) return;
    if (!this.recipeListContainer) return;
    this.recipeScrollY = Phaser.Math.Clamp(this.recipeScrollY + dy * 0.5, 0, this.recipeMaxScroll);
    this.recipeListContainer.y = -RIGHT_H / 2 - this.recipeScrollY;
  }

  toggle() {
    if (this.panel.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    this.panel.setVisible(true);
    this.updateCounter();
  }

  hide() {
    this.panel.setVisible(false);
  }

  isOpen() {
    return this.panel.visible;
  }
}
