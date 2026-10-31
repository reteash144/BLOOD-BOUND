import { SPRITE_SHEET, PATHOGENS, STATE_ANIMS, animKey, frameIndex } from './spriteConfig.js';

// Call from a scene's preload().
export function loadSpriteAssets(scene) {
  scene.load.spritesheet(SPRITE_SHEET.key, SPRITE_SHEET.url, {
    frameWidth: SPRITE_SHEET.frameWidth,
    frameHeight: SPRITE_SHEET.frameHeight
  });
}

// Call once from a scene's create() after loading. Animations live on the global manager,
// so every later scene (GameScene) can play them without re-registering.
export function createSpriteAnimations(scene) {
  if (!scene.textures.exists(SPRITE_SHEET.key)) {
    console.error(`[BLOODBOUND] Texture "${SPRITE_SHEET.key}" is missing - check ${SPRITE_SHEET.url}`);
    return false;
  }
  for (const pathogen of Object.keys(PATHOGENS)) {
    for (const [state, def] of Object.entries(STATE_ANIMS)) {
      const key = animKey(pathogen, state);
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: def.frames.map((name) => ({ key: SPRITE_SHEET.key, frame: frameIndex(pathogen, name) })),
        frameRate: def.frameRate ?? 12,
        repeat: def.repeat ?? 0
      });
    }
  }
  return true;
}