import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3
} from '@babylonjs/core';

export class PendulumLab {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._mode = 'simple';
    this._pendulums = [];
    this._t = 0;
    this._g = 9.8;
    this._L = 4;
    this._damping = 0.005;
    this._trailPts = [];
    this._trailLine = null;
  }

  show() {
    this._buildMode(this._mode);
    this._buildUI();
  }

  hide() {
    this._clearMeshes();
    this._ui?.remove();
    this._ui = null;
  }

  setPaused(paused) { this._paused = paused; }
  reset() {
    this._t = 0;
    this._buildMode(this._mode);
  }
  increaseParameter() { this._g = Math.min(30, this._g + 0.5); }
  decreaseParameter() { this._g = Math.max(0.5, this._g - 0.5); }
  trigger() {
    this._pendulums.forEach(p => {
      if ('omega' in p) p.omega += 0.7;
      if ('omega1' in p) p.omega1 += 0.45;
      if ('omega2' in p) p.omega2 -= 0.35;
    });
  }

  _clearMeshes() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._pendulums = [];
    this._trailLine = null;
    this._trailPts = [];
  }

  _buildMode(mode) {
    this._clearMeshes();
    this._mode = mode;
    if (mode === 'simple') this._buildSimple();
    else if (mode === 'double') this._buildDouble();
    else if (mode === 'coupled') this._buildCoupled();
  }

  _buildSimple() {
    const pivot = new Vector3(0, 4, 0);
    const pivotSphere = MeshBuilder.CreateSphere('pivot', { diameter: 0.2 }, this.scene);
    pivotSphere.position = pivot.clone();
    pivotSphere.isPickable = false;
    const pmat = new StandardMaterial('pivotMat', this.scene);
    pmat.emissiveColor = new Color3(0.8, 0.8, 0.8);
    pivotSphere.material = pmat;

    const bob = MeshBuilder.CreateSphere('bob', { diameter: 0.5 }, this.scene);
    const bmat = new PBRMaterial('bobMat', this.scene);
    bmat.albedoColor = new Color3(0, 0.85, 1);
    bmat.metallic = 0.8;
    bmat.roughness = 0.2;
    bmat.emissiveColor = new Color3(0, 0.2, 0.4);
    bob.material = bmat;
    this.env.highlight(bob, new Color3(0, 0.7, 1));
    this.interaction.register(bob);

    this._meshes.push(pivotSphere, bob);
    this._pendulums.push({
      pivot, bob, rod: null,
      theta: Math.PI / 4,
      omega: 0,
      L: this._L,
    });
    this._updateSimple();
  }

  _buildDouble() {
    const pivot = new Vector3(0, 4, 0);
    const L1 = 2.5, L2 = 2.5;
    const p0 = MeshBuilder.CreateSphere('dpivot', { diameter: 0.18 }, this.scene);
    p0.position = pivot.clone(); p0.isPickable = false;
    const bmat1 = new PBRMaterial('db1', this.scene);
    bmat1.albedoColor = new Color3(1, 0.5, 0.1); bmat1.metallic = 0.7; bmat1.roughness = 0.3;
    const bob1 = MeshBuilder.CreateSphere('db1m', { diameter: 0.4 }, this.scene);
    bob1.material = bmat1;
    const bmat2 = new PBRMaterial('db2', this.scene);
    bmat2.albedoColor = new Color3(0, 0.85, 1); bmat2.metallic = 0.7; bmat2.roughness = 0.3;
    const bob2 = MeshBuilder.CreateSphere('db2m', { diameter: 0.4 }, this.scene);
    bob2.material = bmat2;
    const pmat = new StandardMaterial('dpivotMat', this.scene);
    pmat.emissiveColor = new Color3(0.8, 0.8, 0.8); p0.material = pmat;
    this._meshes.push(p0, bob1, bob2);
    this._pendulums.push({
      pivot, bob1, bob2, L1, L2,
      theta1: Math.PI / 3, theta2: Math.PI / 6,
      omega1: 0, omega2: 0,
      m1: 1, m2: 1,
      isDouble: true,
    });
  }

  _buildCoupled() {
    for (let i = 0; i < 3; i++) {
      const pivot = new Vector3(-4 + i * 4, 4, 0);
      const ps = MeshBuilder.CreateSphere(`cpivot${i}`, { diameter: 0.15 }, this.scene);
      ps.position = pivot.clone(); ps.isPickable = false;
      const mat = new StandardMaterial(`cpm${i}`, this.scene);
      mat.emissiveColor = new Color3(0.7, 0.7, 0.7); ps.material = mat;
      const bob = MeshBuilder.CreateSphere(`cbob${i}`, { diameter: 0.4 }, this.scene);
      const bmat = new PBRMaterial(`cbm${i}`, this.scene);
      const c = [new Color3(1,0.3,0.3), new Color3(0.3,1,0.3), new Color3(0.3,0.5,1)][i];
      bmat.albedoColor = c; bmat.metallic = 0.5; bmat.roughness = 0.4; bob.material = bmat;
      this.interaction.register(bob);
      this._meshes.push(ps, bob);
      this._pendulums.push({ pivot, bob, theta: (i - 1) * Math.PI / 6, omega: 0, L: 3.5, k: 0.3, neighbors: [] });
    }
    // Link neighbors for spring coupling
    this._pendulums.forEach((p, i) => {
      if (i > 0) p.neighbors.push(this._pendulums[i - 1]);
      if (i < this._pendulums.length - 1) p.neighbors.push(this._pendulums[i + 1]);
    });
  }

  _updateSimple() {
    const p = this._pendulums[0];
    if (!p || !p.bob) return;
    const x = p.pivot.x + Math.sin(p.theta) * p.L;
    const y = p.pivot.y - Math.cos(p.theta) * p.L;
    p.bob.position = new Vector3(x, y, 0);
    p.rod?.dispose();
    p.rod = MeshBuilder.CreateLines('pRod', { points: [p.pivot, p.bob.position] }, this.scene);
    p.rod.color = new Color3(0.6, 0.6, 0.7); p.rod.isPickable = false;
    this._meshes = this._meshes.filter(m => m !== p.rod);
    this._meshes.push(p.rod);

    // Trail
    this._trailPts.push(p.bob.position.clone());
    if (this._trailPts.length > 200) this._trailPts.shift();
    this._trailLine?.dispose();
    if (this._trailPts.length > 2) {
      this._trailLine = MeshBuilder.CreateLines('trail', { points: this._trailPts }, this.scene);
      this._trailLine.color = new Color3(0, 0.6, 1);
      this._trailLine.alpha = 0.4;
      this._trailLine.isPickable = false;
    }

    if (this._keEl && this._peEl) {
      const v = p.omega * p.L;
      const ke = 0.5 * v * v;
      const pe = this._g * p.L * (1 - Math.cos(p.theta));
      this._keEl.textContent = ke.toFixed(3);
      this._peEl.textContent = pe.toFixed(3);
    }
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px;min-width:340px';

    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap';
    ['simple', 'double', 'coupled'].forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn' + (m === this._mode ? ' active' : '');
      btn.textContent = { simple: 'Simple', double: 'Double (Chaotic)', coupled: 'Coupled (3)' }[m];
      btn.style.fontSize = '0.78rem';
      btn.addEventListener('click', () => {
        modeRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._buildMode(m);
      });
      modeRow.appendChild(btn);
    });

    const info = document.createElement('div');
    info.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:0.8rem;font-family:monospace';
    const keL = document.createElement('span'); keL.style.color = '#ff6a1a'; keL.textContent = 'KE:';
    this._keEl = document.createElement('span'); this._keEl.style.color = '#fff'; this._keEl.textContent = '0.000';
    const peL = document.createElement('span'); peL.style.color = '#00d4ff'; peL.textContent = 'PE:';
    this._peEl = document.createElement('span'); this._peEl.style.color = '#fff'; this._peEl.textContent = '0.000';
    info.append(keL, this._keEl, peL, this._peEl);

    wrap.append(modeRow, info);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  update(deltaTime) {
    if (this._paused) return;
    const dt = Math.min(deltaTime * 0.001, 0.05);
    this._t += dt;

    if (this._mode === 'simple' && this._pendulums[0]) {
      const p = this._pendulums[0];
      const alpha = -(this._g / p.L) * Math.sin(p.theta) - this._damping * p.omega;
      p.omega += alpha * dt;
      p.theta += p.omega * dt;
      this._updateSimple();
    }

    if (this._mode === 'double' && this._pendulums[0]?.isDouble) {
      const p = this._pendulums[0];
      const m1 = p.m1, m2 = p.m2, L1 = p.L1, L2 = p.L2, g = this._g;
      const { theta1, theta2, omega1, omega2 } = p;
      const dt2 = dt * dt;
      const dth = theta1 - theta2;
      const D = 2 * m1 + m2 - m2 * Math.cos(2 * dth);
      const alpha1 = (-g * (2 * m1 + m2) * Math.sin(theta1) - m2 * g * Math.sin(theta1 - 2 * theta2)
        - 2 * Math.sin(dth) * m2 * (omega2 * omega2 * L2 + omega1 * omega1 * L1 * Math.cos(dth))) / (L1 * D);
      const alpha2 = (2 * Math.sin(dth) * (omega1 * omega1 * L1 * (m1 + m2) + g * (m1 + m2) * Math.cos(theta1)
        + omega2 * omega2 * L2 * m2 * Math.cos(dth))) / (L2 * D);
      p.omega1 += alpha1 * dt; p.theta1 += p.omega1 * dt;
      p.omega2 += alpha2 * dt; p.theta2 += p.omega2 * dt;
      const x1 = p.pivot.x + L1 * Math.sin(p.theta1);
      const y1 = p.pivot.y - L1 * Math.cos(p.theta1);
      const x2 = x1 + L2 * Math.sin(p.theta2);
      const y2 = y1 - L2 * Math.cos(p.theta2);
      p.bob1.position = new Vector3(x1, y1, 0);
      p.bob2.position = new Vector3(x2, y2, 0);
    }

    if (this._mode === 'coupled') {
      this._pendulums.forEach(p => {
        let torque = -(this._g / p.L) * Math.sin(p.theta) - this._damping * p.omega;
        p.neighbors.forEach(n => { torque += p.k * (n.theta - p.theta); });
        p.omega += torque * dt; p.theta += p.omega * dt;
        const x = p.pivot.x + Math.sin(p.theta) * p.L;
        const y = p.pivot.y - Math.cos(p.theta) * p.L;
        p.bob.position = new Vector3(x, y, 0);
      });
    }
  }
}
