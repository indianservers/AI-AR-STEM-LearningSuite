// Synthesized sound effects — pure Web Audio API, no external files needed
class SoundFX {
  constructor() {
    this._ctx = null;
    this._enabled = true;
    this._volume = 0.22;
  }

  _getCtx() {
    if (!this._ctx) {
      try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this._enabled = false; }
    }
    if (this._ctx?.state === 'suspended') this._ctx.resume().catch(() => {});
    return this._ctx;
  }

  _tone(freq, type = 'sine', duration = 0.18, gain = 0.18, startTime = 0) {
    if (!this._enabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    const t = ctx.currentTime + startTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gainNode.gain.setValueAtTime(gain * this._volume, t);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  _sweep(freqStart, freqEnd, type = 'sawtooth', duration = 0.22, gain = 0.15, startTime = 0) {
    if (!this._enabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    const t = ctx.currentTime + startTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
    gainNode.gain.setValueAtTime(gain * this._volume, t);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  // Short UI click / tap
  blip() {
    this._tone(880, 'sine', 0.06, 0.6);
  }

  // Soft pop — button press, item appear
  pop() {
    this._tone(440, 'sine', 0.1, 0.5);
    this._tone(660, 'sine', 0.06, 0.3, 0.04);
  }

  // Upward swish — navigation, transition
  swoosh() {
    this._sweep(220, 880, 'sine', 0.2, 0.4);
  }

  // Downward swish — going back
  swooshDown() {
    this._sweep(880, 220, 'sine', 0.18, 0.35);
  }

  // Portal entry — entering a subject
  portal() {
    this._sweep(110, 440, 'sine', 0.28, 0.5);
    this._tone(660, 'sine', 0.22, 0.4, 0.2);
    this._tone(880, 'sine', 0.18, 0.3, 0.38);
  }

  // Achievement chime — quest complete, level up
  chime() {
    [523, 659, 784, 1047].forEach((f, i) => {
      this._tone(f, 'sine', 0.45, 0.55, i * 0.09);
    });
  }

  // XP gain — quick positive ding
  xp() {
    this._tone(660, 'sine', 0.12, 0.45);
    this._tone(880, 'sine', 0.1, 0.35, 0.08);
  }

  // Power / WOW button
  boom() {
    this._tone(80, 'sawtooth', 0.5, 0.9);
    this._tone(160, 'square', 0.3, 0.5, 0.08);
    this._sweep(800, 200, 'sine', 0.4, 0.5, 0.12);
  }

  // Entering a lab topic
  labEnter() {
    this._tone(440, 'sine', 0.15, 0.45);
    this._tone(550, 'sine', 0.14, 0.4, 0.08);
    this._tone(660, 'sine', 0.2, 0.5, 0.16);
  }

  // Confetti / celebration
  celebrate() {
    [392, 523, 659, 784, 1047].forEach((f, i) => {
      this._tone(f, 'sine', 0.35, 0.5, i * 0.07);
    });
  }

  // Friendly whoosh on gesture swipe
  swipe() {
    this._sweep(400, 1200, 'sine', 0.15, 0.28);
  }

  // Home return
  home() {
    this._tone(880, 'sine', 0.12, 0.4);
    this._tone(660, 'sine', 0.12, 0.35, 0.06);
    this._tone(440, 'sine', 0.2, 0.45, 0.12);
  }

  setVolume(v) { this._volume = Math.max(0, Math.min(1, v)); }
  setEnabled(v) { this._enabled = !!v; }
}

export const soundFX = new SoundFX();
