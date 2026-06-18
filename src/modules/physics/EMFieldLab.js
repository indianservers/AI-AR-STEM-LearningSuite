import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Vector3,
  ParticleSystem, DynamicTexture
} from '@babylonjs/core';

export class EMFieldLab {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._charges = [];
    this._meshes = [];
    this._ui = null;
    this._t = 0;
    this._fieldLines = [];
    this._nextCharge = 1; // +1 or -1
    this._maxCharges = 6;
  }

  show() {
    this._buildUI();
    this._addCharge(1, new Vector3(-2, 0, 0));
    this._addCharge(-1, new Vector3(2, 0, 0));
    this._rebuildField();
  }

  hide() {
    this._clearMeshes();
    this._charges = [];
    this._ui?.remove();
    this._ui = null;
  }

  _clearMeshes() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._fieldLines = [];
  }

  _addCharge(sign, pos) {
    if (this._charges.length >= this._maxCharges) return;
    const color = sign > 0 ? new Color3(1, 0.3, 0.1) : new Color3(0.1, 0.5, 1);
    const sphere = MeshBuilder.CreateSphere(`charge_${this._charges.length}`, {
      diameter: 0.5 + Math.abs(sign) * 0.1, segments: 12,
    }, this.scene);
    sphere.position = pos.clone();
    const mat = new PBRMaterial(`cMat_${this._charges.length}`, this.scene);
    mat.albedoColor = color;
    mat.emissiveColor = color.scale(0.4);
    mat.metallic = 0.3; mat.roughness = 0.4;
    sphere.material = mat;
    this.env.highlight(sphere, color);
    this.interaction.register(sphere);
    this._charges.push({ mesh: sphere, sign, pos: pos.clone() });
    this._meshes.push(sphere);

    // Label
    const label = document.createElement('div');
    label.textContent = sign > 0 ? '+' : '−';
    label.style.cssText = `position:absolute;color:${sign > 0 ? '#ff5530' : '#3399ff'};font-size:1.4rem;font-weight:bold;pointer-events:none;text-shadow:0 0 8px currentColor;`;
    document.getElementById('hud-layer').appendChild(label);
    this._charges[this._charges.length - 1].label = label;
  }

  _rebuildField() {
    // Remove old field lines
    this._fieldLines.forEach(l => l.dispose());
    this._fieldLines = [];
    this._meshes = this._meshes.filter(m => !m.name.startsWith('fieldLine'));

    const SAMPLES = 60;
    const STEP = 0.15;

    // Cast field lines from each positive charge
    this._charges.forEach(charge => {
      if (charge.sign <= 0) return;
      const rays = 16;
      for (let r = 0; r < rays; r++) {
        const angle = (r / rays) * Math.PI * 2;
        let pos = charge.pos.clone().add(new Vector3(
          Math.cos(angle) * 0.4, Math.sin(angle) * 0.4, 0));
        const pts = [pos.clone()];
        for (let s = 0; s < SAMPLES; s++) {
          let ex = 0, ey = 0;
          this._charges.forEach(c => {
            const dx = pos.x - c.pos.x, dy = pos.y - c.pos.y;
            const r2 = dx * dx + dy * dy + 0.01;
            const r = Math.sqrt(r2);
            const factor = c.sign / (r2 * r);
            ex += dx * factor; ey += dy * factor;
          });
          const len = Math.sqrt(ex * ex + ey * ey) + 1e-8;
          pos = pos.add(new Vector3(ex / len * STEP, ey / len * STEP, 0));
          pts.push(pos.clone());
          if (Math.abs(pos.x) > 10 || Math.abs(pos.y) > 10) break;
          // Stop near a negative charge
          let nearNeg = false;
          this._charges.forEach(c => {
            if (c.sign < 0 && Vector3.Distance(pos, c.pos) < 0.5) nearNeg = true;
          });
          if (nearNeg) break;
        }
        if (pts.length < 2) continue;
        const line = MeshBuilder.CreateLines(`fieldLine_${charge.sign}_${r}`, { points: pts }, this.scene);
        line.color = new Color3(1, 0.4, 0.1);
        line.alpha = 0.55;
        line.isPickable = false;
        this._fieldLines.push(line);
        this._meshes.push(line);
      }
    });
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center';

    const addPos = document.createElement('button');
    addPos.className = 'topic-btn';
    addPos.textContent = '➕ Add + Charge';
    addPos.style.color = '#ff5530';
    addPos.addEventListener('click', () => {
      this._addCharge(1, new Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4, 0));
      this._rebuildField();
    });

    const addNeg = document.createElement('button');
    addNeg.className = 'topic-btn';
    addNeg.textContent = '➖ Add − Charge';
    addNeg.style.color = '#3399ff';
    addNeg.addEventListener('click', () => {
      this._addCharge(-1, new Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4, 0));
      this._rebuildField();
    });

    const resetBtn = document.createElement('button');
    resetBtn.className = 'topic-btn';
    resetBtn.textContent = '↺ Reset';
    resetBtn.addEventListener('click', () => {
      this.hide();
      this.show();
    });

    const rebuildBtn = document.createElement('button');
    rebuildBtn.className = 'topic-btn';
    rebuildBtn.textContent = '⚡ Redraw Fields';
    rebuildBtn.addEventListener('click', () => {
      // Sync charge positions from meshes
      this._charges.forEach(c => { c.pos.copyFrom(c.mesh.position); });
      this._rebuildField();
    });

    const info = document.createElement('div');
    info.style.cssText = 'font-size:0.74rem;color:#7ba3cc;text-align:center';
    info.textContent = 'Drag charges to move them, then click Redraw Fields';

    btnRow.append(addPos, addNeg, resetBtn, rebuildBtn);
    wrap.append(btnRow, info);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  update(deltaTime) {
    this._t += deltaTime * 0.001;
    // Pulse charge spheres
    this._charges.forEach(c => {
      c.mesh.scaling.setAll(1 + Math.sin(this._t * 3 + c.sign) * 0.05);
    });
  }
}
