// QuantumCollapse.js — Quantum wave function collapse visualizer
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Vector3,
  DynamicTexture, Mesh, SolidParticleSystem, GlowLayer
} from '@babylonjs/core';

const A0 = 1.5; // Bohr radius scale
const N_PARTICLES = 3000;

const ORBITAL_INFO = {
  '1s': { n: 1, label: 'n=1  l=0  m=0', color: '#00d4ff' },
  '2s': { n: 2, label: 'n=2  l=0  m=0', color: '#88aaff' },
  '2p': { n: 2, label: 'n=2  l=1  m=0', color: '#ff88cc' },
  '3d': { n: 3, label: 'n=3  l=2  m=0', color: '#ffcc44' },
};

function sampleOrbital(mode) {
  const maxIter = 200;
  // Rejection sampling for r
  let r, theta, phi;
  let accepted = false;
  let attempts = 0;
  while (!accepted && attempts < maxIter) {
    attempts++;
    r = Math.random() * 8;
    const u = Math.random();
    let rho;
    if (mode === '1s') {
      // rho proportional to r^2 * |psi|^2 = r^2 * exp(-2r/a0)
      rho = r * r * Math.exp(-2 * r / A0);
      if (u < rho / (1.0)) accepted = true; // max ~0.27 at r=a0
    } else if (mode === '2s') {
      const x = r / A0;
      const psi = (2 - x) * Math.exp(-x / 2);
      rho = r * r * psi * psi;
      if (u < rho / 8.0) accepted = true;
    } else if (mode === '2p') {
      const x = r / A0;
      rho = r * r * x * x * Math.exp(-x);
      if (u < rho / 4.0) accepted = true;
    } else if (mode === '3d') {
      const x = r / A0;
      rho = r * r * Math.pow(x, 4) * Math.exp(-2 * x / 3);
      if (u < rho / 80.0) accepted = true;
    }
  }
  if (!accepted) r = Math.random() * 4;

  phi = Math.random() * 2 * Math.PI;

  if (mode === '2p') {
    // lobe along y-axis: sin^2(theta) distribution
    let tAccepted = false;
    let tAttempts = 0;
    theta = Math.PI / 2;
    while (!tAccepted && tAttempts < 50) {
      tAttempts++;
      const t = Math.random() * Math.PI;
      const s = Math.sin(t);
      if (Math.random() < s * s) { theta = t; tAccepted = true; }
    }
  } else if (mode === '3d') {
    // 4-lobe: sin^2(2theta) distribution
    let tAccepted = false;
    let tAttempts = 0;
    theta = Math.PI / 4;
    while (!tAccepted && tAttempts < 80) {
      tAttempts++;
      const t = Math.random() * Math.PI;
      const s = Math.sin(2 * t);
      if (Math.random() < s * s) { theta = t; tAccepted = true; }
    }
  } else {
    theta = Math.acos(2 * Math.random() - 1);
  }

  return {
    x: r * Math.sin(theta) * Math.cos(phi),
    y: r * Math.cos(theta),
    z: r * Math.sin(theta) * Math.sin(phi),
    r,
  };
}

export class QuantumCollapse {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._active = false;
    this._ui = null;
    this._infoEl = null;
    this._sps = null;
    this._mode = '1s';
    this._positions = [];   // target positions for each particle
    this._collapsed = false;
    this._collapsePoint = null;
    this._collapseTimer = 0;
    this._collapsePhase = 'none'; // 'none'|'collapsing'|'wait'|'respreading'
    this._glowLayer = null;
    this._root = null;
  }

  show() {
    this._active = true;
    this._buildCloud();
    this._buildUI();
    this._buildInfoPanel();
  }

  hide() {
    this._active = false;
    this._sps?.dispose();
    this._sps = null;
    this._root?.dispose();
    this._root = null;
    this._glowLayer?.dispose();
    this._glowLayer = null;
    this._ui?.remove();
    this._ui = null;
    this._infoEl?.remove();
    this._infoEl = null;
    this._positions = [];
    this._collapsed = false;
    this._collapsePhase = 'none';
  }

  _samplePositions() {
    const pts = [];
    for (let i = 0; i < N_PARTICLES; i++) {
      pts.push(sampleOrbital(this._mode));
    }
    return pts;
  }

  _buildCloud() {
    this._sps?.dispose();
    this._sps = null;
    this._root?.dispose();
    this._root = null;

    // Glow layer for the cloud
    if (!this._glowLayer) {
      this._glowLayer = new GlowLayer('qcGlow', this.scene);
      this._glowLayer.intensity = 0.6;
    }

    // Anchor root
    this._root = MeshBuilder.CreateSphere('qcRoot', { diameter: 0.01 }, this.scene);
    this._root.isPickable = false;
    const hideMat = new StandardMaterial('qcRootMat', this.scene);
    hideMat.alpha = 0;
    this._root.material = hideMat;

    // SolidParticleSystem for 3000 small spheres
    this._sps = new SolidParticleSystem('qcSPS', this.scene, { updatable: true });
    const model = MeshBuilder.CreateSphere('qcModel', { diameter: 0.05, segments: 3 }, this.scene);
    this._sps.addShape(model, N_PARTICLES);
    model.dispose();

    const mesh = this._sps.buildMesh();
    mesh.isPickable = false;

    // Sample initial positions
    this._positions = this._samplePositions();
    this._collapsePhase = 'none';
    this._collapsed = false;

    this._sps.initParticles = () => {
      for (let i = 0; i < this._sps.nbParticles; i++) {
        const p = this._sps.particles[i];
        const pos = this._positions[i];
        p.position.set(pos.x, pos.y, pos.z);
        const t = Math.min(1, pos.r / 4);
        // close = bright white/cyan, far = dim blue
        p.color = new Color4(
          1 - t * 0.6,
          1 - t * 0.4,
          1,
          Math.max(0.15, 1 - t * 0.7)
        );
      }
    };
    this._sps.initParticles();
    this._sps.setParticles();
    this._glowLayer.addIncludedOnlyMesh(mesh);
  }

  _changeOrbital(mode) {
    if (this._collapsePhase !== 'none') return;
    this._mode = mode;
    this._positions = this._samplePositions();
    // Animate particles spreading to new positions
    this._spreadTo(this._positions, 0.4);
    this._updateInfoPanel();
    // Update button highlights
    if (this._ui) {
      this._ui.querySelectorAll('[data-orbital]').forEach(b => {
        b.style.borderColor = b.dataset.orbital === mode
          ? ORBITAL_INFO[mode].color : 'rgba(0,212,255,0.3)';
        b.style.color = b.dataset.orbital === mode ? ORBITAL_INFO[mode].color : '#e8f4ff';
      });
    }
  }

  _spreadTo(targetPositions, duration) {
    // Record start positions and animate via lerp in update()
    this._spreadStart = [];
    for (let i = 0; i < this._sps.nbParticles; i++) {
      const p = this._sps.particles[i];
      this._spreadStart.push(p.position.clone());
    }
    this._spreadTargets = targetPositions;
    this._spreadDuration = duration * 1000;
    this._spreadElapsed = 0;
    this._spreading = true;
  }

  _triggerCollapse() {
    if (this._collapsePhase !== 'none') return;
    this._collapsePhase = 'collapsing';
    this._collapseTimer = 0;

    // Pick a random sample as the collapse point
    const sample = sampleOrbital(this._mode);
    this._collapsePoint = new Vector3(sample.x, sample.y, sample.z);

    // Record start positions
    this._collapseStart = [];
    for (let i = 0; i < this._sps.nbParticles; i++) {
      this._collapseStart.push(this._sps.particles[i].position.clone());
    }
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = [
      'bottom:110px;flex-direction:column;gap:10px;',
      'padding:14px 20px;min-width:320px;'
    ].join('');

    // Orbital mode buttons
    const orbRow = document.createElement('div');
    orbRow.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;';
    ['1s', '2s', '2p', '3d'].forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn';
      btn.textContent = m;
      btn.dataset.orbital = m;
      btn.style.cssText = [
        'font-size:0.85rem;font-family:monospace;padding:6px 14px;',
        `border-color:${m === this._mode ? ORBITAL_INFO[m].color : 'rgba(0,212,255,0.3)'};`,
        `color:${m === this._mode ? ORBITAL_INFO[m].color : '#e8f4ff'};`
      ].join('');
      btn.addEventListener('click', () => this._changeOrbital(m));
      orbRow.appendChild(btn);
    });

    // Measure button
    const measureBtn = document.createElement('button');
    measureBtn.className = 'topic-btn';
    measureBtn.textContent = 'MEASURE (Collapse)';
    measureBtn.style.cssText = [
      'font-size:0.8rem;padding:8px 18px;border-color:rgba(255,100,100,0.6);',
      'color:#ff8888;background:rgba(255,50,50,0.1);width:100%;'
    ].join('');
    measureBtn.addEventListener('click', () => this._triggerCollapse());

    const info = document.createElement('div');
    info.style.cssText = 'font-size:0.7rem;color:#7ba3cc;text-align:center;';
    info.textContent = 'Orbital probability density |ψ|² cloud. Press MEASURE to collapse.';

    wrap.append(orbRow, measureBtn, info);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  _buildInfoPanel() {
    this._infoEl?.remove();
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed;top:80px;right:20px;',
      'background:rgba(10,20,40,0.92);',
      'border:1px solid rgba(0,212,255,0.3);border-radius:12px;',
      'padding:14px 18px;z-index:2100;pointer-events:none;',
      'font-size:0.78rem;color:#e8f4ff;backdrop-filter:blur(8px);',
      'font-family:monospace;min-width:200px;'
    ].join('');
    this._infoEl = el;
    document.body.appendChild(el);
    this._updateInfoPanel();
  }

  _updateInfoPanel() {
    if (!this._infoEl) return;
    const info = ORBITAL_INFO[this._mode];
    this._infoEl.innerHTML = `
      <div style="color:${info.color};font-weight:700;margin-bottom:8px;">
        Orbital: ${this._mode}
      </div>
      <div>${info.label}</div>
      <div style="margin-top:8px;color:#7ba3cc;">Energy Level</div>
      <div style="color:#ffdd88;font-size:1rem;">n = ${info.n}</div>
      <div style="margin-top:8px;color:#7ba3cc;">
        ${this._collapsePhase === 'none' ? 'Superposition state' :
          this._collapsePhase === 'collapsing' ? 'COLLAPSING...' :
          this._collapsePhase === 'wait' ? 'Position measured!' :
          'Re-spreading...'}
      </div>
      <div style="margin-top:4px;color:#aaccff;font-size:0.7rem;">
        Particles: ${N_PARTICLES.toLocaleString()}
      </div>
    `;
  }

  update(dt) {
    if (!this._active || !this._sps) return;

    // Handle spread animation
    if (this._spreading) {
      this._spreadElapsed += dt;
      const t = Math.min(1, this._spreadElapsed / this._spreadDuration);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      for (let i = 0; i < this._sps.nbParticles; i++) {
        const p = this._sps.particles[i];
        const start = this._spreadStart[i];
        const tgt = this._spreadTargets[i];
        p.position.x = start.x + (tgt.x - start.x) * ease;
        p.position.y = start.y + (tgt.y - start.y) * ease;
        p.position.z = start.z + (tgt.z - start.z) * ease;
        const r = Math.sqrt(tgt.x * tgt.x + tgt.y * tgt.y + tgt.z * tgt.z);
        const tf = Math.min(1, r / 4);
        p.color.r = 1 - tf * 0.6;
        p.color.g = 1 - tf * 0.4;
        p.color.b = 1;
        p.color.a = Math.max(0.15, 1 - tf * 0.7);
      }
      if (t >= 1) this._spreading = false;
      this._sps.setParticles();
      return;
    }

    // Collapse animation phases
    if (this._collapsePhase === 'collapsing') {
      this._collapseTimer += dt;
      const dur = 500; // 0.5s
      const t = Math.min(1, this._collapseTimer / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      const cp = this._collapsePoint;
      for (let i = 0; i < this._sps.nbParticles; i++) {
        const p = this._sps.particles[i];
        const start = this._collapseStart[i];
        p.position.x = start.x + (cp.x - start.x) * ease;
        p.position.y = start.y + (cp.y - start.y) * ease;
        p.position.z = start.z + (cp.z - start.z) * ease;
        p.color.r = 1;
        p.color.g = 1;
        p.color.b = 1;
        p.color.a = 0.6 + 0.4 * ease;
      }
      this._sps.setParticles();
      if (t >= 1) {
        this._collapsePhase = 'wait';
        this._collapseTimer = 0;
        this._updateInfoPanel();
      }
      return;
    }

    if (this._collapsePhase === 'wait') {
      this._collapseTimer += dt;
      if (this._collapseTimer >= 1500) {
        this._collapsePhase = 'respreading';
        this._collapseTimer = 0;
        this._positions = this._samplePositions();
        this._spreadTo(this._positions, 0.6);
        // Override the phase end
        this._collapsePhase = 'respreading';
        this._updateInfoPanel();
      }
      return;
    }

    if (this._collapsePhase === 'respreading') {
      if (!this._spreading) {
        this._collapsePhase = 'none';
        this._updateInfoPanel();
      }
      return;
    }

    // Gentle idle shimmer
    const t = performance.now() * 0.001;
    for (let i = 0; i < this._sps.nbParticles; i++) {
      const p = this._sps.particles[i];
      const r = Math.sqrt(
        p.position.x * p.position.x +
        p.position.y * p.position.y +
        p.position.z * p.position.z
      );
      const shimmer = 0.1 * Math.sin(t * 2 + i * 0.05);
      const tf = Math.min(1, r / 4);
      p.color.a = Math.max(0.05, Math.min(0.95, (1 - tf * 0.7) + shimmer * 0.15));
    }
    this._sps.setParticles();
  }
}
