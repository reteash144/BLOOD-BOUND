import Phaser from 'phaser';

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.damageScale = 1;
  }

  resolvePlayerHit(player, attack, target) {
    if (!target || target.dead || target.hitCooldown > 0) return false;
    const width = attack.range;
    const hitbox = new Phaser.Geom.Rectangle(
      player.x + (player.facing > 0 ? 10 : -width - 10),
      player.y - 37,
      width,
      74
    );
    const hurtWidth = target.isBoss ? 60 : 34;
    const hurtHeight = target.isBoss ? 94 : 76;
    const hurtbox = new Phaser.Geom.Rectangle(
      target.x - hurtWidth / 2,
      target.y - hurtHeight / 2,
      hurtWidth,
      hurtHeight
    );
    if (!Phaser.Geom.Intersects.RectangleToRectangle(hitbox, hurtbox)) return false;
    target.takeDamage(attack.damage * this.damageScale, player.facing * attack.knockback, attack.stagger);
    player.energy = Math.min(100, player.energy + attack.energyGain);
    this.scene.events.emit('player-hit', { target, attack, hitbox, hurtbox });
    return true;
  }
}
