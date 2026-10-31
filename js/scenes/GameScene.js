import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { MalariaBoss } from '../entities/MalariaBoss.js';
import { StatusSystem } from '../systems/StatusSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { MedicineSystem } from '../systems/MedicineSystem.js';
import { DiagnosticSystem } from '../systems/DiagnosticSystem.js';
import { HUD } from '../ui/HUD.js';
import { loadSpriteAssets, createSpriteAnimations } from '../sprites/spriteAnimations.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  preload() {
    loadSpriteAssets(this);
  }

  create() {
    // Bridge Phaser's scene lifecycle to the background music controller.
    this.events.on(Phaser.Scenes.Events.PAUSE, () => {
      window.dispatchEvent(new Event('bloodbound:pause'));
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      window.dispatchEvent(new Event('bloodbound:resume'));
    });

    if (!createSpriteAnimations(this)) {
      throw new Error('BLOODBOUND could not initialise pathogen sprites. Run python3 tools/build_sprites.py and rebuild.');
    }
    this.stageWidth = 3600;
    this.stageHeight = 720;
    this.groundY = 584;
    this.isOverlayOpen = false;
    this.endShown = false;
    this.diagnosisComplete = false;
    this.bossSpawned = false;
    this.boss = null;
    this.enemies = [];
    this.enemySerial = 0;
    this.enemyKills = 0;
    this.activeAttackers = new Set();
    this.effects = [];
    this.elapsed = 0;
    this.hazardCooldown = 0;
    this.ui = new HUD();
    this.statusSystem = new StatusSystem(this, this.registry.get('symptoms'));
    this.combat = new CombatSystem(this);
    this.medicineSystem = new MedicineSystem(this, this.registry.get('medicines'));
    this.diagnosticSystem = new DiagnosticSystem(this, this.registry.get('pathogens'));
    this.events.on('pathogen-identified', () => { this.diagnosisComplete = true; });

    this.physics.world.setBounds(0, 0, this.stageWidth, this.stageHeight);
    this.physics.world.gravity.y = 1280;
    this.createSolidTexture();
    this.createEnvironment();
    this.createHazards();
    this.createInput();

    this.player = new Player(this, 235, this.groundY);
    this.ground = this.add.rectangle(this.stageWidth / 2, this.groundY + 15, this.stageWidth, 30, 0x270d19, 0).setOrigin(.5);
    this.physics.add.existing(this.ground, true);
    this.physics.add.collider(this.player.bodySprite, this.ground);

    this.spawnEnemy('scout', 790);
    this.spawnEnemy('assassin', 940);
    this.spawnEnemy('brute', 1100);

    this.cameras.main.setBounds(0, 0, this.stageWidth, this.stageHeight);
    this.cameras.main.startFollow(this.player.bodySprite, true, .08, .08, -110, 0);
    this.cameras.main.setDeadzone(440, 180);
    this.events.on('status-changed', (statuses) => this.ui.updateSymptoms(statuses));
    this.events.on('boss-phase', (phase) => this.ui.updateBoss(this.boss ?? { name: 'MALARIA // THE BLOOD REAVER', phase, health: 620, maxHealth: 620 }));
    this.events.on('boss-health', () => this.ui.updateBoss(this.boss));
    this.events.on('combat-feedback', (label) => this.ui.toast(label));
    this.ui.showHud(true);
    this.ui.updatePlayer(this.player);
    this.ui.updateBoss(null);
    this.ui.updateSymptoms([]);
    this.ui.setObjective('NEUTRALIZE PARASITE VANGUARD');
    this.ui.hidePause();
    this.ui.closeMedicine();
    this.ui.closeDiagnostic();
    this.ui.hideEnd();
    this.scene.bringToTop();
    this.events.once('shutdown', this.onShutdown, this);
    this.ui.toast('THREAT DETECTED // THREE PARASITE SIGNATURES');
  }

  createSolidTexture() {
    if (this.textures.exists('solid')) return;
    const graphic = this.make.graphics({ x: 0, y: 0, add: false });
    graphic.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4);
    graphic.generateTexture('solid', 4, 4);
    graphic.destroy();
  }

  createEnvironment() {
    const far = this.add.graphics().setScrollFactor(.22).setDepth(-100);
    far.fillGradientStyle(0x0c0711, 0x0c0711, 0x370d20, 0x160814, 1).fillRect(0, 0, this.stageWidth, this.stageHeight);
    for (let i = 0; i < 68; i++) {
      const x = Phaser.Math.Between(0, this.stageWidth);
      const y = Phaser.Math.Between(30, 680);
      far.lineStyle(1, 0x8b1c37, Phaser.Math.FloatBetween(.08, .22)).strokeCircle(x, y, Phaser.Math.Between(14, 55));
    }

    const walls = this.add.graphics().setDepth(-50);
    walls.fillStyle(0x250916, .98);
    walls.beginPath().moveTo(0, 0).lineTo(this.stageWidth, 0).lineTo(this.stageWidth, 98);
    walls.lineTo(3000, 125).lineTo(2500, 85).lineTo(1900, 112).lineTo(1300, 76).lineTo(760, 115).lineTo(0, 82).closePath().fillPath();
    walls.fillStyle(0x250916, .98);
    walls.beginPath().moveTo(0, 672).lineTo(690, 640).lineTo(1340, 674).lineTo(2080, 636).lineTo(2830, 670).lineTo(this.stageWidth, 636).lineTo(this.stageWidth, 720).lineTo(0, 720).closePath().fillPath();
    walls.lineStyle(7, 0x66152e, .72).beginPath().moveTo(0, 93).lineTo(760, 126).lineTo(1300, 87).lineTo(1900, 126).lineTo(2500, 97).lineTo(3000, 132).lineTo(this.stageWidth, 105).strokePath();
    walls.lineStyle(6, 0x741a36, .56).beginPath().moveTo(0, 650).lineTo(690, 622).lineTo(1340, 656).lineTo(2080, 618).lineTo(2830, 652).lineTo(this.stageWidth, 618).strokePath();

    const lumen = this.add.graphics().setDepth(-40);
    lumen.fillGradientStyle(0x3c0c1d, 0x2a0b19, 0x170914, 0x230916, .22).fillRect(0, 95, this.stageWidth, 525);
    lumen.lineStyle(2, 0xa52b48, .10);
    for (let x = 0; x < this.stageWidth; x += 180) {
      lumen.beginPath().moveTo(x, 165).lineTo(x + 75, 250).lineTo(x + 24, 360).strokePath();
    }

    this.cells = [];
    for (let i = 0; i < 34; i++) {
      const cell = this.add.graphics().setDepth(-10 + (i % 3));
      const x = Phaser.Math.Between(0, this.stageWidth);
      const y = Phaser.Math.Between(170, 520);
      const rx = Phaser.Math.Between(17, 33);
      const ry = rx * Phaser.Math.FloatBetween(.46, .72);
      cell.fillStyle(0x9d263d, .35).fillEllipse(0, 0, rx * 2, ry * 2);
      cell.lineStyle(2, 0xd94b5e, .27).strokeEllipse(0, 0, rx * 2, ry * 2);
      cell.fillStyle(0x4b1226, .38).fillEllipse(0, 0, rx, ry);
      cell.setPosition(x, y);
      this.cells.push({ graphic: cell, speed: Phaser.Math.FloatBetween(13, 34), drift: Phaser.Math.FloatBetween(-9, 9), startY: y });
    }

    this.flowLines = this.add.graphics().setDepth(-5);
    for (let i = 0; i < 26; i++) {
      const y = Phaser.Math.Between(145, 560);
      const x = Phaser.Math.Between(0, this.stageWidth);
      const len = Phaser.Math.Between(22, 86);
      this.flowLines.lineStyle(1, 0xff6678, Phaser.Math.FloatBetween(.06, .18)).beginPath().moveTo(x, y).lineTo(x + len, y).strokePath();
    }
  }

  createHazards() {
    this.hazards = [{ x: 1670, width: 165, label: 'CLOT SURGE' }];
    const hazardGfx = this.add.graphics().setDepth(1);
    for (const hazard of this.hazards) {
      hazardGfx.fillStyle(0x79162e, .30).fillRoundedRect(hazard.x, this.groundY - 7, hazard.width, 14, 7);
      hazardGfx.lineStyle(2, 0xe74760, .55).strokeRoundedRect(hazard.x, this.groundY - 7, hazard.width, 14, 7);
      hazardGfx.lineStyle(1, 0xff9ba8, .25);
      for (let x = hazard.x + 13; x < hazard.x + hazard.width; x += 25) hazardGfx.beginPath().moveTo(x, this.groundY - 4).lineTo(x + 8, this.groundY - 19).strokePath();
    }
  }

  createInput() {
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.W,
      block: Phaser.Input.Keyboard.KeyCodes.S,
      light: Phaser.Input.Keyboard.KeyCodes.J,
      heavy: Phaser.Input.Keyboard.KeyCodes.K,
      special: Phaser.Input.Keyboard.KeyCodes.L,
      dodge: Phaser.Input.Keyboard.KeyCodes.SPACE
    });
  }

  spawnEnemy(type, x, summoned = false) {
    const safeX = Phaser.Math.Clamp(x, 100, this.stageWidth - 100);
    const enemy = new Enemy(this, safeX, this.groundY, type);
    enemy.summoned = summoned;
    this.physics.add.collider(enemy.bodySprite, this.ground);
    this.enemies.push(enemy);
    return enemy;
  }

  reserveEnemyAttack(owner) {
    if (this.activeAttackers.has(owner)) return true;
    if (this.activeAttackers.size >= 2) return false;
    this.activeAttackers.add(owner);
    return true;
  }

  releaseEnemyAttack(owner) { this.activeAttackers.delete(owner); }

  onEnemyDefeated(enemy) {
    if (enemy.summoned) return;
    this.enemyKills++;
    this.ui.toast(`${enemy.name} // NEUTRALIZED`);
    if (!this.bossSpawned && this.enemyKills < 5) {
      const living = this.enemies.filter((item) => !item.dead && !item.summoned).length;
      if (living < 3) {
        const type = this.enemyKills % 3 === 1 ? 'assassin' : this.enemyKills % 3 === 2 ? 'scout' : 'brute';
        this.spawnEnemy(type, Math.min(this.player.x + 680, this.stageWidth - 130));
      }
      this.ui.setObjective(`CLEAR PARASITE VANGUARD // ${Math.min(this.enemyKills, 5)}/5`);
    }
    if (!this.bossSpawned && this.enemyKills >= 5) this.spawnBoss();
  }

  removeEnemyReference(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index >= 0) this.enemies.splice(index, 1);
    if (this.boss === enemy) this.boss = null;
  }

  spawnBoss() {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    this.boss = new MalariaBoss(this, Math.min(this.player.x + 470, this.stageWidth - 180), this.groundY);
    this.physics.add.collider(this.boss.bodySprite, this.ground);
    this.ui.updateBoss(this.boss);
    this.ui.setObjective('DIAGNOSE THE BLOOD REAVER');
    this.ui.toast('APEX PARASITE DETECTED // DIAGNOSTICS REQUIRED');
    this.statusSystem.add('fever', 52000, 1);
    this.statusSystem.add('fatigue', 68000, 1);
    this.statusSystem.add('anaemia', 68000, 1);
    this.time.delayedCall(750, () => this.openDiagnostic());
  }

  openDiagnostic() {
    if (!this.boss || this.boss.dead || this.isOverlayOpen) return;
    this.isOverlayOpen = true;
    this.scene.pause();
    this.ui.openDiagnostic((diagnosis) => {
      if (!this.diagnosticSystem.identify(diagnosis)) return false;
      this.diagnosisComplete = true;
      this.ui.setObjective('NEUTRALIZE THE BLOOD REAVER // TARGETED TREATMENT UNLOCKED');
      this.statusSystem.add('fever', 45000, 1);
      window.setTimeout(() => this.closeDiagnostic(), 950);
      return true;
    }, { clues: this.diagnosticSystem.getClues(), symptoms: this.diagnosticSystem.getObservedSymptoms(), note: this.diagnosticSystem.getNote() });
  }

  closeDiagnostic() {
    this.ui.closeDiagnostic();
    this.isOverlayOpen = false;
    if (this.scene.isPaused()) this.scene.resume();
  }

  openMedicine() {
    if (this.isOverlayOpen || !this.player || this.player.dead) return;
    this.isOverlayOpen = true;
    this.scene.pause();
    this.ui.openMedicine(
      this.medicineSystem.medicines,
      this.medicineSystem.selectedId,
      (id) => { this.medicineSystem.selectedId = id; },
      () => this.activateTreatment(),
      () => this.closeMedicine(),
      (id) => this.medicineSystem.canUse(id),
      (id) => this.medicineSystem.remaining(id)
    );
  }

  closeMedicine() {
    this.ui.closeMedicine();
    this.isOverlayOpen = false;
    if (this.scene.isPaused()) this.scene.resume();
  }

  activateTreatment() {
    const result = this.medicineSystem.useSelected();
    if (result) this.closeMedicine();
  }

  togglePause() {
    if (this.isOverlayOpen || !this.player || this.player.dead) return;
    this.isOverlayOpen = true;
    this.scene.pause();
    this.ui.showPause();
  }

  resumeGame() {
    this.ui.hidePause();
    this.isOverlayOpen = false;
    if (this.scene.isPaused()) this.scene.resume();
  }

  spawnEffect(x, y, color = 0xff6579, count = 8) {
    for (let i = 0; i < Math.min(count, 18); i++) {
      const dot = this.add.circle(x, y, Phaser.Math.FloatBetween(1.5, 4), color, .9).setDepth(800);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(25, 125);
      this.tweens.add({ targets: dot, x: x + Math.cos(angle) * speed * .35, y: y + Math.sin(angle) * speed * .35, alpha: 0, scale: .1, duration: Phaser.Math.Between(220, 480), onComplete: () => dot.destroy() });
    }
  }

  spawnBurst(x, y, color = 0xff6579, count = 16) {
    this.spawnEffect(x, y, color, count);
    this.spawnRing(x, y, color, 42);
  }

  spawnRing(x, y, color, radius = 140) {
    const ring = this.add.circle(x, y, 10, color, 0).setStrokeStyle(3, color, .75).setDepth(760);
    this.tweens.add({ targets: ring, radius, alpha: 0, duration: 520, onComplete: () => ring.destroy() });
  }

  spawnWave(x, y, facing) {
    const wave = this.add.ellipse(x + facing * 22, y, 34, 13, 0xe84962, .85).setDepth(720);
    this.tweens.add({ targets: wave, x: x + facing * 260, scaleX: 4.5, alpha: 0, duration: 520, onComplete: () => wave.destroy() });
  }

  floatingText(x, y, text, color = 0xffa7b2) {
    const label = this.add.text(x, y, text, { fontFamily: 'Consolas, monospace', fontSize: '13px', color: `#${color.toString(16).padStart(6, '0')}`, fontStyle: 'bold', stroke: '#180710', strokeThickness: 3 }).setOrigin(.5).setDepth(920);
    this.tweens.add({ targets: label, y: y - 36, alpha: 0, duration: 720, onComplete: () => label.destroy() });
  }

  onBossDefeated() {
    this.ui.setObjective('PATHOGEN CONTAINED');
    this.spawnBurst(this.boss.x, this.boss.y - 42, 0xffb5bd, 32);
    this.cameras.main.shake(500, .012);
    this.time.delayedCall(1000, () => this.endGame(true));
  }

  endGame(won) {
    if (this.endShown) return;
    this.endShown = true;
    this.isOverlayOpen = true;
    if (this.scene.isActive() && !this.scene.isPaused()) this.scene.pause();
    const stats = {
      elapsed: Math.round(this.elapsed),
      kills: this.enemyKills,
      damage: this.player.damageTaken
    };
    try {
      if (won) {
        const previous = Number(localStorage.getItem('bloodbound-best-kills') ?? 0);
        localStorage.setItem('bloodbound-best-kills', String(Math.max(previous, this.enemyKills)));
      }
      localStorage.setItem('bloodbound-last-result', JSON.stringify({ ...stats, won, at: Date.now() }));
    } catch { /* Storage can be disabled in private browsing. */ }
    this.ui.showHud(false);
    this.ui.showEnd(won, stats, () => window.restartBloodbound(), () => window.returnBloodboundToTitle());
  }

  update(_time, delta) {
    if (!this.player || this.player.dead || this.isOverlayOpen) return;
    this.elapsed += delta / 1000;
    this.player.update(delta, this.keys);
    for (const enemy of [...this.enemies]) enemy.update(delta);
    if (this.boss) this.boss.update(delta);
    this.medicineSystem.update(delta);
    this.ui.updatePlayer(this.player);
    if (this.boss) this.ui.updateBoss(this.boss);
    this.updateEnvironment(delta);
    this.updateHazards(delta);
    this.updateEffects(delta);
  }

  updateEnvironment(delta) {
    for (const cell of this.cells) {
      cell.graphic.x -= cell.speed * delta / 1000;
      cell.graphic.y = cell.startY + Math.sin((this.elapsed + cell.speed) * .65) * 12;
      if (cell.graphic.x < this.cameras.main.scrollX - 120) cell.graphic.x = this.cameras.main.scrollX + 1450;
    }
    this.flowLines.x -= delta * .055;
    if (this.flowLines.x < -150) this.flowLines.x = 0;
  }

  updateHazards(delta) {
    this.hazardCooldown = Math.max(0, this.hazardCooldown - delta);
    if (this.hazardCooldown > 0) return;
    const hazard = this.hazards.find((item) => this.player.x >= item.x && this.player.x <= item.x + item.width);
    if (hazard && this.player.bodySprite.body.blocked.down) {
      this.hazardCooldown = 1800;
      this.player.receiveDamage(5, 90, hazard.x + hazard.width / 2);
      this.ui.toast('CLOT SURGE // ENVIRONMENTAL DAMAGE');
    }
  }

  updateEffects(delta) {
    this.effects = this.effects.filter((effect) => {
      effect.life -= delta;
      if (effect.life <= 0) { effect.destroy?.(); return false; }
      return true;
    });
  }

  onShutdown() {
    this.input.keyboard.removeAllListeners();
    this.player?.destroy();
    for (const enemy of [...(this.enemies ?? [])]) enemy.destroy();
    this.boss?.destroy();
    this.ui.showHud(false);
    this.ui.hidePause();
    this.ui.closeMedicine();
    this.ui.closeDiagnostic();
    this.ui.hideEnd();
  }
}
