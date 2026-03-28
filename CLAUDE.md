# Void Assault — Claude Code Context

## Project Overview
Retro horizontal-scrolling space shooter for desktop web browsers.
- **Stack**: Vanilla HTML5 Canvas 2D API, plain JavaScript (no framework, no build step)
- **Resolution**: 1280×720 canvas, CSS-scaled to viewport (16:9)
- **Entry point**: `index.html` — loads all JS via `<script>` tags (not ES modules, for `file://` compat)
- **Local dev**: `python3 -m http.server 8080`
- **Deployed**: GitHub → `https://github.com/earthshine-hub/void-game.git` → Vercel
- **Current version**: `MILESTONE 3, BUILD 3` (see top of `js/game.js`)

## File Structure
```
index.html          Canvas entry point, loading overlay, script tags
js/
  loader.js         Loader singleton + ASSET_MANIFEST (image paths)
  input.js          Input singleton (_held Set, _justPressed Set, flush() each frame)
  audio.js          Audio singleton — Web Audio API synthesized SFX + music
  sprite.js         SpriteAnim class + keysAnim() / sheetAnim() helpers
  entities.js       All entity classes + LEVEL_SCALE
  game.js           All scenes + game logic (largest file)
  main.js           Async IIFE: resize, init, asset load, RAF loop
Assets/             Sprite PNGs — committed to repo, served statically
SPEC.md             Full game specification
vercel.json         Cache headers (Assets/ = 1yr immutable, js/ = 1hr)
```

## Architecture

### Script load order (index.html)
`loader.js` → `input.js` → `audio.js` → `sprite.js` → `entities.js` → `game.js` → `main.js`

### Game loop (main.js)
RAF loop → `SceneManager.update(dt)` → `SceneManager.render(ctx)` → `Input.flush()`
`dt` is capped at 0.1s to prevent spiral-of-death on tab blur.

### Scene stack (game.js)
`SceneManager.set(scene)` replaces current scene.
Scenes: `LevelIntroScene` → `GameScene` → `PauseScene` / `GameOverScene` / `LevelClearScene` → `CreditsScene` → `StartScene`

### Entity classes (entities.js)
`Player`, `Enemy`, `Turret`, `Asteroid`, `Boss`, `MechBoss`, `TwinBoss`, `FinalBoss`, `Bullet`, `PowerUp`, `Explosion`, `Particle`
- AABB collision via `hitbox()` returning `{x,y,w,h}`
- `TwinBoss` uses `hitboxes()` (array) instead

### Level progression
`StartScene` → `LevelIntroScene(1)` → `GameScene(1)` → `LevelClearScene` → `LevelIntroScene(2)` → … → `LevelIntroScene(4)` → `GameScene(4, FinalBoss)` → `CreditsScene`

### Per-level configs (game.js)
- `LEVEL_SCALE[1..4]` — enemy speed/rate/damage multipliers (in `entities.js`)
- `BG_CONFIGS[1..4]` — background layer keys + scroll speeds
- `LEVEL_NAMES[1..4]` — sector names shown on intro cards
- `makeWaves(levelNum)` — returns wave arrays; `{type:'__boss__'}` sentinel triggers boss spawn

## Key Globals / Patterns
- `_globalParticles` — written by `GameScene.init()` so `Player.takeDamage()` can push shield-pop particles
- `clamp(v, lo, hi)` — utility available in entities.js scope
- Sprite frames loaded as individual PNGs (not spritesheet slicing) via `keysAnim(keys, fps, loop)`
- All scenes are plain object literals with `init()`, `update(dt)`, `render(ctx)` methods

## Audio (IMPORTANT — Safari compatibility)
Safari 16+ throws `NotAllowedError` if `AudioContext` is constructed without a prior user gesture.

**Current pattern** (`Audio.init()`):
- Do NOT construct `AudioContext` at page load
- Register one-time `keydown`/`mousedown`/`touchstart` listeners
- On first interaction: create `AudioContext` AND call `.resume()` synchronously inside the event handler
- Subsequent `_resume()` calls throughout SFX methods handle context re-suspension edge cases

`Audio.startMusic(level)` — synthesized 16-note sawtooth arpeggio, scheduled via Web Audio API lookahead scheduler (2.5s ahead, refilled every 800ms). The `Math.max(sched, currentTime + 0.05)` clamp in `_musicTick()` prevents scheduling in the past if context was briefly suspended.

`Audio.stopMusic()` — call on: `StartScene.init()`, `GameOverScene.init()`, `LevelClearScene.init()`.

## Collision System (game.js `_collide(dt)`)
- Player bullets → enemies, turrets, boss (`_collideBulletVsTarget`)
- Player laser (auto-fires while `player.laserActive`) → enemies + boss, uses `dps * dt`
- `FinalBoss.laserSweepActive` → damages player if `|player.cy - boss.laserSweepY| < 22`
- Enemy bullets → player
- Ramming (enemies/asteroids touching player)
- Power-up collection

## Stats Tracking (per level, reset in `GameScene.init()`)
`GameScene.kills`, `GameScene.shotsFired`, `GameScene.shotsHit`, `Player.damageTaken`
— displayed in `LevelClearScene` score breakdown; perfect run (+500 bonus) if `damageTaken === 0`

## Screen Shake
`GameScene.shakeTimer`, `GameScene.shakeAmt` — applied to game world transform only, HUD is shake-stable.
Trigger: `this.shakeAmt = Math.max(this.shakeAmt, N); this.shakeTimer = Math.max(this.shakeTimer, T);`

## Known Working / Tested
- Chrome ✓, Cursor browser ✓
- Safari: audio fixed in 3.3 (lazy AudioContext creation)
- Laser power-up damages enemies (fixed M2 → M3)
- High score persisted to `localStorage` key `'voidassault_hi'`

## Commands
```bash
# Local dev server
python3 -m http.server 8080

# Deploy (auto via Vercel on push)
git push
```
