import Phaser from 'phaser';
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload() {
    this.load.json('medicines', '/data/medicines.json');
    this.load.json('symptoms', '/data/symptoms.json');
    this.load.json('pathogens', '/data/pathogens.json');
  }
  create() {
    this.registry.set('medicines', this.cache.json.get('medicines'));
    this.registry.set('symptoms', this.cache.json.get('symptoms'));
    this.registry.set('pathogens', this.cache.json.get('pathogens'));
    this.scene.start('MenuScene');
  }
}
