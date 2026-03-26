'use strict';

const CW = 1280, CH = 720;

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Difficulty multipliers per level
const LEVEL_SCALE = {
  1: { spdMult: 1.0,  rateMult: 1.0,  bspdMult: 1.0,  dmgMult: 1.0  },
  2: { spdMult: 1.2,  rateMult: 0.82, bspdMult: 1.15, dmgMult: 1.1  },
  3: { spdMult: 1.45, rateMult: 0.68, bspdMult: 1.3,  dmgMult: 1.25 },
};

// ─── PLAYER ───────────────────────────────────────────────────────────────────
class Player {
  constructor(anim) {
    this.cx = 160; this.cy = CH / 2;
    this.w = 80; this.h = 56;
    this.hw = 32; this.hh = 20;
    this.baseSpeed = 310;
    this.hp = 100; this.maxHp = 100;
    this.dead = false;
    this.invTimer = 0;
    this.fireTimer = 0;
    this.fireRate = 0.11;
    this.anim = anim;
    this.bankFrame = 4;
    // Power-ups
    this.spreadLevel = 0;    // 0=single, 1=3-way, 2=5-way
    this.laserActive = false;
    this.laserTimer  = 0;
    this.speedTimer  = 0;
    this.shieldActive = false;
    this.shieldPulse  = 0;
  }

  get speed() { return this.baseSpeed * (this.speedTimer > 0 ? 1.4 : 1.0); }

  collectPowerup(type) {
    switch (type) {
      case 'spread': this.spreadLevel = Math.min(this.spreadLevel + 1, 2); break;
      case 'laser':  this.laserActive = true; this.laserTimer = 9; break;
      case 'speed':  this.speedTimer = 10; break;
      case 'shield': this.shieldActive = true; break;
    }
    Audio.powerup();
  }

  update(dt, bullets, yMin, yMax) {
    const top = yMin !== undefined ? yMin + this.h / 2 : this.h / 2 + 10;
    const bot = yMax !== undefined ? yMax - this.h / 2 : CH - this.h / 2 - 10;

    let dx = 0, dy = 0;
    if (Input.held('ArrowLeft')  || Input.held('KeyA')) dx -= 1;
    if (Input.held('ArrowRight') || Input.held('KeyD')) dx += 1;
    if (Input.held('ArrowUp')    || Input.held('KeyW')) dy -= 1;
    if (Input.held('ArrowDown')  || Input.held('KeyS')) dy += 1;
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }

    this.cx = clamp(this.cx + dx * this.speed * dt, this.w / 2 + 10, CW * 0.58);
    this.cy = clamp(this.cy + dy * this.speed * dt, top, bot);

    // Banking frame
    const target = 4 + Math.round(dy * 4);
    this.bankFrame = clamp(target, 0, 9);
    if (this.anim) this.anim.frame = this.bankFrame;

    // Power-up timers
    if (this.speedTimer > 0) this.speedTimer -= dt;
    if (this.shieldPulse > 0) this.shieldPulse -= dt;

    // Laser timer
    if (this.laserActive) {
      this.laserTimer -= dt;
      if (this.laserTimer <= 0) this.laserActive = false;
    }

    // Shooting
    this.fireTimer -= dt;
    if (!this.laserActive && Input.held('Space') && this.fireTimer <= 0) {
      this.fireTimer = this.fireRate;
      const angles = this.spreadLevel === 2 ? [-0.26, -0.13, 0, 0.13, 0.26] :
                     this.spreadLevel === 1 ? [-0.19, 0, 0.19] : [0];
      for (const a of angles) {
        bullets.push(new Bullet(
          this.cx + this.w / 2, this.cy,
          Math.cos(a) * 720, Math.sin(a) * 720,
          20, true
        ));
      }
      Audio.shoot();
    }

    if (this.invTimer > 0) this.invTimer -= dt;
  }

  takeDamage(amount) {
    if (this.invTimer > 0 || this.dead) return;
    if (this.shieldActive) {
      this.shieldActive = false;
      this.shieldPulse = 0.4;
      this.invTimer = 0.6;
      spawnParticles(this.cx, this.cy, 18, ['#ff88ff', '#ffffff', '#cc44ff'], _globalParticles);
      Audio.hit();
      return;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.invTimer = 1.8;
    Audio.hit();
    if (this.hp <= 0) this.dead = true;
  }

  draw(ctx) {
    if (this.invTimer > 0 && Math.floor(this.invTimer * 12) % 2 === 0) return;

    const x = this.cx - this.w / 2, y = this.cy - this.h / 2;

    // Shield bubble
    if (this.shieldActive || this.shieldPulse > 0) {
      const alpha = this.shieldActive ? (0.4 + 0.2 * Math.sin(Date.now() / 120)) : this.shieldPulse;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.strokeStyle = '#ff88ff'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ff88ff'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(this.cx, this.cy, 44, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    if (this.anim && this.anim.frames.length > 0) {
      this.anim.draw(ctx, x, y, this.w, this.h, false);
    } else {
      ctx.fillStyle = this.speedTimer > 0 ? '#44ffff' : '#00bfff';
      ctx.beginPath();
      ctx.moveTo(x + this.w, this.cy);
      ctx.lineTo(x, y + 6);
      ctx.lineTo(x + 14, this.cy);
      ctx.lineTo(x, y + this.h - 6);
      ctx.closePath();
      ctx.fill();
    }

    // Engine glow (brighter when speed boost active)
    ctx.save();
    const glowSize = this.speedTimer > 0 ? 28 : 18;
    ctx.globalAlpha = 0.55 + Math.random() * 0.2;
    const grd = ctx.createRadialGradient(x - 2, this.cy, 0, x - 2, this.cy, glowSize);
    grd.addColorStop(0, this.speedTimer > 0 ? '#00ffff' : '#ff8800');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(x - 2, this.cy, glowSize, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  hitbox() { return { x: this.cx - this.hw, y: this.cy - this.hh, w: this.hw * 2, h: this.hh * 2 }; }
}

// Shared particle output array — written to by Player.takeDamage (shield pop)
// GameScene sets this reference before each update so shield pops land correctly.
let _globalParticles = [];

// ─── ENEMY ────────────────────────────────────────────────────────────────────
const ENEMY_DEF = {
  small:  { w: 52, h: 40, hw: 22, hh: 16, hp: 40,  spd: 195, pts: 100, fireRate: 3.2, bulletSpd: 270, bulletDmg: 12, color: '#cc44ff' },
  medium: { w: 70, h: 52, hw: 30, hh: 22, hp: 110, spd: 135, pts: 260, fireRate: 2.1, bulletSpd: 240, bulletDmg: 22, color: '#ff8833' },
};

class Enemy {
  constructor(type, cx, cy, pattern, anim, scale) {
    const sc = scale || LEVEL_SCALE[1];
    const d  = ENEMY_DEF[type] || ENEMY_DEF.small;
    Object.assign(this, d);
    this.spd       = d.spd       * sc.spdMult;
    this.fireRate  = d.fireRate  * sc.rateMult;
    this.bulletSpd = d.bulletSpd * sc.bspdMult;
    this.bulletDmg = Math.round(d.bulletDmg * sc.dmgMult);
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
      case 'sine':  this.cy = this.originY + Math.sin(this.t * 2.2) * 95; break;
      case 'dive': { const diff = py - this.cy; this.cy += Math.sign(diff) * Math.min(Math.abs(diff), 130 * dt); break; }
    }
    this.cy = clamp(this.cy, this.h / 2 + 10, CH - this.h / 2 - 10);

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireRate;
      const dx = px - this.cx, dy = py - this.cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      enemyBullets.push(new Bullet(this.cx - this.hw, this.cy,
        (dx / dist) * this.bulletSpd, (dy / dist) * this.bulletSpd, this.bulletDmg, false));
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
      ctx.moveTo(x, this.cy); ctx.lineTo(x + this.w, y + 8);
      ctx.lineTo(x + this.w - 14, this.cy); ctx.lineTo(x + this.w, y + this.h - 8);
      ctx.closePath(); ctx.fill();
    }
    if (this.flashTimer > 0) ctx.restore();
  }

  hitbox()    { return { x: this.cx - this.hw, y: this.cy - this.hh, w: this.hw * 2, h: this.hh * 2 }; }
  offScreen() { return this.cx + this.w / 2 < -60; }
}

// ─── TURRET (Level 2 — stationary, rotates to track player) ───────────────────
class Turret {
  constructor(cx, cy, anim, scale) {
    const sc = scale || LEVEL_SCALE[2];
    this.cx = cx; this.cy = cy;
    this.w = 52; this.h = 52; this.hw = 22; this.hh = 22;
    this.hp = 75; this.maxHp = 75;
    this.pts = 200;
    this.dead = false;
    this.angle = -Math.PI / 2;           // starts pointing up
    this.fireRate = 2.5 * sc.rateMult;
    this.fireTimer = 0.8 + Math.random() * 2;
    this.bulletSpd = 260 * sc.bspdMult;
    this.bulletDmg = Math.round(20 * sc.dmgMult);
    this.anim = anim; this.flashTimer = 0;
    // Slow entry from right, then park
    this.parked = false;
    this.targetX = CW - 180 - Math.random() * 420;
  }

  update(dt, px, py, enemyBullets) {
    if (!this.parked) {
      this.cx -= 80 * dt;
      if (this.cx <= this.targetX) { this.cx = this.targetX; this.parked = true; }
    }

    // Rotate smoothly toward player
    const targetAngle = Math.atan2(py - this.cy, px - this.cx);
    let diff = targetAngle - this.angle;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += diff * 3.5 * dt;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireRate;
      enemyBullets.push(new Bullet(this.cx, this.cy,
        Math.cos(this.angle) * this.bulletSpd,
        Math.sin(this.angle) * this.bulletSpd,
        this.bulletDmg, false));
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
    if (this.flashTimer > 0) { ctx.save(); ctx.filter = 'brightness(4)'; }
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(this.angle + Math.PI / 2);   // sprite faces up → rotate to aim direction
    if (this.anim && this.anim.frames.length > 0) {
      this.anim.draw(ctx, -this.w / 2, -this.h / 2, this.w, this.h, false);
    } else {
      ctx.fillStyle = '#557733';
      ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
      ctx.fillStyle = '#99bb55';
      ctx.fillRect(-5, -this.h / 2, 10, this.h * 0.65);
    }
    ctx.restore();
    if (this.flashTimer > 0) ctx.restore();
  }

  hitbox()    { return { x: this.cx - this.hw, y: this.cy - this.hh, w: this.hw * 2, h: this.hh * 2 }; }
  offScreen() { return this.cx + this.w / 2 < -80; }
}

// ─── ASTEROID (Level 2 — obstacle, damages on contact) ────────────────────────
class Asteroid {
  constructor(cx, cy, radius, img) {
    this.cx = cx; this.cy = cy;
    this.radius = radius || 28;
    this.vx = -(55 + Math.random() * 75);
    this.vy = (Math.random() - 0.5) * 38;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 1.6;
    this.img = img; this.dead = false;
  }

  update(dt) {
    this.cx += this.vx * dt; this.cy += this.vy * dt;
    this.rotation += this.rotSpeed * dt;
    if (this.cy < this.radius + 10)       { this.cy = this.radius + 10;       this.vy = Math.abs(this.vy); }
    if (this.cy > CH - this.radius - 10)  { this.cy = CH - this.radius - 10;  this.vy = -Math.abs(this.vy); }
    if (this.cx + this.radius < -60)  this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.cx, this.cy); ctx.rotate(this.rotation);
    const s = this.radius * 2;
    if (this.img) {
      ctx.drawImage(this.img, -s / 2, -s / 2, s, s);
    } else {
      ctx.fillStyle = '#776655';
      ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#998877'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }
}

// ─── BOSS (Level 1 — Alien Carrier) ───────────────────────────────────────────
class Boss {
  constructor(anim) {
    this.name = 'ALIEN CARRIER';
    this.cx = CW + 220; this.cy = CH / 2;
    this.w = 200; this.h = 200; this.hw = 84; this.hh = 84;
    this.hp = 600; this.maxHp = 600; this.pts = 1000;
    this.dead = false; this.entering = true; this.targetX = CW - 230;
    this.phase = 1; this.fireTimer = 2.2; this.chargeTimer = 5; this.chargeVY = 0;
    this.t = 0; this.flashTimer = 0; this.anim = anim;
    this.defeatTimer = -1;
  }

  update(dt, py, enemyBullets, onDefeated) {
    if (this.defeatTimer >= 0) { this.defeatTimer -= dt; if (this.defeatTimer <= 0) onDefeated(); return; }
    this.t += dt;
    if (this.entering) {
      this.cx -= 220 * dt;
      if (this.cx <= this.targetX) { this.cx = this.targetX; this.entering = false; Audio.bossAlert(); }
      return;
    }
    const trackSpd = this.phase === 1 ? 85 : 150;
    this.cy += Math.sign(py - this.cy) * Math.min(Math.abs(py - this.cy), trackSpd * dt);
    if (this.phase === 2) {
      this.chargeTimer -= dt;
      if (this.chargeTimer <= 0) { this.chargeTimer = 3.8; this.chargeVY = (Math.random() < 0.5 ? 1 : -1) * 380; }
      this.cy += this.chargeVY * dt;
      this.chargeVY *= Math.pow(0.02, dt);
    }
    this.cy = clamp(this.cy, this.h / 2 + 10, CH - this.h / 2 - 10);
    if (this.hp <= this.maxHp * 0.5 && this.phase === 1) this.phase = 2;
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) { this.fireTimer = this.phase === 1 ? 2.0 : 1.35; this._fire(enemyBullets); }
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.anim) this.anim.update(dt);
  }

  _fire(bullets) {
    const count = this.phase === 1 ? 3 : 5, spread = Math.PI / 5;
    for (let i = 0; i < count; i++) {
      const frac = count === 1 ? 0 : (i / (count - 1) - 0.5);
      const angle = Math.PI + frac * spread;
      bullets.push(new Bullet(this.cx - this.hw, this.cy, Math.cos(angle) * 310, Math.sin(angle) * 310, 28, false, 'boss'));
    }
  }

  takeDamage(dmg) {
    if (this.dead || this.defeatTimer >= 0) return;
    this.hp -= dmg; this.flashTimer = 0.08;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.defeatTimer = 2.8; Audio.bigExplosion(); }
  }

  draw(ctx) {
    if (this.flashTimer > 0) { ctx.save(); ctx.filter = 'brightness(4)'; }
    if (this.anim && this.anim.frames.length > 0) {
      ctx.save(); ctx.translate(this.cx, this.cy); ctx.rotate(-Math.PI / 2);
      this.anim.draw(ctx, -this.w / 2, -this.h / 2, this.w, this.h, false);
      ctx.restore();
    } else {
      const x = this.cx - this.w / 2, y = this.cy - this.h / 2;
      ctx.fillStyle = '#661100'; ctx.fillRect(x, y, this.w, this.h);
      ctx.fillStyle = '#cc3300'; ctx.fillRect(x + 10, y + 10, this.w - 20, this.h - 20);
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath(); ctx.arc(x + 28, this.cy, 18, 0, Math.PI * 2); ctx.fill();
    }
    if (this.flashTimer > 0) ctx.restore();
    if (this.defeatTimer >= 0) {
      ctx.save(); ctx.globalAlpha = clamp(this.defeatTimer / 0.6, 0, 1);
      ctx.fillStyle = Math.random() > 0.5 ? '#ff6600' : '#ffcc00';
      ctx.beginPath(); ctx.arc(this.cx + (Math.random() - 0.5) * this.w, this.cy + (Math.random() - 0.5) * this.h, 15 + Math.random() * 35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  drawHPBar(ctx) {
    const bw = 580, bh = 16, bx = CW / 2 - bw / 2, by = 12;
    ctx.fillStyle = '#2a0000'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = this.hp / this.maxHp > 0.5 ? '#dd2200' : '#ff0000';
    ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
    ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(this.name + '  ' + (this.phase === 1 ? 'PHASE I' : '!! PHASE II !!'), CW / 2, by + bh + 15);
    ctx.textAlign = 'left';
  }

  hitbox() { return { x: this.cx - this.hw, y: this.cy - this.hh, w: this.hw * 2, h: this.hh * 2 }; }
}

// ─── MECH BOSS (Level 2 — Armored Walker) ─────────────────────────────────────
class MechBoss {
  constructor(anim) {
    this.name = 'ARMORED WALKER';
    this.cx = CW + 180; this.cy = CH / 2;
    this.w = 130; this.h = 130; this.hw = 55; this.hh = 55;
    this.hp = 500; this.maxHp = 500; this.pts = 1000;
    this.dead = false; this.entering = true; this.targetX = CW - 200;
    this.phase = 1; this.t = 0; this.flashTimer = 0; this.anim = anim;
    this.defeatTimer = -1;
    // Phase 1: burst fire
    this.burstTimer = 0; this.burstCount = 0; this.burstDelay = 2.5;
    // Phase 2: stomp (ring of bullets) + burst
    this.stompTimer = 4;
  }

  update(dt, py, enemyBullets, onDefeated) {
    if (this.defeatTimer >= 0) { this.defeatTimer -= dt; if (this.defeatTimer <= 0) onDefeated(); return; }
    this.t += dt;
    if (this.entering) {
      this.cx -= 180 * dt;
      if (this.cx <= this.targetX) { this.cx = this.targetX; this.entering = false; Audio.bossAlert(); }
      return;
    }

    // Strafe vertically (sinusoidal)
    this.cy = CH / 2 + Math.sin(this.t * 0.7) * (CH * 0.32);
    // Phase 2: also tracks player
    if (this.phase === 2) {
      const diff = py - this.cy;
      this.cy += Math.sign(diff) * Math.min(Math.abs(diff), 160 * dt);
    }
    this.cy = clamp(this.cy, this.h / 2 + 10, CH - this.h / 2 - 10);

    if (this.hp <= this.maxHp * 0.5 && this.phase === 1) this.phase = 2;

    // Burst fire
    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      if (this.burstCount < (this.phase === 1 ? 3 : 5)) {
        this.burstCount++;
        this.burstTimer = 0.18;
        const angle = Math.atan2(py - this.cy, 0 - this.cx) + (Math.random() - 0.5) * 0.2;
        const spd = 300 + (this.phase === 2 ? 60 : 0);
        enemyBullets.push(new Bullet(this.cx - this.hw, this.cy, Math.cos(angle) * spd, Math.sin(angle) * spd, 25, false, 'boss'));
      } else {
        this.burstCount = 0;
        this.burstTimer = this.phase === 1 ? 2.4 : 1.6;
      }
    }

    // Phase 2: stomp (ring of 8 bullets)
    if (this.phase === 2) {
      this.stompTimer -= dt;
      if (this.stompTimer <= 0) {
        this.stompTimer = 3.5;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          enemyBullets.push(new Bullet(this.cx, this.cy, Math.cos(a) * 220, Math.sin(a) * 220, 20, false, 'boss'));
        }
      }
    }

    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.anim) this.anim.update(dt);
  }

  takeDamage(dmg) {
    if (this.dead || this.defeatTimer >= 0) return;
    this.hp -= dmg; this.flashTimer = 0.08;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.defeatTimer = 2.8; Audio.bigExplosion(); }
  }

  draw(ctx) {
    if (this.flashTimer > 0) { ctx.save(); ctx.filter = 'brightness(4)'; }
    const x = this.cx - this.w / 2, y = this.cy - this.h / 2;
    if (this.anim && this.anim.frames.length > 0) {
      this.anim.draw(ctx, x, y, this.w, this.h, true);
    } else {
      ctx.fillStyle = '#334422'; ctx.fillRect(x, y, this.w, this.h);
      ctx.fillStyle = '#557733'; ctx.fillRect(x + 12, y + 12, this.w - 24, this.h - 24);
      ctx.fillStyle = '#ff4400';
      ctx.beginPath(); ctx.arc(this.cx - 15, y + 25, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(this.cx + 15, y + 25, 10, 0, Math.PI * 2); ctx.fill();
    }
    if (this.flashTimer > 0) ctx.restore();
    if (this.defeatTimer >= 0) {
      ctx.save(); ctx.globalAlpha = clamp(this.defeatTimer / 0.6, 0, 1);
      ctx.fillStyle = '#ff6600';
      ctx.beginPath(); ctx.arc(this.cx + (Math.random() - 0.5) * this.w, this.cy + (Math.random() - 0.5) * this.h, 12 + Math.random() * 28, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  drawHPBar(ctx) {
    const bw = 580, bh = 16, bx = CW / 2 - bw / 2, by = 12;
    ctx.fillStyle = '#001a00'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = this.hp / this.maxHp > 0.5 ? '#44aa22' : '#88dd00';
    ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
    ctx.strokeStyle = '#66ff22'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(this.name + '  ' + (this.phase === 1 ? 'PHASE I' : '!! PHASE II !!'), CW / 2, by + bh + 15);
    ctx.textAlign = 'left';
  }

  hitbox() { return { x: this.cx - this.hw, y: this.cy - this.hh, w: this.hw * 2, h: this.hh * 2 }; }
}

// ─── TWIN BOSS (Level 3 — Twin Alien Gunships) ────────────────────────────────
class TwinBoss {
  constructor(animA, animB) {
    this.name = 'TWIN GUNSHIPS';
    this.hp = 440; this.maxHp = 440; this.pts = 1000;
    this.dead = false; this.entering = true;
    this.targetX = CW - 210;
    this.w = 68; this.h = 52; this.hw = 28; this.hh = 22;
    // Two ships, vertically mirrored
    this.ships = [
      { cx: CW + 220, cy: CH / 2 - 140, dead: false, anim: animA },
      { cx: CW + 220, cy: CH / 2 + 140, dead: false, anim: animB },
    ];
    this.t = 0; this.fireTimer = 1.6; this.fireIndex = 0;
    this.flashTimer = 0; this.berserk = false;
    this.defeatTimer = -1;
  }

  update(dt, py, enemyBullets, onDefeated) {
    if (this.defeatTimer >= 0) { this.defeatTimer -= dt; if (this.defeatTimer <= 0) onDefeated(); return; }
    this.t += dt;

    // Entry
    if (this.entering) {
      for (const s of this.ships) s.cx -= 200 * dt;
      if (this.ships[0].cx <= this.targetX) {
        for (const s of this.ships) s.cx = this.targetX;
        this.entering = false;
        Audio.bossAlert();
      }
      return;
    }

    // Movement: sine-wave vertically (mirrored)
    const amp = this.berserk ? 180 : 120;
    this.ships[0].cy = clamp(CH / 2 - 140 + Math.sin(this.t * 1.1) * amp, this.h / 2 + 60, CH / 2 - 20);
    this.ships[1].cy = clamp(CH / 2 + 140 - Math.sin(this.t * 1.1) * amp, CH / 2 + 20, CH - this.h / 2 - 60);

    for (const s of this.ships) if (s.anim) s.anim.update(dt);

    // Firing (alternate between ships, skip dead one)
    this.fireTimer -= dt;
    const rate = this.berserk ? 0.7 : 1.5;
    if (this.fireTimer <= 0) {
      this.fireTimer = rate;
      const activeShips = this.ships.filter(s => !s.dead);
      if (activeShips.length > 0) {
        const s = activeShips[this.fireIndex % activeShips.length];
        this.fireIndex++;
        const bulletCount = this.berserk ? 3 : 2;
        for (let i = 0; i < bulletCount; i++) {
          const spread = (i / Math.max(bulletCount - 1, 1) - 0.5) * 0.35;
          const baseAngle = Math.atan2(py - s.cy, 0 - s.cx);
          const spd = this.berserk ? 340 : 290;
          enemyBullets.push(new Bullet(s.cx - this.hw, s.cy,
            Math.cos(baseAngle + spread) * spd, Math.sin(baseAngle + spread) * spd, 22, false, 'boss'));
        }
      }
    }

    if (this.flashTimer > 0) this.flashTimer -= dt;
  }

  // Damage splits equally; if one ship reaches 0 HP equivalent, mark it dead → berserk
  takeDamage(dmg, shipIndex) {
    if (this.dead || this.defeatTimer >= 0) return;
    this.hp -= dmg; this.flashTimer = 0.08;

    // Determine which ship should look "more damaged"
    if (this.hp <= this.maxHp * 0.5 && !this.berserk) {
      // Kill one ship at half HP
      const aliveIdx = this.ships.findIndex(s => !s.dead);
      if (aliveIdx >= 0) {
        this.ships[aliveIdx].dead = true;
        this.berserk = true;
        // Surviving ship gets faster
      }
    }

    if (this.hp <= 0) {
      this.hp = 0; this.dead = true;
      for (const s of this.ships) s.dead = true;
      this.defeatTimer = 2.8;
      Audio.bigExplosion();
    }
  }

  draw(ctx) {
    for (const s of this.ships) {
      if (s.dead) continue;
      if (this.flashTimer > 0) { ctx.save(); ctx.filter = 'brightness(4)'; }
      const x = s.cx - this.w / 2, y = s.cy - this.h / 2;
      if (s.anim && s.anim.frames.length > 0) {
        s.anim.draw(ctx, x, y, this.w, this.h, true);
      } else {
        ctx.fillStyle = this.berserk ? '#ff4400' : '#880066';
        ctx.beginPath();
        ctx.moveTo(x, s.cy); ctx.lineTo(x + this.w, y + 6);
        ctx.lineTo(x + this.w - 12, s.cy); ctx.lineTo(x + this.w, y + this.h - 6);
        ctx.closePath(); ctx.fill();
      }
      if (this.berserk) {
        ctx.save(); ctx.globalAlpha = 0.4 + 0.2 * Math.sin(this.t * 8);
        ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.cx, s.cy, 38, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      if (this.flashTimer > 0) ctx.restore();
    }
    if (this.defeatTimer >= 0) {
      ctx.save(); ctx.globalAlpha = clamp(this.defeatTimer / 0.6, 0, 1);
      ctx.fillStyle = '#ff6600';
      for (const s of this.ships) {
        ctx.beginPath(); ctx.arc(s.cx + (Math.random() - 0.5) * this.w, s.cy + (Math.random() - 0.5) * this.h, 10 + Math.random() * 22, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  drawHPBar(ctx) {
    const bw = 580, bh = 16, bx = CW / 2 - bw / 2, by = 12;
    ctx.fillStyle = '#12001a'; ctx.fillRect(bx, by, bw, bh);
    const ratio = this.hp / this.maxHp;
    ctx.fillStyle = ratio > 0.5 ? '#cc00cc' : '#ff00ff';
    ctx.fillRect(bx, by, bw * ratio, bh);
    ctx.strokeStyle = '#ff66ff'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText(this.name + (this.berserk ? '  !! BERSERK !!' : ''), CW / 2, by + bh + 15);
    ctx.textAlign = 'left';
  }

  // Returns array of active hitboxes
  hitboxes() {
    return this.ships.filter(s => !s.dead).map(s => ({
      x: s.cx - this.hw, y: s.cy - this.hh, w: this.hw * 2, h: this.hh * 2
    }));
  }
}

// ─── POWER-UP ─────────────────────────────────────────────────────────────────
const PU_COLORS = { spread: '#ffcc00', laser: '#00ff88', speed: '#00bfff', shield: '#ff88ff' };
const PU_LABELS = { spread: 'SPR', laser: 'LZR', speed: 'SPD', shield: 'SHD' };
const PU_KEYS   = ['pu1', 'pu2', 'pu3', 'pu4'];
const PU_TYPES  = ['spread', 'laser', 'speed', 'shield'];

class PowerUp {
  constructor(cx, cy, type) {
    this.cx = cx; this.cy = cy; this.type = type;
    this.vx = -55; this.vy = (Math.random() - 0.5) * 70;
    this.t = 0; this.dead = false; this.r = 16;
    this.img = Loader.get(PU_KEYS[PU_TYPES.indexOf(type)] || 'pu1');
  }

  update(dt) {
    this.t += dt;
    this.cx += this.vx * dt;
    this.cy += Math.sin(this.t * 3) * 25 * dt;  // gentle bob
    if (this.cx < -40) this.dead = true;
  }

  draw(ctx) {
    const color = PU_COLORS[this.type];
    const pulse = 0.7 + 0.3 * Math.sin(this.t * 5);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = color; ctx.shadowBlur = 18;
    if (this.img) {
      ctx.drawImage(this.img, this.cx - this.r, this.cy - this.r, this.r * 2, this.r * 2);
    } else {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(this.cx, this.cy, this.r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#000';
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(PU_LABELS[this.type], this.cx, this.cy);
    }
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }
}

// ─── BULLET ───────────────────────────────────────────────────────────────────
class Bullet {
  constructor(cx, cy, vx, vy, dmg, isPlayer, variant) {
    this.cx = cx; this.cy = cy; this.vx = vx; this.vy = vy;
    this.dmg = dmg; this.isPlayer = isPlayer; this.variant = variant || 'normal';
    this.dead = false;
    this.w = isPlayer ? 22 : (variant === 'boss' ? 14 : 9);
    this.h = isPlayer ? 8  : (variant === 'boss' ? 14 : 9);
  }

  update(dt) { this.cx += this.vx * dt; this.cy += this.vy * dt; }

  draw(ctx, boltAnim) {
    if (this.isPlayer) {
      if (boltAnim && boltAnim.frames.length > 0) {
        const fi = Math.floor(Date.now() / 55) % boltAnim.frames.length;
        const img = boltAnim.frames[fi];
        if (img) ctx.drawImage(img, this.cx - this.w / 2, this.cy - this.h / 2 - 4, this.w * 2, this.h * 2.5);
      } else {
        ctx.save(); ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.cx - this.w / 2, this.cy - this.h / 2, this.w, this.h);
        ctx.restore();
      }
    } else {
      const color = this.variant === 'boss' ? '#ff5500' : '#ff66ff';
      ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 8;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(this.cx, this.cy, this.w / 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  offScreen() { return this.cx < -60 || this.cx > CW + 60 || this.cy < -60 || this.cy > CH + 60; }
  hitbox()    { return { x: this.cx - this.w / 2, y: this.cy - this.h / 2, w: this.w, h: this.h }; }
}

// ─── EXPLOSION ────────────────────────────────────────────────────────────────
class Explosion {
  constructor(cx, cy, size, anim) {
    this.cx = cx; this.cy = cy; this.size = size || 60; this.anim = anim; this.done = false;
  }
  update(dt) { if (this.anim) { this.anim.update(dt); if (this.anim.done) this.done = true; } else this.done = true; }
  draw(ctx) {
    const s = this.size;
    if (this.anim && this.anim.frames.length > 0) this.anim.draw(ctx, this.cx - s / 2, this.cy - s / 2, s, s);
    const prog = this.anim ? (this.anim.frame / Math.max(this.anim.frames.length - 1, 1)) : 1;
    ctx.save(); ctx.globalAlpha = (1 - prog) * 0.7;
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
    this.life -= dt; if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    ctx.save(); ctx.globalAlpha = this.life / this.maxLife; ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, this.size * (this.life / this.maxLife), 0, Math.PI * 2); ctx.fill();
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
    const ang = Math.random() * Math.PI * 2, spd = 70 + Math.random() * 230;
    out.push(new Particle(cx, cy, Math.cos(ang) * spd, Math.sin(ang) * spd,
      colors[Math.floor(Math.random() * colors.length)], 0.35 + Math.random() * 0.5, 2 + Math.random() * 4));
  }
}

function randomPowerupType() {
  return PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
}
