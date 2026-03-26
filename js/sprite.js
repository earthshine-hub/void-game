'use strict';

// Animates through an array of images (HTMLImageElement or OffscreenCanvas).
class SpriteAnim {
  constructor(frames, fps, loop) {
    this.frames  = frames || [];
    this.fps     = fps || 8;
    this.loop    = loop !== false;
    this.frame   = 0;
    this.elapsed = 0;
    this.done    = false;
  }

  clone() {
    const s = new SpriteAnim(this.frames, this.fps, this.loop);
    return s;
  }

  reset() { this.frame = 0; this.elapsed = 0; this.done = false; }

  update(dt) {
    if (this.done || this.frames.length === 0) return;
    this.elapsed += dt;
    const dur = 1 / this.fps;
    while (this.elapsed >= dur) {
      this.elapsed -= dur;
      this.frame++;
      if (this.frame >= this.frames.length) {
        if (this.loop) { this.frame = 0; }
        else { this.frame = this.frames.length - 1; this.done = true; break; }
      }
    }
  }

  // x, y = top-left corner of draw rect
  draw(ctx, x, y, w, h, flipX) {
    const img = this.frames[this.frame];
    if (!img) return;
    if (flipX) {
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
  }
}

// Build a SpriteAnim from a horizontal spritesheet image.
function sheetAnim(img, frameCount, fps, loop) {
  if (!img || frameCount <= 0) return new SpriteAnim([], fps, loop);
  const fw = img.naturalWidth / frameCount;
  const fh = img.naturalHeight;
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    const c = document.createElement('canvas');
    c.width = fw; c.height = fh;
    c.getContext('2d').drawImage(img, i * fw, 0, fw, fh, 0, 0, fw, fh);
    frames.push(c);
  }
  return new SpriteAnim(frames, fps, loop);
}

// Build a SpriteAnim from an array of loader keys.
function keysAnim(keys, fps, loop) {
  const frames = keys.map(k => Loader.get(k)).filter(Boolean);
  return new SpriteAnim(frames, fps, loop);
}
