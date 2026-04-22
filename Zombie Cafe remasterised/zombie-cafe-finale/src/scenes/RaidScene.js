export default class RaidScene extends Phaser.Scene {
  constructor() { super('RaidScene'); }

  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'RaidScene — stub', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ff4040',
    }).setOrigin(0.5);
  }
}
