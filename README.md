# BLOODBOUND — Browser Game MVP

A single-level, side-scrolling Phaser 3 beat-'em-up prototype set inside a stylised bloodstream. Character visuals use an alpha-keyed pathogen sprite atlas; physics and combat remain on independent Arcade bodies.

## Requirements

- Node.js 20 or newer
- npm
- Python 3 with Pillow, NumPy and SciPy (only needed to rebuild the sprite atlas)
- A modern desktop browser

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

Run the lightweight system tests with `npm test`.

The pathogen atlas is committed at `public/assets/sprites/pathogens.png`. To rebuild it from the source sheet:

```bash
pip install pillow numpy scipy
python3 tools/build_sprites.py
# or: npm run build:sprites
```

Create a production build with:

```bash
npm run build
npm run preview
```

Phaser is declared as an exact npm dependency in `package.json`. No CDN or remote image assets are used by the game. The interface uses system font stacks and does not fetch remote fonts.

## Controls

| Key | Action |
|---|---|
| A / D | Move |
| W | Jump |
| S | Block |
| J | Light combo |
| K | Heavy attack |
| L | Biological-energy special |
| Space | Dodge with brief invulnerability |
| E | Open / close medicine interface |
| Q | Activate selected treatment while the medicine interface is open |
| Esc | Pause / resume |

The in-game **CONTROLS ?** panel repeats the controls.

## Encounter flow

1. Defeat five ordinary parasite combatants. Three enemies enter the first encounter together.
2. The game replenishes the vanguard as enemies fall. Scout, Assassin, and Brute use different attack timing and movement.
3. The Blood Reaver enters after the fifth ordinary defeat.
4. Read the pathogen clues and identify **Malaria**.
5. Use combat and the medicine interface to defeat the three-phase boss.

## Combat and status systems

- Player attacks have wind-up, active, and recovery frames. Each attack resolves its hitbox once.
- The player can block, dodge, jump, and spend biological energy on a wide special attack.
- Enemy attacks use a two-attacker concurrency limit. Enemies separate horizontally to reduce visual stacking.
- The boss uses Parasite Slash, Blood Cell Infiltration, Rupture Wave, Fever Pulse, and parasite summons.
- Fever reduces movement speed. Fatigue reduces stamina capacity and regeneration. Dehydration drains stamina. Anaemia reduces maximum health.

## Medicine mechanics

| Generic treatment | Simulation effect | Limitation |
|---|---|---|
| Artemether–lumefantrine | After malaria identification, damages and weakens the boss | Targeted antimalarial game mechanic only |
| Paracetamol | Reduces the Fever status | Does not kill parasites |
| Oral rehydration solution (ORS) | Restores stamina and reduces Dehydration | Supportive mechanic; does not kill parasites |

These are educational game abstractions. They do not provide medical advice, dosing, or a real treatment plan. Symptoms alone do not establish a real-world diagnosis.

## Project structure

```text
bloodbound/
├── index.html
├── package.json
├── README.md
├── css/
│   └── main.css
├── art/
│   └── source/
│       ├── pathogen-sheet.jpeg
│       └── bloodstream-reference.jpeg
├── public/
│   └── assets/
│       └── sprites/
│           └── pathogens.png
├── tools/
│   └── build_sprites.py
├── data/
│   ├── medicines.json
│   ├── pathogens.json
│   └── symptoms.json
├── tests/
│   ├── sprites.test.js
│   └── systems.test.js
└── js/
    ├── main.js
    ├── sprites/
    │   ├── CharacterSprite.js
    │   ├── spriteAnimations.js
    │   └── spriteConfig.js
    ├── entities/
    │   ├── Enemy.js
    │   ├── MalariaBoss.js
    │   └── Player.js
    ├── scenes/
    │   ├── BootScene.js
    │   ├── GameScene.js
    │   └── MenuScene.js
    ├── systems/
    │   ├── CombatSystem.js
    │   ├── MedicineSystem.js
    │   └── StatusSystem.js
    └── ui/
        └── HUD.js
```

## Persistence

LocalStorage stores the best ordinary-enemy count, the last run result, and the controls-panel preference. The current run resets when restarted.

## Prototype limits

- Character sprites use the six-row pathogen atlas; the environment and combat effects remain procedural.
- Combat uses a single horizontal lane with jump height and simple depth cues.
- The diagnostic task uses fictional encounter clues and a constrained choice set.
- No real-world medicine database, clinical inference, audio, controller support, or mobile touch controls are included.
# BLOOD-BOUND
# BLOOD-BOUND
