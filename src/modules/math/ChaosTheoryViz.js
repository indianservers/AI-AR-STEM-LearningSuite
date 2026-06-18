import {
  MeshBuilder,
  Vector3,
  Color3,
  Color4,
  StandardMaterial,
  HemisphericLight,
  GlowLayer,
  Mesh
} from '@babylonjs/core';

// ─── Lorenz RK4 ─────────────────────────────────────────────────────────────
function lorenzDerivs(x, y, z, sigma, rho, beta) {
  return [
    sigma * (y - x),
    x * (rho - z) - y,
    x * y - beta * z
  ];
}

function rk4Lorenz(x, y, z, dt, sigma, rho, beta) {
  const [k1x, k1y, k1z] = lorenzDerivs(x, y, z, sigma, rho, beta);
  const [k2x, k2y, k2z] = lorenzDerivs(x + k1x * dt / 2, y + k1y * dt / 2, z + k1z * dt / 2, sigma, rho, beta);
  const [k3x, k3y, k3z] = lorenzDerivs(x + k2x * dt / 2, y + k2y * dt / 2, z + k2z * dt / 2, sigma, rho, beta);
  const [k4x, k4y, k4z] = lorenzDerivs(x + k3x * dt, y + k3y * dt, z + k3z * dt, sigma, rho, beta);
  return [
    x + (k1x + 2 * k2x + 2 * k3x + k4x) * dt / 6,
    y + (k1y + 2 * k2y + 2 * k3y + k4y) * dt / 6,
    z + (k1z + 2 * k2z + 2 * k3z + k4z) * dt / 6
  ];
}

// ─── Double Pendulum Equations of Motion ────────────────────────────────────
function pendulumDerivs(t1, t2, w1, w2, m1, m2, L1, L2, g) {
  const d = t1 - t2;
  const denom1 = L1 * (2 * m1 + m2 - m2 * Math.cos(2 * d));
  const dw1 = (
    -g * (2 * m1 + m2) * Math.sin(t1)
    - m2 * g * Math.sin(t1 - 2 * t2)
    - 2 * Math.sin(d) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d))
  ) / denom1;

  const denom2 = L2 * (2 * m1 + m2 - m2 * Math.cos(2 * d));
  const dw2 = (
    2 * Math.sin(d) * (w1 * w1 * L1 * (m1 + m2) + g * (m1 + m2) * Math.cos(t1) + w2 * w2 * L2 * m2 * Math.cos(d))
  ) / denom2;

  return [w1, w2, dw1, dw2];
}

function rk4Pendulum(t1, t2, w1, w2, dt, m1, m2, L1, L2, g) {
  const [k1a, k1b, k1c, k1d] = pendulumDerivs(t1, t2, w1, w2, m1, m2, L1, L2, g);
  const [k2a, k2b, k2c, k2d] = pendulumDerivs(
    t1 + k1a * dt / 2, t2 + k1b * dt / 2, w1 + k1c * dt / 2, w2 + k1d * dt / 2, m1, m2, L1, L2, g
  );
  const [k3a, k3b, k3c, k3d] = pendulumDerivs(
    t1 + k2a * dt / 2, t2 + k2b * dt / 2, w1 + k2c * dt / 2, w2 + k2d * dt / 2, m1, m2, L1, L2, g
  );
  const [k4a, k4b, k4c, k4d] = pendulumDerivs(
    t1 + k3a * dt, t2 + k3b * dt, w1 + k3c * dt, w2 + k3d * dt, m1, m2, L1, L2, g
  );
  return [
    t1 + (k1a + 2 * k2a + 2 * k3a + k4a) * dt / 6,
    t2 + (k1b + 2 * k2b + 2 * k3b + k4b) * dt / 6,
    w1 + (k1c + 2 * k2c + 2 * k3c + k4c) * dt / 6,
    w2 + (k1d + 2 * k2d + 2 * k3d + k4d) * dt / 6
  ];
}

// ─── Circular buffer ─────────────────────────────────────────────────────────
class CircularBuffer {
  constructor(size) {
    this._size = size;
    this._buf = [];
    this._head = 0;
    this._count = 0;
  }
  push(v) {
    if (this._count < this._size) {
      this._buf.push(v);
      this._count++;
    } else {
      this._buf[this._head] = v;
      this._head = (this._head + 1) % this._size;
    }
  }
  toArray() {
    if (this._count < this._size) return this._buf.slice();
    const tail = this._buf.slice(this._head);
    const head = this._buf.slice(0, this._head);
    return tail.concat(head);
  }
  get length() { return this._count; }
}

export class ChaosTheoryViz {
  constructor(scene, interaction, environment) {
    this._scene = scene;
    this._interaction = interaction;
    this._environment = environment;
    this._active = false;
    this._mode = 'lorenz';
    this._domEl = null;
    this._light = null;
    this._glowLayer = null;

    // Lorenz params
    this._sigma = 10;
    this._rho = 28;
    this._beta = 8 / 3;
    this._lorenzColors = [
      new Color3(0, 1, 1),
      new Color3(1, 0.5, 0),
      new Color3(0, 1, 0.3),
      new Color3(1, 0, 1),
      new Color3(1, 1, 0)
    ];
    this._lorenzTrajectories = null; // Array of {state, buffer, lineMesh}
    this._lorenzLines = [];

    // Pendulum params
    this._gravity = 9.8;
    this._m1 = 1; this._m2 = 1;
    this._L1 = 2; this._L2 = 2;
    this._pendulumColors = [new Color3(0, 1, 1), new Color3(1, 0.4, 0), new Color3(0.3, 1, 0.3)];
    this._pendulums = null;
    this._pendulumMeshes = [];
    this._pendulumTraces = [];
    this._pendulumTraceMeshes = [];
    this._pivotMesh = null;
  }

  show() {
    if (this._active) return;
    this._active = true;

    this._light = new HemisphericLight('chaosLight', new Vector3(0, 1, 0), this._scene);
    this._light.intensity = 0.7;
    this._glowLayer = new GlowLayer('chaosGlow', this._scene);
    this._glowLayer.intensity = 0.5;

    this._initMode(this._mode);
    this._buildDOM();
  }

  _initMode(mode) {
    this._clearMeshes();
    if (mode === 'lorenz') {
      this._initLorenz();
    } else {
      this._initPendulum();
    }
  }

  _clearMeshes() {
    for (const l of this._lorenzLines) if (l) l.dispose();
    this._lorenzLines = [];
    this._lorenzTrajectories = null;

    for (const m of this._pendulumMeshes) if (m) m.dispose();
    this._pendulumMeshes = [];
    for (const m of this._pendulumTraceMeshes) if (m) m.dispose();
    this._pendulumTraceMeshes = [];
    if (this._pivotMesh) { this._pivotMesh.dispose(); this._pivotMesh = null; }
    this._pendulums = null;
    this._pendulumTraces = [];
  }

  _initLorenz() {
    const initialConditions = [
      [1, 1, 1],
      [1.01, 1, 1],
      [1.02, 1, 1],
      [1.005, 1, 1],
      [0.99, 1, 1]
    ];
    this._lorenzTrajectories = initialConditions.map(([x, y, z], i) => {
      const buf = new CircularBuffer(500);
      buf.push(new Vector3(x, y, z));
      // Create placeholder line with 2 points
      const lineMesh = MeshBuilder.CreateLines('lorenz' + i, {
        points: [new Vector3(0, 0, 0), new Vector3(0.01, 0, 0)],
        updatable: true,
        useVertexAlpha: false
      }, this._scene);
      lineMesh.color = this._lorenzColors[i];
      this._lorenzLines.push(lineMesh);
      return { x, y, z, buffer: buf, lineMesh };
    });
  }

  _initPendulum() {
    const theta1Inits = [2.0, 2.01, 2.02];
    this._pendulums = theta1Inits.map((t1) => ({
      t1, t2: 2.0, w1: 0, w2: 0
    }));
    this._pendulumTraces = theta1Inits.map(() => new CircularBuffer(200));

    // Pivot sphere
    this._pivotMesh = MeshBuilder.CreateSphere('pivot', { diameter: 0.15 }, this._scene);
    const pivMat = new StandardMaterial('pivMat', this._scene);
    pivMat.emissiveColor = new Color3(1, 1, 1);
    this._pivotMesh.material = pivMat;

    // For each pendulum: arm1 line, bob1, arm2 line, bob2
    for (let i = 0; i < 3; i++) {
      const col = this._pendulumColors[i];
      const mat = new StandardMaterial('pendMat' + i, this._scene);
      mat.emissiveColor = col;

      const bob1 = MeshBuilder.CreateSphere('bob1_' + i, { diameter: 0.22 }, this._scene);
      bob1.material = mat;
      const bob2 = MeshBuilder.CreateSphere('bob2_' + i, { diameter: 0.18 }, this._scene);
      bob2.material = mat;

      const arm1 = MeshBuilder.CreateLines('arm1_' + i, {
        points: [new Vector3(0, 0, 0), new Vector3(0, -1, 0)],
        updatable: true
      }, this._scene);
      arm1.color = col;

      const arm2 = MeshBuilder.CreateLines('arm2_' + i, {
        points: [new Vector3(0, 0, 0), new Vector3(0, -1, 0)],
        updatable: true
      }, this._scene);
      arm2.color = col;

      const trace = MeshBuilder.CreateLines('trace_' + i, {
        points: [new Vector3(0, 0, 0), new Vector3(0.01, 0, 0)],
        updatable: true
      }, this._scene);
      trace.color = col;
      this._pendulumTraceMeshes.push(trace);
      this._pendulumMeshes.push(arm1, bob1, arm2, bob2);
    }
  }

  _stepLorenz() {
    const dt_sim = 0.005;
    const steps = 3;
    const scale = 0.3;
    const center = new Vector3(0, -10 * scale, 0);

    for (const traj of this._lorenzTrajectories) {
      let { x, y, z } = traj;
      for (let s = 0; s < steps; s++) {
        [x, y, z] = rk4Lorenz(x, y, z, dt_sim, this._sigma, this._rho, this._beta);
        traj.buffer.push(new Vector3(x * scale - center.x, y * scale - center.y, z * scale - center.z));
      }
      traj.x = x; traj.y = y; traj.z = z;
    }

    // Rebuild lines
    for (let i = 0; i < this._lorenzTrajectories.length; i++) {
      const traj = this._lorenzTrajectories[i];
      const pts = traj.buffer.toArray();
      if (pts.length >= 2) {
        this._lorenzLines[i] = MeshBuilder.CreateLines('lorenz' + i, {
          points: pts,
          instance: this._lorenzLines[i]
        });
      }
    }
  }

  _stepPendulum() {
    const dt_sim = 0.016;
    const { m1, m2, _L1: L1, _L2: L2 } = this;
    const g = this._gravity;

    for (let i = 0; i < this._pendulums.length; i++) {
      const p = this._pendulums[i];
      const [nt1, nt2, nw1, nw2] = rk4Pendulum(p.t1, p.t2, p.w1, p.w2, dt_sim, m1, m2, L1, L2, g);
      p.t1 = nt1; p.t2 = nt2; p.w1 = nw1; p.w2 = nw2;

      const x1 = this._L1 * Math.sin(p.t1);
      const y1 = -this._L1 * Math.cos(p.t1);
      const x2 = x1 + this._L2 * Math.sin(p.t2);
      const y2 = y1 + -this._L2 * Math.cos(p.t2);

      this._pendulumTraces[i].push(new Vector3(x2, y2, i * 0.05));
    }

    // Update meshes
    for (let i = 0; i < this._pendulums.length; i++) {
      const p = this._pendulums[i];
      const meshOffset = i * 4;
      const arm1 = this._pendulumMeshes[meshOffset];
      const bob1 = this._pendulumMeshes[meshOffset + 1];
      const arm2 = this._pendulumMeshes[meshOffset + 2];
      const bob2 = this._pendulumMeshes[meshOffset + 3];

      const x1 = this._L1 * Math.sin(p.t1);
      const y1 = -this._L1 * Math.cos(p.t1);
      const x2 = x1 + this._L2 * Math.sin(p.t2);
      const y2 = y1 + -this._L2 * Math.cos(p.t2);
      const zOff = i * 0.05;

      bob1.position.set(x1, y1, zOff);
      bob2.position.set(x2, y2, zOff);

      MeshBuilder.CreateLines('arm1_' + i, {
        points: [new Vector3(0, 0, zOff), new Vector3(x1, y1, zOff)],
        instance: arm1
      });
      MeshBuilder.CreateLines('arm2_' + i, {
        points: [new Vector3(x1, y1, zOff), new Vector3(x2, y2, zOff)],
        instance: arm2
      });

      const tracePts = this._pendulumTraces[i].toArray();
      if (tracePts.length >= 2) {
        this._pendulumTraceMeshes[i] = MeshBuilder.CreateLines('trace_' + i, {
          points: tracePts,
          instance: this._pendulumTraceMeshes[i]
        });
      }
    }
  }

  _buildDOM() {
    const el = document.createElement('div');
    el.id = 'chaos-panel';
    el.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10,20,40,0.92);
      border: 1px solid rgba(0,212,255,0.3);
      border-radius: 12px;
      color: #e8f4ff;
      padding: 14px 24px;
      z-index: 2000;
      font-family: 'Segoe UI', Arial, sans-serif;
      text-align: center;
      box-shadow: 0 0 24px rgba(0,212,255,0.12);
    `;
    el.innerHTML = `
      <div style="font-size:16px;font-weight:700;color:#00d4ff;letter-spacing:2px;margin-bottom:10px;">
        CHAOS THEORY
      </div>
      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:12px;">
        <button id="btn-lorenz" style="padding:7px 18px;border-radius:20px;border:1px solid rgba(0,212,255,0.5);
          background:rgba(0,212,255,0.2);color:#00d4ff;cursor:pointer;font-size:13px;font-family:inherit;">
          Lorenz Attractor
        </button>
        <button id="btn-pendulum" style="padding:7px 18px;border-radius:20px;border:1px solid rgba(255,150,0,0.4);
          background:rgba(200,80,0,0.12);color:#ff9933;cursor:pointer;font-size:13px;font-family:inherit;">
          Double Pendulum
        </button>
      </div>
      <div id="chaos-lorenz-controls">
        <label style="font-size:12px;color:#aaccee;">ρ (rho):</label>
        <input id="rho-slider" type="range" min="15" max="35" step="0.5" value="28"
          style="width:120px;vertical-align:middle;accent-color:#00d4ff;">
        <span id="rho-val" style="font-size:12px;color:#00d4ff;">28.0</span>
      </div>
      <div id="chaos-pendulum-controls" style="display:none;">
        <label style="font-size:12px;color:#aaccee;">g (gravity):</label>
        <input id="g-slider" type="range" min="5" max="15" step="0.1" value="9.8"
          style="width:120px;vertical-align:middle;accent-color:#ff9933;">
        <span id="g-val" style="font-size:12px;color:#ff9933;">9.8</span>
      </div>
    `;

    // Bottom-right info panel
    const info = document.createElement('div');
    info.id = 'chaos-info';
    info.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgba(10,20,40,0.88);
      border: 1px solid rgba(0,212,255,0.2);
      border-radius: 10px;
      color: #e8f4ff;
      padding: 12px 18px;
      z-index: 2000;
      font-family: 'Segoe UI', monospace;
      font-size: 12px;
      line-height: 1.7;
      min-width: 200px;
    `;
    info.innerHTML = `
      <div style="color:#00d4ff;font-weight:700;margin-bottom:4px;">Parameters</div>
      <div>σ = 10 &nbsp; ρ = <span id="param-rho">28.0</span> &nbsp; β = 2.67</div>
      <div style="margin-top:4px;color:#88aacc;">5 trajectories, Δx₀ = 0.01</div>
    `;
    document.body.appendChild(info);

    document.body.appendChild(el);
    this._domEl = el;
    this._infoEl = info;

    el.querySelector('#btn-lorenz').addEventListener('click', () => {
      this._mode = 'lorenz';
      this._initMode('lorenz');
      el.querySelector('#chaos-lorenz-controls').style.display = '';
      el.querySelector('#chaos-pendulum-controls').style.display = 'none';
      info.innerHTML = `
        <div style="color:#00d4ff;font-weight:700;margin-bottom:4px;">Parameters</div>
        <div>σ = 10 &nbsp; ρ = <span id="param-rho">${this._rho.toFixed(1)}</span> &nbsp; β = 2.67</div>
        <div style="margin-top:4px;color:#88aacc;">5 trajectories, Δx₀ = 0.01</div>
      `;
    });

    el.querySelector('#btn-pendulum').addEventListener('click', () => {
      this._mode = 'pendulum';
      this._initMode('pendulum');
      el.querySelector('#chaos-lorenz-controls').style.display = 'none';
      el.querySelector('#chaos-pendulum-controls').style.display = '';
      info.innerHTML = `
        <div style="color:#ff9933;font-weight:700;margin-bottom:4px;">Parameters</div>
        <div>m₁=m₂=1 &nbsp; L₁=L₂=2</div>
        <div>g = <span id="param-g">${this._gravity.toFixed(1)}</span></div>
        <div style="margin-top:4px;color:#88aacc;">3 pendulums, Δθ₁ = 0.01</div>
      `;
    });

    el.querySelector('#rho-slider').addEventListener('input', (e) => {
      this._rho = parseFloat(e.target.value);
      el.querySelector('#rho-val').textContent = this._rho.toFixed(1);
      const pr = info.querySelector('#param-rho');
      if (pr) pr.textContent = this._rho.toFixed(1);
      // Reset trajectories
      if (this._mode === 'lorenz') this._initMode('lorenz');
    });

    el.querySelector('#g-slider').addEventListener('input', (e) => {
      this._gravity = parseFloat(e.target.value);
      el.querySelector('#g-val').textContent = this._gravity.toFixed(1);
      const pg = info.querySelector('#param-g');
      if (pg) pg.textContent = this._gravity.toFixed(1);
      if (this._mode === 'pendulum') this._initMode('pendulum');
    });
  }

  hide() {
    this._active = false;
    this._clearMeshes();
    if (this._light) { this._light.dispose(); this._light = null; }
    if (this._glowLayer) { this._glowLayer.dispose(); this._glowLayer = null; }
    if (this._domEl) { this._domEl.remove(); this._domEl = null; }
    if (this._infoEl) { this._infoEl.remove(); this._infoEl = null; }
  }

  update(dt) {
    if (!this._active) return;
    if (this._mode === 'lorenz' && this._lorenzTrajectories) {
      this._stepLorenz();
    } else if (this._mode === 'pendulum' && this._pendulums) {
      this._stepPendulum();
    }
  }
}
