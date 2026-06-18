import {
  MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, VertexData
} from '@babylonjs/core';

export class CalculusViz {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._mode = 'riemann'; // 'riemann' | 'derivative' | 'gradient_descent'
    this._n = 8;
    this._t = 0;
    this._ballMesh = null;
    this._ballVelX = 0.05;
    this._ballVelZ = 0.03;
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

  _clearMeshes() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._ballMesh = null;
  }

  _buildMode(mode) {
    this._clearMeshes();
    this._mode = mode;
    if (mode === 'riemann') this._buildRiemann(this._n);
    else if (mode === 'derivative') this._buildDerivative();
    else if (mode === 'gradient_descent') this._buildGradientDescent();
  }

  _buildRiemann(n) {
    this._n = n;
    const fn = x => Math.sin(x) + 1.2;
    const a = 0, b = Math.PI;
    const step = (b - a) / n;
    let area = 0;

    // Curve
    const curvePts = [];
    for (let i = 0; i <= 80; i++) {
      const x = a + (i / 80) * (b - a);
      curvePts.push(new Vector3(x * 2 - Math.PI, fn(x) * 1.5, 0));
    }
    const curve = MeshBuilder.CreateLines('curve', { points: curvePts }, this.scene);
    curve.color = new Color3(0, 0.9, 1);
    curve.isPickable = false;
    this._meshes.push(curve);

    // Riemann rectangles
    for (let i = 0; i < n; i++) {
      const x = a + i * step;
      const y = fn(x + step / 2);
      area += y * step;
      const w = step * 2;
      const h = y * 1.5;
      const cx = (x + step / 2) * 2 - Math.PI;
      const rect = MeshBuilder.CreateBox(`rr_${i}`, { width: w * 0.95, height: h, depth: 0.05 }, this.scene);
      rect.position = new Vector3(cx, h / 2, 0);
      rect.isPickable = false;
      const mat = new StandardMaterial(`rrMat_${i}`, this.scene);
      mat.emissiveColor = new Color3(0.1, 0.5, 0.9).scale(0.8);
      mat.alpha = 0.65;
      rect.material = mat;
      this._meshes.push(rect);
    }

    // Area label
    if (this._areaEl) this._areaEl.textContent = `Area ≈ ${area.toFixed(4)}  |  Exact = ${(2).toFixed(4)}`;
  }

  _buildDerivative() {
    const fn  = x => x * x * 0.4;
    const dfn = x => 2 * x * 0.4;
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const x = -4 + i * (8 / 60);
      pts.push(new Vector3(x, fn(x), 0));
    }
    const curve = MeshBuilder.CreateLines('derCurve', { points: pts }, this.scene);
    curve.color = new Color3(0, 0.9, 1);
    curve.isPickable = false;
    this._meshes.push(curve);

    // Tangent line (animated via update)
    this._tangentX = 0;
    this._tangentMesh = MeshBuilder.CreateLines('tan', {
      points: [new Vector3(-1, 0, 0), new Vector3(1, 0, 0)], updatable: true,
    }, this.scene);
    this._tangentMesh.color = new Color3(1, 0.8, 0);
    this._tangentMesh.isPickable = false;
    this._meshes.push(this._tangentMesh);

    // Moving dot
    const dot = MeshBuilder.CreateSphere('dot', { diameter: 0.15 }, this.scene);
    dot.position = new Vector3(0, fn(0), 0);
    dot.isPickable = false;
    const dmat = new StandardMaterial('dotMat', this.scene);
    dmat.emissiveColor = new Color3(1, 0.6, 0);
    dot.material = dmat;
    this._meshes.push(dot);
    this._dotMesh = dot;
    this._derivFn = fn;
    this._derivDfn = dfn;
  }

  _buildGradientDescent() {
    const fn = (x, z) => (x * x + z * z) * 0.4;
    // Build surface
    const res = 30, range = 4, step = (range * 2) / res;
    const positions = [], indices = [];
    for (let i = 0; i <= res; i++) {
      for (let j = 0; j <= res; j++) {
        const x = -range + i * step, z = -range + j * step;
        positions.push(x, fn(x, z), z);
      }
    }
    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const a = i * (res + 1) + j;
        indices.push(a, a + 1, (i + 1) * (res + 1) + j, a + 1, (i + 1) * (res + 1) + j + 1, (i + 1) * (res + 1) + j);
      }
    }
    const normals = [];
    VertexData.ComputeNormals(positions, indices, normals);
    const vd = new VertexData();
    vd.positions = positions; vd.indices = indices; vd.normals = normals;
    const surf = new Mesh('gdSurf', this.scene);
    vd.applyToMesh(surf);
    const mat = new StandardMaterial('gdMat', this.scene);
    mat.wireframe = true;
    mat.emissiveColor = new Color3(0.15, 0.35, 0.7);
    surf.material = mat;
    surf.isPickable = false;
    this._meshes.push(surf);

    // Ball
    const ball = MeshBuilder.CreateSphere('gdBall', { diameter: 0.25 }, this.scene);
    const bmat = new StandardMaterial('gdBallMat', this.scene);
    bmat.emissiveColor = new Color3(1, 0.5, 0);
    ball.material = bmat;
    ball.isPickable = false;
    this._ballMesh = ball;
    this._meshes.push(ball);
    this._gdFn = fn;
    this._gdX = 3; this._gdZ = 3; // start at rim
    this._gdLr = 0.04; // learning rate
  }

  update(deltaTime) {
    this._t += deltaTime * 0.001;
    if (this._mode === 'derivative' && this._dotMesh) {
      const x = Math.sin(this._t) * 3;
      const y = this._derivFn(x);
      const dy = this._derivDfn(x);
      this._dotMesh.position = new Vector3(x, y, 0);
      // Update tangent line
      if (this._tangentMesh) {
        const len = 2;
        MeshBuilder.CreateLines('tan', {
          points: [new Vector3(x - len, y - dy * len, 0), new Vector3(x + len, y + dy * len, 0)],
          instance: this._tangentMesh,
        });
      }
    }
    if (this._mode === 'gradient_descent' && this._ballMesh && this._gdFn) {
      // Gradient step
      const lr = this._gdLr;
      const gx = 2 * this._gdX * 0.4, gz = 2 * this._gdZ * 0.4;
      this._gdX -= lr * gx;
      this._gdZ -= lr * gz;
      if (Math.abs(this._gdX) < 0.01 && Math.abs(this._gdZ) < 0.01) {
        this._gdX = 3.5; this._gdZ = 3.5; // restart
      }
      const y = this._gdFn(this._gdX, this._gdZ);
      this._ballMesh.position = new Vector3(this._gdX, y + 0.15, this._gdZ);
    }
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom: 110px; flex-direction: column; gap: 10px; padding: 16px 24px;';

    const modeGrid = document.createElement('div');
    modeGrid.style.cssText = 'display:flex;gap:8px;justify-content:center';
    ['riemann', 'derivative', 'gradient_descent'].forEach(mode => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn' + (mode === this._mode ? ' active' : '');
      btn.textContent = { riemann: 'Riemann Sum', derivative: 'Derivative', gradient_descent: 'Gradient Descent' }[mode];
      btn.style.fontSize = '0.78rem';
      btn.addEventListener('click', () => {
        modeGrid.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._buildMode(mode);
        sliderRow.style.display = mode === 'riemann' ? 'flex' : 'none';
      });
      modeGrid.appendChild(btn);
    });

    const sliderRow = document.createElement('div');
    sliderRow.className = 'param-slider-wrap';
    sliderRow.style.cssText = 'box-shadow:none;border:none;background:none;padding:0;margin:0;display:flex;align-items:center;gap:10px;';
    const lbl = document.createElement('label');
    lbl.textContent = 'n =';
    lbl.style.cssText = 'font-size:0.8rem;color:#7ba3cc';
    const sl = document.createElement('input');
    sl.type = 'range'; sl.min = 2; sl.max = 50; sl.step = 1; sl.value = this._n;
    sl.style.width = '140px';
    const vl = document.createElement('span');
    vl.className = 'param-value';
    vl.textContent = this._n;
    this._areaEl = document.createElement('span');
    this._areaEl.style.cssText = 'font-size:0.75rem;color:#7ba3cc;font-family:monospace';

    sl.addEventListener('input', () => {
      this._n = parseInt(sl.value);
      vl.textContent = this._n;
      if (this._mode === 'riemann') this._buildMode('riemann');
    });
    sliderRow.append(lbl, sl, vl);
    wrap.append(modeGrid, sliderRow, this._areaEl);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }
}
