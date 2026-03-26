'use strict';

const MILESTONE = 2, BUILD = 1;
const VERSION_STR = 'MILESTONE ' + MILESTONE + '.' + BUILD;

// ─── BACKGROUND ───────────────────────────────────────────────────────────────
const BG_CONFIGS = {
  1: { keys: ['bg_back', 'bg_stars', 'bg_planet'], speeds: [18, 35, 8],  base: '#04060f' },
  2: { keys: ['bg_asteroid', 'bg_planet2'],         speeds: [30, 8],      base: '#020510' },
  3: { keys: ['bg_corridor_back', 'bg_corridor'],   speeds: [20, 55],     base: '#080512' },
};

class Background {
  constructor(levelNum) {
    this.cfg = BG_CONFIGS[levelNum] || BG_CONFIGS[1];
    this.offsets = this.cfg.keys.map(() => 0);
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({ x: Math.random() * CW, y: Math.random() * CH,
        r: 0.5 + Math.random() * 1.8, spd: 20 + Math.random() * 80, alpha: 0.3 + Math.random() * 0.7 });
    }
  }

  update(dt) {
    for (let i = 0; i < this.cfg.keys.length; i++)
      this.offsets[i] = (this.offsets[i] + this.cfg.speeds[i] * dt) % CW;
    for (const s of this.stars) { s.x -= s.spd * dt; if (s.x < -4) { s.x = CW + 4; s.y = Math.random() * CH; } }
  }

  draw(ctx) {
    ctx.fillStyle = this.cfg.base; ctx.fillRect(0, 0, CW, CH);
    for (let i = 0; i < this.cfg.keys.length; i++) {
      const img = Loader.get(this.cfg.keys[i]); if (!img) continue;
      const off = this.offsets[i];
      ctx.drawImage(img, -off, 0, CW, CH);
      ctx.drawImage(img, CW - off, 0, CW, CH);
    }
    for (const s of this.stars) {
      ctx.save(); ctx.globalAlpha = s.alpha; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
}

// ─── WAVE DEFINITIONS ─────────────────────────────────────────────────────────
function makeWaves(levelNum) {
  const base = CW + 70;
  const H = CH;

  function col(type, count, centerY, gap, patFn) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({ type, cx: base + i * 55, cy: centerY + (i - (count - 1) / 2) * gap,
        pattern: patFn ? patFn(i) : 'straight' });
    }
    return arr;
  }

  function vForm(type, count) {
    const mid = Math.floor(count / 2);
    return Array.from({ length: count }, (_, i) => ({
      type, cx: base + Math.abs(i - mid) * 65, cy: H / 2 + (i - mid) * 72, pattern: 'straight'
    }));
  }

  if (levelNum === 2) return [
    // L2 W1 — turrets + small drones
    [...col('turret', 3, H * 0.75, 0, () => 'straight').map(e => ({ ...e, cx: base + e.cx % 200 })),
     ...col('small', 4, H * 0.3, 100)],
    // L2 W2 — diving smalls
    col('small', 10, H / 2, 60, () => 'dive'),
    // L2 W3 — V-form + turrets on terrain
    [...vForm('small', 7), ...col('turret', 2, H * 0.72, 0, () => 'straight').map((e, i) => ({ ...e, cx: base + 80 + i * 160 }))],
    // L2 W4 — mediums + turrets
    [...col('medium', 4, H / 2, 120), ...col('turret', 3, H * 0.76, 0, () => 'straight').map((e, i) => ({ ...e, cx: base + i * 120 }))],
    // L2 W5 — dense mixed
    [...col('medium', 3, H / 2, 130), ...col('small', 6, H / 2, 80, () => 'sine')],
    [{ type: '__boss__' }],
  ];

  if (levelNum === 3) return [
    // L3 W1 — dense corridor smalls
    col('small', 10, H / 2, 55, (i) => i % 2 === 0 ? 'sine' : 'straight'),
    // L3 W2 — mixed corridor
    [...col('medium', 4, H / 2, 110), ...col('small', 5, H / 2, 70, () => 'dive')],
    // L3 W3 — dual columns
    [...col('medium', 4, H * 0.35, 90), ...col('medium', 4, H * 0.65, 90)],
    // L3 W4 — swarm
    col('small', 14, H / 2, 45, (i) => i % 3 === 0 ? 'dive' : 'sine'),
    // L3 W5 — elite mixed with tight timing
    [...col('medium', 5, H / 2, 100), ...col('small', 8, H / 2, 60, () => 'dive')],
    [{ type: '__boss__' }],
  ];

  // Level 1 (default)
  return [
    [...col('small', 3, H * 0.28, 90), ...col('small', 3, H * 0.72, 90)],
    col('small', 8, H / 2, 75, () => 'sine'),
    vForm('small', 9),
    col('medium', 4, H / 2, 120),
    [...col('medium', 3, H / 2, 130), ...col('small', 5, H / 2, 80, () => 'dive')],
    [{ type: '__boss__' }],
  ];
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawHUD(ctx, player, score, waveNum, levelNum, bossActive) {
  // HP bar
  const bw = 220, bh = 16, bx = 18, by = 14;
  ctx.fillStyle = '#1a0000'; ctx.fillRect(bx, by, bw, bh);
  const ratio = player.hp / player.maxHp;
  ctx.fillStyle = ratio > 0.5 ? '#00dd44' : ratio > 0.25 ? '#ffbb00' : '#ff2200';
  ctx.fillRect(bx, by, bw * ratio, bh);
  ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px "Courier New"';
  ctx.fillText('HP  ' + player.hp + ' / ' + player.maxHp, bx + 4, by + bh + 13);

  // Active power-up icons (below HP bar)
  let iconX = bx;
  const iconY = by + bh + 28;
  const icons = [];
  if (player.spreadLevel > 0) icons.push({ label: 'SPREAD ' + (player.spreadLevel === 2 ? '5-WAY' : '3-WAY'), color: '#ffcc00' });
  if (player.laserActive)     icons.push({ label: 'LASER ' + player.laserTimer.toFixed(1) + 's', color: '#00ff88' });
  if (player.speedTimer > 0)  icons.push({ label: 'SPEED ' + player.speedTimer.toFixed(1) + 's', color: '#00bfff' });
  if (player.shieldActive)    icons.push({ label: 'SHIELD', color: '#ff88ff' });
  for (const ic of icons) {
    ctx.fillStyle = ic.color; ctx.font = 'bold 10px "Courier New"';
    ctx.fillText(ic.label, iconX, iconY);
    iconX += ctx.measureText(ic.label).width + 14;
  }

  // Score (top-right)
  ctx.fillStyle = '#00ddff'; ctx.font = 'bold 20px "Courier New"'; ctx.textAlign = 'right';
  ctx.fillText(String(score).padStart(8, '0'), CW - 18, 30);
  ctx.fillStyle = '#668899'; ctx.font = '12px "Courier New"';
  ctx.fillText('SCORE', CW - 18, 46);
  ctx.textAlign = 'left';

  // Level + wave (center top)
  if (!bossActive) {
    ctx.fillStyle = '#446688'; ctx.font = '13px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('LEVEL ' + levelNum + '   WAVE ' + waveNum, CW / 2, 22);
    ctx.textAlign = 'left';
  }
}

// ─── GAME SCENE ───────────────────────────────────────────────────────────────
const GameScene = {
  bg: null, player: null,
  enemies: [], turrets: [], powerups: [], asteroids: [],
  playerBullets: [], enemyBullets: [],
  explosions: [], particles: [],
  boss: null, bossActive: false,
  score: 0, levelNum: 1, waveIndex: 0,
  waveDelay: 0, waveCleared: false, allWavesDone: false, waves: [],
  anims: {},
  // Level-specific
  asteroidTimer: 0,
  corridorWalls: false,
  corridorTop: 55, corridorBot: 665,   // player Y constraints for Level 3

  init(levelNum) {
    this.levelNum = levelNum || 1;
    this.bg = new Background(this.levelNum);
    this.waves = makeWaves(this.levelNum);
    this.score = this.score || 0;   // preserve score across levels
    this.waveIndex = 0; this.waveDelay = 1.5; this.waveCleared = true;
    this.allWavesDone = false; this.bossActive = false;
    this.enemies = []; this.turrets = []; this.powerups = []; this.asteroids = [];
    this.playerBullets = []; this.enemyBullets = [];
    this.explosions = []; this.particles = [];
    this.boss = null;
    this.asteroidTimer = 2;
    this.corridorWalls = (this.levelNum === 3);

    // Build/reuse animations
    const A = this.anims;
    if (!A.player) {
      A.player   = keysAnim(['ship1','ship2','ship3','ship4','ship5','ship6','ship7','ship8','ship9','ship10'], 10);
      A.alien    = keysAnim(['alien1','alien2','alien3','alien4','alien5','alien6','alien7','alien8'], 10);
      A.alienWlk = keysAnim(['alien_walk1','alien_walk2','alien_walk3','alien_walk4'], 8);
      A.enemyMed = keysAnim(['enemy_med1','enemy_med2'], 6);
      A.mech     = keysAnim(['mech1','mech2','mech3','mech4','mech5','mech6','mech7','mech8','mech9','mech10'], 10);
      A.boss1    = keysAnim(['boss1','boss2','boss3','boss4','boss5'], 8);
      A.explode  = keysAnim(['exp1','exp2','exp3','exp4','exp5'], 12, false);
      A.bolt     = keysAnim(['bolt1','bolt2','bolt3','bolt4'], 18);
    }

    // Preserve or create player
    if (!this.player) {
      this.player = new Player(A.player);
    } else {
      // Carry HP/powerups into next level — keep existing player object
      this.player.cx = 160; this.player.cy = CH / 2;
    }

    // Wire global particle array so Player.takeDamage shield pops work
    _globalParticles = this.particles;
    return this;
  },

  _animForType(type) {
    const A = this.anims;
    if (type === 'small')  return this.levelNum === 3 ? A.alienWlk.clone() : A.alien.clone();
    if (type === 'medium') return A.enemyMed.clone();
    if (type === 'turret') return A.mech.clone();
    return A.alien.clone();
  },

  _spawnWave(idx) {
    const defs = this.waves[idx];
    if (defs[0] && defs[0].type === '__boss__') {
      const A = this.anims;
      if (this.levelNum === 1) this.boss = new Boss(A.boss1.clone());
      else if (this.levelNum === 2) this.boss = new MechBoss(A.mech.clone());
      else this.boss = new TwinBoss(A.alien.clone(), A.alien.clone());
      this.bossActive = true; this.allWavesDone = true;
      return;
    }
    const sc = LEVEL_SCALE[this.levelNum];
    for (const d of defs) {
      const anim = this._animForType(d.type);
      if (d.type === 'turret') {
        this.turrets.push(new Turret(d.cx, d.cy, anim, sc));
      } else {
        this.enemies.push(new Enemy(d.type, d.cx, d.cy, d.pattern, anim, sc));
      }
    }
  },

  _checkWaveCleared() {
    if (this.allWavesDone || this.bossActive) return;
    const aliveEnemies  = this.enemies.some(e => !e.dead && !e.offScreen());
    const aliveTurrets  = this.turrets.some(t => !t.dead && !t.offScreen());
    if (!aliveEnemies && !aliveTurrets && !this.waveCleared) {
      this.waveCleared = true; this.waveDelay = 2.2;
    }
  },

  _tryDropPowerup(cx, cy, dropChance) {
    if (Math.random() < dropChance) {
      this.powerups.push(new PowerUp(cx, cy, randomPowerupType()));
    }
  },

  _collideBulletVsTarget(b, target) {
    if (b.dead || target.dead) return false;
    const bh = b.hitbox(), th = target.hitbox ? target.hitbox() : null;
    if (!th) return false;
    if (aabb(bh.x, bh.y, bh.w, bh.h, th.x, th.y, th.w, th.h)) {
      b.dead = true; target.takeDamage(b.dmg); return true;
    }
    return false;
  },

  _collide() {
    const p = this.player, ph = p.hitbox();

    // Player bullets → enemies
    for (const b of this.playerBullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (this._collideBulletVsTarget(b, e)) {
          const died = e.dead;
          if (died) {
            this.score += e.pts;
            this.explosions.push(makeExplosion(e.cx, e.cy, 70, this.anims.explode));
            spawnParticles(e.cx, e.cy, 14, ['#ff8800','#ffcc00','#ff4400'], this.particles);
            this._tryDropPowerup(e.cx, e.cy, 0.13);
            Audio.explosion();
          }
          break;
        }
      }
      // Player bullets → turrets
      if (!b.dead) {
        for (const t of this.turrets) {
          if (this._collideBulletVsTarget(b, t)) {
            if (t.dead) {
              this.score += t.pts;
              this.explosions.push(makeExplosion(t.cx, t.cy, 60, this.anims.explode));
              spawnParticles(t.cx, t.cy, 12, ['#88bb44','#ffcc00','#ffffff'], this.particles);
              this._tryDropPowerup(t.cx, t.cy, 0.28);
              Audio.explosion();
            }
            break;
          }
        }
      }
      // Player bullets → boss (single or twin)
      if (!b.dead && this.boss && !this.boss.dead) {
        const bh2 = b.hitbox();
        let hit = false;
        if (this.boss.hitboxes) {
          for (const hb of this.boss.hitboxes()) {
            if (aabb(bh2.x, bh2.y, bh2.w, bh2.h, hb.x, hb.y, hb.w, hb.h)) { hit = true; break; }
          }
        } else {
          const bosh = this.boss.hitbox();
          hit = aabb(bh2.x, bh2.y, bh2.w, bh2.h, bosh.x, bosh.y, bosh.w, bosh.h);
        }
        if (hit) { b.dead = true; this.boss.takeDamage(b.dmg); }
      }
    }

    // Laser → enemies + boss (DPS)
    if (p.laserActive && Input.held('Space')) {
      const ly = p.cy, lx = p.cx + p.w / 2;
      const dps = 80;
      for (const e of this.enemies) {
        if (!e.dead && Math.abs(e.cy - ly) < e.hh && e.cx > lx) {
          const wasDead = e.dead;
          e.takeDamage(dps * 0.016);   // per-frame approx (assume ~60fps cap)
          if (!wasDead && e.dead) {
            this.score += e.pts;
            this.explosions.push(makeExplosion(e.cx, e.cy, 70, this.anims.explode));
            spawnParticles(e.cx, e.cy, 14, ['#00ff88','#ffffff','#00ffcc'], this.particles);
            this._tryDropPowerup(e.cx, e.cy, 0.13);
            Audio.explosion();
          }
        }
      }
      if (this.boss && !this.boss.dead) this.boss.takeDamage(dps * 0.016);
    }

    // Enemy bullets → player
    for (const b of this.enemyBullets) {
      if (b.dead) continue;
      const bh = b.hitbox();
      if (aabb(bh.x, bh.y, bh.w, bh.h, ph.x, ph.y, ph.w, ph.h)) {
        b.dead = true; p.takeDamage(b.dmg);
        spawnParticles(p.cx, p.cy, 8, ['#0088ff','#00ffff','#ffffff'], this.particles);
      }
    }

    // Enemies ramming player
    for (const e of this.enemies) {
      if (e.dead) continue;
      const eh = e.hitbox();
      if (aabb(eh.x, eh.y, eh.w, eh.h, ph.x, ph.y, ph.w, ph.h)) {
        p.takeDamage(30); e.takeDamage(9999);
        this.explosions.push(makeExplosion(e.cx, e.cy, 55, this.anims.explode));
        spawnParticles(e.cx, e.cy, 10, ['#ff8800','#ff4400'], this.particles);
        Audio.explosion();
      }
    }

    // Asteroids → player (Level 2)
    for (const a of this.asteroids) {
      const dx = a.cx - (ph.x + ph.w / 2), dy = a.cy - (ph.y + ph.h / 2);
      if (Math.sqrt(dx * dx + dy * dy) < a.radius + 22) {
        p.takeDamage(22);
        spawnParticles(a.cx, a.cy, 10, ['#888877','#aaa995','#ff8800'], this.particles);
      }
    }

    // Player collecting power-ups
    for (const pu of this.powerups) {
      if (pu.dead) continue;
      const dx = pu.cx - p.cx, dy = pu.cy - p.cy;
      if (Math.sqrt(dx * dx + dy * dy) < pu.r + 26) {
        pu.dead = true; p.collectPowerup(pu.type);
      }
    }
  },

  update(dt) {
    if (Input.pressed('Escape')) { SceneManager.push(PauseScene); return; }

    // Expose particles to Player for shield pop
    _globalParticles = this.particles;

    const yMin = this.corridorWalls ? this.corridorTop  : undefined;
    const yMax = this.corridorWalls ? this.corridorBot  : undefined;

    this.bg.update(dt);
    this.player.update(dt, this.playerBullets, yMin, yMax);

    // Wave / boss spawning
    if (!this.bossActive) {
      this._checkWaveCleared();
      if (this.waveCleared) {
        this.waveDelay -= dt;
        if (this.waveDelay <= 0) {
          this.waveCleared = false;
          if (this.waveIndex < this.waves.length) this._spawnWave(this.waveIndex++);
        }
      }
    }

    // Enemies + turrets
    for (const e of this.enemies) if (!e.dead) e.update(dt, this.player.cx, this.player.cy, this.enemyBullets);
    for (const t of this.turrets) if (!t.dead) t.update(dt, this.player.cx, this.player.cy, this.enemyBullets);
    this.enemies = this.enemies.filter(e => !e.dead && !e.offScreen());
    this.turrets = this.turrets.filter(t => !t.dead && !t.offScreen());

    // Boss
    if (this.boss) {
      this.boss.update(dt, this.player.cy, this.enemyBullets, () => {
        this.score += this.boss.pts || 1000;
        SceneManager.set(LevelClearScene.init(this.score, this.levelNum));
      });
    }

    // Asteroids (Level 2 only)
    if (this.levelNum === 2) {
      this.asteroidTimer -= dt;
      if (this.asteroidTimer <= 0) {
        this.asteroidTimer = 1.6 + Math.random() * 2.2;
        const r = 22 + Math.random() * 28;
        const img = Loader.get('asteroid' + (1 + Math.floor(Math.random() * 5)));
        this.asteroids.push(new Asteroid(CW + r + 10, 80 + Math.random() * (CH - 160), r, img));
      }
      for (const a of this.asteroids) a.update(dt);
      this.asteroids = this.asteroids.filter(a => !a.dead);
    }

    // Power-ups
    for (const pu of this.powerups) pu.update(dt);
    this.powerups = this.powerups.filter(pu => !pu.dead);

    // Bullets
    for (const b of this.playerBullets) b.update(dt);
    for (const b of this.enemyBullets)  b.update(dt);
    this.playerBullets = this.playerBullets.filter(b => !b.dead && !b.offScreen());
    this.enemyBullets  = this.enemyBullets.filter(b => !b.dead && !b.offScreen());

    // FX
    for (const e of this.explosions) e.update(dt);
    for (const p of this.particles)  p.update(dt);
    this.explosions = this.explosions.filter(e => !e.done);
    this.particles  = this.particles.filter(p => !p.dead);

    this._collide();

    if (this.player.dead) SceneManager.set(GameOverScene.init(this.score));
  },

  render(ctx) {
    this.bg.draw(ctx);

    // Asteroids behind everything else
    for (const a of this.asteroids) a.draw(ctx);

    for (const e of this.explosions) e.draw(ctx);
    for (const p of this.particles)  p.draw(ctx);

    for (const pu of this.powerups)  pu.draw(ctx);
    for (const e of this.enemies)    e.draw(ctx);
    for (const t of this.turrets)    t.draw(ctx);
    if (this.boss) this.boss.draw(ctx);

    for (const b of this.enemyBullets)  b.draw(ctx, null);
    for (const b of this.playerBullets) b.draw(ctx, this.anims.bolt);

    // Laser beam
    if (this.player.laserActive && Input.held('Space')) {
      const lx = this.player.cx + this.player.w / 2, ly = this.player.cy;
      ctx.save();
      ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 3 + Math.random() * 2;
      ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(CW + 10, ly); ctx.stroke();
      // Inner bright core
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(CW + 10, ly); ctx.stroke();
      ctx.restore();
    }

    this.player.draw(ctx);

    // Corridor wall overlays (Level 3)
    if (this.corridorWalls) {
      ctx.fillStyle = '#0d0a18';
      ctx.fillRect(0, 0, CW, this.corridorTop);
      ctx.fillRect(0, this.corridorBot, CW, CH - this.corridorBot);
      // Neon edge lines
      ctx.strokeStyle = '#8844ff'; ctx.lineWidth = 2;
      ctx.shadowColor = '#8844ff'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(0, this.corridorTop); ctx.lineTo(CW, this.corridorTop); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, this.corridorBot); ctx.lineTo(CW, this.corridorBot); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    drawHUD(ctx, this.player, this.score, this.waveIndex, this.levelNum, this.bossActive);
    if (this.boss && !this.boss.dead) this.boss.drawHPBar(ctx);

    // Wave incoming notice
    if (this.waveCleared && this.waveDelay > 0 && !this.bossActive && this.waveIndex < this.waves.length) {
      const isBoss = this.waves[this.waveIndex]?.[0]?.type === '__boss__';
      ctx.save(); ctx.globalAlpha = Math.min(1, this.waveDelay * 1.5);
      ctx.fillStyle = isBoss ? '#ff4400' : '#00ccff';
      ctx.font = 'bold 22px "Courier New"'; ctx.textAlign = 'center';
      ctx.fillText(isBoss ? '!! BOSS INCOMING !!' : 'WAVE ' + (this.waveIndex + 1), CW / 2, CH / 2);
      ctx.restore(); ctx.textAlign = 'left';
    }
  },
};

// ─── START SCENE ──────────────────────────────────────────────────────────────
const StartScene = {
  bg: null, t: 0,

  init() {
    this.bg = new Background(1); this.t = 0;
    return this;
  },

  update(dt) {
    this.t += dt; this.bg.update(dt);
    if (Input.pressed('Space') || Input.pressed('Enter')) {
      GameScene.score = 0;
      GameScene.player = null;   // fresh player each new game
      GameScene.anims = {};
      GameScene.init(1);
      SceneManager.set(GameScene);
    }
  },

  render(ctx) {
    this.bg.draw(ctx);
    const pulse = 0.85 + 0.15 * Math.sin(this.t * 2.4);
    ctx.save(); ctx.globalAlpha = pulse;
    ctx.fillStyle = '#00bfff'; ctx.font = 'bold 88px "Courier New"';
    ctx.textAlign = 'center'; ctx.shadowColor = '#00bfff'; ctx.shadowBlur = 30;
    ctx.fillText('VOID ASSAULT', CW / 2, CH / 2 - 60); ctx.restore();

    ctx.fillStyle = '#334455'; ctx.font = '14px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(VERSION_STR, CW / 2, CH / 2 - 22);
    ctx.fillStyle = '#fff'; ctx.font = '22px "Courier New"';
    ctx.fillText('PRESS  SPACE  TO  BEGIN', CW / 2, CH / 2 + 20);
    const hs = parseInt(localStorage.getItem('voidassault_hi') || '0');
    ctx.fillStyle = '#778899'; ctx.font = '16px "Courier New"';
    ctx.fillText('HIGH SCORE   ' + String(hs).padStart(8, '0'), CW / 2, CH / 2 + 68);
    ctx.font = '13px "Courier New"'; ctx.fillStyle = '#445566';
    ctx.fillText('WASD / ARROWS — move     SPACE — fire / laser     ESC — pause', CW / 2, CH - 30);
    ctx.textAlign = 'left';
  },
};

// ─── PAUSE SCENE ──────────────────────────────────────────────────────────────
const PauseScene = {
  update(dt) { if (Input.pressed('Escape') || Input.pressed('Space')) SceneManager.pop(); },
  render(ctx) {
    GameScene.render(ctx);
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 60px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CW / 2, CH / 2 - 20);
    ctx.font = '20px "Courier New"'; ctx.fillStyle = '#99aabb';
    ctx.fillText('PRESS ESC OR SPACE TO RESUME', CW / 2, CH / 2 + 36);
    ctx.textAlign = 'left'; ctx.restore();
  },
};

// ─── GAME OVER SCENE ──────────────────────────────────────────────────────────
const GameOverScene = {
  score: 0, t: 0,

  init(score) {
    this.score = score; this.t = 0;
    const hi = parseInt(localStorage.getItem('voidassault_hi') || '0');
    if (score > hi) localStorage.setItem('voidassault_hi', score);
    return this;
  },

  update(dt) {
    this.t += dt;
    if (this.t > 1.0 && (Input.pressed('Space') || Input.pressed('Enter')))
      SceneManager.set(StartScene.init());
  },

  render(ctx) {
    if (GameScene.bg) GameScene.bg.draw(ctx); else { ctx.fillStyle = '#04060f'; ctx.fillRect(0, 0, CW, CH); }
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = '#ff2200'; ctx.font = 'bold 80px "Courier New"'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 24; ctx.fillText('GAME  OVER', CW / 2, CH / 2 - 60);
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '26px "Courier New"';
    ctx.fillText('SCORE   ' + String(this.score).padStart(8, '0'), CW / 2, CH / 2 + 14);
    const hi = parseInt(localStorage.getItem('voidassault_hi') || '0');
    ctx.fillStyle = '#ffcc00'; ctx.font = '18px "Courier New"';
    ctx.fillText('HIGH SCORE   ' + String(hi).padStart(8, '0'), CW / 2, CH / 2 + 52);
    if (this.t > 1.0) { ctx.fillStyle = '#aabbcc'; ctx.font = '16px "Courier New"';
      ctx.fillText('PRESS SPACE TO RETURN TO TITLE', CW / 2, CH / 2 + 102); }
    ctx.textAlign = 'left'; ctx.restore();
  },
};

// ─── LEVEL CLEAR SCENE ────────────────────────────────────────────────────────
const LevelClearScene = {
  score: 0, levelNum: 1, t: 0,

  init(score, levelNum) {
    this.score = score; this.levelNum = levelNum; this.t = 0;
    Audio.levelClear();
    return this;
  },

  update(dt) {
    this.t += dt;
    if (this.t > 2.0 && (Input.pressed('Space') || Input.pressed('Enter'))) {
      if (this.levelNum < 3) {
        // Carry player and score into next level
        GameScene.init(this.levelNum + 1);
        SceneManager.set(GameScene);
      } else {
        SceneManager.set(StartScene.init());
      }
    }
  },

  render(ctx) {
    if (GameScene.bg) GameScene.bg.draw(ctx); else { ctx.fillStyle = '#04060f'; ctx.fillRect(0, 0, CW, CH); }
    ctx.save(); ctx.fillStyle = 'rgba(0,0,20,0.65)'; ctx.fillRect(0, 0, CW, CH);
    const isLast = this.levelNum >= 3;
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 70px "Courier New"'; ctx.textAlign = 'center';
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 28;
    ctx.fillText(isLast ? 'ALL SECTORS CLEARED' : 'SECTOR ' + this.levelNum + ' CLEARED', CW / 2, CH / 2 - 65);
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '26px "Courier New"';
    ctx.fillText('SCORE   ' + String(this.score).padStart(8, '0'), CW / 2, CH / 2 + 10);
    if (this.t > 2.0) {
      ctx.fillStyle = '#aabbcc'; ctx.font = '16px "Courier New"';
      const msg = isLast ? 'PRESS SPACE TO RETURN TO TITLE' : 'PRESS SPACE TO ADVANCE TO LEVEL ' + (this.levelNum + 1);
      ctx.fillText(msg, CW / 2, CH / 2 + 75);
    }
    ctx.textAlign = 'left'; ctx.restore();
  },
};

// ─── SCENE MANAGER ────────────────────────────────────────────────────────────
const SceneManager = {
  _stack: [],
  set(scene)  { this._stack = [scene]; },
  push(scene) { this._stack.push(scene); },
  pop()       { if (this._stack.length > 1) this._stack.pop(); },
  get current() { return this._stack[this._stack.length - 1]; },
  update(dt)  { this.current && this.current.update(dt); },
  render(ctx) { this.current && this.current.render(ctx); },
};
