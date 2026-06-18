// Feature 15: Special Relativity Visualizer — Lorentz contraction + time dilation
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3,
  DynamicTexture, Mesh
} from '@babylonjs/core';

export class RelativityViz {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._t = 0;
    this._beta = 0.5; // v/c
    this._mode = 'contraction'; // 'contraction' | 'tiledilation' | 'spacetime'
    this._shipMesh = null;
    this._clockMesh = null;
    this._worldlineMesh = null;
    this._shipX = -8;
    this._properTime = 0;
    this._coordTime = 0;
  }

  show() { this._build(); this._buildUI(); }

  hide() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._ui?.remove(); this._ui = null;
    this._infoEl?.remove(); this._infoEl = null;
  }

  _lorentz() { return 1 / Math.sqrt(1 - this._beta * this._beta); }

  _build() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._shipX = -8;
    this._properTime = 0;
    this._coordTime = 0;

    if (this._mode === 'contraction') this._buildContraction();
    else if (this._mode === 'tiledilation') this._buildTimeDilation();
    else this._buildSpacetime();

    this._buildInfoPanel();
  }

  _buildContraction() {
    // Two boxes: rest frame (transparent) and moving (contracted)
    const restL = 4;
    const restBox = MeshBuilder.CreateBox('relRest', {width:restL, height:0.8, depth:0.8}, this.scene);
    restBox.position.set(0, 2, 0);
    const rMat = new StandardMaterial('relRestMat', this.scene);
    rMat.emissiveColor = new Color3(0.15, 0.3, 0.5); rMat.wireframe = true; rMat.alpha = 0.5;
    restBox.material = rMat; restBox.isPickable = false;
    this._meshes.push(restBox);

    // Moving spacecraft (contracted)
    const contractedL = restL / this._lorentz();
    this._shipMesh = MeshBuilder.CreateBox('relShip', {width:contractedL, height:0.8, depth:0.8}, this.scene);
    this._shipMesh.position.set(-8, 0, 0);
    const sMat = new PBRMaterial('relShipMat', this.scene);
    sMat.albedoColor = new Color3(0.3, 0.7, 1); sMat.emissiveColor = new Color3(0.05, 0.2, 0.5);
    sMat.metallic = 0.6; sMat.roughness = 0.2;
    this._shipMesh.material = sMat; this._shipMesh.isPickable = false;
    this._meshes.push(this._shipMesh);

    // Ground reference grid
    for (let x = -10; x <= 10; x += 2) {
      const line = MeshBuilder.CreateLines(`relGrid${x}`, {
        points: [new Vector3(x, -0.8, -2), new Vector3(x, -0.8, 2)]
      }, this.scene);
      line.color = new Color3(0.1, 0.15, 0.3); line.isPickable = false;
      this._meshes.push(line);
    }

    // Readout labels
    this._addLabel('Rest length: ' + restL.toFixed(1) + ' m', 0, 3.0, '#7ba3cc');
    this._addLabel('Contracted: ?', 0, -2, '#00d4ff');
    this._contractedLabel = this._meshes[this._meshes.length-1];
  }

  _buildTimeDilation() {
    // Show two clocks: stationary and moving
    for (let i = 0; i < 2; i++) {
      const base = MeshBuilder.CreateBox(`relClock${i}`, {width:1.5, height:1.5, depth:0.2}, this.scene);
      base.position.set(i === 0 ? -3 : 3, 0, 0);
      const mat = new PBRMaterial(`relClkMat${i}`, this.scene);
      mat.albedoColor = i === 0 ? new Color3(0.2,0.2,0.2) : new Color3(0.1,0.3,0.6);
      mat.emissiveColor = i === 0 ? new Color3(0.05,0.05,0.05) : new Color3(0.02,0.1,0.3);
      mat.metallic = 0.5; mat.roughness = 0.4;
      base.material = mat; base.isPickable = false;
      this._meshes.push(base);
    }
    this._addLabel('Stationary Observer', -3, 2.2, '#7ba3cc');
    this._addLabel('Moving Observer (v=' + (this._beta*100).toFixed(0) + '%c)', 3, 2.2, '#00d4ff');
    this._addLabel('', -3, -2, '#7ba3cc'); // stationary time
    this._addLabel('', 3,  -2, '#00d4ff'); // moving time
    this._clockLabels = [this._meshes.length-2, this._meshes.length-1];
  }

  _buildSpacetime() {
    // Minkowski spacetime diagram: ct vs x
    const origin = Vector3.Zero();
    // Axes
    [
      { to: new Vector3(8,0,0),  color: new Color3(1,0.5,0.2), label:'x' },
      { to: new Vector3(0,8,0),  color: new Color3(0.5,1,0.5), label:'ct' },
    ].forEach((a, i) => {
      const line = MeshBuilder.CreateLines(`stAxis${i}`, {points:[origin, a.to]}, this.scene);
      line.color = a.color; line.isPickable = false;
      this._meshes.push(line);
    });

    // Light cone (45° lines)
    [-1,1].forEach(sign => {
      const lc = MeshBuilder.CreateLines('lightCone'+sign, {
        points:[new Vector3(0,-6,0), new Vector3(sign*6,0,0), new Vector3(0,6,0)]
      }, this.scene);
      lc.color = new Color3(1,1,0); lc.isPickable = false;
      this._meshes.push(lc);
    });

    // Worldline of moving observer
    const gamma = this._lorentz();
    const angle = Math.atan(this._beta); // tilt of worldline in Minkowski
    const points = [];
    for (let t = -5; t <= 5; t += 0.1) {
      points.push(new Vector3(this._beta*t, t, 0));
    }
    const wl = MeshBuilder.CreateLines('worldLine', {points}, this.scene);
    wl.color = new Color3(0,0.85,1); wl.isPickable = false;
    this._meshes.push(wl);

    this._addLabel('Light cone', 4.5, 4.5, '#ffd700');
    this._addLabel('Moving worldline (β=' + this._beta.toFixed(2) + ')', 3, 3.5, '#00d4ff');
  }

  _addLabel(text, x, y, color) {
    const plane = MeshBuilder.CreatePlane('relLbl' + this._meshes.length, {width:4, height:0.7}, this.scene);
    plane.position.set(x, y, 0.1);
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const tex = new DynamicTexture('relTex' + this._meshes.length, {width:320, height:56}, this.scene);
    const ctx = tex.getContext();
    ctx.fillStyle = color; ctx.font = '20px Arial'; ctx.textAlign = 'center';
    ctx.fillText(text, 160, 36); tex.update();
    const mat = new StandardMaterial('relLblMat' + this._meshes.length, this.scene);
    mat.emissiveTexture = tex; mat.disableLighting = true; mat.alpha = 0.9;
    plane.material = mat; plane.isPickable = false;
    this._meshes.push(plane);
    return plane;
  }

  _buildInfoPanel() {
    this._infoEl?.remove();
    const el = document.createElement('div');
    el.id = 'rel-info';
    el.style.cssText = `
      position:fixed;top:80px;right:20px;background:rgba(10,20,40,0.88);
      border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:14px 18px;
      z-index:1500;pointer-events:none;font-size:0.78rem;color:#e8f4ff;
      backdrop-filter:blur(8px);font-family:monospace;min-width:220px;
    `;
    this._infoEl = el;
    document.body.appendChild(el);
    this._meshes.push({ dispose: () => el.remove() });
    this._updateInfo();
  }

  _updateInfo() {
    if (!this._infoEl) return;
    const gamma = this._lorentz();
    const v = (this._beta * 299792).toFixed(0);
    this._infoEl.innerHTML = `
      <div style="color:#00d4ff;font-weight:700;margin-bottom:8px;">Special Relativity</div>
      <div>β = v/c = ${this._beta.toFixed(3)}</div>
      <div>γ = ${gamma.toFixed(4)}</div>
      <div>v = ${v} km/s</div>
      <div style="margin-top:8px;color:#7ba3cc;">Length: L = L₀/γ = L₀×${(1/gamma).toFixed(3)}</div>
      <div style="color:#7ba3cc;">Time: Δt' = γΔt</div>
      <div style="margin-top:8px;color:#ffd700;">Proper time: ${this._properTime.toFixed(2)}s</div>
      <div style="color:#ff8040;">Coord time: ${this._coordTime.toFixed(2)}s</div>
    `;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 22px;';

    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;';
    ['contraction','tiledilation','spacetime'].forEach(m => {
      const labels = {contraction:'📏 Length Contract.',tiledilation:'⏱ Time Dilation',spacetime:'🌌 Spacetime'};
      const btn = document.createElement('button');
      btn.className = 'topic-btn physics-topic' + (m===this._mode?' active':'');
      btn.textContent = labels[m]; btn.style.fontSize = '0.75rem';
      btn.onclick = () => {
        this._mode = m;
        modeRow.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        this._build();
      };
      modeRow.appendChild(btn);
    });

    const betaRow = document.createElement('div');
    betaRow.style.cssText = 'display:flex;align-items:center;gap:10px;';
    const bl = document.createElement('label');
    bl.style.cssText = 'font-size:0.78rem;color:#7ba3cc;white-space:nowrap;min-width:50px;';
    bl.textContent = 'v/c (β)';
    const bs = document.createElement('input');
    bs.type='range'; bs.min=0; bs.max=0.999; bs.step=0.001; bs.value=this._beta;
    bs.style.width='130px'; bs.style.accentColor='#ff6b35';
    const bv = document.createElement('span');
    bv.style.cssText = 'font-size:0.78rem;color:#ff6b35;min-width:45px;font-family:monospace;';
    bv.textContent = this._beta.toFixed(3);
    bs.oninput = () => {
      this._beta = +bs.value;
      bv.textContent = this._beta.toFixed(3);
      this._build();
    };
    betaRow.append(bl, bs, bv);

    wrap.append(modeRow, betaRow);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  update(dt) {
    this._t += dt * 0.001;
    this._coordTime += dt * 0.001;
    this._properTime += (dt * 0.001) / this._lorentz();

    if (this._mode === 'contraction' && this._shipMesh) {
      // Move ship across scene
      this._shipX += this._beta * 5 * dt * 0.001;
      if (this._shipX > 10) this._shipX = -10;
      this._shipMesh.position.x = this._shipX;

      // Update contracted label
      const cl = this._contractedLabel;
      if (cl) {
        const cLen = 4 / this._lorentz();
        const tex = cl.material?.emissiveTexture;
        if (tex) {
          const ctx = tex.getContext();
          ctx.clearRect(0,0,320,56);
          ctx.fillStyle = '#00d4ff'; ctx.font = '20px Arial'; ctx.textAlign = 'center';
          ctx.fillText('Contracted: ' + cLen.toFixed(2) + ' m', 160, 36);
          tex.update();
        }
      }
    }

    this._updateInfo();
  }
}
