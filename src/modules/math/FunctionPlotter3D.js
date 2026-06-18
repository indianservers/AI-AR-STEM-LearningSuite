import {
  MeshBuilder, StandardMaterial, VertexData, Color3, Color4, Vector3, Mesh
} from '@babylonjs/core';

const PRESETS = [
  { name: 'Sin Ripple',    fn: (x,z) => Math.sin(Math.sqrt(x*x+z*z) * 1.2) * 1.5,  range: 6, res: 60 },
  { name: 'Saddle Point',  fn: (x,z) => (x*x - z*z) * 0.3,                           range: 4, res: 50 },
  { name: 'Paraboloid',    fn: (x,z) => -(x*x + z*z) * 0.15,                          range: 5, res: 50 },
  { name: 'Gaussian Bell', fn: (x,z) => 3*Math.exp(-(x*x+z*z)*0.4),                   range: 4, res: 50 },
  { name: 'Waves',         fn: (x,z) => Math.sin(x*1.5)*Math.cos(z*1.5),              range: 5, res: 60 },
  { name: 'Monkey Saddle', fn: (x,z) => (x*x*x - 3*x*z*z) * 0.15,                    range: 4, res: 50 },
];

export class FunctionPlotter3D {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._mesh = null;
    this._axisMeshes = [];
    this._presetIdx = 0;
    this._t = 0;
    this._ui = null;
  }

  show() {
    this._buildAxes();
    this._buildSurface(PRESETS[this._presetIdx]);
    this._buildUI();
  }

  hide() {
    this._mesh?.dispose();
    this._mesh = null;
    this._axisMeshes.forEach(m => m.dispose());
    this._axisMeshes = [];
    this._ui?.remove();
    this._ui = null;
  }

  reset() {
    this._presetIdx = 0;
    this._buildSurface(PRESETS[this._presetIdx]);
  }

  nextPreset() {
    this._presetIdx = (this._presetIdx + 1) % PRESETS.length;
    this._buildSurface(PRESETS[this._presetIdx]);
  }

  previousPreset() {
    this._presetIdx = (this._presetIdx - 1 + PRESETS.length) % PRESETS.length;
    this._buildSurface(PRESETS[this._presetIdx]);
  }

  increaseParameter() {
    this.nextPreset();
  }

  decreaseParameter() {
    this.previousPreset();
  }

  _buildSurface(preset) {
    this._mesh?.dispose();
    const { fn, range, res } = preset;
    const step = (range * 2) / res;
    const positions = [], indices = [], colors = [];

    let minY = Infinity, maxY = -Infinity;
    const yVals = [];

    for (let i = 0; i <= res; i++) {
      for (let j = 0; j <= res; j++) {
        const x = -range + i * step;
        const z = -range + j * step;
        const y = fn(x, z);
        positions.push(x, y, z);
        yVals.push(y);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    // Color by height (hot-cold)
    yVals.forEach(y => {
      const t = (y - minY) / (maxY - minY + 0.0001);
      const r = t;
      const g = 1 - Math.abs(t - 0.5) * 2;
      const b = 1 - t;
      colors.push(r, g, b, 1);
    });

    // Triangle indices
    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const a = i * (res + 1) + j;
        const b = a + 1;
        const c = (i + 1) * (res + 1) + j;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    const normals = [];
    VertexData.ComputeNormals(positions, indices, normals);

    const vd = new VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.normals = normals;
    vd.colors = colors;

    this._mesh = new Mesh('surface3d', this.scene);
    vd.applyToMesh(this._mesh);

    const mat = new StandardMaterial('surfMat', this.scene);
    mat.vertexColorsEnabled = true;
    mat.backFaceCulling = false;
    mat.wireframe = false;
    this._mesh.material = mat;

    this.interaction.register(this._mesh);
    this.env.glowLayer?.addExcludedMesh(this._mesh);
  }

  _buildAxes() {
    this._axisMeshes.forEach(m => m.dispose());
    this._axisMeshes = [];

    const axisData = [
      { dir: new Vector3(1,0,0), color: new Color3(1,0.2,0.2), label: 'X' },
      { dir: new Vector3(0,1,0), color: new Color3(0.2,1,0.2), label: 'Y' },
      { dir: new Vector3(0,0,1), color: new Color3(0.2,0.4,1), label: 'Z' },
    ];

    axisData.forEach(ax => {
      const line = MeshBuilder.CreateLines(`ax_${ax.label}`, {
        points: [Vector3.Zero(), ax.dir.scale(7)],
      }, this.scene);
      line.color = ax.color;
      line.isPickable = false;
      this._axisMeshes.push(line);
    });
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom: 110px; display: flex; flex-direction: column; gap: 8px; padding: 16px 24px;';

    const presetWrap = document.createElement('div');
    presetWrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center';
    PRESETS.forEach((p, i) => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn' + (i === this._presetIdx ? ' active' : '');
      btn.textContent = p.name;
      btn.style.fontSize = '0.72rem';
      btn.addEventListener('click', () => {
        this._presetIdx = i;
        presetWrap.querySelectorAll('button').forEach((b,j) =>
          b.classList.toggle('active', j === i));
        this._buildSurface(PRESETS[i]);
      });
      presetWrap.appendChild(btn);
    });

    wrap.appendChild(presetWrap);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  update(deltaTime) {}
}
