import { SPRITE_SHEET, PATHOGENS, ROLE_SPRITES, animKey, frameIndex } from './spriteConfig.js';

// Visual layer shared by Player, Enemy and MalariaBoss. Physics stays on each entity's
// invisible Arcade body; this class owns only the animated art and its visual effects.
//
// render({ x, y, facing, vx, vy, grounded, action, t, lunge, power, flash, tint, alpha, blink, depth })
// action: idle | run | air | alert | windup | strike | recover | block | dodge | hurt
// x/y: centre of the physics body. The sprite is automatically anchored to the floor.

const FOOT = 37; // Physics body is 74px tall; its centre is 37px above the feet.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const easeOut = (value) => 1 - (1 - value) * (1 - value);

export class CharacterSprite {
  constructor(scene, role) {
    const definition = ROLE_SPRITES[role];
    if (!definition) throw new Error(`[CharacterSprite] Unknown sprite role "${role}"`);
    if (!scene.textures.exists(SPRITE_SHEET.key)) {
      throw new Error(`[CharacterSprite] Texture "${SPRITE_SHEET.key}" was not loaded before entity creation`);
    }

    const art = PATHOGENS[definition.pathogen];
    this.scene = scene;
    this.role = role;
    this.pathogen = definition.pathogen;
    this.baseScale = definition.scale;
    this.halfH = (art.bodyHeight * definition.scale) / 2;
    this.halfW = (art.bodyWidth * definition.scale) / 2;
    this.centerY = FOOT - this.halfH;
    this.topY = this.centerY - this.halfH;
    this.sprite = scene.add.sprite(0, 0, SPRITE_SHEET.key, frameIndex(this.pathogen, 'idle1'))
      .setScale(this.baseScale);
    this.fx = scene.add.graphics();
    this.anim = null;
    this.idlePhase = Math.random() * Math.PI * 2;
    this.runPhase = Math.random() * Math.PI * 2;
    this.landSquash = 0;
    this.wasGrounded = true;
    this.lastGhost = 0;
    this.ghostTint = 0x8de5dc;
    this.dying = false;
    this.play('idle');
  }

  play(state, restart = false) {
    if (this.anim === state && !restart) return;
    this.anim = state;
    this.sprite.play(animKey(this.pathogen, state));
    this.sprite.anims.timeScale = 1;
  }

  setDepth(depth) {
    this.sprite.setDepth(depth);
    this.fx.setDepth(depth + 1);
  }

  render(p) {
    if (this.dying || !this.sprite.active) return;
    const now = this.scene.time.now;
    const delta = p.delta ?? 16.7;
    const facing = p.facing >= 0 ? 1 : -1;
    const grounded = p.grounded ?? true;
    const power = p.power ?? 1;
    const lunge = p.lunge ?? 20;
    const t = clamp(p.t ?? 0, 0, 1);
    let action = p.action ?? 'idle';
    let state = 'idle';
    let sx = 1, sy = 1, rotation = 0, ox = 0, oy = 0;
    let alpha = p.alpha ?? 1;
    let timeScale = 1;

    this.idlePhase += delta * 0.006;
    if (grounded && !this.wasGrounded) this.landSquash = 1;
    this.wasGrounded = grounded;
    this.landSquash = Math.max(0, this.landSquash - delta / 130);

    if (action === 'air') action = (p.vy ?? 0) < 0 ? 'jump' : 'fall';

    switch (action) {
      case 'run': {
        const speed = clamp(Math.abs(p.vx ?? 0) / 250, 0.35, 1.6);
        this.runPhase += delta * 0.011 * speed;
        const hop = Math.abs(Math.sin(this.runPhase));
        const lean = Math.sign(p.vx || facing);
        state = 'run';
        timeScale = speed;
        oy = -hop * 6;
        sy = 1 + (hop - 0.5) * 0.1;
        sx = 1 - (hop - 0.5) * 0.08;
        rotation = lean * 0.11 + Math.sin(this.runPhase) * 0.05;
        break;
      }
      case 'jump':
        state = 'jump'; sx = 0.92; sy = 1.12; rotation = facing * 0.08;
        break;
      case 'fall':
        state = 'fall'; sx = 0.97; sy = 1.05; rotation = facing * 0.04;
        break;
      case 'alert':
        state = 'idle'; sx = 1 + 0.12 * (1 - t); sy = 1 - 0.08 * (1 - t);
        break;
      case 'windup': {
        const charge = easeOut(t) * power;
        state = 'windup';
        sx = 1 + 0.10 * charge; sy = 1 - 0.12 * charge;
        ox = -facing * 10 * charge;
        rotation = -facing * 0.08 * Math.min(charge, 1.4);
        break;
      }
      case 'strike':
        state = 'strike';
        ox = facing * lunge * easeOut(t);
        sx = 1.08 + 0.06 * power; sy = 0.94;
        rotation = facing * 0.06;
        break;
      case 'recover':
        state = 'recover';
        ox = facing * lunge * 0.6 * (1 - easeOut(t));
        sx = 1 + 0.05 * (1 - t); sy = 1 - 0.05 * (1 - t);
        break;
      case 'block':
        state = 'block'; sx = 0.94; sy = 1.05; ox = -facing * 4;
        break;
      case 'dodge':
        state = 'dodge'; sx = 1.25; sy = 0.78; rotation = facing * 0.1; alpha *= 0.86;
        if (now - this.lastGhost > 55) {
          this.lastGhost = now;
          this.spawnGhost();
        }
        break;
      case 'hurt':
        state = 'hurt';
        ox = -facing * 7 + Math.sin(now / 20) * 3;
        sx = 0.92; sy = 1.1; rotation = -facing * 0.12;
        break;
      default: {
        const breathe = Math.sin(this.idlePhase);
        sx = 1 + breathe * 0.025;
        sy = 1 - breathe * 0.025;
        oy = Math.sin(this.idlePhase * 0.7) * 2;
      }
    }

    if (grounded && this.landSquash > 0) {
      sx *= 1 + 0.14 * this.landSquash;
      sy *= 1 - 0.16 * this.landSquash;
    }

    this.play(state);
    this.sprite.anims.timeScale = timeScale;

    const sprite = this.sprite;
    sprite.setPosition(p.x + ox, p.y + this.centerY + oy);
    sprite.setScale(this.baseScale * sx, this.baseScale * sy);
    sprite.setRotation(rotation);
    sprite.setFlipX(facing < 0);
    if (p.blink && Math.floor(now / 65) % 2 === 0) alpha *= 0.4;
    sprite.setAlpha(alpha);
    if (p.flash) sprite.setTintFill(0xffffff);
    else if (p.tint != null) sprite.setTint(p.tint);
    else sprite.clearTint();
    if (p.depth != null) this.setDepth(p.depth);

    // Ground shadow is independent of the sprite texture and remains visible while airborne.
    const fx = this.fx;
    fx.clear();
    fx.setPosition(p.x, p.y);
    const groundY = this.scene.groundY ?? p.y + FOOT + 1;
    const feetY = p.y + FOOT;
    const lift = Math.max(0, groundY - 1 - feetY);
    const shadowScale = 1 - clamp(lift / 220, 0, 0.6);
    fx.fillStyle(0x050308, 0.42 * shadowScale)
      .fillEllipse(0, groundY - p.y + 2, this.halfW * 1.8 * shadowScale, 12);
  }

  ring(color, alpha = 0.85, extra = 6, width = 2) {
    this.fx.lineStyle(width, color, alpha)
      .strokeCircle(0, this.centerY, Math.max(this.halfW, this.halfH) + extra);
  }

  guardArc(facing, color = 0x9ce7e2) {
    const radius = Math.max(this.halfW, this.halfH) + 9;
    const start = facing > 0 ? -0.95 : Math.PI - 0.95;
    this.fx.lineStyle(3, color, 0.9)
      .beginPath().arc(0, this.centerY, radius, start, start + 1.9, false).strokePath();
  }

  bar(width, ratio, color, y = this.topY - 14, height = 4) {
    this.fx.fillStyle(0x15070d, 0.9).fillRect(-width / 2, y, width, height);
    this.fx.fillStyle(color, 1).fillRect(-width / 2, y, width * clamp(ratio, 0, 1), height);
  }

  spawnGhost() {
    const sprite = this.sprite;
    const ghost = this.scene.add.sprite(sprite.x, sprite.y, SPRITE_SHEET.key, sprite.frame.name)
      .setScale(sprite.scaleX, sprite.scaleY)
      .setRotation(sprite.rotation)
      .setFlipX(sprite.flipX)
      .setAlpha(0.38)
      .setTint(this.ghostTint)
      .setDepth(sprite.depth - 1);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: sprite.scaleX * 0.82,
      duration: 240,
      onComplete: () => ghost.destroy()
    });
  }

  playDeath() {
    if (this.dying) return;
    this.dying = true;
    this.anim = 'death';
    this.sprite.setRotation(0).setScale(this.baseScale).setAlpha(1).clearTint();
    this.sprite.play(animKey(this.pathogen, 'death'));
    this.sprite.anims.timeScale = 1;
    this.fx.clear();
  }

  // Enemies follow their moving physics body while the death animation fades out.
  renderDeath(x, y, life, depth) {
    if (!this.sprite.active) return;
    const grow = 1 + (1 - life) * 0.18;
    this.sprite.setPosition(x, y + this.centerY);
    this.sprite.setScale(this.baseScale * grow);
    this.sprite.setAlpha(clamp(life, 0, 1));
    this.sprite.setRotation((1 - life) * 0.16);
    this.setDepth(depth);
    this.fx.clear();
  }

  fadeOut(duration = 600, to = 0.3) {
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: to,
      scaleX: this.baseScale * 1.15,
      scaleY: this.baseScale * 1.15,
      duration
    });
  }

  destroy() {
    if (this.sprite?.active) this.sprite.destroy();
    if (this.fx?.active) this.fx.destroy();
  }
}
