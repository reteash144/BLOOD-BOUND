import Phaser from 'phaser';
import { Enemy } from './Enemy.js';

export class MalariaBoss extends Enemy {
  constructor(scene, x, groundY) {
    super(scene, x, groundY, 'brute', 'boss');
    this.type = 'boss';
    this.name = 'MALARIA // THE BLOOD REAVER';
    this.isBoss = true;
    this.maxHealth = 620;
    this.health = 620;
    this.attackCooldown = 1500;
    this.attackIndex = 0;
    this.phase = 1;
    this.currentAction = null;
    this.weakenedUntil = 0;
    this.summonCount = 0;
    this.gfx.setDepth(25);
    this.scene.events.emit('boss-phase', this.phase);
  }

  update(delta) {
    if (this.dead) {
      super.update(delta);
      return;
    }
    const player = this.scene.player;
    const dx = player.x - this.x;
    const distance = Math.abs(dx);
    this.facing = dx >= 0 ? 1 : -1;
    this.updatePhase();
    if (this.scene.time.now < this.staggerUntil) {
      this.bodySprite.setVelocityX(this.bodySprite.body.velocity.x * .86);
      this.drawBoss();
      return;
    }

    if (this.currentAction) {
      this.updateBossAction(delta, dx, distance);
    } else if (distance > 175) {
      this.state = 'approach';
      this.bodySprite.setVelocityX(this.facing * (this.phase === 3 ? 115 : 78));
    } else {
      this.bodySprite.setVelocityX(0);
      this.attackCooldown -= delta;
      if (this.attackCooldown <= 0) this.chooseAttack();
    }
    this.drawBoss();
  }

  updatePhase() {
    const next = this.health <= this.maxHealth * .35 ? 3 : this.health <= this.maxHealth * .70 ? 2 : 1;
    if (next !== this.phase) {
      this.phase = next;
      this.scene.events.emit('boss-phase', this.phase);
      this.scene.ui.toast(`BLOOD REAVER // PHASE ${this.phase}`);
      this.scene.cameras.main.shake(300, .008);
      this.scene.spawnBurst(this.x, this.y - 42, 0xd52d50, 30);
      if (this.phase === 2) this.scene.statusSystem.add('dehydration', 52000, 2);
      if (this.phase === 3) this.scene.statusSystem.add('fatigue', 60000, 1);
    }
  }

  chooseAttack() {
    const patterns = this.phase === 1
      ? ['slash', 'infiltration', 'summon']
      : this.phase === 2
        ? ['fever', 'rupture', 'slash', 'summon']
        : ['slash', 'rupture', 'infiltration', 'fever'];
    const type = patterns[this.attackIndex % patterns.length];
    this.attackIndex++;
    this.beginBossAction(type);
  }

  beginBossAction(type) {
    if (!this.scene.reserveEnemyAttack(this)) {
      this.attackCooldown = 450;
      return;
    }
    const phaseSpeed = this.phase === 3 ? .72 : this.phase === 2 ? .88 : 1;
    const timings = {
      slash: { telegraph: 610 * phaseSpeed, active: 170, recovery: 900 * phaseSpeed },
      infiltration: { telegraph: 750 * phaseSpeed, active: 200, recovery: 1050 * phaseSpeed },
      summon: { telegraph: 900, active: 180, recovery: 1150 },
      fever: { telegraph: 980 * phaseSpeed, active: 230, recovery: 1200 * phaseSpeed },
      rupture: { telegraph: 1050 * phaseSpeed, active: 250, recovery: 1350 * phaseSpeed }
    };
    this.currentAction = { type, elapsed: 0, ...timings[type], resolved: false };
    this.state = 'attack';
    this.bodySprite.setVelocityX(0);
    this.scene.events.emit('boss-telegraph', type);
    this.scene.spawnEffect(this.x, this.y - 45, type === 'fever' ? 0xffb34f : 0xe83e5b, 12);
  }

  updateBossAction(delta, dx, distance) {
    const action = this.currentAction;
    action.elapsed += delta;
    if (action.elapsed >= action.telegraph && !action.resolved) {
      action.resolved = true;
      this.executeBossAction(action.type, dx, distance);
    }
    if (action.elapsed >= action.telegraph + action.active + action.recovery) {
      this.currentAction = null;
      this.attackCooldown = (this.phase === 3 ? 1050 : this.phase === 2 ? 1450 : 2050) + Math.random() * 250;
      this.scene.releaseEnemyAttack(this);
      this.state = 'recover';
    }
  }

  playerInFrontHitbox(reach, height = 78) {
    const player = this.scene.player;
    const hitbox = new Phaser.Geom.Rectangle(this.x + (this.facing > 0 ? 10 : -reach - 10), this.y - height / 2, reach, height);
    const hurtbox = new Phaser.Geom.Rectangle(player.x - 16, player.y - 37, 32, 74);
    return Phaser.Geom.Intersects.RectangleToRectangle(hitbox, hurtbox);
  }

  executeBossAction(type, dx, distance) {
    const player = this.scene.player;
    if (type === 'slash') {
      if (this.playerInFrontHitbox(178, 92)) {
        player.receiveDamage(this.phase === 3 ? 25 : 20, 310, this.x);
        this.scene.spawnBurst(player.x, player.y - 24, 0xf04a63, 13);
      }
      this.scene.cameras.main.shake(110, .003);
    } else if (type === 'infiltration') {
      this.scene.spawnEffect(this.x, this.y - 30, 0xe74762, 25);
      this.bodySprite.setVelocityX(this.facing * (this.phase === 3 ? 510 : 390));
      if (this.playerInFrontHitbox(310, 100)) {
        player.receiveDamage(this.phase === 3 ? 24 : 18, 360, this.x);
      }
      this.scene.cameras.main.shake(140, .004);
    } else if (type === 'fever') {
      this.scene.spawnRing(this.x, this.y - 30, 0xffa64e, 180);
      if (Math.abs(player.x - this.x) < 330) {
        player.receiveDamage(this.phase === 3 ? 15 : 11, 170, this.x);
        this.scene.statusSystem.add('fever', 47000, this.phase === 3 ? 2 : 1);
      }
    } else if (type === 'rupture') {
      this.scene.spawnWave(this.x, this.y + 27, this.facing);
      if (this.playerInFrontHitbox(430, 72)) {
        player.receiveDamage(this.phase === 3 ? 28 : 22, 410, this.x);
        this.scene.statusSystem.add('anaemia', 80000, 1);
      }
      this.scene.cameras.main.shake(220, .006);
    } else if (type === 'summon') {
      this.summonCount++;
      this.scene.spawnEnemy('scout', this.x - 95, true);
      this.scene.spawnEnemy('assassin', this.x + 100, true);
      this.scene.ui.toast('BLOOD CELL INFILTRATION // PARASITES DEPLOYED');
    }
  }

  takeDamage(amount, knockback = 0, stagger = 250, bypassCooldown = false) {
    if (this.dead || (!bypassCooldown && this.hitCooldown > 0)) return false;
    this.hitCooldown = bypassCooldown ? 0 : 120;
    const weakened = this.scene.time.now < this.weakenedUntil ? 1.4 : 1;
    const actual = amount * weakened;
    this.health = Math.max(0, this.health - actual);
    if (stagger >= 600 && this.currentAction) {
      this.currentAction = null;
      this.scene.releaseEnemyAttack(this);
    }
    this.staggerUntil = this.scene.time.now + stagger;
    this.bodySprite.setVelocityX(knockback * .7);
    this.flashUntil = this.scene.time.now + 120;
    this.scene.floatingText(this.x, this.y - 90, `${Math.round(actual)}`, 0xffaabb);
    this.scene.spawnBurst(this.x, this.y - 35, 0xed4160, 13);
    this.updatePhase();
    this.scene.events.emit('boss-health', this.health / this.maxHealth);
    if (this.health <= 0) {
      this.dead = true;
      this.state = 'death';
      this.visual.playDeath();
      this.bodySprite.setVelocity(0, -150);
      this.scene.releaseEnemyAttack(this);
      this.scene.onBossDefeated();
    }
    return true;
  }

  drawBoss() {
    const body = this.bodySprite.body;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const grounded = body.blocked.down;
    const now = this.scene.time.now;
    let action = 'idle';
    let t = 0;
    let lunge = 42;

    if (now < this.staggerUntil) {
      action = 'hurt';
    } else if (this.currentAction) {
      const current = this.currentAction;
      if (current.elapsed < current.telegraph) {
        action = 'windup';
        t = current.telegraph ? current.elapsed / current.telegraph : 1;
      } else if (current.elapsed < current.telegraph + current.active) {
        action = 'strike';
        t = current.active ? (current.elapsed - current.telegraph) / current.active : 1;
      } else {
        action = 'recover';
        t = current.recovery
          ? (current.elapsed - current.telegraph - current.active) / current.recovery
          : 1;
      }
      if (current.type === 'infiltration') lunge = 62;
      else if (current.type === 'rupture') lunge = 54;
    } else if (!grounded) {
      action = 'air';
    } else if (Math.abs(vx) > 10) {
      action = 'run';
    } else if (this.state === 'recover') {
      action = 'recover';
      t = 0.8;
    }

    this.visual.render({
      x: this.x,
      y: this.y,
      facing: this.facing,
      vx,
      vy,
      grounded,
      action,
      t,
      lunge,
      power: this.phase === 3 ? 1.55 : this.phase === 2 ? 1.35 : 1.2,
      delta: this.scene.game?.loop?.delta ?? 16.7,
      flash: now < this.flashUntil,
      depth: this.y + 6
    });

    this.gfx.clear().setPosition(this.x, this.y).setDepth(this.y + 9).setAlpha(1);
    const centerY = this.visual.centerY;
    const topY = this.visual.topY;

    // Crown-like pathogen filaments sit above the sprite silhouette.
    this.gfx.lineStyle(4, 0x9e1f3a, 0.9);
    this.gfx.beginPath().moveTo(-12, topY + 14).lineTo(-34, topY - 10).lineTo(-26, topY + 24).strokePath();
    this.gfx.beginPath().moveTo(10, topY + 14).lineTo(32, topY - 15).lineTo(25, topY + 23).strokePath();
    this.gfx.lineStyle(2, 0xff647b, 0.7)
      .strokeCircle(0, centerY, Math.max(this.visual.halfW, this.visual.halfH) * 0.72);

    if (this.currentAction) {
      const radius = this.currentAction.type === 'fever'
        ? 135
        : this.currentAction.type === 'rupture' ? 90 : 58;
      const pulse = 1 + Math.sin(this.currentAction.elapsed / 75) * 0.09;
      this.gfx.lineStyle(3, 0xff6a7b, 0.75)
        .strokeCircle(0, centerY, radius * pulse);
    }

    const barW = Math.max(96, this.visual.halfW * 1.35);
    const barY = topY - 20;
    this.gfx.fillStyle(0x14060b, 0.92).fillRoundedRect(-barW / 2, barY, barW, 6, 3);
    this.gfx.fillStyle(0xd52d50, 1).fillRoundedRect(-barW / 2, barY, barW * (this.health / this.maxHealth), 6, 3);
  }

}
