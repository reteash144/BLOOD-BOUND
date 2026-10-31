import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { SPRITE_METRICS } from '../js/sprites/spriteMetrics.js';
import {
  SPRITE_SHEET,
  FRAME_COLUMNS,
  FRAME,
  PATHOGENS,
  ROLE_SPRITES,
  STATE_ANIMS,
  frameIndex
} from '../js/sprites/spriteConfig.js';

const ROOT = new URL('../', import.meta.url);
const PNG_PATH = new URL(`public/assets/sprites/pathogens.png`, ROOT);

test('generated pathogen atlas dimensions match the Phaser spritesheet config', async () => {
  assert.equal(existsSync(PNG_PATH), true, 'run python3 tools/build_sprites.py to generate the atlas');
  const png = await readFile(PNG_PATH);
  assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', 'asset must be a PNG');
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(SPRITE_SHEET.frameWidth, SPRITE_METRICS.frameWidth);
  assert.equal(SPRITE_SHEET.frameHeight, SPRITE_METRICS.frameHeight);
  assert.equal(FRAME_COLUMNS, SPRITE_METRICS.columns);
  assert.equal(width, SPRITE_SHEET.frameWidth * FRAME_COLUMNS);
  assert.equal(height, SPRITE_SHEET.frameHeight * SPRITE_METRICS.rows);
});

test('pathogen rows, frame columns, and animation frame references stay in bounds', () => {
  assert.deepEqual(Object.keys(PATHOGENS), ['ebola', 'sars', 'hiv', 'rsv', 'cmv', 'chik']);
  assert.deepEqual(PATHOGENS, SPRITE_METRICS.pathogens);
  assert.deepEqual(Object.values(FRAME), [0, 1, 2, 3, 4]);
  assert.equal(new Set(Object.values(FRAME)).size, FRAME_COLUMNS);

  for (const [name, pathogen] of Object.entries(PATHOGENS)) {
    assert.ok(pathogen.row >= 0 && pathogen.row < Object.keys(PATHOGENS).length, `${name} row`);
    for (const frameName of Object.keys(FRAME)) {
      const index = frameIndex(name, frameName);
      assert.ok(index >= 0 && index < FRAME_COLUMNS * Object.keys(PATHOGENS).length);
    }
  }

  for (const [role, sprite] of Object.entries(ROLE_SPRITES)) {
    assert.ok(PATHOGENS[sprite.pathogen], `${role} maps to a known pathogen`);
    assert.ok(sprite.scale > 0, `${role} has a positive display scale`);
  }

  for (const [state, animation] of Object.entries(STATE_ANIMS)) {
    assert.ok(animation.frames.length > 0, `${state} has at least one frame`);
    for (const frame of animation.frames) assert.ok(frame in FRAME, `${state} references known frame ${frame}`);
  }
});
