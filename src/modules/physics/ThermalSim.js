// Feature 17: Thermal Simulation — 2D heat diffusion on a mesh
import {
  MeshBuilder, StandardMaterial, Color3, Color4, Vector3, VertexData, Mesh
} from '@babylonjs/core';

const GRID = 30; // NxN grid

function tempToColor(t) {
  // Blue (cold) → White (hot)
  const r = Math.min(1, t * 2);
  const g = Math.min(1, t * 1.5 - 0.2);
  const b = Math.max(0, 1 - t * 2);
  return [r, g, b, 1];
}

export class ThermalSim {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._t = 0;
    this._grid = [];
    this._gridNext = [];
    this._N = GRID;
    this._alpha = 0.15; // diffusivity
    this._heatMesh = null;
    this._paused = false;
    this._heatSources = []; // { x, y, temp }
    this._sourceMeshes = [];
    this._mode = 'diffuse'; // 'diffuse' | 'convection'
  }

  show() { this._build(); this._buildUI(); }

  hide() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._sourceMeshes = [];
    this._heatSources = [];
    this._heatMesh = null;
    this._ui?.remove(); this._ui = null;
  }

  _initGrid() {
    const N = this._N;
    this._grid = new Float32Array(N * N);
    this._gridNext = new Float32Array(N * N);
    // Initial temperature: room temp = 0.1 everywhere
    this._grid.fill(0.1);
    // Add some hot spots
    this._setHotSpot(5, 15, 0.95);
    this._setHotSpot(24, 5, 0.8);
  }

  _setHotSpot(gx, gy, temp) {
    const N = this._N;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const ix = gx + dx, iy = gy + dy;
        if (ix >= 0 && ix < N && iy >= 0 && iy < N) {
          this._grid[iy * N + ix] = temp;
        }
      }
    }
  }

  _build() {
    this._initGrid();

    const N = this._N;
    const scale = 12 / N;
    const positions = [], indices = [], colors = [];

    // Build vertex grid
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const wx = (x - N/2) * scale, wy = (y - N/2) * scale;
        positions.push(wx, wy, 0);
        const t = this._grid[y * N + x];
        const c = tempToColor(t);
        colors.push(...c);
      }
    }

    // Build quad indices
    for (let y = 0; y < N-1; y++) {
      for (let x = 0; x < N-1; x++) {
        const i = y * N + x;
        indices.push(i, i+1, i+N, i+1, i+N+1, i+N);
      }
    }

    const vd = new VertexData();
    vd.positions = positions;
    vd.colors = colors;
    vd.indices = indices;
    const mesh = new Mesh('heatMesh', this.scene);
    vd.applyToMesh(mesh, true); // updatable
    const mat = new StandardMaterial('heatMat', this.scene);
    mat.vertexColorsEnabled = true;
    mat.disableLighting = true;
    mesh.material = mat;
    mesh.isPickable = false;
    this._heatMesh = mesh;
    this._meshes.push(mesh);

    // Heat sources (draggable spheres)
    this._addSource(5, 15, 0.95, new Color3(1,0.1,0.1));
    this._addSource(24, 5, 0.8,  new Color3(1,0.5,0.1));

    // Cool sink (blue)
    this._addSink(15, 25, 0.0);
  }

  _addSource(gx, gy, temp, color = new Color3(1,0.2,0)) {
    const N = this._N, scale = 12 / N;
    const sphere = MeshBuilder.CreateSphere('heatSrc' + this._sourceMeshes.length, {diameter:0.6, segments:8}, this.scene);
    const wx = (gx - N/2) * scale, wy = (gy - N/2) * scale;
    sphere.position.set(wx, wy, 0.5);
    const mat = new StandardMaterial('heatSrcMat' + this._sourceMeshes.length, this.scene);
    mat.emissiveColor = color;
    sphere.material = mat;
    this.interaction.register(sphere);
    this._sourceMeshes.push(sphere);
    this._heatSources.push({ gx, gy, temp });
    this._meshes.push(sphere);
    return sphere;
  }

  _addSink(gx, gy, temp) {
    const N = this._N, scale = 12 / N;
    const sphere = MeshBuilder.CreateSphere('heatSink', {diameter:0.6, segments:8}, this.scene);
    const wx = (gx - N/2) * scale, wy = (gy - N/2) * scale;
    sphere.position.set(wx, wy, 0.5);
    const mat = new StandardMaterial('heatSinkMat', this.scene);
    mat.emissiveColor = new Color3(0.1, 0.3, 1);
    sphere.material = mat;
    this.interaction.register(sphere);
    this._sourceMeshes.push(sphere);
    this._heatSources.push({ gx, gy, temp });
    this._meshes.push(sphere);
  }

  _diffuseStep() {
    const N = this._N, a = this._alpha;
    for (let y = 1; y < N-1; y++) {
      for (let x = 1; x < N-1; x++) {
        const c = this._grid[y*N+x];
        const n = this._grid[(y-1)*N+x];
        const s = this._grid[(y+1)*N+x];
        const w = this._grid[y*N+x-1];
        const e = this._grid[y*N+x+1];
        this._gridNext[y*N+x] = c + a * (n + s + w + e - 4*c);
      }
    }
    // Apply sources/sinks from sphere positions
    this._sourceMeshes.forEach((sphere, i) => {
      const hs = this._heatSources[i];
      const N2 = N / 2, scale = 12 / N;
      const gx = Math.round(sphere.position.x / scale + N2);
      const gy = Math.round(sphere.position.y / scale + N2);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ix = Math.max(0,Math.min(N-1,gx+dx)), iy = Math.max(0,Math.min(N-1,gy+dy));
          this._gridNext[iy*N+ix] = hs.temp;
        }
      }
    });

    // Boundary: fixed cold walls
    for (let x = 0; x < N; x++) {
      this._gridNext[x] = 0.05;
      this._gridNext[(N-1)*N+x] = 0.05;
    }
    for (let y = 0; y < N; y++) {
      this._gridNext[y*N] = 0.05;
      this._gridNext[y*N+N-1] = 0.05;
    }

    const tmp = this._grid;
    this._grid = this._gridNext;
    this._gridNext = tmp;
  }

  _updateMeshColors() {
    if (!this._heatMesh) return;
    const N = this._N;
    const colors = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const t = Math.max(0, Math.min(1, this._grid[y*N+x]));
        colors.push(...tempToColor(t));
      }
    }
    this._heatMesh.updateVerticesData('color', colors);
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 22px;';

    const alphaRow = document.createElement('div');
    alphaRow.style.cssText = 'display:flex;align-items:center;gap:10px;';
    const al = document.createElement('label');
    al.style.cssText = 'font-size:0.78rem;color:#7ba3cc;white-space:nowrap;min-width:85px;';
    al.textContent = 'Diffusivity';
    const as = document.createElement('input');
    as.type='range'; as.min=0.01; as.max=0.4; as.step=0.01; as.value=this._alpha;
    as.style.width='120px'; as.style.accentColor='#ff6b35';
    const av = document.createElement('span');
    av.style.cssText='font-size:0.78rem;color:#ff6b35;min-width:40px;font-family:monospace;';
    av.textContent=this._alpha.toFixed(2);
    as.oninput = () => { this._alpha=+as.value; av.textContent=this._alpha.toFixed(2); };
    alphaRow.append(al, as, av);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;';

    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'topic-btn physics-topic';
    pauseBtn.textContent = '⏸ Pause'; pauseBtn.style.fontSize = '0.75rem';
    pauseBtn.onclick = () => {
      this._paused = !this._paused;
      pauseBtn.textContent = this._paused ? '▶ Resume' : '⏸ Pause';
    };

    const resetBtn = document.createElement('button');
    resetBtn.className = 'topic-btn physics-topic';
    resetBtn.textContent = '↺ Reset'; resetBtn.style.fontSize = '0.75rem';
    resetBtn.onclick = () => this._initGrid();

    const hotBtn = document.createElement('button');
    hotBtn.className = 'topic-btn physics-topic';
    hotBtn.textContent = '🔥 Add Source'; hotBtn.style.fontSize = '0.75rem';
    hotBtn.onclick = () => this._addSource(
      Math.round(Math.random() * (this._N-4)) + 2,
      Math.round(Math.random() * (this._N-4)) + 2,
      0.85 + Math.random() * 0.15
    );

    btnRow.append(pauseBtn, resetBtn, hotBtn);

    const info = document.createElement('div');
    info.style.cssText = 'font-size:0.72rem;color:#7ba3cc;text-align:center;';
    info.textContent = '🔴 Red=hot • 🔵 Blue=cold sink • Drag sources to move heat';
    wrap.append(alphaRow, btnRow, info);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  update(dt) {
    this._t += dt * 0.001;
    if (this._paused) return;
    for (let i = 0; i < 3; i++) this._diffuseStep();
    this._updateMeshColors();
  }
}
