// Feature 18: Reaction Energy Diagram — activation energy hill + catalyst animation
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3,
  DynamicTexture, ParticleSystem, Color4, Mesh, VertexData
} from '@babylonjs/core';

const REACTIONS = [
  { name: 'Exothermic (combustion)', ea: 3.5, dH: -2.5, color: new Color3(1,0.3,0.1) },
  { name: 'Endothermic (decomp.)',   ea: 4.0, dH:  2.0, color: new Color3(0.3,0.6,1) },
  { name: 'Catalysed (w/ enzyme)',   ea: 1.8, dH: -1.5, color: new Color3(0.5,1,0.5), catalysed: true },
  { name: 'Equilibrium',            ea: 2.5, dH:  0.0, color: new Color3(1,0.85,0.2) },
];

export class ReactionEnergy {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._t = 0;
    this._activeRxn = 0;
    this._ballMesh = null;
    this._ballT = 0;
    this._catalystMesh = null;
    this._catalystActive = false;
  }

  show() { this._build(); this._buildUI(); }

  hide() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._ballMesh = null;
    this._catalystMesh = null;
    this._ui?.remove(); this._ui = null;
  }

  _rxnCurve(t, ea, dH) {
    // Gaussian hill centered at t=0.5
    const x = (t - 0.5) * 2;
    const hill = ea * Math.exp(-x*x * 3);
    const slope = dH * t;
    return hill + slope;
  }

  _build() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._ballT = 0;

    const rxn = REACTIONS[this._activeRxn];
    const N = 80, W = 10, YScale = 1.2;

    // Build energy profile mesh as lines
    const points = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const y = this._rxnCurve(t, rxn.ea, rxn.dH) * YScale;
      points.push(new Vector3((t - 0.5) * W, y, 0));
    }
    const curveLine = MeshBuilder.CreateLines('rxnCurve', {points}, this.scene);
    curveLine.color = rxn.color;
    curveLine.isPickable = false;
    this._meshes.push(curveLine);

    // If catalysed, show lower curve
    if (rxn.catalysed) {
      const catPoints = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const y = this._rxnCurve(t, rxn.ea * 0.5, rxn.dH) * YScale;
        catPoints.push(new Vector3((t - 0.5) * W, y - 0.1, 0.1));
      }
      const catLine = MeshBuilder.CreateLines('catCurve', {points: catPoints}, this.scene);
      catLine.color = new Color3(1, 1, 0);
      catLine.isPickable = false;
      this._meshes.push(catLine);
      this._catPoints = catPoints;
    }
    this._profilePoints = points;

    // Axes
    const axisX = MeshBuilder.CreateLines('rxnAxisX', {
      points:[new Vector3(-5.5,-3,0), new Vector3(5.5,-3,0)]
    }, this.scene);
    axisX.color = new Color3(0.3,0.3,0.5); axisX.isPickable = false;
    const axisY = MeshBuilder.CreateLines('rxnAxisY', {
      points:[new Vector3(-5.5,-3,0), new Vector3(-5.5,5,0)]
    }, this.scene);
    axisY.color = new Color3(0.3,0.3,0.5); axisY.isPickable = false;
    this._meshes.push(axisX, axisY);

    // Energy level markers
    const reactantY = 0;
    const productY  = rxn.dH * YScale;
    const eaY       = rxn.ea * YScale;
    [
      { y: reactantY, label:'Reactants', x:-4.5 },
      { y: productY,  label:'Products',  x: 3.5 },
      { y: eaY,       label:'Ea = '+(rxn.ea).toFixed(1)+' eV', x: -0.5 },
    ].forEach((m, i) => {
      const dash = MeshBuilder.CreateLines('rxnDash'+i, {
        points:[new Vector3(-5.5, m.y, 0.05), new Vector3(5.5, m.y, 0.05)]
      }, this.scene);
      dash.color = new Color3(0.15,0.15,0.3); dash.isPickable = false;
      this._meshes.push(dash);
      this._addLabel(m.label, m.x, m.y + 0.4);
    });

    // Ball on the energy hill
    this._ballMesh = MeshBuilder.CreateSphere('rxnBall', {diameter:0.4, segments:10}, this.scene);
    const ballMat = new PBRMaterial('rxnBallMat', this.scene);
    ballMat.albedoColor = new Color3(1, 0.7, 0.2);
    ballMat.emissiveColor = new Color3(0.3, 0.15, 0);
    ballMat.metallic = 0.5; ballMat.roughness = 0.2;
    this._ballMesh.material = ballMat;
    this._ballMesh.isPickable = false;
    this._meshes.push(this._ballMesh);

    // Catalyst sphere (draggable)
    const cat = MeshBuilder.CreateSphere('catalystSphere', {diameter:0.7, segments:10}, this.scene);
    cat.position.set(0, eaY + 1.5, 0);
    const catMat = new PBRMaterial('catalystMat', this.scene);
    catMat.albedoColor = new Color3(1,0.9,0.1);
    catMat.emissiveColor = new Color3(0.3,0.25,0);
    catMat.metallic = 0.7; catMat.roughness = 0.15;
    cat.material = catMat;
    this._catalystMesh = cat;
    this.interaction.register(cat);
    this._meshes.push(cat);

    // Reaction label
    const infoEl = document.createElement('div');
    infoEl.style.cssText = `
      position:fixed;top:80px;right:20px;background:rgba(10,20,40,0.88);
      border:1px solid rgba(127,255,127,0.3);border-radius:12px;padding:14px 18px;
      z-index:1500;pointer-events:none;font-size:0.78rem;color:#e8f4ff;
      backdrop-filter:blur(8px);min-width:200px;
    `;
    infoEl.innerHTML = `
      <div style="color:#7fff7f;font-weight:700;margin-bottom:8px;">⚗ Reaction Energy</div>
      <div>${rxn.name}</div>
      <div>Ea = ${rxn.ea.toFixed(1)} eV</div>
      <div>ΔH = ${rxn.dH >= 0 ? '+' : ''}${rxn.dH.toFixed(1)} eV</div>
      <div style="margin-top:8px;font-size:0.72rem;color:#7ba3cc;">Drag the ⭐ catalyst to lower Ea</div>
    `;
    document.body.appendChild(infoEl);
    this._meshes.push({ dispose: () => infoEl.remove() });
  }

  _addLabel(text, x, y) {
    const plane = MeshBuilder.CreatePlane('rxnLabel' + this._meshes.length, {width:3, height:0.6}, this.scene);
    plane.position.set(x, y, 0.1);
    const tex = new DynamicTexture('rxnTex' + this._meshes.length, {width:240, height:48}, this.scene);
    const ctx = tex.getContext();
    ctx.fillStyle = '#88ccff'; ctx.font = '18px Arial'; ctx.textAlign = 'center';
    ctx.fillText(text, 120, 32); tex.update();
    const mat = new StandardMaterial('rxnLblMat' + this._meshes.length, this.scene);
    mat.emissiveTexture = tex; mat.disableLighting = true; mat.alpha = 0.9;
    plane.material = mat; plane.isPickable = false;
    this._meshes.push(plane);
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 22px;';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;';
    REACTIONS.forEach((r, i) => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn chem-topic' + (i===this._activeRxn?' active':'');
      btn.textContent = r.name; btn.style.fontSize = '0.72rem';
      btn.onclick = () => {
        this._activeRxn = i;
        row.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        this._build();
      };
      row.appendChild(btn);
    });
    wrap.appendChild(row);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  update(dt) {
    this._t += dt * 0.001;
    // Animate ball along energy profile
    this._ballT = (this._ballT + dt * 0.0003) % 1;
    const rxn = REACTIONS[this._activeRxn];
    if (this._ballMesh && this._profilePoints?.length) {
      const idx = Math.floor(this._ballT * (this._profilePoints.length - 1));
      const pt = this._profilePoints[idx];
      if (pt) this._ballMesh.position.set(pt.x, pt.y + 0.2, 0.3);
    }
  }
}
