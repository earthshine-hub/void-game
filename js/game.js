'use strict';

// ─── WAVE DEFINITIONS ─────────────────────────────────────────────────────────
// Each wave is an array of enemy spawn descriptors.
// cx/cy are initial positions; pattern is movement style.
function makeWaves() {
  const W = CW, H = CH;
  const base = W + 70;

  // Helper: staggered column of enemies entering from right
  function col(type, count, centerY, gap, patternFn) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const cy = centerY + (i - (count - 1) / 2) * gap;
      arr.push({ type, cx: base + i * 55, cy, pattern: patternFn ? patternFn(i) : 'straight' });
    }
    return arr;
  }

  function vForm(type, count) {
    const arr = [];
    const mid = Math.floor(count / 2);
    for (let i = 0; i < count; i++) {
      const offset = (i - mid) * 72;
      const depth  = Math.abs(i - mid) * 65;
      arr.push({ type, cx: base + depth, cy: H / 2 + offset, pattern: 'straight' });
    }
    return arr;
  }

  return [
    // Wave 1 — straight rows, top + bottom
    [...col('small', 3, H * 0.28, 90), ...col('small', 3, H * 0.72, 90)],
    // Wave 2 — sine wave
    col('small', 8, H / 2, 75, () => 'sine'),
    // Wave 3 — V-formation
    vForm('small', 9),
    // Wave 4 — medium column
    col('medium', 4, H / 2, 120),
    // Wave 5 — mixed: mediums + diving smalls
    [...col('medium', 3, H / 2, 130), ...col('small', 5, H / 2, 80, () => 'dive')],
    // Wave 6 — BOSS (special sentinel)
    [{ type: '__boss__' }],
  ];
}

// ─── BACKGROUND ───────────────────────────────────────────────────────────────
class Background {
  constructor() {
    // Generated starfield (always works, no asset dependency)
    this.stars = [];
    for (let i = 0; i < 220; i++) {
      this.stars.push({
        x: Math.random() * CW, y: Math.random() * CH,
        r: 0.5 + Math.random() * 1.8,
        spd: 20 + Math.random() * 80,
        alpha: 0.3 + Math.random() * 0.7,
      });
    }
    // Asset layer offsets
    this.offsets = [0, 0, 0];
    this.speeds  = [18, 35, 8];    // bg_back, bg_stars, bg_planet
    this.keys    = ['bg_back', 'bg_stars', 'bg_planet'];
  }

  update(dt) {
    for (let i = 0; i < 3; i++) this.offsets[i] = (this.offsets[i] + this.speeds[i] * dt) % CW;
    for (const s of this.stars) {
      s.x -= s.spd * dt;
      if (s.x < -4) { s.x = CW + 4; s.y = Math.random() * CH; }
    }
  }

  draw(ctx) {
    // Deep space base
    ctx.fillStyle = '#04060f';
    ctx.fillRect(0, 0, CW, CH);

    // Asset layers (tiled horizontally)
    for (let i = 0; i < this.keys.length; i++) {
      const img = Loader.get(this.keys[i]);
      if (!img) continue;
      const off = this.offsets[i];
      // Draw twice for seamless tiling
      ctx.drawImage(img, -off, 0, CW, CH);
      ctx.drawImage(img, CW - off, 0, CW, CH);
    }

    // Star particles (drawn on top of dark layers)
    for (const s of this.stars) {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawHUD(ctx, player, score, wave, bossActive) {
  // Health bar (top-left)
  const bw = 220, bh = 16, bx = 18, by = 14;
  ctx.fillStyle = '#1a0000'; ctx.fillRect(bx, by, bw, bh);
  const ratio = player.hp / player.maxHp;
  ctx.fillStyle = ratio > 0.5 ? '#00dd44' : ratio > 0.25 ? '#ffbb00' : '#ff2200';
  ctx.fillRect(bx, by, bw * ratio, bh);
  ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px "Courier New"';
  ctx.fillText('HP  ' + player.hp + ' / ' + player.maxHp, bx + 4, by + bh + 13);

  // Score (top-right)
  ctx.fillStyle = '#00ddff'; ctx.font = 'bold 20px "Courier New"';
  ctx.textAlign = 'right';
  ctx.fillText(String(score).padStart(8, '0'), CW - 18, 30);
  ctx.fillStyle = '#668899'; ctx.font = '12px "Courier New"';
  ctx.fillText('SCORE', CW - 18, 46);
  ctx.textAlign = 'left';

  // Wave indicator (when no boss)
  if (!bossActive) {
    ctx.fillStyle = '#446688'; ctx.font = '13px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('WAVE  ' + wave, CW / 2, 22);
    ctx.textAlign = 'left';
  }
}

// ─── GAME SCENE ───────────────────────────────────────────────────────────────
const GameScene = {
  bg: null,
  player: null,
  enemies: [],
  playerBullets: [],
  enemyBullets: [],
  explosions: [],
  particles: [],
  boss: null,
  bossActive: false,
  score: 0,
  waveIndex: 0,
  waveDelay: 0,
  waveCleared: false,
  allWavesDone: false,
  waves: [],
  anims: {},

  init() {
    this.bg = new Background();
    this.waves = makeWaves();
    this.score = 0;
    this.waveIndex = 0;
    this.waveDelay = 1.5;
    this.waveCleared = true;   // trigger first spawn immediately
    this.allWavesDone = false;
    this.bossActive = false;
    this.enemies = [];
    this.playerBullets = [];
    this.enemyBullets = [];
    this.explosions = [];
    this.particles = [];
    this.boss = null;

    // Build animations from loaded assets
    const A = this.anims;
    A.player   = keysAnim(['ship1','ship2','ship3','ship4','ship5','ship6','ship7','ship8','ship9','ship10'], 10);
    A.alien    = keysAnim(['alien1','alien2','alien3','alien4','alien5','alien6','alien7','alien8'], 10);
    A.enemyMed = keysAnim(['enemy_med1','enemy_med2'], 6);
    A.boss     = keysAnim(['boss1','boss2','boss3','boss4','boss5'], 8);
    A.explode  = keysAnim(['exp1','exp2','exp3','exp4','exp5'], 12, false);
    A.bolt     = keysAnim(['bolt1','bolt2','bolt3','bolt4'], 18);

    this.player = new Player(A.player);
  },

  _spawnWave(idx) {
    const defs = this.waves[idx];
    if (defs[0] && defs[0].type === '__boss__') {
      this.boss = new Boss(this.anims.boss.clone());
      this.bossActive = true;
      this.allWavesDone = true;
      return;
    }
    for (const d of defs) {
      let anim;
      if (d.type === 'small')  anim = this.anims.alien.clone();
      if (d.type === 'medium') anim = this.anims.enemyMed.clone();
      this.enemies.push(new Enemy(d.type, d.cx, d.cy, d.pattern, anim));
    }
  },

  _checkWaveCleared() {
    if (this.allWavesDone || this.bossActive) return;
    const alive = this.enemies.some(e => !e.dead && !e.offScreen());
    if (!alive && !this.waveCleared) {
      this.waveCleared = true;
      this.waveDelay = 2.2;
    }
  },

  _collide() {
    const p = this.player;
    const ph = p.hitbox();

    // Player bullets → enemies
    for (const b of this.playerBullets) {
      if (b.dead) continue;
      const bh = b.hitbox();
      for (const e of this.enemies) {
        if (e.dead) continue;
        const eh = e.hitbox();
        if (aabb(bh.x, bh.y, bh.w, bh.h, eh.x, eh.y, eh.w, eh.h)) {
          b.dead = true;
          const wasAlive = !e.dead;
          e.takeDamage(b.dmg);
          if (wasAlive && e.dead) {
            this.score += e.pts;
            this.explosions.push(makeExplosion(e.cx, e.cy, 70, this.anims.explode));
            spawnParticles(e.cx, e.cy, 14, ['#ff8800','#ffcc00','#ff4400'], this.particles);
            Audio.explosion();
          }
          break;
        }
      }
      // Player bullets → boss
      if (!b.dead && this.boss && !this.boss.dead) {
        const bosh = this.boss.hitbox();
        if (aabb(bh.x, bh.y, bh.w, bh.h, bosh.x, bosh.y, bosh.w, bosh.h)) {
          b.dead = true;
          this.boss.takeDamage(b.dmg);
        }
      }
    }

    // Enemy bullets → player
    for (const b of this.enemyBullets) {
      if (b.dead) continue;
      const bh = b.hitbox();
      if (aabb(bh.x, bh.y, bh.w, bh.h, ph.x, ph.y, ph.w, ph.h)) {
        b.dead = true;
        p.takeDamage(b.dmg);
        spawnParticles(p.cx, p.cy, 8, ['#0088ff','#00ffff','#ffffff'], this.particles);
      }
    }

    // Enemies touching player
    for (const e of this.enemies) {
      if (e.dead) continue;
      const eh = e.hitbox();
      if (aabb(eh.x, eh.y, eh.w, eh.h, ph.x, ph.y, ph.w, ph.h)) {
        p.takeDamage(30);
        e.takeDamage(9999);
        this.explosions.push(makeExplosion(e.cx, e.cy, 55, this.anims.explode));
        spawnParticles(e.cx, e.cy, 10, ['#ff8800','#ff4400'], this.particles);
        Audio.explosion();
      }
    }
  },

  update(dt) {
    if (Input.pressed('Escape')) { SceneManager.push(PauseScene); return; }

    this.bg.update(dt);
    this.player.update(dt, this.playerBullets);

    // Wave / boss spawning
    if (!this.bossActive) {
      this._checkWaveCleared();
      if (this.waveCleared) {
        this.waveDelay -= dt;
        if (this.waveDelay <= 0) {
          this.waveCleared = false;
          if (this.waveIndex < this.waves.length) {
            this._spawnWave(this.waveIndex++);
          }
        }
      }
    }

    // Update enemies
    for (const e of this.enemies) {
      if (!e.dead) e.update(dt, this.player.cx, this.player.cy, this.enemyBullets);
    }
    this.enemies = this.enemies.filter(e => !e.dead && !e.offScreen());

    // Update boss
    if (this.boss) {
      this.boss.update(dt, this.player.cy, this.enemyBullets, () => {
        this.score += 1000;
        SceneManager.set(LevelClearScene.init(this.score));
      });
    }

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

    if (this.player.dead) {
      SceneManager.set(GameOverScene.init(this.score));
    }
  },

  render(ctx) {
    this.bg.draw(ctx);

    for (const e of this.explosions) e.draw(ctx);
    for (const p of this.particles)  p.draw(ctx);

    for (const e of this.enemies) e.draw(ctx);
    if (this.boss) this.boss.draw(ctx);

    // Draw enemy bullets under player bullets for clarity
    const A = this.anims;
    for (const b of this.enemyBullets)  b.draw(ctx, null);
    for (const b of this.playerBullets) b.draw(ctx, A.bolt);

    this.player.draw(ctx);

    drawHUD(ctx, this.player, this.score, this.waveIndex, this.bossActive);
    if (this.boss && !this.boss.dead) this.boss.drawHPBar(ctx);

    // Wave incoming notice
    if (this.waveCleared && this.waveDelay > 0 && !this.bossActive && this.waveIndex < this.waves.length) {
      const next = this.waves[this.waveIndex];
      const isBoss = next && next[0] && next[0].type === '__boss__';
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.waveDelay * 1.5);
      ctx.fillStyle = isBoss ? '#ff4400' : '#00ccff';
      ctx.font = 'bold 22px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(isBoss ? '!! BOSS INCOMING !!' : 'WAVE ' + (this.waveIndex + 1), CW / 2, CH / 2);
      ctx.restore();
      ctx.textAlign = 'left';
    }
  },
};

// ─── START SCENE ──────────────────────────────────────────────────────────────
const StartScene = {
  bg: null, t: 0,

  init() {
    this.bg = new Background();
    this.t = 0;
    return this;
  },

  update(dt) {
    this.t += dt;
    this.bg.update(dt);
    if (Input.pressed('Space') || Input.pressed('Enter')) {
      GameScene.init();
      SceneManager.set(GameScene);
    }
  },

  render(ctx) {
    this.bg.draw(ctx);

    // Title glow pulse
    const pulse = 0.85 + 0.15 * Math.sin(this.t * 2.4);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#00bfff';
    ctx.font = 'bold 88px "Courier New"';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00bfff'; ctx.shadowBlur = 30;
    ctx.fillText('VOID ASSAULT', CW / 2, CH / 2 - 60);
    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.font = '22px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS  SPACE  TO  BEGIN', CW / 2, CH / 2 + 20);

    const hs = parseInt(localStorage.getItem('voidassault_hi') || '0');
    ctx.fillStyle = '#778899';
    ctx.font = '16px "Courier New"';
    ctx.fillText('HIGH SCORE   ' + String(hs).padStart(8, '0'), CW / 2, CH / 2 + 68);

    ctx.font = '13px "Courier New"';
    ctx.fillStyle = '#445566';
    ctx.fillText('WASD / ARROWS  —  move          SPACE  —  fire          ESC  —  pause', CW / 2, CH - 30);
    ctx.textAlign = 'left';
  },
};

// ─── PAUSE SCENE ──────────────────────────────────────────────────────────────
const PauseScene = {
  update(dt) {
    if (Input.pressed('Escape') || Input.pressed('Space')) SceneManager.pop();
  },

  render(ctx) {
    // Draw the game underneath (frozen); safe because PauseScene can only be
    // pushed while GameScene is active, so GameScene is always initialized here.
    GameScene.render(ctx);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 60px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CW / 2, CH / 2 - 20);
    ctx.font = '20px "Courier New"';
    ctx.fillStyle = '#99aabb';
    ctx.fillText('PRESS ESC OR SPACE TO RESUME', CW / 2, CH / 2 + 36);
    ctx.textAlign = 'left';
    ctx.restore();
  },
};

// ─── GAME OVER SCENE ──────────────────────────────────────────────────────────
const GameOverScene = {
  score: 0, t: 0,

  init(score) {
    this.score = score;
    this.t = 0;
    const hi = parseInt(localStorage.getItem('voidassault_hi') || '0');
    if (score > hi) localStorage.setItem('voidassault_hi', score);
    return this;
  },

  update(dt) {
    this.t += dt;
    if (this.t > 1.0 && (Input.pressed('Space') || Input.pressed('Enter'))) {
      SceneManager.set(StartScene.init());
    }
  },

  render(ctx) {
    if (GameScene.bg) GameScene.bg.draw(ctx);
    else { ctx.fillStyle = '#04060f'; ctx.fillRect(0, 0, CW, CH); }
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CW, CH);

    ctx.fillStyle = '#ff2200';
    ctx.font = 'bold 80px "Courier New"';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 24;
    ctx.fillText('GAME  OVER', CW / 2, CH / 2 - 60);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.font = '26px "Courier New"';
    ctx.fillText('SCORE   ' + String(this.score).padStart(8, '0'), CW / 2, CH / 2 + 14);

    const hi = parseInt(localStorage.getItem('voidassault_hi') || '0');
    ctx.fillStyle = '#ffcc00'; ctx.font = '18px "Courier New"';
    ctx.fillText('HIGH SCORE   ' + String(hi).padStart(8, '0'), CW / 2, CH / 2 + 52);

    if (this.t > 1.0) {
      ctx.fillStyle = '#aabbcc'; ctx.font = '16px "Courier New"';
      ctx.fillText('PRESS SPACE TO RETURN TO TITLE', CW / 2, CH / 2 + 102);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  },
};

// ─── LEVEL CLEAR SCENE ────────────────────────────────────────────────────────
const LevelClearScene = {
  score: 0, t: 0,

  init(score) {
    this.score = score; this.t = 0;
    Audio.levelClear();
    return this;
  },

  update(dt) {
    this.t += dt;
    if (this.t > 2.0 && (Input.pressed('Space') || Input.pressed('Enter'))) {
      SceneManager.set(StartScene.init());
    }
  },

  render(ctx) {
    if (GameScene.bg) GameScene.bg.draw(ctx);
    else { ctx.fillStyle = '#04060f'; ctx.fillRect(0, 0, CW, CH); }
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,20,0.65)';
    ctx.fillRect(0, 0, CW, CH);

    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 76px "Courier New"';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 28;
    ctx.fillText('SECTOR CLEARED', CW / 2, CH / 2 - 60);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.font = '26px "Courier New"';
    ctx.fillText('SCORE   ' + String(this.score).padStart(8, '0'), CW / 2, CH / 2 + 14);

    if (this.t > 2.0) {
      ctx.fillStyle = '#aabbcc'; ctx.font = '16px "Courier New"';
      ctx.fillText('PRESS SPACE TO RETURN TO TITLE', CW / 2, CH / 2 + 80);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  },
};

// ─── SCENE MANAGER ────────────────────────────────────────────────────────────
const SceneManager = {
  _stack: [],

  set(scene)  { this._stack = [scene]; },
  push(scene) { this._stack.push(scene); },
  pop()       { if (this._stack.length > 1) this._stack.pop(); },

  get current() { return this._stack[this._stack.length - 1]; },

  update(dt)    { this.current && this.current.update(dt); },
  render(ctx)   { this.current && this.current.render(ctx); },
};
