// Feature 12: Linear Algebra Lab — 3D basis vectors + matrix transformations
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3, DynamicTexture, Mesh
} from '@babylonjs/core';

const TRANSFORMS = [
  { name: 'Identity',    matrix: [[1,0,0],[0,1,0],[0,0,1]] },
  { name: 'Scale ×2',   matrix: [[2,0,0],[0,2,0],[0,0,2]] },
  { name: 'Rotate 45°X',matrix: [[1,0,0],[0,0.7,-0.7],[0,0.7,0.7]] },
  { name: 'Shear XY',   matrix: [[1,0.5,0],[0,1,0],[0,0,1]] },
  { name: 'Project XY', matrix: [[1,0,0],[0,1,0],[0,0,0]] },
  { name: 'Reflect Y',  matrix: [[-1,0,0],[0,1,0],[0,0,1]] },
];

export class LinearAlgebraLab {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._t = 0;
    this._activeTransform = 0;
    this._animating = false;
    this._animT = 0;
    this._pointMeshes = [];
    this._basisArrows = [];
    this._gridPoints = [];
    this._buildGrid();
  }

  _buildGrid() {
    const N = 5;
    for (let x = -N; x <= N; x++) {
      for (let y = -N; y <= N; y++) {
        this._gridPoints.push({ ox: x * 0.8, oy: y * 0.8, oz: 0 });
      }
    }
  }

  show() { this._build(); this._buildUI(); }

  hide() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._pointMeshes = [];
    this._basisArrows = [];
    this._ui?.remove(); this._ui = null;
  }

  _build() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._pointMeshes = [];
    this._basisArrows = [];

    // Draw grid dots
    const mat = new PBRMaterial('laMat', this.scene);
    mat.albedoColor = new Color3(0.2, 0.5, 1);
    mat.emissiveColor = new Color3(0.05, 0.2, 0.5);
    mat.metallic = 0.3; mat.roughness = 0.6;

    this._gridPoints.forEach((p, i) => {
      const sphere = MeshBuilder.CreateSphere(`laPoint${i}`, {diameter:0.08, segments:4}, this.scene);
      sphere.position.set(p.ox, p.oy, p.oz);
      sphere.material = mat;
      sphere.isPickable = false;
      this._meshes.push(sphere);
      this._pointMeshes.push(sphere);
    });

    // Basis vectors
    const basisDefs = [
      { dir: [1,0,0], color: new Color3(1,0.3,0.1) },  // i
      { dir: [0,1,0], color: new Color3(0.1,0.9,0.2) }, // j
      { dir: [0,0,1], color: new Color3(0.1,0.4,1) },   // k
    ];
    basisDefs.forEach((bd, idx) => {
      const len = 3;
      const tip = new Vector3(...bd.dir).scale(len);
      const line = MeshBuilder.CreateLines(`laBasis${idx}`, {points:[Vector3.Zero(), tip]}, this.scene);
      line.color = bd.color; line.isPickable = false;
      const arrowHead = MeshBuilder.CreateCylinder(`laArrow${idx}`, {height:0.3, diameterTop:0, diameterBottom:0.15, tessellation:6}, this.scene);
      arrowHead.position = tip.clone();
      const amat = new StandardMaterial(`laAMat${idx}`, this.scene);
      amat.emissiveColor = bd.color; arrowHead.material = amat; arrowHead.isPickable = false;
      if (idx === 0) arrowHead.rotation.z = -Math.PI / 2;
      if (idx === 2) arrowHead.rotation.x =  Math.PI / 2;
      this._meshes.push(line, arrowHead);
      this._basisArrows.push({ line, arrowHead, dir: bd.dir, color: bd.color });
    });

    // Label: current transform
    const info = TRANSFORMS[this._activeTransform];
    const infoEl = document.createElement('div');
    infoEl.id = 'la-info';
    infoEl.style.cssText = `
      position:fixed;top:80px;right:20px;background:rgba(10,20,40,0.85);
      border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:14px 18px;
      z-index:1500;pointer-events:none;font-size:0.78rem;color:#e8f4ff;
      backdrop-filter:blur(8px);font-family:monospace;
    `;
    const m = info.matrix;
    infoEl.innerHTML = `<div style="color:#00d4ff;margin-bottom:8px;font-weight:700;">${info.name}</div>
      <div>[${m[0].map(v=>v.toFixed(1)).join(', ')}]</div>
      <div>[${m[1].map(v=>v.toFixed(1)).join(', ')}]</div>
      <div>[${m[2].map(v=>v.toFixed(1)).join(', ')}]</div>`;
    document.body.appendChild(infoEl);
    this._infoEl = infoEl;
    this._meshes.push({ dispose: () => infoEl.remove() });
  }

  _applyTransform(tfIdx) {
    this._activeTransform = tfIdx;
    this._animating = true;
    this._animT = 0;

    // Store original and target positions
    const target = TRANSFORMS[tfIdx].matrix;
    this._pointMeshes.forEach((sphere, i) => {
      const p = this._gridPoints[i];
      sphere.userData = sphere.userData || {};
      sphere.userData.origX = sphere.position.x;
      sphere.userData.origY = sphere.position.y;
      sphere.userData.origZ = sphere.position.z;
      sphere.userData.dstX = target[0][0]*p.ox + target[0][1]*p.oy + target[0][2]*p.oz;
      sphere.userData.dstY = target[1][0]*p.ox + target[1][1]*p.oy + target[1][2]*p.oz;
      sphere.userData.dstZ = target[2][0]*p.ox + target[2][1]*p.oy + target[2][2]*p.oz;
    });

    const infoEl = this._infoEl;
    if (infoEl) {
      const m = TRANSFORMS[tfIdx].matrix;
      infoEl.innerHTML = `<div style="color:#00d4ff;margin-bottom:8px;font-weight:700;">${TRANSFORMS[tfIdx].name}</div>
        <div>[${m[0].map(v=>v.toFixed(1)).join(', ')}]</div>
        <div>[${m[1].map(v=>v.toFixed(1)).join(', ')}]</div>
        <div>[${m[2].map(v=>v.toFixed(1)).join(', ')}]</div>`;
    }
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 22px;';

    const title = document.createElement('div');
    title.style.cssText = 'color:#00d4ff;font-size:0.78rem;font-weight:700;letter-spacing:0.05em;';
    title.textContent = '⟨ Linear Transformations ⟩';
    wrap.appendChild(title);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;';
    TRANSFORMS.forEach((tf, i) => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn' + (i === this._activeTransform ? ' active' : '');
      btn.textContent = tf.name;
      btn.style.fontSize = '0.75rem';
      btn.onclick = () => {
        row.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._applyTransform(i);
      };
      row.appendChild(btn);
    });

    const resetBtn = document.createElement('button');
    resetBtn.className = 'topic-btn';
    resetBtn.textContent = '↺ Reset';
    resetBtn.style.cssText = 'font-size:0.75rem;border-color:rgba(255,100,100,0.4);color:#ff8888;';
    resetBtn.onclick = () => this._applyTransform(0);
    row.appendChild(resetBtn);

    wrap.appendChild(row);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  update(dt) {
    this._t += dt * 0.001;
    if (!this._animating) return;
    this._animT = Math.min(this._animT + dt * 0.001 * 1.2, 1);
    const ease = 0.5 - Math.cos(this._animT * Math.PI) * 0.5;

    this._pointMeshes.forEach(sphere => {
      const u = sphere.userData;
      if (!u) return;
      sphere.position.x = u.origX + (u.dstX - u.origX) * ease;
      sphere.position.y = u.origY + (u.dstY - u.origY) * ease;
      sphere.position.z = u.origZ + (u.dstZ - u.origZ) * ease;
    });

    if (this._animT >= 1) this._animating = false;
  }
}
