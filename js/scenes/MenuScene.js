import Phaser from 'phaser';
export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }
  create() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x100811, 0x100811, 0x310d1d, 0x170911, 1);
    g.fillRect(0, 0, 1280, 720);
    for (let i = 0; i < 34; i++) {
      const x = Phaser.Math.Between(0, 1280); const y = Phaser.Math.Between(0, 720);
      g.lineStyle(1, 0x7d1d36, Phaser.Math.FloatBetween(.1, .35)).strokeCircle(x, y, Phaser.Math.Between(10, 40));
    }
  }
}
