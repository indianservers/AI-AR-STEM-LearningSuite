// Feature 11: Complex Number Plane — Argand diagram + Euler's formula helix
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Vector3,
  DynamicTexture, VertexData, Mesh
} from '@babylonjs/core';

export class ComplexPlane {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._t = 0;
    this._mode = 'euler'; // 'euler' | 'argand'
    this._helixMesh = null;
    this._dotMesh = null;
    this._dotT = 0;
  }

  show() { this._build(); this._buildUI(); }

  hide() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._ui?.remove(); this._ui = null;
  }

  _build() {
    this._buildAxes();
    if (this._mode === 'euler') this._buildEuler();
    else this._buildArgand();
  }

  _buildAxes() {
    // Real axis (x), Imaginary axis (y), z axis
    const axes = [
      { from: new Vector3(-6,0,0), to: new Vector3(6,0,0),  color: new Color3(1,0.5,0.2) },
      { from: new Vector3(0,-6,0), to: new Vector3(0,6,0),  color: new Color3(0,0.85,1) },
      { from: new Vector3(0,0,-4), to: new Vector3(0,0,8),  color: new Color3(0.7,0.3,1) },
    ];
    axes.forEach((a, i) => {
      const line = MeshBuilder.CreateLines(`cpAxis${i}`, { points: [a.from, a.to] }, this.scene);
      line.color = a.color;
      line.isPickable = false;
      this._meshes.push(line);
    });

    // Labels
    ['Re', 'Im', 'z=e^(iθ)'].forEach((label, i) => {
      const positions = [new Vector3(6.5,0,0), new Vector3(0,6.5,0), new Vector3(0,0,8.5)];
      const plane = MeshBuilder.CreatePlane('cpLabel'+i, {width:2, height:0.6}, this.scene);
      plane.position = positions[i];
      plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
      const tex = new DynamicTexture('cpTex'+i, {width:128,height:40}, this.scene);
      const ctx = tex.getContext();
      ctx.fillStyle = ['#ff8040','#00d4ff','#b060ff'][i];
      ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
      ctx.fillText(label, 64, 28); tex.update();
      const mat = new StandardMaterial('cpLabelMat'+i, this.scene);
      mat.emissiveTexture = tex; mat.disableLighting = true; mat.alpha = 0.9;
      plane.material = mat; plane.isPickable = false;
      this._meshes.push(plane);
    });

    // Unit circle on Re-Im plane
    const circlePoints = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      circlePoints.push(new Vector3(Math.cos(theta) * 2, Math.sin(theta) * 2, 0));
    }
    const circle = MeshBuilder.CreateLines('unitCircle', { points: circlePoints }, this.scene);
    circle.color = new Color3(0.3, 0.3, 0.5);
    circle.isPickable = false;
    this._meshes.push(circle);
  }

  _buildEuler() {
    // Euler's formula: e^(iθ) traces a helix in (Re, Im, θ) space
    const N = 200, turns = 3;
    const positions = [], colors = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * turns * Math.PI * 2;
      positions.push(Math.cos(t) * 2, Math.sin(t) * 2, t * 0.6);
      const hue = i / N;
      const r = 0.5 + 0.5 * Math.sin(hue * Math.PI * 2);
      const g = 0.3 + 0.3 * Math.cos(hue * Math.PI * 2);
      const b = 0.8;
      colors.push(r, g, b, 1);
    }

    const indices = [];
    for (let i = 0; i < N; i++) indices.push(i, i+1);

    const vd = new VertexData();
    vd.positions = positions;
    vd.colors = colors;
    vd.indices = indices;
    const mesh = new Mesh('eulerHelix', this.scene);
    vd.applyToMesh(mesh);
    mesh.isPickable = false;
    this._meshes.push(mesh);
    this._helixMesh = mesh;

    // Moving dot on helix
    this._dotMesh = MeshBuilder.CreateSphere('cpDot', {diameter:0.25, segments:8}, this.scene);
    const dotMat = new PBRMaterial('cpDotMat', this.scene);
    dotMat.emissiveColor = new Color3(1, 0.85, 0);
    dotMat.metallic = 0; dotMat.roughness = 0.2;
    this._dotMesh.material = dotMat;
    this._dotMesh.isPickable = false;
    this._meshes.push(this._dotMesh);

    // Projections (lines from dot to axes)
    this._projRe = MeshBuilder.CreateLines('projRe', {points:[Vector3.Zero(), Vector3.Zero()], updatable:true}, this.scene);
    this._projIm = MeshBuilder.CreateLines('projIm', {points:[Vector3.Zero(), Vector3.Zero()], updatable:true}, this.scene);
    this._projRe.color = new Color3(1,0.5,0.2);
    this._projIm.color = new Color3(0,0.85,1);
    this._projRe.isPickable = false; this._projIm.isPickable = false;
    this._meshes.push(this._projRe, this._projIm);
  }

  _buildArgand() {
    // Show several complex numbers as vectors
    const examples = [
      { c: {r:2, i:1}, label:'2+i',   color: new Color3(1,0.4,0.1) },
      { c: {r:-1,i:2}, label:'-1+2i', color: new Color3(0,0.85,1) },
      { c: {r:3, i:-1},label:'3-i',   color: new Color3(0.5,1,0.5) },
      { c: {r:-2,i:-2},label:'-2-2i', color: new Color3(1,0.85,0) },
    ];
    examples.forEach((ex, idx) => {
      const origin = Vector3.Zero();
      const tip = new Vector3(ex.c.r, ex.c.i, 0);
      const arrow = MeshBuilder.CreateLines(`argArrow${idx}`, {points:[origin, tip]}, this.scene);
      arrow.color = ex.color; arrow.isPickable = false;
      const sphere = MeshBuilder.CreateSphere(`argDot${idx}`, {diameter:0.3, segments:8}, this.scene);
      sphere.position = tip.clone();
      const mat = new PBRMaterial(`argMat${idx}`, this.scene);
      mat.emissiveColor = ex.color; mat.metallic = 0.2; mat.roughness = 0.3;
      sphere.material = mat; sphere.isPickable = false;
      this._meshes.push(arrow, sphere);
    });
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;gap:10px;flex-direction:column;padding:14px 22px;';

    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:8px;';
    ['euler', 'argand'].forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn' + (m === this._mode ? ' active' : '');
      btn.textContent = m === 'euler' ? "Euler's Formula e^(iθ)" : 'Argand Diagram';
      btn.style.fontSize = '0.78rem';
      btn.onclick = () => {
        this._mode = m;
        modeRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._meshes.forEach(me => me.dispose()); this._meshes = [];
        this._dotMesh = null; this._helixMesh = null;
        this._build();
      };
      modeRow.appendChild(btn);
    });
    wrap.appendChild(modeRow);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  update(dt) {
    this._t += dt * 0.001;
    if (this._mode === 'euler' && this._dotMesh) {
      const theta = (this._t % (Math.PI * 6));
      const px = Math.cos(theta) * 2, py = Math.sin(theta) * 2, pz = theta * 0.6;
      this._dotMesh.position.set(px, py, pz);
      if (this._projRe) {
        this._projRe = MeshBuilder.CreateLines('projRe', {
          points:[new Vector3(px, py, pz), new Vector3(px, 0, pz)], instance: this._projRe
        }, this.scene);
      }
      if (this._projIm) {
        this._projIm = MeshBuilder.CreateLines('projIm', {
          points:[new Vector3(px, py, pz), new Vector3(0, py, pz)], instance: this._projIm
        }, this.scene);
      }
    }
  }
}
