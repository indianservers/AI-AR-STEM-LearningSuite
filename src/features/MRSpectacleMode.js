import {
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

const STORAGE_KEY = 'cosmiclearn_mr_spectacle';

const SUBJECT_COLOR = {
  math: '#00d4ff',
  physics: '#ff6b35',
  chem: '#7fff7f',
  home: '#ff4fd8',
};

function defaults() {
  return {
    activations: 0,
    projections: 0,
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

export class MRSpectacleMode {
  constructor({ scene, xrManager, aiTutor, game, getState }) {
    this.scene = scene;
    this.xrManager = xrManager;
    this.aiTutor = aiTutor;
    this.game = game;
    this.getState = getState || (() => ({}));
    this._state = this._load();
    this._active = false;
    this._xrMode = 'desktop';
    this._hud = null;
    this._toast = null;
    this._root = null;
    this._portal = [];
    this._label = null;
    this._particles = null;
    this._t = 0;

    this._buildHud();
    this._bind();
    this.syncContext();
  }

  toggle() {
    if (this._active) this.deactivate();
    else this.activate();
  }

  activate(reason = 'manual') {
    if (this._active) return;
    this._active = true;
    this._state.activations += 1;
    this._save();
    this._buildPortal();
    this._toastMessage(this._xrMode === 'ar' ? 'AR spectacle armed' : 'MR spectacle armed');
    this.game?.recordEvent?.('mrSpectacle', { reason, mode: this._xrMode });
    this.aiTutor?.coach?.('MR Spectacle Mode armed. Fire WOW or clear an arena to project the effect into the room.', { kind: 'mr' });
    this._renderHud();
  }

  deactivate() {
    if (!this._active) return;
    this._active = false;
    this._disposePortal();
    this._toastMessage('MR spectacle off');
    this._renderHud();
  }

  syncContext() {
    this._renderHud();
    if (this._active) this._refreshPortalColor();
  }

  setXRMode(mode) {
    this._xrMode = mode || 'desktop';
    this._renderHud();
    if (this._active) this._toastMessage(`${this._xrMode.toUpperCase()} spectacle link`);
  }

  update(deltaTime = 16) {
    if (!this._active || !this._root) return;
    this._t += deltaTime * 0.001;
    this._portal.forEach((mesh, index) => {
      mesh.rotation.y += 0.003 + index * 0.0015;
      mesh.scaling.setAll(1 + Math.sin(this._t * 2.2 + index) * 0.035);
    });
    if (this._label && this.scene.activeCamera) this._label.lookAt(this.scene.activeCamera.position);
  }

  projectEvent(label, colorHex = null) {
    if (!this._active) this.activate('auto-project');
    const state = this.getState();
    const color = hexToColor3(colorHex || SUBJECT_COLOR[state.currentSubject || 'home']);
    this._state.projections += 1;
    this._save();
    this._renderHud();
    this._projectionBurst(label || 'STEM Rift', color);
    this._toastMessage(label || 'Room-scale STEM projection');
    this.game?.recordEvent?.('mrProjection', { label, mode: this._xrMode });
  }

  _bind() {
    document.addEventListener('cosmiclearn:game-event', event => {
      const type = event.detail?.type;
      const detail = event.detail?.detail || {};
      if (type === 'powerUse') this.projectEvent(detail.power || 'STEM Power');
      if (type === 'arenaClear') this.projectEvent(`Arena Clear: ${detail.arena || 'Rift'}`, '#7fff7f');
      if (type === 'bossFinisherReady') this.projectEvent(detail.finisher || 'Finisher Ready', '#ffd700');
      if (type === 'bossComplete') this.projectEvent(`Boss Down: ${detail.boss || 'Victory'}`, '#ff4fd8');
    });
  }

  _buildHud() {
    const hud = document.createElement('button');
    hud.id = 'mr-spectacle-hud';
    hud.type = 'button';
    hud.title = 'MR Spectacle Mode';
    hud.addEventListener('click', () => this.toggle());
    document.body.appendChild(hud);
    this._hud = hud;
  }

  _renderHud() {
    if (!this._hud) return;
    const state = this.getState();
    const color = SUBJECT_COLOR[state.currentSubject || 'home'];
    this._hud.style.setProperty('--mr-accent', color);
    this._hud.classList.toggle('active', this._active);
    this._hud.innerHTML = `
      <span>${this._active ? 'MR LIVE' : 'MR'}</span>
      <strong>${this._xrMode === 'desktop' ? 'Spectacle' : this._xrMode.toUpperCase()}</strong>
      <small>${this._state.projections} projections</small>
    `;
  }

  _buildPortal() {
    this._disposePortal();
    if (!this.scene) return;
    const state = this.getState();
    const color = hexToColor3(SUBJECT_COLOR[state.currentSubject || 'home']);
    const center = this.scene.activeCamera?.target?.clone?.() || Vector3.Zero();

    this._root = new Mesh('mrSpectacleRoot', this.scene);
    this._root.position = center.add(new Vector3(0, -0.45, 0));
    this._root.isPickable = false;

    for (let i = 0; i < 3; i++) {
      const ring = MeshBuilder.CreateTorus(`mrPortalRing_${i}`, {
        diameter: 3.4 + i * 1.1,
        thickness: 0.025 + i * 0.006,
        tessellation: 120,
      }, this.scene);
      ring.parent = this._root;
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02 + i * 0.025;
      ring.isPickable = false;
      const mat = new StandardMaterial(`mrPortalMat_${i}`, this.scene);
      mat.emissiveColor = color.scale(1 - i * 0.12);
      mat.diffuseColor = color;
      mat.alpha = 0.72 - i * 0.12;
      ring.material = mat;
      this._portal.push(ring);
    }

    this._label = this._makeLabel('ROOM STEM RIFT', color);
    this._label.parent = this._root;
    this._label.position = new Vector3(0, 1.35, 0);

    this._particles = this._makeParticles(color);
  }

  _refreshPortalColor() {
    const state = this.getState();
    const color = hexToColor3(SUBJECT_COLOR[state.currentSubject || 'home']);
    this._portal.forEach((mesh, index) => {
      if (mesh.material) {
        mesh.material.emissiveColor = color.scale(1 - index * 0.12);
        mesh.material.diffuseColor = color;
      }
    });
  }

  _makeLabel(text, color) {
    const plane = MeshBuilder.CreatePlane('mrSpectacleLabel', { width: 2.6, height: 0.42 }, this.scene);
    plane.isPickable = false;
    const tex = new DynamicTexture('mrSpectacleLabelTex', { width: 512, height: 128 }, this.scene);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(5,10,26,0.72)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = `rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)})`;
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    tex.update();
    const mat = new StandardMaterial('mrSpectacleLabelMat', this.scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    plane.material = mat;
    return plane;
  }

  _makeParticles(color) {
    const tex = new DynamicTexture('mrParticleTex', { width: 24, height: 24 }, this.scene);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(12, 12, 5, 0, Math.PI * 2);
    ctx.fill();
    tex.update();

    const ps = new ParticleSystem('mrSpectacleParticles', 180, this.scene);
    ps.particleTexture = tex;
    ps.emitter = this._root;
    ps.minEmitBox = new Vector3(-2.4, 0.05, -2.4);
    ps.maxEmitBox = new Vector3(2.4, 0.2, 2.4);
    ps.color1 = new Color4(color.r, color.g, color.b, 0.9);
    ps.color2 = new Color4(1, 1, 1, 0.6);
    ps.colorDead = new Color4(color.r, color.g, color.b, 0);
    ps.minSize = 0.035;
    ps.maxSize = 0.12;
    ps.minLifeTime = 0.6;
    ps.maxLifeTime = 1.8;
    ps.emitRate = 62;
    ps.minEmitPower = 0.25;
    ps.maxEmitPower = 0.8;
    ps.direction1 = new Vector3(-0.4, 0.2, -0.4);
    ps.direction2 = new Vector3(0.4, 1.1, 0.4);
    ps.updateSpeed = 0.018;
    ps.start();
    return ps;
  }

  _projectionBurst(label, color) {
    const halo = MeshBuilder.CreateTorus(`mrProjection_${Date.now()}`, {
      diameter: 4.2,
      thickness: 0.04,
      tessellation: 120,
    }, this.scene);
    halo.position = this._root?.position?.clone?.() || Vector3.Zero();
    halo.position.y += 0.15;
    halo.rotation.x = Math.PI / 2;
    halo.isPickable = false;
    const mat = new StandardMaterial(`mrProjectionMat_${Date.now()}`, this.scene);
    mat.emissiveColor = color;
    mat.diffuseColor = color;
    mat.alpha = 0.82;
    halo.material = mat;

    const tag = this._makeLabel(String(label || 'PROJECTION').toUpperCase().slice(0, 24), color);
    tag.position = halo.position.add(new Vector3(0, 1.85, 0));

    const started = performance.now();
    const animate = () => {
      const t = Math.min(1, (performance.now() - started) / 1050);
      halo.scaling.setAll(1 + t * 2.8);
      halo.rotation.y += 0.035;
      mat.alpha = Math.max(0, 0.82 * (1 - t));
      if (tag) tag.scaling.setAll(1 + t * 0.34);
      if (t < 1 && !halo.isDisposed()) requestAnimationFrame(animate);
    };
    animate();

    setTimeout(() => {
      halo.dispose();
      mat.dispose();
      tag.dispose();
    }, 1250);
  }

  _disposePortal() {
    this._particles?.dispose();
    this._particles = null;
    this._portal.forEach(mesh => {
      mesh.material?.dispose?.();
      mesh.dispose();
    });
    this._portal = [];
    this._label?.material?.diffuseTexture?.dispose?.();
    this._label?.material?.dispose?.();
    this._label?.dispose();
    this._label = null;
    this._root?.dispose();
    this._root = null;
  }

  _toastMessage(message) {
    if (!message) return;
    if (!this._toast) {
      const toast = document.createElement('div');
      toast.id = 'mr-spectacle-toast';
      document.body.appendChild(toast);
      this._toast = toast;
    }
    this._toast.textContent = message;
    this._toast.classList.remove('visible');
    requestAnimationFrame(() => this._toast?.classList.add('visible'));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this._toast?.classList.remove('visible'), 1600);
  }

  _load() {
    try { return { ...defaults(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
    catch { return defaults(); }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
  }
}
