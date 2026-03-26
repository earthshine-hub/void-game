'use strict';

const Loader = {
  images: {},

  loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { Loader.images[key] = img; resolve(img); };
      img.onerror = () => { Loader.images[key] = null; resolve(null); };
      img.src = src;
    });
  },

  async loadAll(manifest, onProgress) {
    let loaded = 0;
    const total = manifest.length;
    await Promise.all(manifest.map(async ({ key, src }) => {
      await Loader.loadImage(key, src);
      loaded++;
      if (onProgress) onProgress(loaded / total);
    }));
  },

  get(key) { return Loader.images[key] || null; }
};

const ASSET_MANIFEST = [
  // ── Level 1 background
  { key: 'bg_back',   src: 'Assets/Packs/SpaceShooter/Space Shooter files/background/layered/bg-back.png' },
  { key: 'bg_stars',  src: 'Assets/Packs/SpaceShooter/Space Shooter files/background/layered/bg-stars.png' },
  { key: 'bg_planet', src: 'Assets/Packs/SpaceShooter/Space Shooter files/background/layered/bg-planet.png' },

  // ── Level 2 background (asteroid field)
  { key: 'bg_asteroid', src: 'Assets/Packs/asteroid-fighter/PNG/background.png' },
  { key: 'bg_planet2',  src: 'Assets/Packs/asteroid-fighter/PNG/planet.png' },

  // ── Level 3 background (cyberpunk corridor)
  { key: 'bg_corridor_back', src: 'Assets/Environments/cyberpunk-corridor-files/PNG/back.png' },
  { key: 'bg_corridor',      src: 'Assets/Environments/cyberpunk-corridor-files/PNG/cyberpunk-corridor.png' },

  // ── Player ship frames (10 banking frames)
  { key: 'ship1',  src: 'Assets/Packs/SpaceShipShooter/Sprites/Ship/ship1.png' },
  { key: 'ship2',  src: 'Assets/Packs/SpaceShipShooter/Sprites/Ship/ship2.png' },
  { key: 'ship3',  src: 'Assets/Packs/SpaceShipShooter/Sprites/Ship/ship3.png' },
  { key: 'ship4',  src: 'Assets/Packs/SpaceShipShooter/Sprites/Ship/ship4.png' },
  { key: 'ship5',  src: 'Assets/Packs/SpaceShipShooter/Sprites/Ship/ship5.png' },
  { key: 'ship6',  src: 'Assets/Packs/SpaceShipShooter/Sprites/Ship/ship6.png' },
  { key: 'ship7',  src: 'Assets/Packs/SpaceShipShooter/Sprites/Ship/ship7.png' },
  { key: 'ship8',  src: 'Assets/Packs/SpaceShipShooter/Sprites/Ship/ship8.png' },
  { key: 'ship9',  src: 'Assets/Packs/SpaceShipShooter/Sprites/Ship/ship9.png' },
  { key: 'ship10', src: 'Assets/Packs/SpaceShipShooter/Sprites/Ship/ship10.png' },

  // ── Alien flying enemy (8 frames)
  { key: 'alien1', src: 'Assets/Characters/alien-flying-enemy/sprites/alien-enemy-flying1.png' },
  { key: 'alien2', src: 'Assets/Characters/alien-flying-enemy/sprites/alien-enemy-flying2.png' },
  { key: 'alien3', src: 'Assets/Characters/alien-flying-enemy/sprites/alien-enemy-flying3.png' },
  { key: 'alien4', src: 'Assets/Characters/alien-flying-enemy/sprites/alien-enemy-flying4.png' },
  { key: 'alien5', src: 'Assets/Characters/alien-flying-enemy/sprites/alien-enemy-flying5.png' },
  { key: 'alien6', src: 'Assets/Characters/alien-flying-enemy/sprites/alien-enemy-flying6.png' },
  { key: 'alien7', src: 'Assets/Characters/alien-flying-enemy/sprites/alien-enemy-flying7.png' },
  { key: 'alien8', src: 'Assets/Characters/alien-flying-enemy/sprites/alien-enemy-flying8.png' },

  // ── Alien walking enemy / Level 3 fodder (4 idle frames)
  { key: 'alien_walk1', src: 'Assets/Characters/alien-walking-enemy/Sprites/Idle/frame1.png' },
  { key: 'alien_walk2', src: 'Assets/Characters/alien-walking-enemy/Sprites/Idle/frame2.png' },
  { key: 'alien_walk3', src: 'Assets/Characters/alien-walking-enemy/Sprites/Idle/frame3.png' },
  { key: 'alien_walk4', src: 'Assets/Characters/alien-walking-enemy/Sprites/Idle/frame4.png' },

  // ── Enemy medium (2 frames)
  { key: 'enemy_med1', src: 'Assets/Packs/SpaceShipShooter/Sprites/Enemy Medium/enemy-medium1.png' },
  { key: 'enemy_med2', src: 'Assets/Packs/SpaceShipShooter/Sprites/Enemy Medium/enemy-medium2.png' },

  // ── Mech unit — Level 2 turrets + boss (10 frames)
  { key: 'mech1',  src: 'Assets/Characters/mech-unit/sprites/mech-unit-export1.png' },
  { key: 'mech2',  src: 'Assets/Characters/mech-unit/sprites/mech-unit-export2.png' },
  { key: 'mech3',  src: 'Assets/Characters/mech-unit/sprites/mech-unit-export3.png' },
  { key: 'mech4',  src: 'Assets/Characters/mech-unit/sprites/mech-unit-export4.png' },
  { key: 'mech5',  src: 'Assets/Characters/mech-unit/sprites/mech-unit-export5.png' },
  { key: 'mech6',  src: 'Assets/Characters/mech-unit/sprites/mech-unit-export6.png' },
  { key: 'mech7',  src: 'Assets/Characters/mech-unit/sprites/mech-unit-export7.png' },
  { key: 'mech8',  src: 'Assets/Characters/mech-unit/sprites/mech-unit-export8.png' },
  { key: 'mech9',  src: 'Assets/Characters/mech-unit/sprites/mech-unit-export9.png' },
  { key: 'mech10', src: 'Assets/Characters/mech-unit/sprites/mech-unit-export10.png' },

  // ── Level 1 boss frames (5 frames)
  { key: 'boss1', src: 'Assets/Misc/top-down-boss/PNG/sprites/boss/_0000_Layer-1.png' },
  { key: 'boss2', src: 'Assets/Misc/top-down-boss/PNG/sprites/boss/_0001_Layer-2.png' },
  { key: 'boss3', src: 'Assets/Misc/top-down-boss/PNG/sprites/boss/_0002_Layer-3.png' },
  { key: 'boss4', src: 'Assets/Misc/top-down-boss/PNG/sprites/boss/_0003_Layer-4.png' },
  { key: 'boss5', src: 'Assets/Misc/top-down-boss/PNG/sprites/boss/_0004_Layer-5.png' },

  // ── Asteroids (5 variants)
  { key: 'asteroid1', src: 'Assets/Packs/asteroid-fighter/PNG/asteroids/asteroid-1.png' },
  { key: 'asteroid2', src: 'Assets/Packs/asteroid-fighter/PNG/asteroids/asteroid-2.png' },
  { key: 'asteroid3', src: 'Assets/Packs/asteroid-fighter/PNG/asteroids/asteroid-3.png' },
  { key: 'asteroid4', src: 'Assets/Packs/asteroid-fighter/PNG/asteroids/asteroid-4.png' },
  { key: 'asteroid5', src: 'Assets/Packs/asteroid-fighter/PNG/asteroids/asteroid-5.png' },

  // ── Explosion (5 frames)
  { key: 'exp1', src: 'Assets/Packs/SpaceShooter/Space Shooter files/explosion/sprites/explosion1.png' },
  { key: 'exp2', src: 'Assets/Packs/SpaceShooter/Space Shooter files/explosion/sprites/explosion2.png' },
  { key: 'exp3', src: 'Assets/Packs/SpaceShooter/Space Shooter files/explosion/sprites/explosion3.png' },
  { key: 'exp4', src: 'Assets/Packs/SpaceShooter/Space Shooter files/explosion/sprites/explosion4.png' },
  { key: 'exp5', src: 'Assets/Packs/SpaceShooter/Space Shooter files/explosion/sprites/explosion5.png' },

  // ── Player bullet bolt (4 frames)
  { key: 'bolt1', src: 'Assets/Misc/Warped shooting fx/Bolt/Sprites/bolt1.png' },
  { key: 'bolt2', src: 'Assets/Misc/Warped shooting fx/Bolt/Sprites/bolt2.png' },
  { key: 'bolt3', src: 'Assets/Misc/Warped shooting fx/Bolt/Sprites/bolt3.png' },
  { key: 'bolt4', src: 'Assets/Misc/Warped shooting fx/Bolt/Sprites/bolt4.png' },

  // ── Hit flash (4 frames)
  { key: 'hit1', src: 'Assets/Packs/SpaceShooter/Space Shooter files/Hit/sprites/hit1.png' },
  { key: 'hit2', src: 'Assets/Packs/SpaceShooter/Space Shooter files/Hit/sprites/hit2.png' },
  { key: 'hit3', src: 'Assets/Packs/SpaceShooter/Space Shooter files/Hit/sprites/hit3.png' },
  { key: 'hit4', src: 'Assets/Packs/SpaceShooter/Space Shooter files/Hit/sprites/hit4.png' },

  // ── Power-up sprites (4 types)
  { key: 'pu1', src: 'Assets/Packs/SpaceShipShooter/Sprites/PowerUps/power-up1.png' },
  { key: 'pu2', src: 'Assets/Packs/SpaceShipShooter/Sprites/PowerUps/power-up2.png' },
  { key: 'pu3', src: 'Assets/Packs/SpaceShipShooter/Sprites/PowerUps/power-up3.png' },
  { key: 'pu4', src: 'Assets/Packs/SpaceShipShooter/Sprites/PowerUps/power-up4.png' },
];
