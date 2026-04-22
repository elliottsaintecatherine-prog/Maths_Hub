export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  preload() {
    this.load.image('banner', 'assets/images/banner.png');
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2 - 60, 'banner').setScale(0.8);
    this.add.text(width / 2, height / 2 + 120, 'Click to start', {
      fontFamily: 'monospace', fontSize: '28px', color: '#9ef01a',
    }).setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.start('GameScene'));
  }
}
