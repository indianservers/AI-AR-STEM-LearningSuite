import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3,
  Mesh, VertexData, ParticleSystem, DynamicTexture, Color4
} from '@babylonjs/core';

const G = 6.674e-11;
const SCALE = 1e-9; // m → scene units

const BODIES = [
  { name: 'Sun',     mass: 2e30, radius: 0.8, color: new Color3(1, 0.9, 0.2),  pos: [0, 0, 0],    vel: [0, 0, 0],      fixed: true },
  { name: 'Mercury', mass: 3.3e23, radius: 0.1, color: new Color3(0.8, 0.7, 0.6), pos: [3, 0, 0], vel: [0, 0.02, 0] },
  { name: 'Venus',   mass: 4.9e24, radius: 0.18, color: new Color3(0.9, 0.8, 0.5), pos: [5, 0, 0], vel: [0, 0.016, 0] },
  { name: 'Earth',   mass: 6e24,  radius: 0.2, color: new Color3(0.2, 0.5, 1),  pos: [7, 0, 0],    vel: [0, 0.013, 0] },
  { name: 'Mars',    mass: 6.4e23, radius: 0.14, color: new Color3(0.9, 0.4, 0.2), pos: [9, 0, 0], vel: [0, 0.011, 0] },
  { name: 'Jupiter', mass: 1.9e27, radius: 0.4, color: new Color3(0.9, 0.75, 0.55),pos: [13, 0, 0], vel: [0, 0.007, 0] },
];

export class GravityLab {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._bodies = [];
    this._meshes = [];
    this._ui = null;
    this._trails = [];
    this._running = true;
    this._wellMesh = null;
    this._showWell = false;
  }

  show() {
    this._buildBodies();
    this._buildGravityWell();
    this._buildUI();
  }

  hide() {
    this._clearMeshes();
    this._ui?.remove();
    this._ui = null;
    this._bodies = [];
    this._trails = [];
  }

  _clearMeshes() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._wellMesh?.dispose();
    this._wellMesh = null;
  }

  _buildBodies() {
    BODIES.forEach((bd, i) => {
      const mesh = MeshBuilder.CreateSphere(`planet_${i}`, {
        diameter: bd.radius * 2, segments: 16,
      }, this.scene);
      mesh.position = new Vector3(bd.pos[0], bd.pos[1], bd.pos[2]);

      const mat = new PBRMaterial(`planetMat_${i}`, this.scene);
      mat.albedoColor = bd.color;
      mat.emissiveColor = bd.fixed ? bd.color.scale(0.5) : bd.color.scale(0.1);
      mat.metallic = 0.1;
      mat.roughness = 0.7;
      mesh.material = mat;

      if (bd.fixed) this.env.glowLayer?.addIncludedOnlyMesh(mesh);

      this.interaction.register(mesh);

      this._bodies.push({
        ...bd,
        mesh,
        vel: new Vector3(bd.vel[0], bd.vel[1], bd.vel[2]),
        pos: new Vector3(bd.pos[0], bd.pos[1], bd.pos[2]),
        trail: [],
        trailMesh: null,
      });
      this._meshes.push(mesh);
    });
  }

  _buildGravityWell() {
    const res = 30, range = 15;
    const positions = [], indices = [], colors = [];
    const step = (range * 2) / res;
    for (let i = 0; i <= res; i++) {
      for (let j = 0; j <= res; j++) {
        const x = -range + i * step, z = -range + j * step;
        const r = Math.sqrt(x * x + z * z) + 0.5;
        const y = -6 / r;
        positions.push(x, y - 2, z);
        const t = Math.max(0, Math.min(1, 1 - r / 15));
        colors.push(0.1 + t * 0.1, 0.3 + t * 0.5, 1.0, 0.5);
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
    this._wellMesh = new Mesh('gravWell', this.scene);
    vd.applyToMesh(this._wellMesh);
    const mat = new StandardMaterial('wellMat', this.scene);
    mat.wireframe = true;
    mat.vertexColorsEnabled = true;
    mat.alpha = 0.3;
    mat.backFaceCulling = false;
    this._wellMesh.material = mat;
    this._wellMesh.isPickable = false;
    this._wellMesh.setEnabled(this._showWell);
    this._meshes.push(this._wellMesh);
  }

  _updateTrail(body) {
    body.trail.push(body.pos.clone());
    if (body.trail.length > 80) body.trail.shift();
    if (body.trail.length < 2) return;
    body.trailMesh?.dispose();
    const line = MeshBuilder.CreateLines(`trail_${body.name}`, {
      points: body.trail,
    }, this.scene);
    line.color = body.color.scale(0.6);
    line.isPickable = false;
    body.trailMesh = line;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center';

    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'topic-btn';
    pauseBtn.textContent = '⏸ Pause';
    pauseBtn.addEventListener('click', () => {
      this._running = !this._running;
      pauseBtn.textContent = this._running ? '⏸ Pause' : '▶ Resume';
    });

    const wellBtn = document.createElement('button');
    wellBtn.className = 'topic-btn';
    wellBtn.textContent = 'Show Gravity Well';
    wellBtn.addEventListener('click', () => {
      this._showWell = !this._showWell;
      this._wellMesh?.setEnabled(this._showWell);
      wellBtn.textContent = this._showWell ? 'Hide Gravity Well' : 'Show Gravity Well';
    });

    const resetBtn = document.createElement('button');
    resetBtn.className = 'topic-btn';
    resetBtn.textContent = '↺ Reset';
    resetBtn.addEventListener('click', () => {
      this.hide();
      this.show();
    });

    btnRow.append(pauseBtn, wellBtn, resetBtn);

    const info = document.createElement('div');
    info.style.cssText = 'font-size:0.72rem;color:#7ba3cc;text-align:center';
    info.textContent = 'Pinch-drag a planet to perturb its orbit!';

    wrap.append(btnRow, info);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  update(deltaTime) {
    if (!this._running) return;
    const dt = deltaTime * 0.002;

    this._bodies.forEach((bi, i) => {
      if (bi.fixed) return;
      let ax = 0, ay = 0, az = 0;

      this._bodies.forEach((bj, j) => {
        if (i === j) return;
        const dx = bj.pos.x - bi.pos.x;
        const dy = bj.pos.y - bi.pos.y;
        const dz = bj.pos.z - bi.pos.z;
        const r2 = dx * dx + dy * dy + dz * dz + 0.1;
        const r = Math.sqrt(r2);
        // Simplified gravitational force (tuned for visual scale)
        const force = (bj.mass / (bi.mass + bj.mass)) * 0.0001 / r2;
        ax += force * dx / r;
        ay += force * dy / r;
        az += force * dz / r;
      });

      bi.vel.x += ax * dt;
      bi.vel.y += ay * dt;
      bi.vel.z += az * dt;
      bi.pos.x += bi.vel.x * dt;
      bi.pos.y += bi.vel.y * dt;
      bi.pos.z += bi.vel.z * dt;
      bi.mesh.position.copyFrom(bi.pos);
      bi.mesh.rotation.y += dt * 0.3;
      this._updateTrail(bi);
    });
  }
}
