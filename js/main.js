import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#140811',
  antialias: true,
  roundPixels: false,
  physics: {
    default: 'arcade',
    arcade: { debug: false, fps: 60 }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  render: { pixelArt: false, antialias: true, transparent: false },
  scene: [BootScene, MenuScene, GameScene]
};

const game = new Phaser.Game(config);
const byId = (id) => document.getElementById(id);

// Background music is an MP4 file containing an AAC audio track.
// Browsers allow playback after the player clicks Initialize Operative.
const music = new Audio('/assets/audio/bloodbound-theme.mp4');
music.loop = true;
music.preload = 'auto';
music.volume = 0.80;
let musicEnabled = true;
let musicAvailable = true;
const musicButton = byId('music-toggle');

function updateMusicButton() {
  musicButton.textContent = musicAvailable
    ? `MUSIC: ${musicEnabled ? 'ON' : 'OFF'}`
    : 'MUSIC FILE MISSING';
  musicButton.setAttribute('aria-pressed', String(musicEnabled));
  musicButton.title = musicAvailable
    ? 'Toggle background music'
    : 'Add public/assets/audio/bloodbound-theme.mp4 to enable music';
}

async function playMusic() {
  if (!musicEnabled || !musicAvailable) return;
  try {
    await music.play();
  } catch (error) {
    // Missing files and browser autoplay restrictions should never block gameplay.
    if (error?.name === 'NotSupportedError' || error?.name === 'MediaError') musicAvailable = false;
    updateMusicButton();
  }
}

function pauseMusic() { music.pause(); }

music.addEventListener('error', () => {
  musicAvailable = false;
  updateMusicButton();
});
musicButton.addEventListener('click', () => {
  musicEnabled = !musicEnabled;
  if (musicEnabled) playMusic();
  else pauseMusic();
  updateMusicButton();
});
updateMusicButton();

// GameScene dispatches these window events from its own lifecycle emitter.
// This avoids looking up a scene before Phaser has instantiated it.
window.addEventListener('bloodbound:pause', pauseMusic);
window.addEventListener('bloodbound:resume', () => {
  if (!byId('main-menu').classList.contains('hidden')) playMusic();
});

function activeGameScene() {
  const scene = game.scene.getScene('GameScene');
  return scene && (scene.sys.isActive() || scene.scene.isPaused()) ? scene : null;
}

function startGame() {
  playMusic();
  byId('main-menu').classList.add('hidden');
  byId('end-screen').classList.add('hidden');
  byId('pause-menu').classList.add('hidden');
  byId('medicine-panel').classList.add('hidden');
  byId('diagnostic-panel').classList.add('hidden');
  byId('hud').classList.remove('hidden');
  byId('help-toggle').classList.remove('hidden');
  game.scene.start('GameScene');
}

function restartGame() { startGame(); }
function returnToTitle() {
  pauseMusic();
  const scene = activeGameScene();
  if (scene) game.scene.stop('GameScene');
  byId('hud').classList.add('hidden');
  byId('help-toggle').classList.add('hidden');
  byId('end-screen').classList.add('hidden');
  byId('pause-menu').classList.add('hidden');
  byId('medicine-panel').classList.add('hidden');
  byId('diagnostic-panel').classList.add('hidden');
  byId('main-menu').classList.remove('hidden');
}

window.restartBloodbound = restartGame;
window.returnBloodboundToTitle = returnToTitle;
byId('start-button').addEventListener('click', startGame);
byId('resume-button').addEventListener('click', () => activeGameScene()?.resumeGame());
byId('restart-pause-button').addEventListener('click', restartGame);

window.addEventListener('keydown', (event) => {
  if (event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  const scene = activeGameScene();
  if (!scene) return;
  const key = event.key.toLowerCase();
  if (key === 'e') {
    if (scene.isOverlayOpen && !byId('medicine-panel').classList.contains('hidden')) scene.closeMedicine();
    else if (!scene.isOverlayOpen) scene.openMedicine();
  } else if (key === 'q') {
    if (!byId('medicine-panel').classList.contains('hidden')) scene.activateTreatment();
  } else if (key === 'escape') {
    if (!byId('medicine-panel').classList.contains('hidden')) scene.closeMedicine();
    else if (!byId('diagnostic-panel').classList.contains('hidden')) return;
    else if (!byId('pause-menu').classList.contains('hidden')) scene.resumeGame();
    else scene.togglePause();
  }
});

// Lightweight settings persistence; simulation state resets on each run.
try {
  const best = Number(localStorage.getItem('bloodbound-best-kills') ?? 0);
  if (best > 0) byId('start-button').setAttribute('title', `Best parasite count: ${best}`);
} catch { /* Local storage is optional. */ }
