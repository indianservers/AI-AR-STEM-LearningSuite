import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3
} from '@babylonjs/core';

export class ProjectileLab {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._angle = 45;
    this._speed = 12;
    this._drag = false;
    this._g = 9.8;
    this._projectile = null;
    this._velVec = Vector3.Zero();
    this._launched = false;
    this._trail = [];
    this._trailLine = null;
    this._cannon = null;
    this._t = 0;
  }

  show() {
    this._buildScene();
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
    this._projectile = null;
    this._cannon = null;
    this._trail = [];
    this._trailLine = null;
    this._launched = false;
  }

  _buildScene() {
    // Ground
    const ground = MeshBuilder.CreateGround('projGround', { width: 30, height: 8 }, this.scene);
    ground.position.y = -4;
    const gmat = new StandardMaterial('pgMat', this.scene);
    gmat.wireframe = true; gmat.emissiveColor = new Color3(0.1, 0.2, 0.4); gmat.alpha = 0.4;
    ground.material = gmat; ground.isPickable = false;
    this._meshes.push(ground);

    // Cannon
    this._cannon = MeshBuilder.CreateCylinder('cannon', {
      height: 1.8, diameter: 0.4, tessellation: 16,
    }, this.scene);
    this._cannon.position = new Vector3(-8, -3.2, 0);
    const angleRad = this._angle * Math.PI / 180;
    this._cannon.rotation.z = Math.PI / 2 - angleRad;
    const cmat = new StandardMaterial('cannonMat', this.scene);
    cmat.emissiveColor = new Color3(0.6, 0.6, 0.6);
    this._cannon.material = cmat;
    this.interaction.register(this._cannon);
    this._meshes.push(this._cannon);

    // Projectile ball
    this._projectile = MeshBuilder.CreateSphere('proj', { diameter: 0.35 }, this.scene);
    this._projectile.position = new Vector3(-8, -3, 0);
    const pmat = new PBRMaterial('projMat', this.scene);
    pmat.albedoColor = new Color3(1, 0.5, 0.1);
    pmat.metallic = 0.7; pmat.roughness = 0.3;
    pmat.emissiveColor = new Color3(0.3, 0.1, 0);
    this._projectile.material = pmat;
    this._meshes.push(this._projectile);
  }

  _launch() {
    const angleRad = this._angle * Math.PI / 180;
    const vx = this._speed * Math.cos(angleRad);
    const vy = this._speed * Math.sin(angleRad);
    this._velVec = new Vector3(vx, vy, 0);
    this._projectile.position = new Vector3(-8, -3, 0);
    this._launched = true;
    this._trail = [this._projectile.position.clone()];
    this._trailLine?.dispose();
    this._trailLine = null;
    this._t = 0;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px;min-width:360px';

    const angleRow = this._sliderRow('Angle', 5, 85, 1, this._angle, v => {
      this._angle = v;
      const r = v * Math.PI / 180;
      this._cannon.rotation.z = Math.PI / 2 - r;
    });
    const speedRow = this._sliderRow('Speed (m/s)', 2, 30, 1, this._speed, v => { this._speed = v; });

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:center';
    const fireBtn = document.createElement('button');
    fireBtn.className = 'topic-btn';
    fireBtn.textContent = '🚀 Launch!';
    fireBtn.addEventListener('click', () => this._launch());

    const dragChk = document.createElement('input');
    dragChk.type = 'checkbox'; dragChk.style.accentColor = '#00d4ff';
    dragChk.addEventListener('change', () => { this._drag = dragChk.checked; });
    const dragLabel = document.createElement('label');
    dragLabel.style.cssText = 'font-size:0.8rem;color:#7ba3cc;display:flex;align-items:center;gap:6px';
    dragLabel.append(dragChk, 'Air Resistance');

    btnRow.append(fireBtn, dragLabel);

    this._infoEl = document.createElement('div');
    this._infoEl.style.cssText = 'font-size:0.78rem;color:#7ba3cc;font-family:monospace;text-align:center';

    wrap.append(angleRow, speedRow, btnRow, this._infoEl);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  _sliderRow(label, min, max, step, val, onChange) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px';
    const lbl = document.createElement('label');
    lbl.style.cssText = 'font-size:0.8rem;color:#7ba3cc;min-width:90px'; lbl.textContent = label;
    const sl = document.createElement('input');
    sl.type = 'range'; sl.min = min; sl.max = max; sl.step = step; sl.value = val;
    sl.style.width = '140px'; sl.style.accentColor = '#ff6b35';
    const vl = document.createElement('span');
    vl.className = 'param-value'; vl.textContent = val;
    sl.addEventListener('input', () => { onChange(parseFloat(sl.value)); vl.textContent = sl.value; });
    row.append(lbl, sl, vl);
    return row;
  }

  update(deltaTime) {
    if (!this._launched) return;
    const dt = deltaTime * 0.001;
    this._t += dt;

    // Physics
    this._velVec.y -= this._g * dt;
    if (this._drag) {
      const speed = this._velVec.length();
      const drag = 0.05 * speed;
      this._velVec = this._velVec.subtract(this._velVec.normalize().scale(drag * dt));
    }

    this._projectile.position.x += this._velVec.x * dt;
    this._projectile.position.y += this._velVec.y * dt;

    // Trail
    this._trail.push(this._projectile.position.clone());
    this._trailLine?.dispose();
    if (this._trail.length > 2) {
      this._trailLine = MeshBuilder.CreateLines('projTrail', { points: this._trail }, this.scene);
      this._trailLine.color = new Color3(1, 0.5, 0.1);
      this._trailLine.alpha = 0.5;
      this._trailLine.isPickable = false;
    }

    // Range stats
    const range = this._projectile.position.x + 8;
    const maxH = (this._speed * Math.sin(this._angle * Math.PI / 180)) ** 2 / (2 * this._g);
    if (this._infoEl) {
      this._infoEl.textContent = `Range: ${range.toFixed(1)}m | Height: ${(this._projectile.position.y + 4).toFixed(1)}m | Max H: ${maxH.toFixed(1)}m`;
    }

    // Ground collision
    if (this._projectile.position.y <= -3.8 && this._velVec.y < 0) {
      this._launched = false;
      if (this._infoEl) this._infoEl.textContent += `  ✓ Landed at ${range.toFixed(1)}m`;
    }

    // Out of bounds reset
    if (this._projectile.position.x > 15) this._launched = false;
  }
}
