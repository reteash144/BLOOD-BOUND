// Single source of truth for how the uploaded pathogen sheet is used.
// The sheet is produced by tools/build_sprites.py (6 pathogens x 6 frames, uniform cells,
// body centre on the cell centre, every frame drawn facing RIGHT).

export const SPRITE_SHEET = {
  key: 'pathogens',
  url: '/assets/sprites/pathogens.png',
  frameWidth: 264,   // must match the "cell" printed by tools/build_sprites.py
  frameHeight: 104
};

export const FRAME_COLUMNS = 6;

// Column inside a pathogen's row.
export const FRAME = { idle1: 0, idle2: 1, attack1: 2, attack2: 3, hit: 4, death: 5 };

// Row in the sheet + height of the pathogen body in source pixels (used to stand it on the floor).
export const PATHOGENS = {
  ebola: { row: 0, bodyHeight: 74, bodyWidth: 100 },
  sars:  { row: 1, bodyHeight: 93, bodyWidth: 101 },
  hiv:   { row: 2, bodyHeight: 91, bodyWidth: 98 },
  rsv:   { row: 3, bodyHeight: 89, bodyWidth: 95 },
  cmv:   { row: 4, bodyHeight: 92, bodyWidth: 98 },
  chik:  { row: 5, bodyHeight: 93, bodyWidth: 98 }
};

// Which pathogen art plays which gameplay role. Change a name here to re-skin a role.
// scale = display scale of the 100px-ish source body (physics bodies are unchanged: 31x74).
export const ROLE_SPRITES = {
  player:   { pathogen: 'rsv',   scale: 0.82 },   // cyan = the player's existing guard/dodge colour
  scout:    { pathogen: 'sars',  scale: 0.80 },
  assassin: { pathogen: 'ebola', scale: 1.00 },   // whip-like attack frames suit the lunge
  brute:    { pathogen: 'chik',  scale: 1.20 },
  boss:     { pathogen: 'hiv',   scale: 1.95 }    // ring / shock-arc attack frames suit the boss moves
};

// Gameplay state -> frames from the sheet. Every state becomes a Phaser animation per pathogen,
// keyed `${pathogen}:${state}`. States with a single frame are held; the motion for run / jump /
// block / dodge is added by CharacterSprite (the sheet has no dedicated frames for them).
export const STATE_ANIMS = {
  idle:    { frames: ['idle1', 'idle2'], frameRate: 3,  repeat: -1 },
  run:     { frames: ['idle2', 'idle1'], frameRate: 10, repeat: -1 },
  jump:    { frames: ['idle2'] },
  fall:    { frames: ['idle1'] },
  windup:  { frames: ['attack1'] },                 // anticipation, held until the hit frame
  strike:  { frames: ['attack2'] },                 // active frames: shown while the hitbox resolves
  recover: { frames: ['attack1'] },                 // follow-through after the hit
  block:   { frames: ['idle1'] },
  dodge:   { frames: ['attack1'] },
  hurt:    { frames: ['hit'] },
  death:   { frames: ['hit', 'death'], frameRate: 8, repeat: 0 }
};

export const animKey = (pathogen, state) => `${pathogen}:${state}`;
export const frameIndex = (pathogen, name) => PATHOGENS[pathogen].row * FRAME_COLUMNS + FRAME[name];