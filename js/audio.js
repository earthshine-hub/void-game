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
  },

  _musicGain: null,
  _musicBeat: 0,
  _musicNotes: [],
  _musicStepTime: 0.125,
  _musicSched: 0,
  _musicTimer: null,

  startMusic(level) {
    if (!Audio.ctx) return;
    Audio.stopMusic();
    const seqs = {
      1: [130.8,0,196,0,261.6,0,196,0, 164.8,0,220,0,164.8,0,130.8,0],
      2: [110,0,164.8,0,220,0,164.8,0, 130.8,0,196,0,130.8,0,110,0],
      3: [87.3,0,130.8,0,174.6,0,130.8,0, 116.5,0,155.6,0,116.5,0,87.3,0],
      4: [73.4,0,110,0,146.8,0,110,0, 98,0,130.8,0,98,0,73.4,0],
    };
    Audio._musicNotes = seqs[level] || seqs[1];
    Audio._musicBeat = 0;
    Audio._musicGain = Audio.ctx.createGain();
    Audio._musicGain.gain.value = 0.1;
    Audio._musicGain.connect(Audio.ctx.destination);
    // Wait for context to be running before scheduling, so currentTime is accurate
    const startTick = () => {
      Audio._musicSched = Audio.ctx.currentTime + 0.05;
      Audio._musicTick();
    };
    if (Audio.ctx.state === 'suspended') {
      Audio.ctx.resume().then(startTick).catch(startTick);
    } else {
      startTick();
    }
  },

  _musicTick() {
    if (!Audio._musicGain || !Audio.ctx) return;
    // Always stay ahead of currentTime to avoid scheduling in the past
    Audio._musicSched = Math.max(Audio._musicSched, Audio.ctx.currentTime + 0.05);
    while (Audio._musicSched < Audio.ctx.currentTime + 2.5) {
      const freq = Audio._musicNotes[Audio._musicBeat % Audio._musicNotes.length];
      if (freq > 0) {
        const osc = Audio.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const env = Audio.ctx.createGain();
        env.gain.setValueAtTime(0.001, Audio._musicSched);
        env.gain.linearRampToValueAtTime(1, Audio._musicSched + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, Audio._musicSched + Audio._musicStepTime * 0.75);
        osc.connect(env);
        env.connect(Audio._musicGain);
        osc.start(Audio._musicSched);
        osc.stop(Audio._musicSched + Audio._musicStepTime);
      }
      Audio._musicBeat++;
      Audio._musicSched += Audio._musicStepTime;
    }
    Audio._musicTimer = setTimeout(() => Audio._musicTick(), 800);
  },

  stopMusic() {
    if (Audio._musicTimer !== null) { clearTimeout(Audio._musicTimer); Audio._musicTimer = null; }
    if (Audio._musicGain) {
      const g = Audio._musicGain;
      Audio._musicGain = null;
      try {
        g.gain.setValueAtTime(g.gain.value, Audio.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, Audio.ctx.currentTime + 0.3);
      } catch(e) {}
      setTimeout(() => { try { g.disconnect(); } catch(e) {} }, 400);
    }
  },
};
