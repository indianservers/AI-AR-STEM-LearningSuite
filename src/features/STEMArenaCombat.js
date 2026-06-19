import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { GestureActions } from '../core/GestureActionRegistry.js';

const STORAGE_KEY = 'cosmiclearn_arena_combat';

const ARENAS = {
  waves: {
    name: 'Resonance Rift',
    target: 'Node Core',
    weakness: 'Wave Surge',
    hint: 'Hit with Wave Surge after changing parameters.',
    color: '#00f0ff',
  },
  gravity: {
    name: 'Orbit Breaker',
    target: 'Gravity Core',
    weakness: 'Gravity Crush',
    hint: 'Crush after building orbit momentum.',
    color: '#ffd700',
  },
  pendulum: {
    name: 'Time Gate',
    target: 'Kinetic Lock',
    weakness: 'Time Freeze',
    hint: 'Freeze at the right moment.',
    color: '#bfeaff',
  },
  function3d: {
    name: 'Surface Rift',
    target: 'Critical Point',
    weakness: 'Function Rift',
    hint: 'Tear the surface after rotating it.',
    color: '#7a5cff',
  },
  vectors: {
    name: 'Vector Duel',
    target: 'Direction Shield',
    weakness: 'Vector Slash',
    hint: 'Slash after aligning direction.',
    color: '#00d4ff',
  },
  graph2d: {
    name: 'Vector Duel',
    target: 'Axis Shield',
    weakness: 'Vector Slash',
    hint: 'Slash through the axis lock.',
    color: '#00d4ff',
  },
  atomic: {
    name: 'Atomic Breach',
    target: 'Nucleus Shell',
    weakness: 'Atom Burst',
    hint: 'Burst after inspection.',
    color: '#7fff7f',
  },
  periodic: {
    name: 'Element Gate',
    target: 'Element Core',
    weakness: 'Atom Burst',
    hint: 'Burst the element core.',
    color: '#7fff7f',
  },
  molecules: {
    name: 'Bond Arena',
    target: 'Bond Lock',
    weakness: 'Molecule Forge',
    hint: 'Forge after rotating the structure.',
    color: '#ff6b35',
  },
  titration: {
    name: 'Reaction Gate',
    target: 'pH Lock',
    weakness: 'Molecule Forge',
    hint: 'Forge near the reaction swing.',
    color: '#ff6b35',
  },
  default: {
    name: 'STEM Rift',
    target: 'Concept Core',
    weakness: 'Portal Surge',
    hint: 'Use any power to break the core.',
    color: '#ff4fd8',
  },
};

function defaults() {
  return {
    clears: 0,
    bestOverdrive: 0,
    hits: 0,
  };
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

export class STEMArenaCombat {
  constructor({ scene, gestureEngine, aiTutor, game, getState }) {
    this.scene = scene;
    this.gestureEngine = gestureEngine;
    this.aiTutor = aiTutor;
    this.game = game;
    this.getState = getState || (() => ({}));
    this._state = this._load();
    this._hud = null;
    this._toast = null;
    this._arena = null;
    this._hp = 0;
    this._maxHp = 100;
    this._charge = 0;
    this._mesh = null;
    this._halo = null;
    this._material = null;
    this._haloMaterial = null;
    this._lastTopic = null;

    this._buildHud();
    this._bind();
    this.syncContext();
  }

  syncContext() {
    const app = this.getState();
    if (!app.currentTopic) {
      this._lastTopic = null;
      this._arena = null;
      this._disposeTarget();
      this._render();
      return;
    }
    if (app.currentTopic === this._lastTopic) {
      this._render();
      return;
    }
    this._lastTopic = app.currentTopic;
    this._startArena(app.currentTopic);
  }

  update(deltaTime = 16) {
    if (!this._mesh || !this._arena) return;
    const dt = Math.min(0.05, deltaTime / 1000);
    this._mesh.rotation.y += dt * 0.9;
    this._mesh.rotation.x += dt * 0.35;
    if (this._halo) {
      this._halo.rotation.z -= dt * 1.2;
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.05;
      this._halo.scaling.setAll(pulse);
    }
  }

  _bind() {
    this.gestureEngine?.onAction?.((action) => {
      if (!this._arena || !action || action.phase !== 'complete') return;
      if (action.name === GestureActions.INSPECT) this._addCharge(10, 'Scan charge');
      if (action.name === GestureActions.ROTATE || action.name === GestureActions.SCALE) this._addCharge(12, 'Control charge');
      if (action.name === GestureActions.SWIPE_UP || action.name === GestureActions.SWIPE_DOWN) this._addCharge(8, 'Parameter charge');
      if (action.name === GestureActions.THROW) this._hit('Vector Slash', 'throw');
    });

    document.addEventListener('cosmiclearn:game-event', event => {
      if (event.detail?.type === 'powerUse') {
        this._hit(event.detail.detail?.power, event.detail.detail?.reason);
      }
    });
  }

  _startArena(topic) {
    this._arena = ARENAS[topic] || ARENAS.default;
    this._maxHp = 120;
    this._hp = this._maxHp;
    this._charge = 0;
    this._spawnTarget();
    this._toastMessage(`${this._arena.name}: ${this._arena.target}`);
    this.aiTutor?.coach?.(`${this._arena.name}: ${this._arena.hint}`, { kind: 'arena' });
    this._render();
  }

  _spawnTarget() {
    this._disposeTarget();
    if (!this.scene) return;
    const color = hexToColor3(this._arena.color);
    const center = this.scene.activeCamera?.target?.clone?.() || Vector3.Zero();
    const mesh = MeshBuilder.CreatePolyhedron('arenaTargetCore', {
      type: 2,
      size: 0.72,
    }, this.scene);
    mesh.position = center.add(new Vector3(0, 1.45, 0));
    mesh.isPickable = false;

    const mat = new StandardMaterial('arenaTargetMat', this.scene);
    mat.emissiveColor = color.scale(0.78);
    mat.diffuseColor = color;
    mat.alpha = 0.94;
    mesh.material = mat;

    const halo = MeshBuilder.CreateTorus('arenaTargetHalo', {
      diameter: 1.55,
      thickness: 0.025,
      tessellation: 72,
    }, this.scene);
    halo.position = mesh.position.clone();
    halo.isPickable = false;
    const haloMat = new StandardMaterial('arenaTargetHaloMat', this.scene);
    haloMat.emissiveColor = color;
    haloMat.diffuseColor = color;
    haloMat.alpha = 0.72;
    halo.material = haloMat;

    this._mesh = mesh;
    this._halo = halo;
    this._material = mat;
    this._haloMaterial = haloMat;
  }

  _hit(powerName, reason) {
    if (!this._arena || this._hp <= 0) return;
    const exact = powerName === this._arena.weakness;
    const charged = this._charge >= 45;
    const damage = exact ? (charged ? 58 : 38) : (charged ? 26 : 14);
    this._hp = Math.max(0, this._hp - damage);
    this._charge = Math.max(0, this._charge - (exact ? 28 : 18));
    this._state.hits += 1;
    this.game?.recordEvent?.('arenaHit', {
      arena: this._arena.name,
      target: this._arena.target,
      power: powerName || 'Unknown',
      exact,
      damage,
      reason,
    });
    this._hitFlash(exact, damage);
    this._toastMessage(`${exact ? 'Weak hit' : 'Hit'}: ${damage}`);
    if (this._hp <= 0) this._clearArena(powerName);
    this._save();
    this._render();
  }

  _addCharge(amount, label) {
    this._charge = Math.min(100, this._charge + amount);
    this._state.bestOverdrive = Math.max(this._state.bestOverdrive, this._charge);
    if (this._charge >= 100) this._toastMessage('Overdrive ready');
    else if (amount >= 10) this._toastMessage(label);
    this._save();
    this._render();
  }

  _clearArena(powerName) {
    this._state.clears += 1;
    this.game?.recordEvent?.('arenaClear', {
      arena: this._arena.name,
      target: this._arena.target,
      power: powerName || 'Unknown',
    });
    this._toastMessage(`Arena clear: ${this._arena.name}`);
    this.aiTutor?.coach?.(`${this._arena.target} shattered. Chain another lab for a faster arena clear.`, { kind: 'arena' });
    this._shatterTarget();
    this._save();
  }

  _hitFlash(exact, damage) {
    if (!this._mesh || !this._material || !this._haloMaterial) return;
    const flash = exact ? new Color3(1, 1, 1) : new Color3(1, 0.55, 0.15);
    this._material.emissiveColor = flash;
    this._haloMaterial.emissiveColor = flash;
    this._mesh.scaling.setAll(1 + Math.min(0.48, damage / 100));
    setTimeout(() => {
      if (!this._arena || !this._material || !this._mesh) return;
      const color = hexToColor3(this._arena.color);
      this._material.emissiveColor = color.scale(0.78);
      this._haloMaterial.emissiveColor = color;
      this._mesh.scaling.setAll(1);
    }, 170);
  }

  _shatterTarget() {
    const target = this._mesh;
    const halo = this._halo;
    setTimeout(() => {
      if (target && !target.isDisposed()) target.dispose();
      if (halo && !halo.isDisposed()) halo.dispose();
      this._mesh = null;
      this._halo = null;
      this._material?.dispose();
      this._haloMaterial?.dispose();
      this._material = null;
      this._haloMaterial = null;
    }, 240);
  }

  _disposeTarget() {
    this._mesh?.dispose();
    this._halo?.dispose();
    this._material?.dispose();
    this._haloMaterial?.dispose();
    this._mesh = null;
    this._halo = null;
    this._material = null;
    this._haloMaterial = null;
  }

  _buildHud() {
    const hud = document.createElement('section');
    hud.id = 'stem-arena-hud';
    document.body.appendChild(hud);
    this._hud = hud;
  }

  _render() {
    if (!this._hud) return;
    if (!this._arena) {
      this._hud.classList.add('hidden');
      return;
    }
    this._hud.classList.remove('hidden');
    const hpPct = Math.round((this._hp / this._maxHp) * 100);
    this._hud.style.setProperty('--arena-accent', this._arena.color);
    this._hud.innerHTML = `
      <header>
        <div>
          <p>Arena Combat</p>
          <h2>${this._arena.name}</h2>
        </div>
        <strong>${hpPct}%</strong>
      </header>
      <div class="arena-hp"><span style="width:${hpPct}%"></span></div>
      <div class="arena-charge"><span style="width:${Math.round(this._charge)}%"></span></div>
      <small>${this._arena.target} weak to ${this._arena.weakness}</small>
    `;
  }

  _toastMessage(message) {
    if (!message) return;
    if (!this._toast) {
      const toast = document.createElement('div');
      toast.id = 'stem-arena-toast';
      document.body.appendChild(toast);
      this._toast = toast;
    }
    this._toast.textContent = message;
    this._toast.classList.remove('visible');
    requestAnimationFrame(() => this._toast?.classList.add('visible'));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this._toast?.classList.remove('visible'), 1300);
  }

  _load() {
    try { return { ...defaults(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
    catch { return defaults(); }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
  }
}
