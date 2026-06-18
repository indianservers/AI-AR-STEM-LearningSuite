/**
 * ARFloorGraph.js
 * AR Floor Graph — paint math function surface on the real floor.
 * FEATURE CLASS INTERFACE: activate(), deactivate(), update(camera, canvas, dt)
 */

import {
  MeshBuilder,
  Vector3,
  Color3,
  Color4,
  StandardMaterial,
  Mesh,
  VertexData
} from '@babylonjs/core';

// ── Jet colormap ──────────────────────────────────────────────────────────────
function jetColor(t) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const r = clamp(1.5 - Math.abs(4 * t - 3), 0, 1);
  const g = clamp(1.5 - Math.abs(4 * t - 2), 0, 1);
  const b = clamp(1.5 - Math.abs(4 * t - 1), 0, 1);
  return [r, g, b];
}

// ── Preset functions ──────────────────────────────────────────────────────────
const PRESETS = {
  sinc: {
    label: 'Sinc  sin(r)/r',
    fn: (x, z, _t) => {
      const r = Math.sqrt(x * x + z * z) + 0.001;
      return Math.sin(r) / r;
    }
  },
  ripple: {
    label: 'Ripple  sin(x)·cos(z)',
    fn: (x, z, _t) => Math.sin(x) * Math.cos(z)
  },
  saddle: {
    label: 'Saddle  x²−z²',
    fn: (x, z, _t) => (x * x - z * z) * 0.1
  },
  gaussian: {
    label: 'Gaussian  e^(−r²/2)',
    fn: (x, z, _t) => Math.exp(-(x * x + z * z) / 2)
  },
  waves: {
    label: 'Waves  sin(2x)+cos(2z)',
    fn: (x, z, _t) => (Math.sin(x * 2) + Math.cos(z * 2)) * 0.5
  },
  animatedSinc: {
    label: 'Animated Sinc',
    fn: (x, z, t) => {
      const r = Math.sqrt(x * x + z * z) + 0.001;
      return Math.sin(r - t) / r;
    }
  }
};

const DIVISIONS = 30;
const RANGE     = 5;   // [-5, 5]

export class ARFloorGraph {
  constructor(scene) {
    this._scene    = scene;
    this._active   = false;
    this._mesh     = null;
    this._panel    = null;
    this._t        = 0;
    this._animate  = false;
    this._scale    = 1.0;
    this._preset   = 'sinc';
    this._observer = null;
  }

  // ── activate ───────────────────────────────────────────────────────────────
  activate() {
    if (this._active) return;
    this._active = true;

    this._buildMesh();
    this._buildPanel();

    this._observer = this._scene.onBeforeRenderObservable.add(() => {
      this.update(
        this._scene.activeCamera,
        this._scene.getEngine().getRenderingCanvas(),
        this._scene.getEngine().getDeltaTime()
      );
    });
  }

  // ── deactivate ─────────────────────────────────────────────────────────────
  deactivate() {
    if (!this._active) return;
    this._active = false;

    if (this._observer) {
      this._scene.onBeforeRenderObservable.remove(this._observer);
      this._observer = null;
    }

    if (this._mesh) { this._mesh.dispose(); this._mesh = null; }

    if (this._panel && this._panel.parentNode) {
      this._panel.parentNode.removeChild(this._panel);
    }
    this._panel = null;
  }

  // ── update ─────────────────────────────────────────────────────────────────
  update(camera, canvas, dt) {
    if (!this._active) return;
    if (this._animate) {
      this._t += dt * 0.001; // seconds
      this._rebuildVertexData();
    }
  }

  // ── private: build mesh ────────────────────────────────────────────────────
  _buildMesh() {
    this._mesh = new Mesh('ar_floor_graph', this._scene);

    const mat = new StandardMaterial('ar_floor_graph_mat', this._scene);
    mat.vertexColorsEnabled = true;
    mat.backFaceCulling     = false;
    mat.specularColor       = new Color3(0, 0, 0);
    this._mesh.material = mat;

    this._mesh.position.y = -0.5;
    this._mesh.isPickable  = false;

    this._rebuildVertexData();
  }

  // ── private: rebuild vertex data ──────────────────────────────────────────
  _rebuildVertexData() {
    const N    = DIVISIONS;
    const step = (2 * RANGE) / N;
    const fn   = PRESETS[this._animate ? 'animatedSinc' : this._preset]?.fn
                 || PRESETS.sinc.fn;
    const scale = this._scale;

    const positions = [];
    const colors    = [];
    const indices   = [];

    // Compute raw Y values to find min/max for color normalization
    const yVals = [];
    for (let iz = 0; iz <= N; iz++) {
      for (let ix = 0; ix <= N; ix++) {
        const x = -RANGE + ix * step;
        const z = -RANGE + iz * step;
        yVals.push(fn(x, z, this._t));
      }
    }
    const yMin = Math.min(...yVals);
    const yMax = Math.max(...yVals);
    const yRange = (yMax - yMin) || 1;

    let vi = 0;
    for (let iz = 0; iz <= N; iz++) {
      for (let ix = 0; ix <= N; ix++) {
        const x = -RANGE + ix * step;
        const z = -RANGE + iz * step;
        const y = fn(x, z, this._t) * scale;
        positions.push(x, y, z);

        const t = (fn(x, z, this._t) - yMin) / yRange;
        const [r, g, b] = jetColor(t);
        colors.push(r, g, b, 1);
        vi++;
      }
    }

    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const a = iz * (N + 1) + ix;
        const b = a + 1;
        const c = a + (N + 1);
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const vd = new VertexData();
    vd.positions = new Float32Array(positions);
    vd.colors    = new Float32Array(colors);
    vd.indices   = new Int32Array(indices);

    // Compute normals
    const normals = [];
    VertexData.ComputeNormals(positions, indices, normals);
    vd.normals = new Float32Array(normals);

    vd.applyToMesh(this._mesh, true);
  }

  // ── private: panel ─────────────────────────────────────────────────────────
  _buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'ar-floor-graph-panel';
    Object.assign(panel.style, {
      position:     'fixed',
      bottom:       '100px',
      left:         '20px',
      background:   'rgba(10,20,40,0.92)',
      border:       '1px solid rgba(0,212,255,0.3)',
      borderRadius: '12px',
      color:        '#e8f4ff',
      padding:      '14px 18px',
      zIndex:       '2000',
      minWidth:     '230px',
      fontFamily:   'sans-serif',
      fontSize:     '14px',
      userSelect:   'none'
    });

    // Title
    const title = document.createElement('div');
    title.textContent = 'AR Floor Graph';
    Object.assign(title.style, { fontWeight: 'bold', marginBottom: '10px', color: '#00d4ff' });
    panel.appendChild(title);

    // Function selector
    const fnLabel = document.createElement('div');
    fnLabel.textContent = 'Function:';
    fnLabel.style.marginBottom = '4px';
    panel.appendChild(fnLabel);

    const fnSelect = document.createElement('select');
    Object.assign(fnSelect.style, {
      width: '100%', marginBottom: '12px', background: 'rgba(0,20,40,0.9)',
      color: '#e8f4ff', border: '1px solid rgba(0,212,255,0.3)',
      borderRadius: '6px', padding: '4px'
    });
    Object.entries(PRESETS).forEach(([key, val]) => {
      if (key === 'animatedSinc') return; // handled by animate toggle
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = val.label;
      fnSelect.appendChild(opt);
    });
    fnSelect.value = this._preset;
    fnSelect.addEventListener('change', () => {
      this._preset = fnSelect.value;
      this._rebuildVertexData();
    });
    panel.appendChild(fnSelect);

    // Scale slider
    const scaleLabel = document.createElement('div');
    scaleLabel.style.marginBottom = '4px';
    const updateScaleLabel = () => {
      scaleLabel.textContent = `Height Scale: ${this._scale.toFixed(1)}`;
    };
    updateScaleLabel();
    panel.appendChild(scaleLabel);

    const scaleSlider = document.createElement('input');
    scaleSlider.type  = 'range';
    scaleSlider.min   = '0.5';
    scaleSlider.max   = '3.0';
    scaleSlider.step  = '0.1';
    scaleSlider.value = String(this._scale);
    Object.assign(scaleSlider.style, { width: '100%', marginBottom: '12px' });
    scaleSlider.addEventListener('input', () => {
      this._scale = parseFloat(scaleSlider.value);
      updateScaleLabel();
      this._rebuildVertexData();
    });
    panel.appendChild(scaleLabel);
    panel.appendChild(scaleSlider);

    // Animate toggle
    const animBtn = document.createElement('button');
    const updateAnimBtn = () => {
      animBtn.textContent = this._animate ? '⏹ Stop Animation' : '▶ Animate';
      animBtn.style.background = this._animate
        ? 'rgba(200,60,60,0.6)' : 'rgba(0,100,200,0.7)';
    };
    updateAnimBtn();
    Object.assign(animBtn.style, {
      width: '100%', padding: '8px',
      color: '#e8f4ff',
      border: '1px solid rgba(0,212,255,0.5)', borderRadius: '8px',
      cursor: 'pointer', fontSize: '14px'
    });
    animBtn.addEventListener('click', () => {
      this._animate = !this._animate;
      this._t = 0;
      updateAnimBtn();
      if (!this._animate) this._rebuildVertexData();
    });
    panel.appendChild(animBtn);

    document.body.appendChild(panel);
    this._panel = panel;
  }
}
