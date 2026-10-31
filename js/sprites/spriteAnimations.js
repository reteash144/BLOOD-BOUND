import { SPRITE_SHEET, PATHOGENS, STATE_ANIMS, animKey, frameIndex } from './spriteConfig.js';

// Load once per scene lifetime. A stopped/restarted GameScene reuses the cached texture.
export function loadSpriteAssets(scene) {
  if (!scene.textures.exists(SPRITE_SHEET.key)) {
    scene.load.spritesheet(SPRITE_SHEET.key, SPRITE_SHEET.url, {
      frameWidth: SPRITE_SHEET.frameWidth,
      frameHeight: SPRITE_SHEET.frameHeight
    });
  }
}

// Phaser's animation manager is shared by scenes, so register each pathogen/state only once.
export function createSpriteAnimations(scene) {
  if (!scene.textures.exists(SPRITE_SHEET.key)) {
    console.error(`[BLOODBOUND] Sprite texture "${SPRITE_SHEET.key}" is missing (${SPRITE_SHEET.url})`);
    return false;
  }

  for (const pathogen of Object.keys(PATHOGENS)) {
    for (const [state, definition] of Object.entries(STATE_ANIMS)) {
      const key = animKey(pathogen, state);
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: definition.frames.map((name) => ({
          key: SPRITE_SHEET.key,
          frame: frameIndex(pathogen, name)
        })),
        frameRate: definition.frameRate ?? 12,
        repeat: definition.repeat ?? 0
      });
    }
  }
  return true;
}
