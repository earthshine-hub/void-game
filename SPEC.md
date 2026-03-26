# Void Assault — Game Specification

A horizontal-scrolling space shooter built for desktop web browsers.

**Tech stack:** Vanilla HTML5 Canvas + JavaScript (no framework). Single `index.html` entrypoint.
**Target resolution:** 1280×720, centered in viewport.
**Art style:** Gritty sci-fi — dark void, neon glows, metallic enemies. Palette: deep blues, purples, hot orange/red accents.

---

## Asset Sources

| Purpose | Source |
|---|---|
| Player ship | `Assets/Packs/SpaceShooter/` or `SpaceShipShooter/` |
| Enemy aliens | `Assets/Characters/Alien-flying-enemy/` |
| Enemy mechs / turrets | `Assets/Characters/Mech-unit/`, `Assets/Misc/Tank-unit/` |
| Boss ships | `Assets/Misc/Top-down-boss/` |
| Explosions / FX | `Assets/Misc/Warped shooting fx/`, `Assets/Misc/Grotto-escape-2-FX/`, `Assets/Misc/Hit effects/` |
| Backgrounds | `Assets/Packs/SpaceShooter/` background layers, `Assets/Environments/Top-down-space-environment/` |
| Power-up gems | `Assets/Misc/Gems/` |

---

## Core Systems

### Player
- Single ship with free 2D movement (WASD or arrow keys), constrained to left 60% of screen.
- Auto-fires while spacebar is held; tap for single shot.
- **Health bar** (no lives): one continuous HP pool per run. When depleted → Game Over screen.
- Starts at full HP each new game.

### Weapon Upgrades (via power-up pickups)
Upgrades stack; collected again refreshes duration where applicable.

| Power-up | Effect |
|---|---|
| Spread Shot | Single bullet → 3-way; collect again → 5-way spread |
| Laser Beam | Replaces bullets with a sustained piercing laser while held |
| Speed Boost | +40% movement speed for 10 seconds |
| Shield Bubble | Absorbs next hit taken, then pops; visual aura on ship |

### Scoring
- Points awarded per enemy kill (scaled by enemy type).
- Bonus points for completing a level without taking damage.
- High score persisted to `localStorage`. Displayed on Game Over and Start screens.

---

## Game Structure

Three levels, each with a distinct environment and mini-boss, followed by a final boss fight.

| Level | Environment | Mini-Boss |
|---|---|---|
| 1 — Open Void | Deep space starfield, sparse asteroids | Large alien carrier ship |
| 2 — Debris Field | Dense asteroid belt, wreckage scrolling in foreground | Armored mech walker on a derelict hull |
| 3 — Mothership Interior | Corridor walls close in, tight formations | Twin alien gunships in sync pattern |
| Final — Bridge | Mothership command deck (environmental gimmick TBD) | Massive boss ship (multi-phase) |

---

## Milestones

---

### Milestone 1 — Playable Core Loop

**Goal:** A complete, shippable game with one level. Fun to play end-to-end.

#### Deliverables

1. **Project scaffold**
   - `index.html` with full-screen Canvas, game loop (`requestAnimationFrame`), input handler.
   - Asset loader that maps sprite sheets to named animations.

2. **Player ship**
   - Sprite loaded from SpaceShooter pack, idle + thrust animation.
   - 8-directional movement, screen-edge clamping.
   - Single forward bullet, auto-fire on spacebar hold.
   - Health bar rendered in HUD (top-left).

3. **Scrolling background**
   - Parallax starfield: 2–3 layers scrolling at different speeds.
   - Seamless loop.

4. **Enemy — Alien Drones** (Level 1 fodder)
   - Spawn from right edge in wave patterns (straight line, sine wave, V-formation).
   - Fire slow projectiles back at player.
   - Die on bullet contact, award points.

5. **Mini-boss — Alien Carrier** (end of Level 1)
   - Large multi-sprite boss, health bar displayed top-center.
   - Two attack phases: spread shot barrage, then charge sweep.

6. **Game states**
   - Start screen (title + high score + "Press Space to play")
   - Playing
   - Paused (Escape key)
   - Game Over (score + high score + restart prompt)
   - Level Clear (score tally + "Continue")

7. **Scoring & persistence**
   - Kill score, displayed in HUD.
   - High score saved to `localStorage` on Game Over.

#### Exit Criteria
- Player can start a game, fight through Level 1 waves, defeat the mini-boss, see Level Clear, and die to reach Game Over — all without errors.

---

### Milestone 2 — Full Enemy Roster, Power-ups, and Levels 2 & 3

**Goal:** Complete three-level campaign with all enemy types and the full power-up system.

#### Deliverables

1. **Power-up system**
   - Power-ups drop from destroyed enemies (random chance) or fixed spawn points.
   - Visual pickup sprites from `Assets/Misc/Gems/`.
   - Spread Shot, Laser Beam, Speed Boost, Shield Bubble fully implemented.
   - Active power-ups shown as icons in HUD.

2. **New enemy — Mech Turrets** (Level 2)
   - Ground-mounted on scrolling terrain strip at bottom of screen.
   - Rotate to track player, fire burst shots.
   - Require more hits than drones; award higher score.

3. **Level 2 — Debris Field**
   - Asteroid obstacles that damage player on contact (not destroyable, must dodge).
   - Mech turrets on derelict hull strip.
   - Mini-boss: Armored mech walker — shielded front, must be flanked or hit from behind.

4. **Level 3 — Mothership Interior**
   - Corridor environment with top/bottom wall segments (avoid collision).
   - Dense alien formation attacks.
   - Mini-boss: Twin gunships that mirror each other's movement and coordinate fire.

5. **Difficulty scaling**
   - Each level increases enemy spawn rate and projectile speed.
   - Later waves mix enemy types.

6. **Audio** (placeholder / simple)
   - Web Audio API: synthesized SFX for shoot, explosion, hit, power-up, boss alert.
   - No music required yet.

#### Exit Criteria
- Player can complete all three levels sequentially, encounter all enemy types, collect every power-up type at least once, and defeat all three mini-bosses.

---

### Milestone 3 — Final Boss, Polish, and Ship

**Goal:** Complete, polished game ready to share.

#### Deliverables

1. **Final Boss — Mothership Command**
   - Three phases, each unlocked at HP thresholds:
     - Phase 1: Slow spread fire, summons drone escorts.
     - Phase 2: Laser sweeps + missile barrage.
     - Phase 3: Enraged — all attacks active simultaneously, boss moves.
   - Boss health bar with phase indicator.
   - Dramatic defeat animation (multi-stage explosion sequence).

2. **Visual polish**
   - Screen shake on large explosions and boss hits.
   - Particle effects for bullet impacts, ship destruction, power-up pickups.
   - Boss phase transitions with flash + text callout ("PHASE 2").
   - Animated title screen with scrolling starfield.

3. **Audio**
   - Background music per level (chiptune/synthwave tracks — sourced or generated).
   - Boss music that intensifies per phase.
   - SFX polish pass: spatial volume, pitch variation.

4. **UI / UX**
   - Level intro card (level number + name, 2-second overlay).
   - End-of-level score breakdown (kills, accuracy, damage taken bonus).
   - Credits screen after final boss defeat.
   - Keyboard controls shown on start screen.

5. **Performance & compatibility**
   - Stable 60 fps on mid-range hardware.
   - No memory leaks (sprite/canvas object cleanup).
   - Tested in Chrome, Firefox, Safari.

6. **Ship**
   - Everything in a single directory, openable via `file://` or a simple `npx serve`.
   - No build step, no dependencies, no backend.

#### Exit Criteria
- A fresh player can open `index.html`, play through all three levels, defeat the final boss, see the credits, and replay — with a persistent high score — entirely in browser with no console errors.

---

## Open Questions / Future Scope
- Continue screen (spend score to refill HP mid-run)?
- Mobile / touch support?
- Online leaderboard?
- Unlockable ship variants after first clear?
