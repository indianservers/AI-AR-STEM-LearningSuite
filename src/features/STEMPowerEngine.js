import {
  Color3,
  Color4,
  DynamicTexture,
  MeshBuilder,
  ParticleSystem,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { GestureActions } from '../core/GestureActionRegistry.js';

const STORAGE_KEY = 'cosmiclearn_power_state';

const POWERS = {
  math: [
    { id: 'vector_slash', name: 'Vector Slash', color: '#00d4ff', cue: 'Directional strike' },
    { id: 'function_rift', name: 'Function Rift', color: '#7a5cff', cue: 'Surface tear' },
  ],
  physics: [
    { id: 'gravity_crush', name: 'Gravity Crush', color: '#ffd700', cue: 'Field collapse' },
    { id: 'time_freeze', name: 'Time Freeze', color: '#bfeaff', cue: 'Slow motion pulse' },
  ],
  chem: [
    { id: 'atom_burst', name: 'Atom Burst', color: '#7fff7f', cue: 'Particle bloom' },
    { id: 'molecule_forge', name: 'Molecule Forge', color: '#ff6b35', cue: 'Bond flare' },
  ],
  home: [
    { id: 'portal_surge', name: 'Portal Surge', color: '#ff4fd8', cue: 'World reveal' },
  ],
};

const TOPIC_POWER = {
  waves: 'wave_surge',
  pendulum: 'time_freeze',
  gravity: 'gravity_crush',
  function3d: 'function_rift',
  graph2d: 'vector_slash',
  vectors: 'vector_slash',
  molecules: 'molecule_forge',
  atomic: 'atom_burst',
  periodic: 'atom_burst',
  titration: 'molecule_forge',
};

const SPECIAL_POWERS = {
  wave_surge: { id: 'wave_surge', name: 'Wave Surge', color: '#00f0ff', cue: 'Resonance wave' },
};

function allPowersFor(subject) {
  return [...(POWERS[subject || 'home'] || POWERS.home)];
}

function hexToColor3(hex) {
  const clean = String(hex || '#00d4ff').replace('#', '');
  const value = parseInt(clean, 16);
  return new Color3(
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255
  );
}

function defaults() {
  return {
    uses: 0,
    discoveries: [],
    lastPower: null,
  };
}

export class STEMPowerEngine {
  constructor({ scene, gestureEngine, aiTutor, game, getState }) {
    this.scene = scene;
    this.gestureEngine = gestureEngine;
    this.aiTutor = aiTutor;
    this.game = game;
    this.getState = getState || (() => ({}));
    this._state = this._load();
    this._hud = null;
    this._layer = null;
    this._toast = null;
    this._lastGesturePowerAt = 0;
    this._gestureChain = [];

    this._buildHud();
    this._buildLayer();
    this._bind();
    this.syncContext();
  }

  syncContext() {
    this._renderHud();
  }

  triggerWow(reason = 'manual') {
    const state = this.getState();
    const power = this._powerForContext(state, reason);
    this._firePower(power, reason);
  }

  showLoadout() {
    const state = this.getState();
    const subject = state.currentSubject || 'home';
    const powers = allPowersFor(subject);
    this._toastMessage(`${subject.toUpperCase()} powers: ${powers.map(power => power.name).join(' / ')}`);
  }

  _bind() {
    this.gestureEngine?.onAction?.((action) => {
      if (!action || action.phase !== 'complete') return;
      this._gestureChain.push({ name: action.name, time: Date.now() });
      this._gestureChain = this._gestureChain.filter(item => Date.now() - item.time < 4500);

      const now = Date.now();
      if (now - this._lastGesturePowerAt < 2600) return;
      if (action.name === GestureActions.THROW) {
        this._lastGesturePowerAt = now;
        this._firePower(this._powerById('vector_slash'), 'throw');
      }
      if (action.name === GestureActions.SCALE) {
        this._lastGesturePowerAt = now;
        this._firePower(this._powerForContext(this.getState(), 'scale'), 'scale');
      }
      if (action.name === GestureActions.PAUSE) {
        this._lastGesturePowerAt = now;
        this._firePower(this._powerById('time_freeze'), 'pause');
      }
      if (this._hasChain([GestureActions.INSPECT, GestureActions.ROTATE, GestureActions.SCALE])) {
        this._lastGesturePowerAt = now;
        this._firePower(this._powerForContext(this.getState(), 'combo'), 'combo');
        this._gestureChain = [];
      }
    });
  }

  _hasChain(sequence) {
    const names = this._gestureChain.map(item => item.name);
    let cursor = 0;
    for (const name of names) {
      if (name === sequence[cursor]) cursor++;
      if (cursor >= sequence.length) return true;
    }
    return false;
  }

  _powerForContext(state, reason) {
    const topicPower = TOPIC_POWER[state.currentTopic];
    if (topicPower) return this._powerById(topicPower);
    if (reason === 'scale' && state.currentSubject === 'physics') return this._powerById('gravity_crush');
    if (reason === 'combo' && state.currentSubject === 'chem') return this._powerById('molecule_forge');
    const list = allPowersFor(state.currentSubject || 'home');
    return list[this._state.uses % list.length] || POWERS.home[0];
  }

  _powerById(id) {
    return [...Object.values(POWERS).flat(), ...Object.values(SPECIAL_POWERS)].find(power => power.id === id)
      || POWERS.home[0];
  }

  _firePower(power, reason) {
    if (!power) return;
    this._state.uses += 1;
    this._state.lastPower = power.id;
    if (!this._state.discoveries.includes(power.id)) {
      this._state.discoveries.push(power.id);
      this._toastMessage(`Discovery: ${power.name}`);
    } else {
      this._toastMessage(power.name);
    }
    this._save();
    this._renderHud();
    this._screenBurst(power, reason);
    this._sceneBurst(power);
    this.game?.recordEvent?.('powerUse', { power: power.name, reason });
    this.aiTutor?.coach?.(`${power.name}: ${power.cue}.`, { kind: 'power' });
  }

  _buildHud() {
    const hud = document.createElement('button');
    hud.id = 'stem-power-hud';
    hud.type = 'button';
    hud.title = 'STEM powers';
    hud.addEventListener('click', () => this.showLoadout());
    document.body.appendChild(hud);
    this._hud = hud;
  }

  _buildLayer() {
    const layer = document.createElement('div');
    layer.id = 'stem-power-layer';
    document.body.appendChild(layer);
    this._layer = layer;
  }

  _renderHud() {
    if (!this._hud) return;
    const state = this.getState();
    const power = this._powerForContext(state, 'hud');
    this._hud.style.setProperty('--power-accent', power.color);
    this._hud.innerHTML = `
      <span>POWER</span>
      <strong>${power.name}</strong>
      <small>${this._state.discoveries.length} found</small>
    `;
  }

  _screenBurst(power, reason) {
    if (!this._layer) return;
    this._layer.style.setProperty('--power-accent', power.color);
    const burst = document.createElement('div');
    burst.className = `stem-power-burst power-${power.id}`;
    burst.innerHTML = `
      <span>${power.name}</span>
      <strong>${power.cue}</strong>
    `;
    this._layer.appendChild(burst);

    for (let i = 0; i < 18; i++) {
      const shard = document.createElement('i');
      shard.className = 'stem-power-shard';
      shard.style.setProperty('--tx', `${Math.round((Math.random() - 0.5) * 520)}px`);
      shard.style.setProperty('--ty', `${Math.round((Math.random() - 0.5) * 340)}px`);
      shard.style.setProperty('--rot', `${Math.round(Math.random() * 360)}deg`);
      shard.style.setProperty('--delay', `${Math.random() * 0.14}s`);
      this._layer.appendChild(shard);
      setTimeout(() => shard.remove(), 1100);
    }

    document.body.classList.add('stem-power-active');
    setTimeout(() => {
      burst.remove();
      document.body.classList.remove('stem-power-active');
    }, reason === 'manual' ? 1400 : 1100);
  }

  _sceneBurst(power) {
    if (!this.scene) return;
    const color = hexToColor3(power.color);
    const center = this.scene.activeCamera?.target?.clone?.() || Vector3.Zero();
    const ring = MeshBuilder.CreateTorus(`powerRing_${power.id}`, {
      diameter: 3.4,
      thickness: 0.035,
      tessellation: 96,
    }, this.scene);
    ring.position = center.add(new Vector3(0, 0.2, 0));
    ring.rotation.x = Math.PI / 2;
    ring.isPickable = false;
    const mat = new StandardMaterial(`powerMat_${power.id}_${Date.now()}`, this.scene);
    mat.emissiveColor = color;
    mat.diffuseColor = color;
    mat.alpha = 0.72;
    ring.material = mat;

    const texture = new DynamicTexture(`powerParticleTex_${Date.now()}`, { width: 32, height: 32 }, this.scene);
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 16, 8, 0, Math.PI * 2);
    ctx.fill();
    texture.update();

    const ps = new ParticleSystem(`powerParticles_${Date.now()}`, 120, this.scene);
    ps.particleTexture = texture;
    ps.emitter = ring;
    ps.minEmitBox = new Vector3(-1.4, -0.05, -1.4);
    ps.maxEmitBox = new Vector3(1.4, 0.05, 1.4);
    ps.color1 = new Color4(color.r, color.g, color.b, 1);
    ps.color2 = new Color4(1, 1, 1, 0.8);
    ps.colorDead = new Color4(color.r, color.g, color.b, 0);
    ps.minSize = 0.05;
    ps.maxSize = 0.16;
    ps.minLifeTime = 0.2;
    ps.maxLifeTime = 0.7;
    ps.emitRate = 320;
    ps.direction1 = new Vector3(-1, 0.4, -1);
    ps.direction2 = new Vector3(1, 1.2, 1);
    ps.minEmitPower = 0.6;
    ps.maxEmitPower = 1.8;
    ps.updateSpeed = 0.018;
    ps.start();

    const started = performance.now();
    const animate = () => {
      const t = Math.min(1, (performance.now() - started) / 900);
      ring.scaling.setAll(1 + t * 2.4);
      mat.alpha = Math.max(0, 0.72 * (1 - t));
      if (t < 1 && !ring.isDisposed()) requestAnimationFrame(animate);
    };
    animate();

    setTimeout(() => {
      ps.stop();
      setTimeout(() => {
        ps.dispose();
        texture.dispose();
        ring.dispose();
        mat.dispose();
      }, 900);
    }, 420);
  }

  _toastMessage(message) {
    if (!message) return;
    if (!this._toast) {
      const toast = document.createElement('div');
      toast.id = 'stem-power-toast';
      document.body.appendChild(toast);
      this._toast = toast;
    }
    this._toast.textContent = message;
    this._toast.classList.remove('visible');
    requestAnimationFrame(() => this._toast?.classList.add('visible'));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this._toast?.classList.remove('visible'), 1700);
  }

  _load() {
    try { return { ...defaults(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
    catch { return defaults(); }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
  }
}
