import { GestureActions } from './GestureActionRegistry.js';

const PARAM_CANDIDATES = [
  { key: '_freq', label: 'Frequency', step: 0.15, min: 0.1, max: 8 },
  { key: '_amp', label: 'Amplitude', step: 0.12, min: 0.05, max: 5 },
  { key: '_speed', label: 'Speed', step: 1, min: 0, max: 80 },
  { key: '_angle', label: 'Angle', step: 3, min: 0, max: 90 },
  { key: '_g', label: 'Gravity', step: 0.4, min: 0.5, max: 30 },
  { key: '_gravity', label: 'Gravity', step: 0.4, min: 0.5, max: 30 },
  { key: '_mass', label: 'Mass', step: 0.2, min: 0.1, max: 100 },
  { key: '_temperature', label: 'Temperature', step: 5, min: -100, max: 1000 },
  { key: '_z', label: 'Atomic Number', step: 1, min: 1, max: 118 },
  { key: '_iter', label: 'Iterations', step: 8, min: 8, max: 512 },
  { key: '_speedMultiplier', label: 'Speed', step: 0.1, min: 0.1, max: 4 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class SimulationControlBus {
  constructor(gestureEngine) {
    this.gestureEngine = gestureEngine;
    this._activeLab = null;
    this._activeMeta = { subject: null, topic: null };
    this._paused = false;
    this._activeParam = null;
    this._statusEl = this._buildStatus();
    this._hintEl = this._buildHint();

    gestureEngine.onAction(action => this._handleAction(action));
  }

  setActiveLab(lab, meta = {}) {
    this._activeLab = lab || null;
    this._activeMeta = meta;
    this._paused = false;
    this._activeParam = this._findParameter();
    this._syncLabPause(false);
    this._renderHint();
  }

  clearActiveLab() {
    this._activeLab = null;
    this._activeMeta = { subject: null, topic: null };
    this._paused = false;
    this._activeParam = null;
    this._renderHint();
  }

  shouldUpdate(lab) {
    return !this._paused || (lab && lab !== this._activeLab);
  }

  isPaused() {
    return this._paused;
  }

  togglePause() {
    if (!this._activeLab) {
      this._flash('No active simulation');
      return;
    }
    this._paused = !this._paused;
    this._syncLabPause(this._paused);
    this._flash(this._paused ? 'Simulation paused' : 'Simulation resumed');
    this._renderHint();
  }

  reset() {
    const lab = this._activeLab;
    if (!lab) {
      this._flash('Nothing to reset');
      return;
    }

    if (typeof lab.reset === 'function') lab.reset();
    else if (typeof lab._reset === 'function') lab._reset();
    else if (typeof lab._build === 'function') lab._build();
    else if (typeof lab.hide === 'function' && typeof lab.show === 'function') {
      lab.hide();
      lab.show();
    }

    this._paused = false;
    this._syncLabPause(false);
    this._activeParam = this._findParameter();
    this._flash('Simulation reset');
    this._renderHint();
  }

  trigger() {
    const lab = this._activeLab;
    if (!lab) {
      this._flash('No active trigger');
      return;
    }

    if (typeof lab.trigger === 'function') lab.trigger();
    else if (typeof lab._trigger === 'function') lab._trigger();
    else if (typeof lab._fire === 'function') lab._fire();
    else if (typeof lab._launch === 'function') lab._launch();
    else if (typeof lab._triggerCollapse === 'function') lab._triggerCollapse();
    else if ('_dripping' in lab) lab._dripping = !lab._dripping;
    else this._flash('No trigger mapped here');

    this._flash('Trigger sent');
  }

  increaseParameter() {
    this._adjustParameter(1);
  }

  decreaseParameter() {
    this._adjustParameter(-1);
  }

  nextPreset() {
    this._cyclePreset(1);
  }

  previousPreset() {
    this._cyclePreset(-1);
  }

  _handleAction(action) {
    if (!action || !this._activeLab) return;
    if (action.name === GestureActions.PAUSE && action.phase === 'complete') this.togglePause();
    if (action.name === GestureActions.RESET && action.phase === 'complete') this.reset();
    if (action.name === GestureActions.SWIPE_UP && action.phase === 'complete') this.increaseParameter();
    if (action.name === GestureActions.SWIPE_DOWN && action.phase === 'complete') this.decreaseParameter();
    if (action.name === GestureActions.SWIPE_RIGHT && action.phase === 'complete') this.nextPreset();
    if (action.name === GestureActions.SWIPE_LEFT && action.phase === 'complete') this.previousPreset();
  }

  _syncLabPause(paused) {
    const lab = this._activeLab;
    if (!lab) return;
    if (typeof lab.pause === 'function' && paused) lab.pause();
    else if (typeof lab.resume === 'function' && !paused) lab.resume();
    else if (typeof lab.setPaused === 'function') lab.setPaused(paused);
    else if ('_paused' in lab) lab._paused = paused;
    else if ('_running' in lab) lab._running = !paused;
  }

  _adjustParameter(direction) {
    const lab = this._activeLab;
    if (!lab) return;

    if (direction > 0 && typeof lab.increaseParameter === 'function') {
      lab.increaseParameter();
      this._flash('Parameter increased');
      return;
    }
    if (direction < 0 && typeof lab.decreaseParameter === 'function') {
      lab.decreaseParameter();
      this._flash('Parameter decreased');
      return;
    }

    const param = this._activeParam || this._findParameter();
    if (!param) {
      this._flash('No adjustable parameter');
      return;
    }

    const before = Number(lab[param.key]);
    const next = clamp(before + param.step * direction, param.min, param.max);
    lab[param.key] = next;
    this._flash(`${param.label} ${next.toFixed(Number.isInteger(param.step) ? 0 : 2)}`);
    this._renderHint();
  }

  _cyclePreset(direction) {
    const lab = this._activeLab;
    if (!lab) return;

    if (direction > 0 && typeof lab.nextPreset === 'function') {
      lab.nextPreset();
      this._flash('Next preset');
      return;
    }
    if (direction < 0 && typeof lab.previousPreset === 'function') {
      lab.previousPreset();
      this._flash('Previous preset');
      return;
    }

    const presetKey = ['_presetIdx', '_currentFn', '_activeTitration'].find(key => Number.isFinite(lab[key]));
    if (!presetKey) {
      this._flash(direction > 0 ? 'Next gesture noted' : 'Previous gesture noted');
      return;
    }

    const max = this._guessPresetMax(lab, presetKey);
    lab[presetKey] = (lab[presetKey] + direction + max) % max;
    if (typeof lab._buildSurface === 'function' && Array.isArray(lab._presets)) {
      lab._buildSurface(lab._presets[lab[presetKey]]);
    } else if (typeof lab._build === 'function') {
      lab._build();
    }
    this._flash(direction > 0 ? 'Next preset' : 'Previous preset');
  }

  _guessPresetMax(lab, key) {
    if (Array.isArray(lab._presets)) return lab._presets.length;
    if (Array.isArray(lab._functions)) return lab._functions.length;
    if (key === '_activeTitration') return 2;
    return 6;
  }

  _findParameter() {
    const lab = this._activeLab;
    if (!lab) return null;
    return PARAM_CANDIDATES.find(param => Number.isFinite(lab[param.key])) || null;
  }

  _buildStatus() {
    const el = document.createElement('div');
    el.id = 'simulation-status';
    el.className = 'hidden';
    document.body.appendChild(el);
    return el;
  }

  _buildHint() {
    const el = document.createElement('div');
    el.id = 'simulation-hint';
    el.className = 'hidden';
    document.body.appendChild(el);
    return el;
  }

  _flash(text) {
    this._statusEl.textContent = text;
    this._statusEl.classList.remove('hidden');
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => this._statusEl.classList.add('hidden'), 1200);
  }

  _renderHint() {
    if (!this._activeLab) {
      this._hintEl.classList.add('hidden');
      return;
    }
    const param = this._activeParam || this._findParameter();
    this._hintEl.innerHTML = `
      <strong>${this._paused ? 'Paused' : 'Live'}</strong>
      <span>Open palm: pause | Fist hold: reset | Swipe up/down: ${param ? param.label : 'parameter'}</span>
    `;
    this._hintEl.classList.remove('hidden');
  }
}
