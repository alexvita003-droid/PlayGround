import { clamp, safeLocalGet, safeLocalSet } from './util.js';

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = safeLocalGet('fd_muted') === true;
    this.noise = null;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.startAmbient();
  }
  setMuted(m) {
    this.muted = m;
    safeLocalSet('fd_muted', m);
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }
  tone(freq, dur, type = 'sine', vol = 0.15, slide = 1, delay = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  burst(dur = 0.2, vol = 0.2, filterFreq = 1400, type = 'bandpass', delay = 0) {
    if (!this.ctx || !this.noise) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(filterFreq, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(80, filterFreq * 0.35), t0 + dur);
    f.Q.value = 1.1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }
  startAmbient() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const g = this.ctx.createGain(); g.gain.value = 0.035;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    g.connect(f).connect(this.master);
    [98, 147, 196.5, 293.5].forEach((fr, i) => {
      const o = this.ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = fr;
      const og = this.ctx.createGain();
      og.gain.value = 0.5 / (i + 1);
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.04 + i * 0.017;
      const lg = this.ctx.createGain(); lg.gain.value = 0.18 / (i + 1);
      lfo.connect(lg).connect(og.gain);
      o.connect(og).connect(g);
      o.start(t0); lfo.start(t0);
    });
  }
  play(name) {
    if (!this.ctx || this.muted) return;
    const A = this.ctx.currentTime;
    switch (name) {
      case 'swing': this.burst(0.15, 0.22, 2100); this.tone(520, 0.09, 'sawtooth', 0.03, 0.6); break;
      case 'swing2': this.burst(0.13, 0.2, 2800); break;
      case 'hit': this.burst(0.1, 0.28, 900, 'lowpass'); this.tone(150, 0.1, 'square', 0.07, 0.5); break;
      case 'crit': this.burst(0.2, 0.34, 1200); this.tone(880, 0.16, 'triangle', 0.09, 0.4); this.tone(1320, 0.12, 'sine', 0.05, 0.5, 0.03); break;
      case 'dash': this.burst(0.22, 0.17, 1600, 'highpass'); break;
      case 'skill': this.tone(300, 0.4, 'sawtooth', 0.08, 2.4); this.burst(0.4, 0.2, 2400); break;
      case 'ult': this.tone(110, 0.7, 'sawtooth', 0.1, 3); this.tone(220, 0.9, 'triangle', 0.06, 2.5); this.burst(0.8, 0.22, 800, 'lowpass'); break;
      case 'hurt': this.tone(180, 0.22, 'square', 0.11, 0.6); this.burst(0.18, 0.15, 600, 'lowpass'); break;
      case 'pickup': this.tone(980, 0.08, 'sine', 0.07, 1.6); this.tone(1460, 0.1, 'sine', 0.05, 1.5, 0.06); break;
      case 'coin': this.tone(1200, 0.06, 'triangle', 0.06, 1.2); this.tone(1800, 0.08, 'sine', 0.04, 1.1, 0.05); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.08, 1, i * 0.09)); break;
      case 'quest': [392, 523, 659].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.08, 1, i * 0.12)); break;
      case 'boss': this.tone(58, 1.6, 'sawtooth', 0.15, 0.8); this.burst(1.2, 0.25, 300, 'lowpass'); break;
      case 'roar': this.tone(72, 1.1, 'sawtooth', 0.14, 1.9); this.burst(0.9, 0.2, 500, 'lowpass'); break;
      case 'heal': this.tone(660, 0.25, 'sine', 0.06, 1.4); this.tone(990, 0.3, 'sine', 0.05, 1.3, 0.1); break;
      case 'death': this.tone(180, 0.9, 'sawtooth', 0.1, 0.25); this.burst(0.8, 0.2, 500, 'lowpass'); break;
      case 'win': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.8, 'triangle', 0.08, 1, i * 0.13)); break;
      case 'ui': this.tone(700, 0.05, 'sine', 0.04, 1.2); break;
      case 'deny': this.tone(140, 0.18, 'square', 0.06, 0.8); break;
      default: break;
    }
  }
  footstep() {
    if (!this.ctx || this.muted) return;
    this.burst(0.06, 0.035, 420, 'lowpass');
  }
}
