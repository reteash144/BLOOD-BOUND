import { SPRITE_SHEET, PATHOGENS, ROLE_SPRITES, animKey, frameIndex } from './spriteConfig.js';

// Visual layer shared by Player, Enemy and MalariaBoss. It owns a Phaser Sprite (the art) and a
// Graphics layer (ground shadow, health bars, telegraphs). Entities keep all gameplay logic and
// each frame describe WHAT they are doing; this class decides which animation plays and adds the
// procedural motion the sheet has no frames for (run, jump, block, dodge).
//
//   view.render({ x, y, facing, vx, vy, grounded, action, t, lunge, power, flash, tint, alpha, blink })
//
// action: idle | run | air | alert | windup | strike | recover | block | dodge | hurt
// t:      0..1 progress through the current windup / strike / recover phase
// x, y:   centre of the physics body (sprite is stood on its feet automatically)

const FOOT = 37;                       // physics body is 74px tall; centre sits 37px above the feet
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeOut = (t) => 1 - (1 - t) * (1 - t);

export class CharacterSprite {
  constructor(scene, role) {
    const def = ROLE_SPRITES[role];
    if (!def) throw new Error(`[CharacterSprite] unknown sprite role "${role}"`);
    const art = PATHOGENS[def.pathogen];
    this.scene = scene;
    this.role = role;
    this.pathogen = def.pathogen;
    this.baseScale = def.scale;
    this.halfH = (art.bodyHeight * def.scale) / 2;
    this.halfW = (art.bodyWidth * def.scale) / 2;
    this.centerY = FOOT - this.halfH;            // sprite centre, relative to the physics body centre
    this.topY = this.centerY - this.halfH;       // top of the art, relative to the body centre
    this.sprite = scene.add.sprite(0, 0, SPRITE_SHEET.key, frameIndex(def.pathogen, 'idle1')).setScale(def.scale);
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

  // --- animation ---------------------------------------------------------------------------
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

  // --- per-frame pose ----------------------------------------------------------------------
  render(p) {
    if (this.dying) return;
    const now = this.scene.time.now;
    const delta = p.delta ?? 16.7;
    const facing = p.facing >= 0 ? 1 : -1;
    const grounded = p.grounded ?? true;
    const power = p.power ?? 1;
    const lunge = p.lunge ?? 20;
    const t = clamp(p.t ?? 0, 0, 1);
    let action = p.action ?? 'idle';
    let state = 'idle';
    let sx = 1, sy = 1, rot = 0, ox = 0, oy = 0;
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
        rot = lean * 0.11 + Math.sin(this.runPhase) * 0.05;
        break;
      }
      case 'jump':
        state = 'jump'; sx = 0.9; sy = 1.14; rot = facing * 0.08;
        break;
      case 'fall':
        state = 'fall'; sx = 0.96; sy = 1.06; rot = facing * 0.04;
        break;
      case 'alert':
        state = 'idle'; sx = 1 + 0.15 * (1 - t); sy = 1 - 0.1 * (1 - t);
        break;
      case 'windup': {
        const charge = easeOut(t) * power;
        state = 'windup';
        sx = 1 + 0.10 * charge; sy = 1 - 0.12 * charge;
        ox = -facing * 10 * charge;
        rot = -facing * 0.08 * Math.min(charge, 1.4);
        break;
      }
      case 'strike':
        state = 'strike';
        ox = facing * lunge * easeOut(t);
        sx = 1.08 + 0.06 * power; sy = 0.94;
        rot = facing * 0.06;
        break;
      case 'recover':
        state = t < 0.45 ? 'recover' : 'idle';
        ox = facing * lunge * 0.6 * (1 - easeOut(t));
        sx = 1 + 0.05 * (1 - t); sy = 1 - 0.05 * (1 - t);
        break;
      case 'block':
        state = 'block'; sx = 0.92; sy = 1.05; ox = -facing * 4;
        break;
      case 'dodge':
        state = 'dodge'; sx = 1.32; sy = 0.76; rot = facing * 0.1; alpha *= 0.8;
        if (now - this.lastGhost > 45) { this.lastGhost = now; this.spawnGhost(); }
        break;
      case 'hurt':
        state = 'hurt';
        ox = -facing * 7 + Math.sin(now / 20) * 3;
        sx = 0.9; sy = 1.12; rot = -facing * 0.12;
        break;
      default: {   // idle: slow breathing + hover
        const breathe = Math.sin(this.idlePhase);
        sx = 1 + breathe * 0.025; sy = 1 - breathe * 0.025;
        oy = Math.sin(this.idlePhase * 0.7) * 2;
      }
    }

    if (grounded && this.landSquash > 0) { sx *= 1 + 0.14 * this.landSquash; sy *= 1 - 0.16 * this.landSquash; }

    this.play(state);
    this.sprite.anims.timeScale = timeScale;

    const s = this.sprite;
    s.setPosition(p.x + ox, p.y + this.centerY + oy);
    s.setScale(this.baseScale * sx, this.baseScale * sy);
    s.setRotation(rot);
    s.setFlipX(facing < 0);
    if (p.blink && Math.floor(now / 65) % 2 === 0) alpha *= 0.4;
    s.setAlpha(alpha);
    if (p.flash) s.setTintFill(0xffffff);
    else if (p.tint != null) s.setTint(p.tint);
    else s.clearTint();
    if (p.depth != null) this.setDepth(p.depth);

    // overlay layer: cleared every frame, then the shadow; the entity adds bars / telegraphs after
    const fx = this.fx;
    fx.clear();
    fx.setPosition(p.x, p.y);
    const groundY = this.scene.groundY ?? p.y + FOOT + 1;
    const lift = Math.max(0, groundY - 1 - (p.y + FOOT));
    const k = 1 - clamp(lift / 220, 0, 0.6);
    fx.fillStyle(0x050308, 0.42 * k).fillEllipse(0, groundY - p.y + 2, this.halfW * 1.8 * k, 12);
  }

  // --- overlay helpers (coordinates relative to the physics body centre) --------------------
  ring(color, alpha = 0.85, extra = 6, width = 2) {
    this.fx.lineStyle(width, color, alpha).strokeCircle(0, this.centerY, Math.max(this.halfW, this.halfH) + extra);
  }

  guardArc(facing, color = 0x9ce7e2) {
    const r = Math.max(this.halfW, this.halfH) + 9;
    const a0 = facing > 0 ? -0.95 : Math.PI - 0.95;
    this.fx.lineStyle(3, color, 0.9).beginPath().arc(0, this.centerY, r, a0, a0 + 1.9, false).strokePath();
  }

  bar(width, ratio, color, y = this.topY - 14, height = 4) {
    this.fx.fillStyle(0x15070d, 0.9).fillRect(-width / 2, y, width, height);
    this.fx.fillStyle(color, 1).fillRect(-width / 2, y, width * clamp(ratio, 0, 1), height);
  }

  spawnGhost() {
    const s = this.sprite;
    const ghost = this.scene.add.sprite(s.x, s.y, SPRITE_SHEET.key, s.frame.name)
      .setScale(s.scaleX, s.scaleY).setRotation(s.rotation).setFlipX(s.flipX)
      .setAlpha(0.42).setTint(this.ghostTint).setDepth(s.depth - 1);
    this.scene.tweens.add({
      targets: ghost, alpha: 0, scaleX: s.scaleX * 0.8, duration: 240,
      onComplete: () => ghost.destroy()
    });
  }

  // --- death -------------------------------------------------------------------------------
  playDeath() {
    if (this.dying) return;
    this.dying = true;
    this.anim = 'death';
    const s = this.sprite;
    s.setRotation(0).setScale(this.baseScale).setAlpha(1).clearTint();
    s.play(animKey(this.pathogen, 'death'));
    s.anims.timeScale = 1;
    this.fx.clear();
  }

  // Enemies keep following their (sliding) physics body while the death animation fades out.
  renderDeath(x, y, life, depth) {
    const s = this.sprite;
    const grow = 1 + (1 - life) * 0.25;
    s.setPosition(x, y + this.centerY);
    s.setScale(this.baseScale * grow);
    s.setAlpha(clamp(life, 0, 1));
    this.setDepth(depth);
    this.fx.clear();
  }

  // The player's death plays in place: hold the last position and dim out.
  fadeOut(duration = 600, to = 0.3) {
    this.scene.tweens.add({ targets: this.sprite, alpha: to, scaleX: this.baseScale * 1.15, scaleY: this.baseScale * 1.15, duration });
  }

  destroy() {
    if (this.sprite && this.sprite.active) this.sprite.destroy();
    if (this.fx && this.fx.active) this.fx.destroy();
  }
}