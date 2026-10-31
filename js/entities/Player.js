import Phaser from 'phaser';
import { CharacterSprite } from '../sprites/CharacterSprite.js';

const ATTACKS = {
  light: { name: 'LIGHT STRIKE', windup: 105, active: 115, recovery: 230, damage: 13, range: 83, knockback: 150, stagger: 300, stamina: 8, energyGain: 12, heavy: false },
  heavy: { name: 'HEAVY BREAKER', windup: 360, active: 145, recovery: 510, damage: 31, range: 108, knockback: 390, stagger: 650, stamina: 24, energyGain: 20, heavy: true },
  special: { name: 'CRIMSON SURGE', windup: 170, active: 200, recovery: 620, damage: 48, range: 174, knockback: 520, stagger: 850, stamina: 0, energyGain: 0, heavy: true }
};

export class Player {
  constructor(scene, x, groundY) {
    this.scene = scene;
    this.groundY = groundY;
    this.bodySprite = scene.physics.add.sprite(x, groundY - 38, 'solid');
    this.bodySprite.setAlpha(0.001).setSize(31, 74).setCollideWorldBounds(true);
    this.bodySprite.setMaxVelocity(520, 900);
    this.bodySprite.body.setDrag(1800, 0);
    this.bodySprite.body.setMass(1.3);
    this.visual = new CharacterSprite(scene, 'player');
    this.x = x;
    this.y = groundY - 38;
    this.facing = 1;
    this.health = 100;
    this.maxHealth = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.energy = 0;
    this.dead = false;
    this.invulnerableUntil = 0;
    this.dodgeVisualUntil = 0;
    this.hurtUntil = 0;
    this.attack = null;
    this.attackCombo = 0;
    this.attackLock = 0;
    this.dodgeUntil = 0;
    this.blocking = false;
    this.statusReliefFlash = 0;
    this.damageTaken = 0;
    this.restTimer = 0;
  }

  get sprite() { return this.bodySprite; }

  startAttack(kind) {
    if (this.dead || this.attack || this.scene.time.now < this.attackLock || this.blocking || this.scene.isOverlayOpen) return;
    const base = ATTACKS[kind];
    if (!base) return;
    if (kind === 'special' && this.energy < 35) return this.scene.ui.toast('BIOLOGICAL ENERGY BELOW THRESHOLD');
    const staminaCost = base.stamina * (this.scene.statusSystem.has('dehydration') ? 1.35 : 1);
    if (kind !== 'special' && this.stamina < staminaCost) return this.scene.ui.toast('INSUFFICIENT STAMINA');
    if (kind === 'special') this.energy -= 35;
    else this.stamina -= staminaCost;
    const comboScale = kind === 'light' ? 1 + (this.attackCombo % 3) * .11 : 1;
    if (kind === 'light') this.attackCombo++;
    this.attack = { ...base, kind, elapsed: 0, hit: new Set(), damage: base.damage * comboScale, phase: 'windup' };
    this.attackLock = this.scene.time.now + base.windup + base.active + base.recovery;
    this.scene.events.emit('combat-feedback', base.name);
  }

  startDodge() {
    if (this.dead || this.attack || this.blocking || this.scene.isOverlayOpen || this.scene.time.now < this.dodgeUntil || this.stamina < 24) return;
    this.stamina -= 24;
    this.invulnerableUntil = this.scene.time.now + 390;
    this.dodgeVisualUntil = this.scene.time.now + 300;
    this.dodgeUntil = this.scene.time.now + 880;
    this.bodySprite.setVelocityX(this.facing * 490);
    this.scene.spawnEffect(this.x, this.y, 0x8de5dc, 28);
  }

  update(delta, keys) {
    if (this.dead) return;
    const now = this.scene.time.now;
    const status = this.scene.statusSystem;
    this.x = this.bodySprite.x;
    this.y = this.bodySprite.y;
    this.blocking = keys.block.isDown && !this.attack && now >= this.dodgeUntil && !this.scene.isOverlayOpen;
    const dodging = now < this.invulnerableUntil;
    if (this.statusReliefFlash > 0) this.statusReliefFlash -= delta;

    if (this.attack) {
      const attack = this.attack;
      attack.elapsed += delta;
      if (attack.elapsed >= attack.windup && attack.phase === 'windup') {
        attack.phase = 'active';
        if (attack.kind === 'special') this.scene.cameras.main.shake(120, .005);
        else if (attack.kind === 'heavy') this.scene.cameras.main.shake(95, .0028);
      }
      if (attack.phase === 'active' && attack.elapsed <= attack.windup + attack.active && !attack.resolved) {
        attack.resolved = true;
        const targets = [...this.scene.enemies, ...(this.scene.boss && !this.scene.boss.dead ? [this.scene.boss] : [])];
        for (const target of targets) this.scene.combat.resolvePlayerHit(this, attack, target);
        if (attack.kind === 'special') this.scene.spawnBurst(this.x + this.facing * 40, this.y - 18, 0xff536d, 22);
      }
      if (attack.phase === 'active' && attack.elapsed >= attack.windup + attack.active) attack.phase = 'recover';
      if (attack.elapsed >= attack.windup + attack.active + attack.recovery) this.attack = null;
    }

    if (!this.attack && !this.blocking && !this.scene.isOverlayOpen && !dodging) {
      if (Phaser.Input.Keyboard.JustDown(keys.light)) this.startAttack('light');
      else if (Phaser.Input.Keyboard.JustDown(keys.heavy)) this.startAttack('heavy');
      else if (Phaser.Input.Keyboard.JustDown(keys.special)) this.startAttack('special');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.dodge)) this.startDodge();
    if (Phaser.Input.Keyboard.JustDown(keys.jump) && this.bodySprite.body.blocked.down && !this.attack && !this.blocking) {
      this.bodySprite.setVelocityY(-450);
    }

    if (this.scene.isOverlayOpen) {
      this.bodySprite.setVelocityX(0);
    } else if (this.attack) {
      this.bodySprite.setVelocityX(this.bodySprite.body.velocity.x * .82);
    } else if (dodging) {
      // Dodge impulse owns horizontal movement during its invulnerability window.
    } else if (this.blocking) {
      this.bodySprite.setVelocityX(0);
      this.stamina = Math.max(0, this.stamina - delta * .009);
    } else {
      const left = keys.left.isDown;
      const right = keys.right.isDown;
      const direction = Number(right) - Number(left);
      if (direction !== 0) this.facing = direction;
      let speed = 250;
      if (status.has('fever')) speed *= .82;
      if (status.has('fatigue')) speed *= .9;
      if (status.has('dehydration')) speed *= .92;
      this.bodySprite.setVelocityX(direction * speed);
      const regen = status.has('fatigue') ? 0.006 : 0.019;
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * regen);
    }

    if (!this.blocking && !this.attack && !dodging && status.has('dehydration')) this.stamina = Math.max(0, this.stamina - delta * .0015);
    this.maxStamina = status.has('fatigue') ? 78 : 100;
    this.stamina = Math.min(this.stamina, this.maxStamina);
    this.maxHealth = status.has('anaemia') ? 85 : 100;
    this.health = Math.min(this.health, this.maxHealth);
    if (status.has('fatigue') && Math.abs(this.bodySprite.body.velocity.x) < 8 && !this.attack && !this.blocking && this.bodySprite.body.blocked.down) {
      this.restTimer += delta;
      if (this.restTimer >= 4000) {
        this.restTimer = 0;
        status.reduce('fatigue', 1);
        this.scene.ui.toast('REST RECOVERY // FATIGUE REDUCED');
      }
    } else { this.restTimer = 0; }
    this.scene.statusSystem.update(delta);
    this.x = this.bodySprite.x;
    this.y = this.bodySprite.y;
    this.renderSprite(delta);
  }

  receiveDamage(amount, knockback = 0, attackerX = this.x) {
    if (this.dead || this.scene.time.now < this.invulnerableUntil) return false;
    let damage = amount;
    if (this.blocking && Math.sign(attackerX - this.x || 1) === this.facing && this.stamina >= 8) {
      damage *= .18;
      this.stamina = Math.max(0, this.stamina - 8);
      this.scene.spawnEffect(this.x + this.facing * 23, this.y - 30, 0x8de5dc, 6);
    } else {
      this.bodySprite.setVelocityX(Math.sign(this.x - attackerX || 1) * knockback);
      this.invulnerableUntil = this.scene.time.now + 420;
      this.hurtUntil = this.scene.time.now + 190;
      this.scene.cameras.main.shake(85, .0025);
    }
    this.health = Math.max(0, this.health - damage);
    this.damageTaken += damage;
    this.scene.floatingText(this.x, this.y - 65, `-${Math.round(damage)}`, 0xff6678);
    this.scene.events.emit('player-damaged');
    if (this.health <= 0) {
      this.dead = true;
      this.bodySprite.setVelocity(0, 0);
      this.visual.playDeath();
      // Let the pathogen's death pose play before showing the defeat screen.
      this.scene.time.delayedCall(650, () => this.scene.endGame(false));
    }
    return true;
  }

  renderSprite(delta = 16.7) {
    const now = this.scene.time.now;
    const body = this.bodySprite.body;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const grounded = body.blocked.down;
    let action = 'idle';
    let t = 0;
    let power = 1;
    let lunge = 20;

    if (this.attack) {
      const attack = this.attack;
      power = attack.heavy ? 1.35 : 1;
      lunge = attack.kind === 'special' ? 38 : attack.kind === 'heavy' ? 30 : 20;
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
    } else if (this.blocking) {
      action = 'block';
    } else if (now < this.dodgeVisualUntil) {
      action = 'dodge';
    } else if (now < this.hurtUntil) {
      action = 'hurt';
    } else if (!grounded) {
      action = 'air';
    } else if (Math.abs(vx) > 12) {
      action = 'run';
    }

    this.visual.render({
      x: this.bodySprite.x,
      y: this.bodySprite.y,
      facing: this.facing,
      vx,
      vy,
      grounded,
      action,
      t,
      power,
      lunge,
      delta,
      flash: now < this.invulnerableUntil && Math.floor(now / 65) % 2 === 0 || this.statusReliefFlash > 0,
      blink: now < this.invulnerableUntil,
      depth: this.bodySprite.y + 4
    });

    if (this.blocking) this.visual.guardArc(this.facing);
  }

  destroy() { this.visual?.destroy(); this.bodySprite?.destroy(); }
}
