// Feature 21: Titration Simulator — pH curve + burette drip animation
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Vector3,
  DynamicTexture, ParticleSystem, Mesh
} from '@babylonjs/core';

const TITRATIONS = [
  { name: 'Strong Acid + Strong Base', pKa: null, startPH: 1.0, C0: 0.1, V0: 0.05, Ctit: 0.1,
    calcPH: (vol, V0, C0, Ctit) => {
      const moles_acid = C0 * V0;
      const moles_base = Ctit * vol;
      const excess = moles_acid - moles_base;
      const totalV = V0 + vol;
      if (excess > 0) return -Math.log10(excess / totalV);
      if (excess < 0) return 14 + Math.log10(-excess / totalV);
      return 7;
    }
  },
  { name: 'Weak Acid + Strong Base', pKa: 4.76, startPH: 2.87, C0: 0.1, V0: 0.05, Ctit: 0.1,
    calcPH: (vol, V0, C0, Ctit) => {
      const n_acid = C0 * V0;
      const n_base = Ctit * vol;
      const totalV = V0 + vol;
      if (n_base < n_acid) {
        const ratio = n_base / (n_acid - n_base);
        return 4.76 + Math.log10(ratio);
      } else if (n_base > n_acid) {
        const excess = (n_base - n_acid) / totalV;
        return 14 + Math.log10(excess);
      }
      return 4.76 + 0.5 * Math.log10(n_acid / totalV);
    }
  },
];

function phToColor(ph) {
  // pH indicator: red (acidic) → yellow → green → blue (basic)
  if (ph < 3)  return new Color3(1, 0.1, 0.1);
  if (ph < 5)  return new Color3(1, 0.5, 0.1);
  if (ph < 7)  return new Color3(1, 1, 0.1);
  if (ph < 9)  return new Color3(0.1, 0.8, 0.1);
  if (ph < 11) return new Color3(0.1, 0.4, 1);
  return new Color3(0.4, 0.1, 0.8);
}

export class TitrationSim {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._t = 0;
    this._activeTitration = 0;
    this._volAdded = 0;
    this._dripping = false;
    this._buretteMesh = null;
    this._flaskMesh = null;
    this._solutionMesh = null;
    this._dropPS = null;
    this._phHistory = [];
    this._curveMesh = null;
    this._infoEl = null;
  }

  show() { this._build(); this._buildUI(); }

  hide() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._dropPS?.dispose(); this._dropPS = null;
    this._dripping = false;
    this._ui?.remove(); this._ui = null;
    this._infoEl?.remove(); this._infoEl = null;
  }

  setPaused(paused) { this._paused = paused; }
  reset() { this._build(); }
  trigger() { this._dripping = !this._dripping; }
  increaseParameter() {
    this._volAdded += 0.0005;
    const titr = TITRATIONS[this._activeTitration];
    const ph = Math.max(0, Math.min(14, titr.calcPH(this._volAdded, titr.V0, titr.C0, titr.Ctit)));
    this._updateInfoPanel(ph);
  }
  decreaseParameter() {
    this._volAdded = Math.max(0, this._volAdded - 0.0005);
    const titr = TITRATIONS[this._activeTitration];
    const ph = Math.max(0, Math.min(14, titr.calcPH(this._volAdded, titr.V0, titr.C0, titr.Ctit)));
    this._updateInfoPanel(ph);
  }

  _build() {
    this._meshes.forEach(m => m.dispose()); this._meshes = [];
    this._volAdded = 0; this._phHistory = [];

    const titr = TITRATIONS[this._activeTitration];

    // Burette (tall cylinder at top)
    this._buretteMesh = MeshBuilder.CreateCylinder('burette', {height:6, diameter:0.4, tessellation:12}, this.scene);
    this._buretteMesh.position.set(0, 4, 0);
    const buretteMat = new StandardMaterial('buretteMat', this.scene);
    buretteMat.emissiveColor = new Color3(0.1, 0.3, 0.6); buretteMat.alpha = 0.5;
    this._buretteMesh.material = buretteMat; this._buretteMesh.isPickable = false;
    this._meshes.push(this._buretteMesh);

    // Burette tip
    const tip = MeshBuilder.CreateCylinder('buretteTip', {height:0.4, diameterTop:0.05, diameterBottom:0.15, tessellation:8}, this.scene);
    tip.position.set(0, 0.8, 0);
    tip.material = buretteMat; tip.isPickable = false;
    this._meshes.push(tip);

    // Stopcock (handle)
    const cock = MeshBuilder.CreateBox('stopcock', {width:0.6, height:0.15, depth:0.15}, this.scene);
    cock.position.set(0, 1.2, 0);
    const cockMat = new PBRMaterial('cockmMat', this.scene);
    cockMat.albedoColor = new Color3(0.8, 0.5, 0.1); cockMat.metallic = 0.6; cockMat.roughness = 0.3;
    cock.material = cockMat;
    this.interaction.register(cock, () => { this._dripping = !this._dripping; });
    this._meshes.push(cock);

    // Erlenmeyer flask (simplified as cone + cylinder)
    const flask = MeshBuilder.CreateCylinder('flask', {height:2.5, diameterTop:2.5, diameterBottom:1.0, tessellation:16}, this.scene);
    flask.position.set(0, -3.5, 0);
    const flaskMat = new StandardMaterial('flaskMat', this.scene);
    flaskMat.emissiveColor = new Color3(0.1, 0.2, 0.4); flaskMat.alpha = 0.4;
    flask.material = flaskMat; flask.isPickable = false;
    this._flaskMesh = flask;
    this._meshes.push(flask);

    // Solution inside flask (colored)
    const currentPH = titr.calcPH(0, titr.V0, titr.C0, titr.Ctit);
    this._solutionMesh = MeshBuilder.CreateCylinder('solution', {height:1.5, diameterTop:2.3, diameterBottom:0.8, tessellation:16}, this.scene);
    this._solutionMesh.position.set(0, -3.8, 0);
    const solMat = new PBRMaterial('solutionMat', this.scene);
    solMat.albedoColor = phToColor(currentPH);
    solMat.emissiveColor = phToColor(currentPH).scale(0.3);
    solMat.alpha = 0.7; solMat.metallic = 0.0; solMat.roughness = 0.8;
    this._solutionMesh.material = solMat; this._solutionMesh.isPickable = false;
    this._meshes.push(this._solutionMesh);

    // Drip particle system
    const dripTex = new DynamicTexture('dripTex', {width:8, height:8}, this.scene);
    const ctx = dripTex.getContext();
    ctx.fillStyle = '#aaddff'; ctx.beginPath(); ctx.arc(4,4,3,0,Math.PI*2); ctx.fill(); dripTex.update();
    this._dropPS = new ParticleSystem('drops', 20, this.scene);
    this._dropPS.particleTexture = dripTex;
    this._dropPS.emitter = new Vector3(0, 0.8, 0);
    this._dropPS.createPointEmitter(new Vector3(-0.02, -1, -0.02), new Vector3(0.02, -1, 0.02));
    this._dropPS.minEmitPower = 2; this._dropPS.maxEmitPower = 3;
    this._dropPS.minLifeTime = 0.4; this._dropPS.maxLifeTime = 0.7;
    this._dropPS.emitRate = 8;
    this._dropPS.minSize = 0.05; this._dropPS.maxSize = 0.12;
    this._dropPS.color1 = new Color4(0.5, 0.8, 1, 0.9);
    this._dropPS.colorDead = new Color4(0, 0, 0, 0);
    this._dropPS.gravity = new Vector3(0, -9.8, 0);
    this._meshes.push({ dispose: () => this._dropPS?.dispose() });

    // pH curve axes (right side)
    const axX = MeshBuilder.CreateLines('tAxX', {points:[new Vector3(3,-5,0), new Vector3(8,-5,0)]}, this.scene);
    axX.color = new Color3(0.3,0.3,0.5); axX.isPickable = false;
    const axY = MeshBuilder.CreateLines('tAxY', {points:[new Vector3(3,-5,0), new Vector3(3,5,0)]}, this.scene);
    axY.color = new Color3(0.3,0.3,0.5); axY.isPickable = false;
    this._meshes.push(axX, axY);

    // Labels
    this._addLabel('Volume added (mL)', 5.5, -5.5);
    this._addLabel('pH', 2.5, 0);
    this._addLabel(titr.name, 5.5, 5.5);

    this._buildInfoPanel(titr.calcPH(0, titr.V0, titr.C0, titr.Ctit));
  }

  _addLabel(text, x, y) {
    const plane = MeshBuilder.CreatePlane('titrLbl'+this._meshes.length, {width:3, height:0.6}, this.scene);
    plane.position.set(x, y, 0.1);
    const tex = new DynamicTexture('titrTex'+this._meshes.length, {width:240,height:48}, this.scene);
    const ctx = tex.getContext();
    ctx.fillStyle = '#7ba3cc'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
    ctx.fillText(text, 120, 30); tex.update();
    const mat = new StandardMaterial('titrLblMat'+this._meshes.length, this.scene);
    mat.emissiveTexture = tex; mat.disableLighting = true; mat.alpha = 0.9;
    plane.material = mat; plane.isPickable = false;
    this._meshes.push(plane);
  }

  _buildInfoPanel(ph) {
    this._infoEl?.remove();
    const el = document.createElement('div');
    el.id = 'titration-info';
    el.style.cssText = `
      position:fixed;top:80px;right:20px;background:rgba(10,20,40,0.88);
      border:1px solid rgba(127,255,127,0.3);border-radius:12px;padding:14px 18px;
      z-index:1500;pointer-events:none;font-size:0.82rem;color:#e8f4ff;
      backdrop-filter:blur(8px);min-width:200px;font-family:monospace;
    `;
    this._infoEl = el;
    document.body.appendChild(el);
    this._meshes.push({ dispose: () => el.remove() });
    this._updateInfoPanel(ph);
  }

  _updateInfoPanel(ph) {
    if (!this._infoEl) return;
    const titr = TITRATIONS[this._activeTitration];
    const eqVol = (titr.C0 * titr.V0 / titr.Ctit * 1000).toFixed(1);
    const status = ph < 7 ? '🔴 Acidic' : ph > 7 ? '🔵 Basic' : '⚪ Neutral';
    this._infoEl.innerHTML = `
      <div style="color:#7fff7f;font-weight:700;margin-bottom:8px;">⚗ Titration</div>
      <div>pH = <span style="color:${ph<7?'#ff4040':ph>7?'#4080ff':'#aaffaa'}">${ph.toFixed(2)}</span></div>
      <div>Vol added = ${(this._volAdded*1000).toFixed(2)} mL</div>
      <div>Eq. point ≈ ${eqVol} mL</div>
      <div style="margin-top:6px;">${status}</div>
      <div style="margin-top:8px;font-size:0.72rem;color:#7ba3cc;">Click stopcock to drip • Watch curve steepen at eq. point</div>
    `;
  }

  _updateCurve() {
    this._curveMesh?.dispose();
    if (this._phHistory.length < 2) return;
    const titr = TITRATIONS[this._activeTitration];
    const maxVol = titr.V0 * 2;
    const points = this._phHistory.map(([vol, ph]) => {
      const x = 3 + (vol / maxVol) * 5;
      const y = -5 + (ph / 14) * 10;
      return new Vector3(x, y, 0.1);
    });
    this._curveMesh = MeshBuilder.CreateLines('titrCurve', {points}, this.scene);
    this._curveMesh.color = new Color3(0, 0.9, 0.4);
    this._curveMesh.isPickable = false;
    this._meshes.push(this._curveMesh);
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 22px;';

    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;';
    TITRATIONS.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn chem-topic' + (i===this._activeTitration?' active':'');
      btn.textContent = t.name; btn.style.fontSize = '0.72rem';
      btn.onclick = () => {
        this._activeTitration = i;
        modeRow.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        this._build();
      };
      modeRow.appendChild(btn);
    });

    const dripBtn = document.createElement('button');
    dripBtn.className = 'topic-btn chem-topic active';
    dripBtn.textContent = '💧 Toggle Drip';
    dripBtn.style.fontSize = '0.75rem';
    dripBtn.onclick = () => { this._dripping = !this._dripping; };

    const resetBtn = document.createElement('button');
    resetBtn.className = 'topic-btn chem-topic';
    resetBtn.textContent = '↺ Reset';
    resetBtn.style.fontSize = '0.75rem';
    resetBtn.onclick = () => this._build();

    wrap.append(modeRow, dripBtn, resetBtn);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  update(dt) {
    if (this._paused) return;
    this._t += dt * 0.001;

    if (this._dripping) {
      if (!this._dropPS.isStarted()) this._dropPS.start();
      const titr = TITRATIONS[this._activeTitration];
      const maxVol = titr.V0 * 2;
      if (this._volAdded < maxVol) {
        this._volAdded += 0.00005; // slow drip
        const ph = titr.calcPH(this._volAdded, titr.V0, titr.C0, titr.Ctit);
        const clampedPH = Math.max(0, Math.min(14, ph));

        // Update solution color
        if (this._solutionMesh?.material) {
          const col = phToColor(clampedPH);
          this._solutionMesh.material.albedoColor = col;
          this._solutionMesh.material.emissiveColor = col.scale(0.2);
        }

        // Record pH
        this._phHistory.push([this._volAdded, clampedPH]);
        if (this._phHistory.length % 10 === 0) this._updateCurve();

        this._updateInfoPanel(clampedPH);
      } else {
        this._dripping = false;
      }
    } else {
      if (this._dropPS.isStarted()) this._dropPS.stop();
    }
  }
}
