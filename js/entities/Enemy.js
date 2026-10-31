import Phaser from 'phaser';
import { CharacterSprite } from '../sprites/CharacterSprite.js';

export const ENEMY_TYPES = {
  scout: { name: 'PARASITE SCOUT', hp: 48, speed: 118, range: 76, damage: 9, windup: 260, active: 135, recovery: 560, cooldown: 1250, knockback: 115, color: 0x92213a },
  assassin: { name: 'PARASITE ASSASSIN', hp: 58, speed: 145, range: 110, damage: 13, windup: 420, active: 160, recovery: 650, cooldown: 1650, knockback: 180, color: 0x65152e },
  brute: { name: 'PARASITE BRUTE', hp: 115, speed: 70, range: 86, damage: 22, windup: 760, active: 180, recovery: 1050, cooldown: 2200, knockback: 290, color: 0x9b3c36 }
};

export class Enemy {
  constructor(scene, x, groundY, type = 'scout', spriteRole = type) {
    this.scene = scene;
    this.type = type;
    this.config = ENEMY_TYPES[type];
    this.name = this.config.name;
    this.maxHealth = this.config.hp;
    this.health = this.maxHealth;
    this.bodySprite = scene.physics.add.sprite(x, groundY - 38, 'solid');
    this.bodySprite.setAlpha(0.001).setSize(31, 74).setCollideWorldBounds(true);
    this.bodySprite.setMaxVelocity(430, 900);
    this.bodySprite.body.setDrag(950, 0);
    this.visual = new CharacterSprite(scene, spriteRole);
    this.gfx = scene.add.graphics().setDepth(18);
    this.facing = -1;
    this.state = 'idle';
    this.stateTimer = 0;
    this.cooldown = 600 + Math.random() * 500;
    this.hitCooldown = 0;
    this.staggerUntil = 0;
    this.attack = null;
    this.dead = false;
    this.deathTimer = 600;
    this.spawnIndex = scene.enemySerial++;
    this.flashUntil = 0;
    this.isBoss = false;
  }

  get x() { return this.bodySprite.x; }
  get y() { return this.bodySprite.y; }

  update(delta) {
    if (this.dead) {
      this.deathTimer -= delta;
      this.bodySprite.setVelocityX(this.bodySprite.body.velocity.x * .86);
      const life = Math.max(0, this.deathTimer / 600);
      this.visual.renderDeath(this.x, this.y, life, this.y + 4);
      this.gfx.clear().setPosition(this.x, this.y).setDepth(this.y + 5).setAlpha(life);
      if (this.deathTimer <= 0) this.destroy();
      return;
    }
    this.cooldown -= delta;
    this.hitCooldown = Math.max(0, this.hitCooldown - delta);
    if (this.scene.time.now < this.staggerUntil) {
      this.state = 'hit';
      this.bodySprite.setVelocityX(this.bodySprite.body.velocity.x * .82);
      this.draw();
      return;
    }
    const player = this.scene.player;
    if (!player || player.dead) return;
    const dx = player.x - this.x;
    const distance = Math.abs(dx);
    this.facing = dx >= 0 ? 1 : -1;

    if (this.attack) {
      this.updateAttack(delta, dx);
    } else if (distance > 780) {
      this.state = 'patrol';
      this.bodySprite.setVelocityX(Math.sin(this.scene.time.now / 700 + this.spawnIndex) * 35);
    } else if (this.state === 'patrol' && distance <= 780) {
      this.state = 'detect';
      this.stateTimer = 180;
      this.bodySprite.setVelocityX(0);
    } else if (this.state === 'detect' && this.stateTimer > 0) {
      this.stateTimer -= delta;
      this.bodySprite.setVelocityX(0);
    } else if (distance > this.config.range * .84) {
      this.state = 'approach';
      this.bodySprite.setVelocityX(this.facing * this.config.speed);
    } else if (this.cooldown <= 0 && this.scene.reserveEnemyAttack(this)) {
      this.beginAttack();
    } else if (this.type === 'assassin' && distance < 69 && this.cooldown > 500) {
      this.state = 'retreat';
      this.bodySprite.setVelocityX(-this.facing * 90);
    } else {
      this.state = 'idle';
      this.bodySprite.setVelocityX(this.bodySprite.body.velocity.x * .72);
    }

    this.applySeparation();
    this.draw();
  }

  beginAttack() {
    const isAssassin = this.type === 'assassin';
    this.attack = {
      elapsed: 0,
      phase: 'windup',
      windup: this.config.windup,
      active: this.config.active,
      recovery: this.config.recovery,
      resolved: false
    };
    this.state = 'attack';
    this.bodySprite.setVelocityX(0);
    if (isAssassin) this.scene.spawnEffect(this.x, this.y - 25, 0x9d3154, 8);
  }

  updateAttack(delta, dx) {
    const attack = this.attack;
    attack.elapsed += delta;
    if (attack.elapsed >= attack.windup && attack.phase === 'windup') {
      attack.phase = 'active';
      if (this.type === 'assassin') this.bodySprite.setVelocityX(this.facing * 270);
      if (this.type === 'brute') this.scene.cameras.main.shake(100, .002);
    }
    if (attack.phase === 'active' && !attack.resolved) {
      attack.resolved = true;
      const reach = this.config.range + (this.type === 'assassin' ? 35 : 0);
      const attackBox = new Phaser.Geom.Rectangle(
        this.x + (this.facing > 0 ? 8 : -reach - 8), this.y - 36, reach, 72
      );
      const playerHurtbox = new Phaser.Geom.Rectangle(
        this.scene.player.x - 16, this.scene.player.y - 37, 32, 74
      );
      if (Phaser.Geom.Intersects.RectangleToRectangle(attackBox, playerHurtbox)) {
        this.scene.player.receiveDamage(this.config.damage, this.config.knockback, this.x);
        this.scene.spawnBurst(this.scene.player.x, this.scene.player.y - 24, this.config.color, 8);
      }
    }
    if (attack.phase === 'active' && attack.elapsed >= attack.windup + attack.active) {
      attack.phase = 'recover';
    }
    if (attack.elapsed >= attack.windup + attack.active + attack.recovery) {
      this.attack = null;
      this.cooldown = this.config.cooldown;
      this.state = 'recover';
      this.scene.releaseEnemyAttack(this);
    }
  }

  applySeparation() {
    for (const other of this.scene.enemies) {
      if (other === this || other.dead || other.isBoss) continue;
      const dx = this.x - other.x;
      if (Math.abs(dx) < 55) {
        const direction = dx === 0 ? (this.spawnIndex % 2 === 0 ? -1 : 1) : Math.sign(dx);
        this.bodySprite.x += direction * Math.max(.7, (55 - Math.abs(dx)) * .12);
      }
    }
  }

  takeDamage(amount, knockback = 0, stagger = 280) {
    if (this.dead || this.hitCooldown > 0) return false;
    this.hitCooldown = 150;
    this.health = Math.max(0, this.health - amount);
    this.attack = null;
    this.scene.releaseEnemyAttack(this);
    this.staggerUntil = this.scene.time.now + stagger;
    this.state = 'hit';
    this.bodySprite.setVelocityX(knockback);
    this.flashUntil = this.scene.time.now + 100;
    this.scene.floatingText(this.x, this.y - 65, `${Math.round(amount)}`, 0xffb4be);
    this.scene.spawnEffect(this.x, this.y - 25, 0xff667a, 9);
    if (this.health <= 0) {
      this.dead = true;
      this.state = 'death';
      this.visual.playDeath();
      this.bodySprite.setVelocity(0, -90);
      this.scene.releaseEnemyAttack(this);
      this.scene.onEnemyDefeated(this);
    }
    return true;
  }

  draw() {
    const body = this.bodySprite.body;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const grounded = body.blocked.down;
    const now = this.scene.time.now;
    let action = 'idle';
    let t = 0;
    let lunge = 20;

    if (this.attack) {
      const attack = this.attack;
      if (attack.phase === 'windup') {
        action = 'windup';
        t = attack.windup ? attack.elapsed / attack.windup : 1;
      } else if (attack.phase === 'active') {
        action = 'strike';
        t = attack.active ? (attack.elapsed - attack.windup) / attack.active : 1;
      } else {
        action = 'recover';
        t = attack.recovery ? (attack.elapsed - attack.windup - attack.active) / attack.recovery : 1;
      }
      lunge = this.type === 'assassin' ? 34 : this.type === 'brute' ? 28 : 20;
    } else if (now < this.staggerUntil) {
      action = 'hurt';
    } else if (this.state === 'detect') {
      action = 'alert';
      t = 0.5;
    } else if (!grounded) {
      action = 'air';
    } else if (Math.abs(vx) > 10 || this.state === 'retreat' || this.state === 'approach' || this.state === 'patrol') {
      action = 'run';
    } else if (this.state === 'recover') {
      action = 'recover';
      t = 0.75;
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
      power: this.type === 'brute' ? 1.25 : 1,
      delta: this.scene.game?.loop?.delta ?? 16.7,
      flash: now < this.flashUntil,
      depth: this.y + 4
    });

    this.gfx.clear().setPosition(this.x, this.y).setDepth(this.y + 6).setAlpha(1);
    if (!this.dead) {
      const barW = this.type === 'brute' ? 58 : 48;
      const barY = this.visual.topY - 13;
      this.gfx.fillStyle(0x15070d, 0.9).fillRect(-barW / 2, barY, barW, 4);
      this.gfx.fillStyle(this.config.color, 1)
        .fillRect(-barW / 2, barY, barW * (this.health / this.maxHealth), 4);
      if (this.attack?.phase === 'windup') {
        const radius = Math.max(this.visual.halfW, this.visual.halfH) * 0.78;
        this.gfx.lineStyle(2, 0xff6479, 0.85)
          .strokeCircle(0, this.visual.centerY, radius + Math.sin(this.attack.elapsed / 45) * 2);
      }
    }
  }

  destroy() {
    this.visual?.destroy();
    if (this.gfx && this.gfx.active) this.gfx.destroy();
    if (this.bodySprite && this.bodySprite.active) this.bodySprite.destroy();
    this.scene.removeEnemyReference(this);
  }
}
