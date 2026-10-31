import { SPRITE_METRICS } from './spriteMetrics.js';

// The Python atlas builder writes spriteMetrics.js alongside the PNG. Importing those
// generated values keeps Phaser's frame geometry and the body anchors in lockstep with the art.
export const SPRITE_SHEET = {
  key: 'pathogens',
  url: '/assets/sprites/pathogens.png',
  frameWidth: SPRITE_METRICS.frameWidth,
  frameHeight: SPRITE_METRICS.frameHeight
};

export const FRAME_COLUMNS = SPRITE_METRICS.columns;
export const FRAME = {
  idle1: 0,
  idle2: 1,
  attack: 2,
  hit: 3,
  death: 4
};

// Row indices and body sizes are generated from the two idle poses in the source art.
export const PATHOGENS = SPRITE_METRICS.pathogens;

// Re-skin gameplay roles here without changing combat or physics code.
export const ROLE_SPRITES = {
  player:   { pathogen: 'rsv',   scale: 0.60 },
  scout:    { pathogen: 'sars',  scale: 0.58 },
  assassin: { pathogen: 'ebola', scale: 0.63 },
  brute:    { pathogen: 'chik',  scale: 0.72 },
  boss:     { pathogen: 'hiv',   scale: 1.20 }
};

// The source sheet has two idle poses and one pose for each action state.
// Procedural transforms supply movement that has no dedicated sheet frame.
export const STATE_ANIMS = {
  idle:    { frames: ['idle1', 'idle2'], frameRate: 3, repeat: -1 },
  run:     { frames: ['idle2', 'idle1'], frameRate: 10, repeat: -1 },
  jump:    { frames: ['idle2'] },
  fall:    { frames: ['idle1'] },
  windup:  { frames: ['attack'] },
  strike:  { frames: ['attack'] },
  recover: { frames: ['attack'] },
  block:   { frames: ['idle1'] },
  dodge:   { frames: ['attack'] },
  hurt:    { frames: ['hit'] },
  death:   { frames: ['hit', 'death'], frameRate: 8, repeat: 0 }
};

export const animKey = (pathogen, state) => `${pathogen}:${state}`;
export const frameIndex = (pathogen, name) => {
  const definition = PATHOGENS[pathogen];
  const column = FRAME[name];
  if (!definition || column === undefined) {
    throw new Error(`[sprites] Unknown pathogen/frame: ${pathogen}/${name}`);
  }
  return definition.row * FRAME_COLUMNS + column;
};
