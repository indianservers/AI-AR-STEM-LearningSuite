import {
  MeshBuilder, PBRMaterial, StandardMaterial, Color3, Color4, Vector3
} from '@babylonjs/core';

export class NewtonLab {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._boxes = [];
    this._gravity = 9.8;
    this._friction = 0.3;
    this._t = 0;
    this._trailPts = [];
    this._trailLine = null;
  }

  show() {
    this._buildGround();
    this._buildBoxes();
    this._buildUI();
  }

  hide() {
    this._clearMeshes();
    this._ui?.remove();
    this._ui = null;
    this._boxes = [];
  }

  _clearMeshes() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
  }

  _buildGround() {
    const ground = MeshBuilder.CreateGround('newtonGround', { width: 16, height: 10, subdivisions: 2 }, this.scene);
    ground.position.y = -3;
    const mat = new StandardMaterial('groundMat', this.scene);
    mat.wireframe = true;
    mat.emissiveColor = new Color3(0.1, 0.2, 0.4);
    mat.alpha = 0.5;
    ground.material = mat;
    ground.isPickable = false;
    this._meshes.push(ground);
  }

  _buildBoxes() {
    this._boxes = [];
    const masses = [1, 2, 5];
    const colors = [
      new Color3(0, 0.85, 1),
      new Color3(1, 0.5, 0.1),
      new Color3(0.5, 1, 0.3),
    ];
    masses.forEach((mass, i) => {
      const size = 0.5 + mass * 0.15;
      const box = MeshBuilder.CreateBox(`box_${i}`, { size }, this.scene);
      box.position = new Vector3(-4 + i * 4, -3 + size / 2, 0);
      const mat = new PBRMaterial(`boxMat_${i}`, this.scene);
      mat.albedoColor = colors[i];
      mat.metallic = 0.3;
      mat.roughness = 0.5;
      mat.emissiveColor = colors[i].scale(0.15);
      box.material = mat;

      this.interaction.register(box);

      this._boxes.push({
        mesh: box,
        mass,
        vel: new Vector3(0, 0, 0),
        onGround: true,
        size,
      });
      this._meshes.push(box);
    });
  }

  _applyForce(boxData, force) {
    const acc = force / boxData.mass;
    boxData.vel.x += acc;
    if (this._infoEl) {
      this._infoEl.textContent = `F=${force.toFixed(1)}N | m=${boxData.mass}kg | a=${acc.toFixed(2)}m/s²`;
    }
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center';

    this._boxes.forEach((bd, i) => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn';
      btn.textContent = `Push Box ${i+1} (${bd.mass}kg)`;
      btn.addEventListener('click', () => this._applyForce(bd, 5 + i * 3));
      btnRow.appendChild(btn);
    });

    const resetBtn = document.createElement('button');
    resetBtn.className = 'topic-btn';
    resetBtn.textContent = '↺ Reset';
    resetBtn.addEventListener('click', () => {
      this._boxes.forEach((bd, i) => {
        bd.mesh.position = new Vector3(-4 + i * 4, -3 + bd.size / 2, 0);
        bd.vel = Vector3.Zero();
      });
    });
    btnRow.appendChild(resetBtn);

    this._infoEl = document.createElement('div');
    this._infoEl.style.cssText = 'font-size:0.78rem;color:#7ba3cc;font-family:monospace;text-align:center';
    this._infoEl.textContent = 'Click a box button or pinch-grab a box to apply force (F = ma)';

    wrap.append(btnRow, this._infoEl);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  update(deltaTime) {
    const dt = deltaTime * 0.001;
    this._t += dt;
    this._boxes.forEach(bd => {
      if (!bd.onGround && bd.mesh.position.y > -3 + bd.size / 2) {
        bd.vel.y -= this._gravity * dt;
      }
      bd.vel.x *= (1 - this._friction * dt);
      bd.mesh.position.x += bd.vel.x * dt;
      bd.mesh.position.y += bd.vel.y * dt;
      bd.mesh.rotation.z += bd.vel.x * dt * 0.3;
      const floor = -3 + bd.size / 2;
      if (bd.mesh.position.y <= floor) {
        bd.mesh.position.y = floor;
        bd.vel.y = 0;
        bd.onGround = true;
      }
    });
  }
}
