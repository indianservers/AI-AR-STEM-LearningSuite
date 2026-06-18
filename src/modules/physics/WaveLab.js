import { MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, VertexData } from '@babylonjs/core';

export class WaveLab {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._mode = 'transverse';
    this._freq = 1.5;
    this._amp = 1.0;
    this._sources = [new Vector3(-3, 0, 0), new Vector3(3, 0, 0)];
    this._t = 0;
    this._waveMesh = null;
  }

  show() {
    this._buildWave();
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
    this._clearMeshes();
    this._buildWave();
  }
  increaseParameter() { this._freq = Math.min(5, this._freq + 0.2); }
  decreaseParameter() { this._freq = Math.max(0.3, this._freq - 0.2); }
  trigger() { this._t = 0; this._amp = Math.min(3, this._amp + 0.25); }

  _clearMeshes() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._waveMesh = null;
  }

  _buildWave() {
    if (this._mode === 'transverse') this._buildTransverse();
    else if (this._mode === 'interference') this._buildInterference();
    else if (this._mode === 'standing') this._buildStanding();
  }

  _buildTransverse() {
    // Animated sine wave as a ribbon
    const pts = [];
    for (let i = 0; i <= 60; i++) pts.push(new Vector3(-8 + i * 0.27, 0, 0));
    this._waveLine = MeshBuilder.CreateLines('transWave', { points: pts, updatable: true }, this.scene);
    this._waveLine.color = new Color3(0, 0.9, 1);
    this._waveLine.isPickable = false;
    this._meshes.push(this._waveLine);
    this._transversePts = pts;
  }

  _buildInterference() {
    const res = 60, range = 8;
    const step = (range * 2) / res;
    const positions = [], indices = [], colors = [];
    for (let i = 0; i <= res; i++) {
      for (let j = 0; j <= res; j++) {
        const x = -range + i * step, z = -range + j * step;
        positions.push(x, 0, z);
        colors.push(0.2, 0.6, 1.0, 1.0);
      }
    }
    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const a = i * (res + 1) + j;
        indices.push(a, a + 1, (i + 1) * (res + 1) + j);
        indices.push(a + 1, (i + 1) * (res + 1) + j + 1, (i + 1) * (res + 1) + j);
      }
    }
    const normals = [];
    VertexData.ComputeNormals(positions, indices, normals);
    const vd = new VertexData();
    vd.positions = positions; vd.indices = indices; vd.normals = normals; vd.colors = colors;
    this._waveMesh = new Mesh('interferenceMesh', this.scene);
    vd.applyToMesh(this._waveMesh, true);
    const mat = new StandardMaterial('intMat', this.scene);
    mat.vertexColorsEnabled = true;
    mat.backFaceCulling = false;
    this._waveMesh.material = mat;
    this._waveMesh.isPickable = false;
    this._meshes.push(this._waveMesh);
    this._intRes = res;
    this._intRange = range;
    this._intStep = step;
    this._intPositions = positions;

    // Source spheres (draggable)
    this._sources.forEach((src, i) => {
      const sphere = MeshBuilder.CreateSphere(`src_${i}`, { diameter: 0.4 }, this.scene);
      sphere.position = src.clone();
      const mat = new StandardMaterial(`srcMat_${i}`, this.scene);
      mat.emissiveColor = i === 0 ? new Color3(1, 0.5, 0) : new Color3(0, 0.9, 1);
      sphere.material = mat;
      this.interaction.register(sphere);
      this._meshes.push(sphere);
    });
  }

  _buildStanding() {
    const pts = [];
    for (let i = 0; i <= 80; i++) pts.push(new Vector3(-8 + i * 0.2, 0, 0));
    this._standLine1 = MeshBuilder.CreateLines('stand1', { points: pts, updatable: true }, this.scene);
    this._standLine1.color = new Color3(0, 0.9, 1);
    this._standLine1.isPickable = false;
    const pts2 = pts.map(p => p.clone());
    this._standLine2 = MeshBuilder.CreateLines('stand2', { points: pts2, updatable: true }, this.scene);
    this._standLine2.color = new Color3(1, 0.4, 0);
    this._standLine2.isPickable = false;
    const pts3 = pts.map(p => p.clone());
    this._standLineSum = MeshBuilder.CreateLines('standSum', { points: pts3, updatable: true }, this.scene);
    this._standLineSum.color = new Color3(0.8, 0.2, 1);
    this._standLineSum.isPickable = false;
    this._meshes.push(this._standLine1, this._standLine2, this._standLineSum);
    this._standPts = pts;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px;min-width:380px';

    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap';
    ['transverse', 'interference', 'standing'].forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn' + (m === this._mode ? ' active' : '');
      btn.textContent = { transverse: 'Transverse Wave', interference: 'Interference', standing: 'Standing Wave' }[m];
      btn.style.fontSize = '0.78rem';
      btn.addEventListener('click', () => {
        modeRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._mode = m;
        this._clearMeshes();
        this._buildWave();
      });
      modeRow.appendChild(btn);
    });

    const freqRow = this._sliderRow('Frequency', 0.3, 5, 0.1, this._freq, v => { this._freq = v; });
    const ampRow  = this._sliderRow('Amplitude', 0.1, 3, 0.1, this._amp, v => { this._amp = v; });

    wrap.append(modeRow, freqRow, ampRow);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  _sliderRow(label, min, max, step, val, onChange) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;justify-content:center';
    const lbl = document.createElement('label');
    lbl.style.cssText = 'font-size:0.8rem;color:#7ba3cc;min-width:80px';
    lbl.textContent = label;
    const sl = document.createElement('input');
    sl.type = 'range'; sl.min = min; sl.max = max; sl.step = step; sl.value = val;
    sl.style.width = '130px'; sl.style.accentColor = '#00d4ff';
    const vl = document.createElement('span');
    vl.className = 'param-value'; vl.textContent = val.toFixed(1);
    sl.addEventListener('input', () => { onChange(parseFloat(sl.value)); vl.textContent = parseFloat(sl.value).toFixed(1); });
    row.append(lbl, sl, vl);
    return row;
  }

  update(deltaTime) {
    if (this._paused) return;
    this._t += deltaTime * 0.001;
    const t = this._t, f = this._freq, a = this._amp;

    if (this._mode === 'transverse' && this._waveLine) {
      const pts = this._transversePts.map((p, i) => {
        return new Vector3(p.x, a * Math.sin(f * p.x - t * Math.PI * 2), 0);
      });
      MeshBuilder.CreateLines('transWave', { points: pts, instance: this._waveLine });
    }

    if (this._mode === 'interference' && this._waveMesh) {
      const positions = this._intPositions;
      const res = this._intRes, range = this._intRange, step = this._intStep;
      const posArr = this._waveMesh.getVerticesData('position');
      const colorArr = [];
      let vi = 0;
      for (let i = 0; i <= res; i++) {
        for (let j = 0; j <= res; j++) {
          const x = -range + i * step, z = -range + j * step;
          const d1 = Math.sqrt((x - this._sources[0].x) ** 2 + (z - this._sources[0].z) ** 2);
          const d2 = Math.sqrt((x - this._sources[1].x) ** 2 + (z - this._sources[1].z) ** 2);
          const w = a * Math.sin(f * d1 - t * 6) + a * Math.sin(f * d2 - t * 6);
          posArr[vi * 3 + 1] = w * 0.4;
          const normalized = (w + a * 2) / (a * 4);
          colorArr.push(normalized * 0.3, normalized * 0.7, 1, 1);
          vi++;
        }
      }
      this._waveMesh.updateVerticesData('position', posArr);
      this._waveMesh.updateVerticesData('color', colorArr);
    }

    if (this._mode === 'standing') {
      const makeStandPts = (phase) => this._standPts.map(p =>
        new Vector3(p.x, a * Math.sin(f * p.x) * Math.cos(t * Math.PI * 2 + phase), 0));
      const p1 = makeStandPts(0), p2 = makeStandPts(Math.PI);
      const psum = p1.map((p, i) => new Vector3(p.x, p.y + p2[i].y, 0));
      MeshBuilder.CreateLines('stand1', { points: p1, instance: this._standLine1 });
      MeshBuilder.CreateLines('stand2', { points: p2, instance: this._standLine2 });
      MeshBuilder.CreateLines('standSum', { points: psum, instance: this._standLineSum });
    }
  }
}
