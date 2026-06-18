import {
  MeshBuilder, StandardMaterial, Color3, Vector3
} from '@babylonjs/core';

export class VectorLab {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._vectors = [
      new Vector3(2, 2, 0),
      new Vector3(-1, 3, 1),
    ];
    this._t = 0;
  }

  show() {
    this._buildAxes();
    this._buildVectors();
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
  }

  _buildAxes() {
    const axes = [
      { pts: [new Vector3(-5,0,0), new Vector3(5,0,0)], col: new Color3(1,0.3,0.3) },
      { pts: [new Vector3(0,-5,0), new Vector3(0,5,0)], col: new Color3(0.3,1,0.3) },
      { pts: [new Vector3(0,0,-5), new Vector3(0,0,5)], col: new Color3(0.3,0.5,1) },
    ];
    axes.forEach(a => {
      const l = MeshBuilder.CreateLines('axl', { points: a.pts }, this.scene);
      l.color = a.col; l.isPickable = false;
      this._meshes.push(l);
    });
  }

  _buildVectors() {
    // Remove old vector meshes but keep axes
    this._meshes = this._meshes.filter(m => {
      if (m.name?.startsWith('vec')) { m.dispose(); return false; }
      return true;
    });

    const colors = [new Color3(0,0.9,1), new Color3(1,0.5,0), new Color3(0.6,1,0.3)];
    const origin = Vector3.Zero();

    this._vectors.forEach((v, i) => {
      // Arrow shaft
      const shaft = MeshBuilder.CreateLines(`vec_${i}`, {
        points: [origin, v],
      }, this.scene);
      shaft.color = colors[i % colors.length];
      shaft.isPickable = false;
      this._meshes.push(shaft);

      // Arrowhead
      const tip = MeshBuilder.CreateCylinder(`vectip_${i}`, {
        height: 0.35, diameterTop: 0, diameterBottom: 0.2, tessellation: 8,
      }, this.scene);
      tip.position = v.clone();
      tip.isPickable = false;
      const mat = new StandardMaterial(`vectipMat_${i}`, this.scene);
      mat.emissiveColor = colors[i % colors.length];
      mat.disableLighting = true;
      tip.material = mat;
      this._meshes.push(tip);
    });

    // Cross product vector (v0 × v1)
    if (this._vectors.length >= 2) {
      const cross = Vector3.Cross(this._vectors[0], this._vectors[1]);
      const crossLine = MeshBuilder.CreateLines('vec_cross', {
        points: [origin, cross.scale(0.5)],
      }, this.scene);
      crossLine.color = new Color3(1, 0.2, 0.8);
      crossLine.isPickable = false;
      this._meshes.push(crossLine);
    }

    this._updateInfo();
  }

  _updateInfo() {
    if (!this._infoEl || this._vectors.length < 2) return;
    const a = this._vectors[0], b = this._vectors[1];
    const dot = Vector3.Dot(a, b);
    const angle = Math.acos(dot / (a.length() * b.length() + 0.0001)) * (180 / Math.PI);
    const cross = Vector3.Cross(a, b);
    this._infoEl.innerHTML =
      `<b>A</b> = (${a.x.toFixed(1)}, ${a.y.toFixed(1)}, ${a.z.toFixed(1)})  |A| = ${a.length().toFixed(2)}<br>` +
      `<b>B</b> = (${b.x.toFixed(1)}, ${b.y.toFixed(1)}, ${b.z.toFixed(1)})  |B| = ${b.length().toFixed(2)}<br>` +
      `A·B = ${dot.toFixed(2)} | Angle = ${angle.toFixed(1)}°<br>` +
      `A×B = (${cross.x.toFixed(2)}, ${cross.y.toFixed(2)}, ${cross.z.toFixed(2)})`;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:8px;padding:16px 24px;min-width:320px';

    this._infoEl = document.createElement('div');
    this._infoEl.style.cssText = 'font-size:0.78rem;color:#7ba3cc;font-family:monospace;line-height:1.6';

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:0.72rem;color:#4d7099;text-align:center';
    hint.textContent = 'Cyan = A | Orange = B | Pink = A×B';

    const animBtn = document.createElement('button');
    animBtn.className = 'topic-btn';
    animBtn.textContent = 'Animate Rotation';
    animBtn.addEventListener('click', () => { this._animating = !this._animating; });

    wrap.append(this._infoEl, hint, animBtn);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
    this._updateInfo();
  }

  update(deltaTime) {
    this._t += deltaTime * 0.001;
    if (this._animating) {
      const angle = this._t;
      this._vectors[0] = new Vector3(Math.cos(angle) * 3, Math.sin(angle * 0.7) * 2, Math.sin(angle * 0.4));
      this._buildVectors();
    }
  }
}
