import {
  MeshBuilder,
  Vector3,
  Color3,
  Color4,
  StandardMaterial,
  PBRMaterial,
  VertexData,
  Mesh,
  HemisphericLight,
  DirectionalLight,
  GlowLayer
} from '@babylonjs/core';

export class TopologyLab {
  constructor(scene, interaction, environment) {
    this._scene = scene;
    this._interaction = interaction;
    this._environment = environment;
    this._active = false;
    this._mode = 'mobius';
    this._mesh = null;
    this._domEl = null;
    this._light1 = null;
    this._light2 = null;
    this._glowLayer = null;
    this._rotationY = 0;
    this._rotationX = 0;
  }

  show() {
    if (this._active) return;
    this._active = true;

    this._light1 = new HemisphericLight('topoLight1', new Vector3(0, 1, 0), this._scene);
    this._light1.intensity = 0.7;
    this._light2 = new DirectionalLight('topoLight2', new Vector3(-1, -2, -1), this._scene);
    this._light2.intensity = 0.5;

    this._glowLayer = new GlowLayer('topoGlow', this._scene);
    this._glowLayer.intensity = 0.3;

    this._buildShape(this._mode);
    this._buildDOM();
  }

  _buildMobius() {
    const uSteps = 50;
    const vSteps = 10;
    const scale = 2.5;

    const positions = [];
    const indices = [];
    const normals = [];
    const uvs = [];

    // Build grid of vertices
    for (let i = 0; i <= uSteps; i++) {
      const u = (i / uSteps) * 2 * Math.PI;
      for (let j = 0; j <= vSteps; j++) {
        const v = -0.5 + (j / vSteps) * 1.0;
        const x = (1 + v / 2 * Math.cos(u / 2)) * Math.cos(u);
        const y = (1 + v / 2 * Math.cos(u / 2)) * Math.sin(u);
        const z = v / 2 * Math.sin(u / 2);
        positions.push(x * scale, y * scale, z * scale);
        uvs.push(i / uSteps, j / vSteps);
      }
    }

    // Build indices (two triangles per quad)
    for (let i = 0; i < uSteps; i++) {
      for (let j = 0; j < vSteps; j++) {
        const a = i * (vSteps + 1) + j;
        const b = a + 1;
        const c = (i + 1) * (vSteps + 1) + j;
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    VertexData.ComputeNormals(positions, indices, normals);

    const mesh = new Mesh('mobius', this._scene);
    const vd = new VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.normals = normals;
    vd.uvs = uvs;
    vd.applyToMesh(mesh);

    const mat = new StandardMaterial('mobiusMat', this._scene);
    mat.diffuseColor = new Color3(0.1, 0.7, 0.9);
    mat.emissiveColor = new Color3(0.02, 0.15, 0.25);
    mat.backFaceCulling = false;
    mat.wireframe = false;
    mesh.material = mat;

    return mesh;
  }

  _buildKlein() {
    const uSteps = 40;
    const vSteps = 40;
    const scale = 0.15;

    const positions = [];
    const indices = [];
    const normals = [];
    const uvs = [];

    for (let i = 0; i <= uSteps; i++) {
      const u = (i / uSteps) * 2 * Math.PI;
      for (let j = 0; j <= vSteps; j++) {
        const v = (j / vSteps) * 2 * Math.PI;
        let x, y, z;
        if (u < Math.PI) {
          x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(u) * Math.cos(v);
          y = 8 * Math.sin(u) + (2 * (1 - Math.cos(u) / 2)) * Math.sin(u) * Math.cos(v);
          z = (2 * (1 - Math.cos(u) / 2)) * Math.sin(v);
        } else {
          x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(v + Math.PI);
          y = 8 * Math.sin(u);
          z = (2 * (1 - Math.cos(u) / 2)) * Math.sin(v);
        }
        positions.push(x * scale, y * scale, z * scale);
        uvs.push(i / uSteps, j / vSteps);
      }
    }

    for (let i = 0; i < uSteps; i++) {
      for (let j = 0; j < vSteps; j++) {
        const a = i * (vSteps + 1) + j;
        const b = a + 1;
        const c = (i + 1) * (vSteps + 1) + j;
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    VertexData.ComputeNormals(positions, indices, normals);

    const mesh = new Mesh('klein', this._scene);
    const vd = new VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.normals = normals;
    vd.uvs = uvs;
    vd.applyToMesh(mesh);

    const mat = new PBRMaterial('kleinMat', this._scene);
    mat.metallic = 0.3;
    mat.roughness = 0.2;
    mat.albedoColor = new Color3(0.5, 0.1, 0.8);
    mat.emissiveColor = new Color3(0.08, 0.0, 0.15);
    mat.iridescence.isEnabled = true;
    mat.iridescence.intensity = 1.0;
    mat.iridescence.indexOfRefraction = 1.5;
    mat.backFaceCulling = false;
    mesh.material = mat;

    return mesh;
  }

  _buildTorus() {
    const mesh = MeshBuilder.CreateTorus('torus', {
      diameter: 4,
      thickness: 1.5,
      tessellation: 48
    }, this._scene);

    const mat = new PBRMaterial('torusMat', this._scene);
    mat.metallic = 0.6;
    mat.roughness = 0.25;
    mat.albedoColor = new Color3(0.9, 0.4, 0.1);
    mat.emissiveColor = new Color3(0.12, 0.04, 0.0);
    mesh.material = mat;

    return mesh;
  }

  _buildShape(mode) {
    if (this._mesh) {
      this._mesh.dispose();
      this._mesh = null;
    }
    this._rotationY = 0;
    this._rotationX = 0;

    if (mode === 'mobius') {
      this._mesh = this._buildMobius();
    } else if (mode === 'klein') {
      this._mesh = this._buildKlein();
    } else if (mode === 'torus') {
      this._mesh = this._buildTorus();
    }
  }

  _buildDOM() {
    const el = document.createElement('div');
    el.id = 'topology-panel';
    el.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10,20,40,0.92);
      border: 1px solid rgba(0,212,255,0.3);
      border-radius: 12px;
      color: #e8f4ff;
      padding: 16px 28px;
      z-index: 2000;
      font-family: 'Segoe UI', Arial, sans-serif;
      text-align: center;
      box-shadow: 0 0 24px rgba(0,212,255,0.15);
    `;
    el.innerHTML = `
      <div style="font-size:17px;font-weight:700;letter-spacing:2px;color:#00d4ff;margin-bottom:14px;">
        TOPOLOGY LAB
      </div>
      <div id="topology-buttons" style="display:flex;gap:10px;justify-content:center;">
        <button data-mode="mobius" style="
          padding:8px 18px;border-radius:20px;border:1px solid rgba(0,212,255,0.5);
          background:rgba(0,212,255,0.18);color:#00d4ff;cursor:pointer;font-size:13px;
          font-family:inherit;transition:all 0.2s;">Möbius Strip</button>
        <button data-mode="klein" style="
          padding:8px 18px;border-radius:20px;border:1px solid rgba(180,80,255,0.5);
          background:rgba(100,0,200,0.15);color:#cc80ff;cursor:pointer;font-size:13px;
          font-family:inherit;transition:all 0.2s;">Klein Bottle</button>
        <button data-mode="torus" style="
          padding:8px 18px;border-radius:20px;border:1px solid rgba(255,150,0,0.5);
          background:rgba(200,80,0,0.15);color:#ff9933;cursor:pointer;font-size:13px;
          font-family:inherit;transition:all 0.2s;">Torus</button>
      </div>
      <div id="topology-info" style="margin-top:10px;font-size:11px;color:#5577aa;">
        Möbius strip — non-orientable surface with one side and one edge
      </div>
    `;
    document.body.appendChild(el);
    this._domEl = el;

    const infos = {
      mobius: 'Möbius strip — non-orientable surface with one side and one edge',
      klein: 'Klein bottle — closed non-orientable surface with no boundary',
      torus: 'Torus — orientable surface of genus 1 (donut shape)'
    };

    el.querySelector('#topology-buttons').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-mode]');
      if (!btn) return;
      const mode = btn.dataset.mode;
      this._mode = mode;
      this._buildShape(mode);
      el.querySelector('#topology-info').textContent = infos[mode] || '';
    });
  }

  hide() {
    this._active = false;
    if (this._mesh) { this._mesh.dispose(); this._mesh = null; }
    if (this._light1) { this._light1.dispose(); this._light1 = null; }
    if (this._light2) { this._light2.dispose(); this._light2 = null; }
    if (this._glowLayer) { this._glowLayer.dispose(); this._glowLayer = null; }
    if (this._domEl) { this._domEl.remove(); this._domEl = null; }
  }

  update(dt) {
    if (!this._active || !this._mesh) return;
    const dtSec = dt / 1000;
    this._rotationY += 0.4 * dtSec;
    this._rotationX += 0.15 * dtSec;
    this._mesh.rotation.y = this._rotationY;
    this._mesh.rotation.x = this._rotationX;
  }
}
