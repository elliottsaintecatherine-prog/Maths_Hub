export default class RaidMapScene extends Phaser.Scene {
  constructor() {
    super('RaidMapScene');
  }

  create() {
    const { width, height } = this.scale;

    this.overlayBg = this.add.rectangle(width / 2, height / 2, width, height, 0x222222, 0.85);
    this.overlayBg.setInteractive();
    this.overlayBg.setDepth(0);
    this.overlayBg.on('pointerdown', (pointer, lx, ly, ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });

    this.titleText = this.add.text(width / 2, 30, 'Carte des Raids', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5, 0);
    this.titleText.setDepth(1);

    const closeSize = 32;
    const closeX = width - closeSize / 2 - 12;
    const closeY = closeSize / 2 + 12;

    this.closeBg = this.add.rectangle(closeX, closeY, closeSize, closeSize, 0x555555);
    this.closeBg.setStrokeStyle(2, 0xffffff, 1);
    this.closeBg.setInteractive({ useHandCursor: true });
    this.closeBg.setDepth(20);

    this.closeText = this.add.text(closeX, closeY, 'X', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.closeText.setDepth(21);

    this.closeBg.on('pointerdown', (pointer, lx, ly, ev) => {
      if (this.popupContainer) this.closePrepPopup();
      this.scene.stop('RaidMapScene');
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });

    this.gameScene = this.scene.get('GameScene');
    this.createPlayerCafe();
    this.createEnemyCafes();
  }

  createPlayerCafe() {
    const cx = 200;
    const cy = 320;
    const rectW = 100;
    const rectH = 80;

    const rect = this.add.rectangle(cx, cy, rectW, rectH, 0x3FA15F);
    rect.setStrokeStyle(2, 0xffffff, 1);
    rect.setDepth(1);

    const label = this.add.text(cx, cy + rectH / 2 + 14, 'Ton café', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    label.setDepth(1);

    const rating = this.gameScene && typeof this.gameScene.rating === 'number' ? this.gameScene.rating : 5;
    this.drawStars(cx, cy + rectH / 2 + 36, 5, rating);
  }

  drawStars(centerX, centerY, total, filled) {
    const starSize = 8;
    const spacing = 16;
    const startX = centerX - ((total - 1) * spacing) / 2;
    for (let i = 0; i < total; i++) {
      const x = startX + i * spacing;
      const isFilled = i < filled;
      const color = isFilled ? 0xffd700 : 0x555555;
      this.drawStarPolygon(x, centerY, starSize, color);
    }
  }

  drawStarPolygon(cx, cy, outerR, color) {
    const innerR = outerR / 2;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.lineStyle(1, 0x000000, 1);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.setDepth(1);
    return g;
  }

  createEnemyCafes() {
    const cafes = (this.gameScene && this.gameScene.enemyCafes) ? this.gameScene.enemyCafes : [];
    const cx = 760;
    const ys = [120, 250, 380, 510];
    const rectW = 100;
    const rectH = 80;
    const now = Date.now();

    for (let i = 0; i < cafes.length && i < ys.length; i++) {
      const cafe = cafes[i];
      const cy = ys[i];

      const nameText = this.add.text(cx, cy - rectH / 2 - 14, cafe.name, {
        fontFamily: 'monospace', fontSize: '11px', color: '#ffffff'
      }).setOrigin(0.5);
      nameText.setDepth(1);

      const rect = this.add.rectangle(cx, cy, rectW, rectH, 0xA13F3F);
      rect.setStrokeStyle(2, 0xffffff, 1);
      rect.setDepth(1);

      const levelText = this.add.text(cx, cy, `Niv ${cafe.level}`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);
      levelText.setDepth(2);

      const isClosed = cafe.closedUntil && cafe.closedUntil > now;
      let stateLabel;
      let stateColor;
      if (isClosed) {
        const remainingMs = cafe.closedUntil - now;
        const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
        stateLabel = `Fermé ${minutes}min`;
        stateColor = '#ef4444';
      } else {
        stateLabel = 'Ouvert';
        stateColor = '#ffffff';
      }
      const stateText = this.add.text(cx, cy + rectH / 2 + 14, stateLabel, {
        fontFamily: 'monospace', fontSize: '12px', color: stateColor
      }).setOrigin(0.5);
      stateText.setDepth(1);

      if (!isClosed) {
        rect.setInteractive({ useHandCursor: true });
        rect.on('pointerdown', (pointer, lx, ly, ev) => {
          console.log(`Préparation raid sur ${cafe.name}`);
          this.openPrepPopup(cafe);
          if (ev && ev.stopPropagation) ev.stopPropagation();
        });
      }
    }
  }

  openPrepPopup(cafe) {
    if (this.popupContainer) return;

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.popupBackdrop = this.add.rectangle(cx, cy, width, height, 0x000000, 0.4);
    this.popupBackdrop.setInteractive();
    this.popupBackdrop.setDepth(4);
    this.popupBackdrop.on('pointerdown', (pointer, lx, ly, ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });

    this.popupContainer = this.add.container(cx, cy);
    this.popupContainer.setDepth(5);

    const popupBg = this.add.rectangle(0, 0, 500, 350, 0x333333);
    popupBg.setStrokeStyle(2, 0xffffff, 1);
    popupBg.setInteractive();
    popupBg.on('pointerdown', (pointer, lx, ly, ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });
    this.popupContainer.add(popupBg);

    const title = this.add.text(0, -150, `Raid sur ${cafe.name}`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
    }).setOrigin(0.5, 0);
    this.popupContainer.add(title);

    this.selectedZombieIds = new Set();
    this.popupCafe = cafe;

    const zombies = (this.gameScene && this.gameScene.staff) ? this.gameScene.staff : [];
    const listStartY = -110;
    const rowH = 28;
    const maxRows = 6;

    for (let i = 0; i < zombies.length && i < maxRows; i++) {
      const z = zombies[i];
      const rowY = listStartY + i * rowH;
      this.createZombieRow(z, rowY);
    }

    if (zombies.length === 0) {
      const empty = this.add.text(0, listStartY + 40, 'Aucun zombie disponible', {
        fontFamily: 'monospace', fontSize: '13px', color: '#888888', fontStyle: 'italic'
      }).setOrigin(0.5);
      this.popupContainer.add(empty);
    }

    const tip = this.add.text(0, 75, 'Repose tes zombies avant un raid pour maximiser leur énergie', {
      fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa', fontStyle: 'italic'
    }).setOrigin(0.5);
    this.popupContainer.add(tip);

    const btnY = 130;

    this.cancelBtn = this.add.rectangle(-100, btnY, 120, 36, 0x666666);
    this.cancelBtn.setStrokeStyle(2, 0xffffff, 1);
    this.cancelBtn.setInteractive({ useHandCursor: true });
    this.popupContainer.add(this.cancelBtn);

    this.cancelText = this.add.text(-100, btnY, 'Annuler', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    this.popupContainer.add(this.cancelText);

    this.cancelBtn.on('pointerdown', (pointer, lx, ly, ev) => {
      this.closePrepPopup();
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });

    this.launchBtn = this.add.rectangle(100, btnY, 160, 40, 0x22c55e);
    this.launchBtn.setStrokeStyle(2, 0xffffff, 1);
    this.launchBtn.setInteractive({ useHandCursor: true });
    this.popupContainer.add(this.launchBtn);

    this.launchText = this.add.text(100, btnY, 'Lancer le raid', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    this.popupContainer.add(this.launchText);

    this.launchBtn.on('pointerdown', (pointer, lx, ly, ev) => {
      if (this.selectedZombieIds.size < 1) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        return;
      }
      const selected = Array.from(this.selectedZombieIds);
      const names = selected.map(z => z.name);
      console.log(`Raid lancé sur ${this.popupCafe.name}`, names);
      this.closePrepPopup();
      this.scene.start('RaidScene', { allies: selected, enemyCafe: this.popupCafe });
      if (ev && ev.stopPropagation) ev.stopPropagation();
    });

    this.updateLaunchButtonState();
  }

  createZombieRow(zombie, rowY) {
    const isReanimating = zombie.state === 'reanimating';
    const isSelectable = !isReanimating;

    const checkX = -200;
    const boxColor = isSelectable ? 0xffffff : 0x555555;
    const checkbox = this.add.rectangle(checkX, rowY, 20, 20, boxColor);
    checkbox.setStrokeStyle(1, 0x000000, 1);
    this.popupContainer.add(checkbox);

    const cross1 = this.add.rectangle(checkX, rowY, 14, 3, 0x22c55e);
    cross1.setRotation(Math.PI / 4);
    cross1.setVisible(false);
    this.popupContainer.add(cross1);

    const cross2 = this.add.rectangle(checkX, rowY, 14, 3, 0x22c55e);
    cross2.setRotation(-Math.PI / 4);
    cross2.setVisible(false);
    this.popupContainer.add(cross2);

    const nameColor = isSelectable ? '#ffffff' : '#888888';
    const displayName = zombie.name || zombie.label || '?';
    const nameText = this.add.text(checkX + 18, rowY, displayName, {
      fontFamily: 'monospace', fontSize: '13px', color: nameColor
    }).setOrigin(0, 0.5);
    this.popupContainer.add(nameText);

    const energyColor = isSelectable ? '#22c55e' : '#888888';
    const energyVal = Math.round(zombie.energyCurrent != null ? zombie.energyCurrent : (zombie.energy || 0));
    const energyMax = zombie.energy != null ? zombie.energy : 0;
    const energyText = this.add.text(180, rowY, `Énergie : ${energyVal}/${energyMax}`, {
      fontFamily: 'monospace', fontSize: '12px', color: energyColor
    }).setOrigin(1, 0.5);
    this.popupContainer.add(energyText);

    if (isSelectable) {
      checkbox.setInteractive({ useHandCursor: true });
      checkbox.on('pointerdown', (pointer, lx, ly, ev) => {
        if (this.selectedZombieIds.has(zombie)) {
          this.selectedZombieIds.delete(zombie);
          cross1.setVisible(false);
          cross2.setVisible(false);
        } else {
          this.selectedZombieIds.add(zombie);
          cross1.setVisible(true);
          cross2.setVisible(true);
        }
        this.updateLaunchButtonState();
        if (ev && ev.stopPropagation) ev.stopPropagation();
      });
    }
  }

  updateLaunchButtonState() {
    if (!this.launchBtn) return;
    const enabled = this.selectedZombieIds && this.selectedZombieIds.size >= 1;
    if (enabled) {
      this.launchBtn.setFillStyle(0x22c55e);
      this.launchBtn.setAlpha(1);
      if (this.launchText) this.launchText.setAlpha(1);
    } else {
      this.launchBtn.setFillStyle(0x166534);
      this.launchBtn.setAlpha(0.6);
      if (this.launchText) this.launchText.setAlpha(0.6);
    }
  }

  closePrepPopup() {
    if (this.popupContainer) {
      this.popupContainer.destroy();
      this.popupContainer = null;
    }
    if (this.popupBackdrop) {
      this.popupBackdrop.destroy();
      this.popupBackdrop = null;
    }
    this.selectedZombieIds = null;
    this.popupCafe = null;
    this.cancelBtn = null;
    this.cancelText = null;
    this.launchBtn = null;
    this.launchText = null;
  }
}
