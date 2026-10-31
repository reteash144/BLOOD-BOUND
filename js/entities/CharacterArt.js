export function drawOperative(graphics, state = {}) {
  const { facing = 1, attacking = false, blocking = false, dodging = false, heavy = false, boss = false, flash = false, variant = 'scout', anticipating = false } = state;
  const primary = flash ? 0xffffff : boss ? 0x20070f : 0x080a11;
  const trim = boss ? 0xb52242 : 0x9d243e;
  const cloth = boss ? 0x6c122a : 0x27202a;
  const armReach = attacking ? (heavy ? 36 : 25) : blocking ? 11 : 5;
  const s = facing;

  graphics.clear();
  graphics.fillStyle(0x050308, 0.42).fillEllipse(0, 39, boss ? 88 : 61, 12);
  // Rear coat tails and legs establish a readable martial-arts silhouette.
  graphics.fillStyle(cloth, 1).fillPoints([
    { x: -13, y: -10 }, { x: -23, y: 16 }, { x: -20, y: 34 }, { x: -7, y: 28 },
    { x: 0, y: 7 }, { x: 9, y: 30 }, { x: 24, y: 34 }, { x: 20, y: 13 }, { x: 12, y: -12 }
  ], true);
  graphics.fillStyle(primary, 1).fillRoundedRect(-13, -7, 12, 39, 4).fillRoundedRect(2, -7, 12, 39, 4);
  graphics.fillStyle(trim, 1).fillRect(-14, 23, 14, 5).fillRect(2, 23, 14, 5);
  const torsoWidth = variant === 'brute' || boss ? 44 : variant === 'assassin' ? 29 : 31;
  graphics.fillStyle(primary, 1).fillRoundedRect(-torsoWidth / 2, -40, torsoWidth, 40, 8);
  if (variant === 'brute' && !boss) {
    graphics.fillStyle(0x4e1724, 1).fillRoundedRect(-29, -38, 13, 19, 4).fillRoundedRect(16, -38, 13, 19, 4);
    graphics.fillStyle(0xb24a42, 1).fillRoundedRect(s * 16, -17, 17, 15, 5);
  }
  if (variant === 'assassin') {
    graphics.fillStyle(0x8d1d3b, .95).fillPoints([{ x: -12, y: -34 }, { x: -40, y: -26 }, { x: -55, y: -7 }, { x: -28, y: -14 }], true);
    graphics.lineStyle(3, 0xc3415b, .9).beginPath().moveTo(-13, -49).lineTo(-28, -68).strokePath();
  }
  if (variant === 'scout') {
    graphics.lineStyle(3, 0xc84c62, .95).beginPath().moveTo(-s * 13, -29).lineTo(-s * 29, -45).strokePath();
  }
  graphics.fillStyle(cloth, 1).fillPoints([{ x: -16, y: -35 }, { x: -29, y: -8 }, { x: -20, y: 0 }, { x: -7, y: -24 }], true);
  graphics.fillStyle(trim, 1).fillRect(-13, -18, 26, 4);
  // Head wrap and eye slit.
  graphics.fillStyle(primary, 1).fillCircle(0, -51, boss ? 20 : 16);
  graphics.fillStyle(trim, 1).fillRoundedRect(-17, -55, 34, 8, 2);
  graphics.fillStyle(0xffd4d9, flash ? 1 : 0.9).fillRoundedRect(s * 3 - 7, -53, 14, 3, 1);
  graphics.fillStyle(primary, 1).fillPoints([{ x: -12, y: -61 }, { x: -25, y: -71 }, { x: -7, y: -67 }], true);
  // Lead arm and weapon silhouette.
  graphics.lineStyle(boss ? 9 : 7, primary, 1).beginPath().moveTo(s * 11, -29).lineTo(s * (15 + armReach), -18).strokePath();
  graphics.lineStyle(3, trim, 1).beginPath().moveTo(s * (17 + armReach), -21).lineTo(s * (30 + armReach), -17).strokePath();
  if (anticipating) {
    graphics.lineStyle(2, 0xffb26c, .85).strokeCircle(s * 27, -27, 13 + Math.sin(Date.now() / 45) * 2);
  }
  if (blocking) {
    graphics.lineStyle(3, 0x9ce7e2, .9).strokeCircle(s * 28, -35, 22);
  }
  if (attacking) {
    graphics.lineStyle(heavy ? 6 : 3, heavy ? 0xffbd70 : 0xff6579, .9)
      .beginPath().arc(s * 8, -28, heavy ? 54 : 40, s > 0 ? -.95 : 2.18, s > 0 ? .65 : 3.75, false).strokePath();
  }
  if (dodging) {
    graphics.lineStyle(3, 0xff6579, .7).beginPath().moveTo(-s * 42, -6).lineTo(-s * 14, -6).strokePath();
    graphics.lineStyle(2, 0xffb7c0, .35).beginPath().moveTo(-s * 54, 4).lineTo(-s * 18, 4).strokePath();
  }
  if (boss) {
    graphics.fillStyle(0x71152d, .95).fillPoints([{ x: -24, y: -38 }, { x: -44, y: -22 }, { x: -27, y: -12 }, { x: -13, y: -30 }], true);
    graphics.fillStyle(0x71152d, .95).fillPoints([{ x: 24, y: -38 }, { x: 44, y: -22 }, { x: 27, y: -12 }, { x: 13, y: -30 }], true);
    graphics.lineStyle(2, 0xe74762, .7).strokeCircle(0, -48, 29);
    graphics.fillStyle(0x9d1738, .2).fillCircle(0, -48, 35);
  }
}
