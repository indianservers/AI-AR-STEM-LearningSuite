import {
  MeshBuilder, StandardMaterial, DynamicTexture, Color3, Vector3
} from '@babylonjs/core';

export class TrigCircle {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._angle = 0;   // radians
    this._animating = false;
    this._t = 0;
    this._dot = null;
    this._sinBar = null;
    this._cosBar = null;
    this._tanBar = null;
    this._sinLine = null;
    this._cosLine = null;
  }

  show() {
    this._buildCircle();
    this._buildDot();
    this._buildUI();
    this._update();
  }

  hide() {
    this._clearMeshes();
    this._ui?.remove();
    this._ui = null;
  }

  _clearMeshes() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._dot = null;
    this._sinLine = null;
    this._cosLine = null;
  }

  _buildCircle() {
    // Unit circle outline
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new Vector3(Math.cos(a) * 3, Math.sin(a) * 3, 0));
    }
    const circle = MeshBuilder.CreateLines('unitCircle', { points: pts }, this.scene);
    circle.color = new Color3(0.3, 0.5, 0.9);
    circle.isPickable = false;
    this._meshes.push(circle);

    // Axes
    const x = MeshBuilder.CreateLines('cx', { points: [new Vector3(-4,0,0), new Vector3(4,0,0)] }, this.scene);
    x.color = new Color3(0.8,0.2,0.2); x.isPickable = false;
    const y = MeshBuilder.CreateLines('cy', { points: [new Vector3(0,-4,0), new Vector3(0,4,0)] }, this.scene);
    y.color = new Color3(0.2,0.8,0.2); y.isPickable = false;
    this._meshes.push(x, y);
  }

  _buildDot() {
    this._dot = MeshBuilder.CreateSphere('trigDot', { diameter: 0.28 }, this.scene);
    const mat = new StandardMaterial('tdMat', this.scene);
    mat.emissiveColor = new Color3(1, 0.9, 0);
    this._dot.material = mat;
    this._dot.isPickable = true;
    this.interaction.register(this._dot);
    this._meshes.push(this._dot);
  }

  _update() {
    const a = this._angle;
    const cos = Math.cos(a), sin = Math.sin(a);
    const R = 3;

    if (this._dot) this._dot.position = new Vector3(cos * R, sin * R, 0);

    // Radius line
    this._meshes = this._meshes.filter(m => {
      if (m.name === 'radLine' || m.name === 'sinLine' || m.name === 'cosLine') {
        m.dispose(); return false;
      }
      return true;
    });

    const radLine = MeshBuilder.CreateLines('radLine', {
      points: [Vector3.Zero(), new Vector3(cos * R, sin * R, 0)],
    }, this.scene);
    radLine.color = new Color3(1, 0.9, 0);
    radLine.isPickable = false;
    this._meshes.push(radLine);

    // Sin line (vertical)
    const sinLine = MeshBuilder.CreateLines('sinLine', {
      points: [new Vector3(cos * R, 0, 0), new Vector3(cos * R, sin * R, 0)],
    }, this.scene);
    sinLine.color = new Color3(0, 1, 0.5);
    sinLine.isPickable = false;
    this._meshes.push(sinLine);

    // Cos line (horizontal)
    const cosLine = MeshBuilder.CreateLines('cosLine', {
      points: [new Vector3(0, sin * R, 0), new Vector3(cos * R, sin * R, 0)],
    }, this.scene);
    cosLine.color = new Color3(1, 0.4, 0.1);
    cosLine.isPickable = false;
    this._meshes.push(cosLine);

    // Update HUD values
    const tan = Math.abs(cos) > 0.01 ? (sin / cos) : Infinity;
    if (this._degEl) this._degEl.textContent = `${(a * 180 / Math.PI).toFixed(1)}°`;
    if (this._radEl) this._radEl.textContent = `${a.toFixed(3)} rad`;
    if (this._sinEl) this._sinEl.textContent = sin.toFixed(4);
    if (this._cosEl) this._cosEl.textContent = cos.toFixed(4);
    if (this._tanEl) this._tanEl.textContent = isFinite(tan) ? tan.toFixed(4) : '∞';
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:8px;padding:16px 24px;min-width:300px';

    const sliderRow = document.createElement('div');
    sliderRow.style.cssText = 'display:flex;align-items:center;gap:10px';
    const lbl = document.createElement('label');
    lbl.textContent = 'Angle:';
    lbl.style.cssText = 'font-size:0.8rem;color:#7ba3cc';
    const sl = document.createElement('input');
    sl.type = 'range'; sl.min = 0; sl.max = 6.2832; sl.step = 0.01; sl.value = this._angle;
    sl.style.width = '150px';
    sl.addEventListener('input', () => {
      this._angle = parseFloat(sl.value);
      this._animating = false;
      this._update();
    });
    sliderRow.append(lbl, sl);

    const info = document.createElement('div');
    info.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:0.8rem;font-family:monospace';
    const makeRow = (label, color, key) => {
      const l = document.createElement('span');
      l.style.color = color; l.textContent = label;
      const v = document.createElement('span');
      v.style.color = '#fff'; this[`_${key}El`] = v;
      return [l, v];
    };
    info.append(
      ...makeRow('Angle:', '#ffd700', 'deg'),
      ...makeRow('Radians:', '#ffd700', 'rad'),
      ...makeRow('sin(θ):', '#00ff88', 'sin'),
      ...makeRow('cos(θ):', '#ff6a1a', 'cos'),
      ...makeRow('tan(θ):', '#c080ff', 'tan'),
    );

    const animBtn = document.createElement('button');
    animBtn.className = 'topic-btn';
    animBtn.textContent = '▶ Auto Rotate';
    animBtn.addEventListener('click', () => {
      this._animating = !this._animating;
      animBtn.textContent = this._animating ? '⏸ Pause' : '▶ Auto Rotate';
    });

    wrap.append(sliderRow, info, animBtn);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
    this._update();
  }

  update(deltaTime) {
    if (this._animating) {
      this._angle += deltaTime * 0.001;
      if (this._angle > Math.PI * 2) this._angle -= Math.PI * 2;
      this._update();
    }
  }
}
