'use strict';

const CW = 1280, CH = 720;

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ─── PLAYER ───────────────────────────────────────────────────────────────────
class Player {
  constructor(anim) {
    this.cx = 160; this.cy = CH / 2;
    this.w = 80; this.h = 56;           // rendered size
    this.hw = 32; this.hh = 20;          // hitbox half-extents
    this.speed = 310;
    this.hp = 100; this.maxHp = 100;
    this.dead = false;
    this.invTimer = 0;                   // invincibility seconds remaining
    this.fireTimer = 0;
    this.fireRate = 0.11;
    this.anim = anim;                    // SpriteAnim (idle / banking)
    // banking: 0=level, negative=up, positive=down
    this.bankFrame = 4;                  // frame index (0-9 for ship1-10)
    this.vy = 0;
  }

  update(dt, bullets) {
    let dx = 0, dy = 0;
    if (Input.held('ArrowLeft')  || Input.held('KeyA')) dx -= 1;
    if (Input.held('ArrowRight') || Input.held('KeyD')) dx += 1;
    if (Input.held('ArrowUp')    || Input.held('KeyW')) dy -= 1;
    if (Input.held('ArrowDown')  || Input.held('KeyS')) dy += 1;
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }

    this.cx = clamp(this.cx + dx * this.speed * dt, this.w / 2 + 10, CW * 0.58);
    this.cy = clamp(this.cy + dy * this.speed * dt, this.h / 2 + 10, CH - this.h / 2 - 10);
    this.vy = dy;

    // Choose banking frame (frames 0-9 map to ship1-10: 4=level, 0=hard up, 9=hard down)
    const target = 4 + Math.round(dy * 4);
    this.bankFrame = clamp(target, 0, 9);
    if (this.anim) this.anim.frame = this.bankFrame;

    // Shoot
    this.fireTimer -= dt;
    if (Input.held('Space') && this.fireTimer <= 0) {
      this.fireTimer = this.fireRate;
      bullets.push(new Bullet(this.cx + this.w / 2, this.cy, 720, 0, 20, true));
      Audio.shoot();
    }

    if (this.invTimer > 0) this.invTimer -= dt;
  }

  takeDamage(amount) {
    if (this.invTimer > 0 || this.dead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invTimer = 1.8;
    Audio.hit();
    if (this.hp <= 0) this.dead = true;
  }

  draw(ctx) {
    // Flash during invincibility
    if (this.invTimer > 0 && Math.floor(this.invTimer * 12) % 2 === 0) return;

    const x = this.cx - this.w / 2, y = this.cy - this.h / 2;

    if (this.anim && this.anim.frames.length > 0) {
      this.anim.draw(ctx, x, y, this.w, this.h, false);
    } else {
      // Fallback: blue arrow ship
      ctx.fillStyle = '#00bfff';
      ctx.beginPath();
      ctx.moveTo(x + this.w, this.cy);
      ctx.lineTo(x, y + 6);
      ctx.lineTo(x + 14, this.cy);
      ctx.lineTo(x, y + this.h - 6);
      ctx.closePath();
      ctx.fill();
    }

    // Engine glow
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.random() * 0.2;
    const grd = ctx.createRadialGradient(x - 2, this.cy, 0, x - 2, this.cy, 18);
    grd.addColorStop(0, '#ff8800');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(x - 2, this.cy, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  hitbox() { return { x: this.cx - this.hw, y: this.cy - this.hh, w: this.hw * 2, h: this.hh * 2 }; }
}

// ─── ENEMY ────────────────────────────────────────────────────────────────────
const ENEMY_DEF = {
  small:  { w: 52, h: 40, hw: 22, hh: 16, hp: 40,  spd: 195, pts: 100, fireRate: 3.2, bulletSpd: 270, bulletDmg: 12, color: '#cc44ff' },
  medium: { w: 70, h: 52, hw: 30, hh: 22, hp: 110, spd: 135, pts: 260, fireRate: 2.1, bulletSpd: 240, bulletDmg: 22, color: '#ff8833' },
};

class Enemy {
  constructor(type, cx, cy, pattern, anim) {
    const d = ENEMY_DEF[type] || ENEMY_DEF.small;
    Object.assign(this, d);
    this.type = type; this.cx = cx; this.cy = cy; this.originY = cy;
    this.pattern = pattern || 'straight';
    this.t = 0; this.fireTimer = 0.5 + Math.random() * 2;
    this.dead = false; this.hp = d.hp; this.maxHp = d.hp;
    this.anim = anim; this.flashTimer = 0;
  }

  update(dt, px, py, enemyBullets) {
    this.t += dt;
    this.cx -= this.spd * dt;

    switch (this.pattern) {
      case 'sine':
        this.cy = this.originY + Math.sin(this.t * 2.2) * 95;
        break;
      case 'dive': {
        const diff = py - this.cy;
        this.cy += Math.sign(diff) * Math.min(Math.abs(diff), 130 * dt);
        break;
      }
    }
    this.cy = clamp(this.cy, this.h / 2 + 10, CH - this.h / 2 - 10);

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireRate;
      const dx = px - this.cx, dy = py - this.cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      enemyBullets.push(new Bullet(
        this.cx - this.hw, this.cy,
        (dx / dist) * this.bulletSpd, (dy / dist) * this.bulletSpd,
        this.bulletDmg, false
      ));
    }

    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.anim) this.anim.update(dt);
  }

  takeDamage(dmg) {
    if (this.dead) return;
    this.hp -= dmg; this.flashTimer = 0.07;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  draw(ctx) {
    const x = this.cx - this.w / 2, y = this.cy - this.h / 2;
    if (this.flashTimer > 0) { ctx.save(); ctx.filter = 'brightness(4)'; }

    if (this.anim && this.anim.frames.length > 0) {
      this.anim.draw(ctx, x, y, this.w, this.h, true);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(x, this.cy);
      ctx.lineTo(x + this.w, y + 8);
      ctx.lineTo(x + this.w - 14, this.cy);
      ctx.lineTo(x + this.w, y + this.h - 8);
      ctx.closePath();
      ctx.fill();
    }

    if (this.flashTimer > 0) ctx.restore();
  }

  hitbox() { return { x: this.cx - this.hw, y: this.cy - this.hh, w: this.hw * 2, h: this.hh * 2 }; }
  offScreen() { return this.cx + this.w / 2 < -60; }
}

// ─── BOSS ─────────────────────────────────────────────────────────────────────
class Boss {
  constructor(anim) {
    this.cx = CW + 220; this.cy = CH / 2;
    this.w = 200; this.h = 200;
    this.hw = 84; this.hh = 84;
    this.hp = 600; this.maxHp = 600;
    this.dead = false; this.entering = true;
    this.targetX = CW - 230;
    this.phase = 1; this.fireTimer = 2.2;
    this.chargeTimer = 5; this.chargeVY = 0;
    this.t = 0; this.flashTimer = 0;
    this.anim = anim;
    this.defeatTimer = -1;   // -1 = not defeated yet
    this.defeatExpTimer = 0;
  }

  update(dt, py, enemyBullets, onDefeated) {
    if (this.defeatTimer >= 0) {
      this.defeatTimer -= dt;
      this.defeatExpTimer -= dt;
      if (this.defeatTimer <= 0) onDefeated();
      return;
    }

    this.t += dt;
    if (this.entering) {
      this.cx -= 220 * dt;
      if (this.cx <= this.targetX) { this.cx = this.targetX; this.entering = false; Audio.bossAlert(); }
      return;
    }

    // Vertical tracking
    const trackSpd = this.phase === 1 ? 85 : 150;
    const diff = py - this.cy;
    this.cy += Math.sign(diff) * Math.min(Math.abs(diff), trackSpd * dt);

    // Phase 2 charge
    if (this.phase === 2) {
      this.chargeTimer -= dt;
      if (this.chargeTimer <= 0) {
        this.chargeTimer = 3.8;
        this.chargeVY = (Math.random() < 0.5 ? 1 : -1) * 380;
      }
      this.cy += this.chargeVY * dt;
      this.chargeVY *= Math.pow(0.02, dt);
    }
    this.cy = clamp(this.cy, this.h / 2 + 10, CH - this.h / 2 - 10);

    if (this.hp <= this.maxHp * 0.5 && this.phase === 1) this.phase = 2;

    // Firing
    this.fireTimer -= dt;
    const rate = this.phase === 1 ? 2.0 : 1.35;
    if (this.fireTimer <= 0) {
      this.fireTimer = rate;
      this._fire(enemyBullets);
    }

    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.anim) this.anim.update(dt);
  }

  _fire(bullets) {
    const count = this.phase === 1 ? 3 : 5;
    const spread = Math.PI / 5;
    for (let i = 0; i < count; i++) {
      const frac = count === 1 ? 0 : (i / (count - 1) - 0.5);
      const angle = Math.PI + frac * spread;
      const spd = 310;
      bullets.push(new Bullet(this.cx - this.hw, this.cy, Math.cos(angle) * spd, Math.sin(angle) * spd, 28, false, 'boss'));
    }
  }

  takeDamage(dmg) {
    if (this.dead || this.defeatTimer >= 0) return;
    this.hp -= dmg; this.flashTimer = 0.08;
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true;
      this.defeatTimer = 2.8; this.defeatExpTimer = 0;
      Audio.bigExplosion();
    }
  }

  draw(ctx) {
    const x = this.cx - this.w / 2, y = this.cy - this.h / 2;

    if (this.flashTimer > 0) { ctx.save(); ctx.filter = 'brightness(4)'; }

    if (this.anim && this.anim.frames.length > 0) {
      // Boss is top-down (faces up). Rotate 90° CCW so it faces left.
      ctx.save();
      ctx.translate(this.cx, this.cy);
      ctx.rotate(-Math.PI / 2);
      // After rotation: original w→h, h→w
      this.anim.draw(ctx, -this.w / 2, -this.h / 2, this.w, this.h, false);
      ctx.restore();
    } else {
      ctx.fillStyle = '#661100';
      ctx.fillRect(x, y, this.w, this.h);
      ctx.fillStyle = '#cc3300';
      ctx.fillRect(x + 10, y + 10, this.w - 20, this.h - 20);
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath(); ctx.arc(x + 28, this.cy, 18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 28, this.cy - 50, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 28, this.cy + 50, 10, 0, Math.PI * 2); ctx.fill();
    }

    if (this.flashTimer > 0) ctx.restore();

    // Defeat explosions
    if (this.defeatTimer >= 0) {
      ctx.save();
      const alpha = clamp(this.defeatTimer / 0.6, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = Math.random() > 0.5 ? '#ff6600' : '#ffcc00';
      ctx.beginPath();
      ctx.arc(
        this.cx + (Math.random() - 0.5) * this.w,
        this.cy + (Math.random() - 0.5) * this.h,
        15 + Math.random() * 35, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }

  drawHPBar(ctx) {
    const bw = 580, bh = 16, bx = CW / 2 - bw / 2, by = 12;
    ctx.fillStyle = '#2a0000'; ctx.fillRect(bx, by, bw, bh);
    const ratio = this.hp / this.maxHp;
    ctx.fillStyle = ratio > 0.5 ? '#dd2200' : '#ff0000';
    ctx.fillRect(bx, by, bw * ratio, bh);
    ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('ALIEN CARRIER  ' + (this.phase === 1 ? 'PHASE I' : '!! PHASE II !!'), CW / 2, by + bh + 15);
    ctx.textAlign = 'left';
  }

  hitbox() { return { x: this.cx - this.hw, y: this.cy - this.hh, w: this.hw * 2, h: this.hh * 2 }; }
}

// ─── BULLET ───────────────────────────────────────────────────────────────────
class Bullet {
  constructor(cx, cy, vx, vy, dmg, isPlayer, variant) {
    this.cx = cx; this.cy = cy;
    this.vx = vx; this.vy = vy;
    this.dmg = dmg; this.isPlayer = isPlayer;
    this.variant = variant || 'normal';
    this.dead = false;
    this.w = isPlayer ? 22 : (variant === 'boss' ? 14 : 9);
    this.h = isPlayer ? 8  : (variant === 'boss' ? 14 : 9);
  }

  update(dt) { this.cx += this.vx * dt; this.cy += this.vy * dt; }

  draw(ctx, boltAnim) {
    if (this.isPlayer) {
      if (boltAnim && boltAnim.frames.length > 0) {
        // Use wall-clock time so all bolts animate independently of game loop
        const fi = Math.floor(Date.now() / 55) % boltAnim.frames.length;
        const img = boltAnim.frames[fi];
        if (img) ctx.drawImage(img, this.cx - this.w / 2, this.cy - this.h / 2 - 4, this.w * 2, this.h * 2.5);
      } else {
        ctx.save();
        ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.cx - this.w / 2, this.cy - this.h / 2, this.w, this.h);
        ctx.restore();
      }
    } else {
      const color = this.variant === 'boss' ? '#ff5500' : '#ff66ff';
      ctx.save();
      ctx.shadowColor = color; ctx.shadowBlur = 8;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(this.cx, this.cy, this.w / 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  offScreen() {
    return this.cx < -60 || this.cx > CW + 60 || this.cy < -60 || this.cy > CH + 60;
  }

  hitbox() { return { x: this.cx - this.w / 2, y: this.cy - this.h / 2, w: this.w, h: this.h }; }
}

// ─── EXPLOSION ────────────────────────────────────────────────────────────────
class Explosion {
  constructor(cx, cy, size, anim) {
    this.cx = cx; this.cy = cy; this.size = size || 60;
    this.anim = anim; this.done = false;
  }

  update(dt) {
    if (this.anim) { this.anim.update(dt); if (this.anim.done) this.done = true; }
    else this.done = true;
  }

  draw(ctx) {
    const s = this.size;
    if (this.anim && this.anim.frames.length > 0) {
      this.anim.draw(ctx, this.cx - s / 2, this.cy - s / 2, s, s);
    }
    // Radial glow overlay
    const prog = this.anim ? (this.anim.frame / Math.max(this.anim.frames.length - 1, 1)) : 1;
    ctx.save();
    ctx.globalAlpha = (1 - prog) * 0.7;
    const grd = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, s * 0.6);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.4, '#ff8800'); grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, s * (0.4 + prog * 0.6), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ─── PARTICLE ─────────────────────────────────────────────────────────────────
class Particle {
  constructor(cx, cy, vx, vy, color, life, size) {
    this.cx = cx; this.cy = cy; this.vx = vx; this.vy = vy;
    this.color = color; this.life = life || 0.55; this.maxLife = this.life;
    this.size = size || 3; this.dead = false;
  }

  update(dt) {
    this.cx += this.vx * dt; this.cy += this.vy * dt;
    this.vx *= (1 - 3 * dt); this.vy *= (1 - 3 * dt);
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.size * (this.life / this.maxLife), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function makeExplosion(cx, cy, size, expAnim) {
  const a = expAnim ? expAnim.clone() : null;
  if (a) { a.loop = false; a.frame = 0; a.done = false; }
  return new Explosion(cx, cy, size, a);
}

function spawnParticles(cx, cy, count, colors, out) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 70 + Math.random() * 230;
    out.push(new Particle(cx, cy, Math.cos(ang) * spd, Math.sin(ang) * spd,
      colors[Math.floor(Math.random() * colors.length)], 0.35 + Math.random() * 0.5, 2 + Math.random() * 4));
  }
}
