'use strict';

const Audio = {
  ctx: null,

  init() {
    try {
      Audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { /* no audio */ }
  },

  _resume() {
    if (Audio.ctx && Audio.ctx.state === 'suspended') Audio.ctx.resume();
  },

  _osc(freq, endFreq, duration, type, gain) {
    if (!Audio.ctx) return;
    Audio._resume();
    const osc = Audio.ctx.createOscillator();
    const g = Audio.ctx.createGain();
    osc.connect(g); g.connect(Audio.ctx.destination);
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, Audio.ctx.currentTime);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, Audio.ctx.currentTime + duration);
    g.gain.setValueAtTime(gain || 0.2, Audio.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, Audio.ctx.currentTime + duration);
    osc.start(); osc.stop(Audio.ctx.currentTime + duration);
  },

  _noise(duration, gainVal, freqCutoff) {
    if (!Audio.ctx) return;
    Audio._resume();
    const sr = Audio.ctx.sampleRate;
    const buf = Audio.ctx.createBuffer(1, sr * duration, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = Audio.ctx.createBufferSource();
    src.buffer = buf;
    const filt = Audio.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = freqCutoff || 800;
    const g = Audio.ctx.createGain();
    src.connect(filt); filt.connect(g); g.connect(Audio.ctx.destination);
    g.gain.setValueAtTime(gainVal || 0.4, Audio.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, Audio.ctx.currentTime + duration);
    src.start(); src.stop(Audio.ctx.currentTime + duration);
  },

  shoot()      { Audio._osc(900, 400, 0.09, 'sawtooth', 0.18); },
  hit()        { Audio._osc(220, 110, 0.12, 'square', 0.25); },
  explosion()  { Audio._noise(0.35, 0.55, 700); },
  bigExplosion(){ Audio._noise(0.7, 0.8, 400); },
  powerup()    {
    [440, 660, 880].forEach((f, i) =>
      setTimeout(() => Audio._osc(f, f * 1.2, 0.18, 'sine', 0.25), i * 120));
  },
  bossAlert()  {
    Audio._osc(120, 80, 0.5, 'sawtooth', 0.4);
    setTimeout(() => Audio._osc(100, 70, 0.5, 'sawtooth', 0.4), 600);
  },
  levelClear() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => Audio._osc(f, f, 0.3, 'sine', 0.3), i * 180));
  }
};
