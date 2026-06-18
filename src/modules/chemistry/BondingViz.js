import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Vector3,
  ParticleSystem, DynamicTexture
} from '@babylonjs/core';

export class BondingViz {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._mode = 'ionic';
    this._t = 0;
    this._electronPS = null;
  }

  show() {
    this._buildMode(this._mode);
    this._buildUI();
  }

  hide() {
    this._clearMeshes();
    this._ui?.remove();
    this._ui = null;
  }

  _clearMeshes() {
    this._electronPS?.dispose();
    this._electronPS = null;
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
  }

  _buildMode(mode) {
    this._clearMeshes();
    this._mode = mode;
    if (mode === 'ionic') this._buildIonic();
    else if (mode === 'covalent') this._buildCovalent();
    else if (mode === 'metallic') this._buildMetallic();
    else if (mode === 'hydrogen') this._buildHydrogen();
  }

  _buildIonic() {
    // Na (donor) and Cl (acceptor)
    const na = MeshBuilder.CreateSphere('na', { diameter: 1.1, segments: 16 }, this.scene);
    na.position = new Vector3(-2.5, 0, 0);
    const naMat = new PBRMaterial('naMat', this.scene);
    naMat.albedoColor = new Color3(0.6, 0.3, 0.9);
    naMat.emissiveColor = new Color3(0.1, 0.04, 0.15);
    na.material = naMat;
    na.isPickable = false;
    this._meshes.push(na);

    const cl = MeshBuilder.CreateSphere('cl', { diameter: 1.4, segments: 16 }, this.scene);
    cl.position = new Vector3(2.5, 0, 0);
    const clMat = new PBRMaterial('clMat', this.scene);
    clMat.albedoColor = new Color3(0.1, 0.9, 0.1);
    clMat.emissiveColor = new Color3(0, 0.08, 0);
    cl.material = clMat;
    cl.isPickable = false;
    this._meshes.push(cl);

    // Labels
    const naL = this._makeTextTile('Na⁺', -2.5, 1.4);
    const clL = this._makeTextTile('Cl⁻', 2.5, 1.8);
    this._meshes.push(naL, clL);

    // Electron transfer animation
    const ps = new ParticleSystem('eTransfer', 40, this.scene);
    const tex = new DynamicTexture('eTex', { width: 8, height: 8 }, this.scene);
    const ctx = tex.getContext();
    ctx.fillStyle = '#aaddff'; ctx.beginPath(); ctx.arc(4,4,3,0,Math.PI*2); ctx.fill();
    tex.update();
    ps.particleTexture = tex;
    ps.emitter = na.position.clone();
    ps.createSphereEmitter(0.3, 1);
    ps.direction1 = new Vector3(1, 0.2, 0.2);
    ps.direction2 = new Vector3(1, -0.2, -0.2);
    ps.minEmitPower = 3; ps.maxEmitPower = 5;
    ps.minLifeTime = 0.6; ps.maxLifeTime = 1.0;
    ps.emitRate = 15;
    ps.minSize = 0.08; ps.maxSize = 0.18;
    ps.color1 = new Color4(0.7, 0.9, 1, 1);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.gravity = new Vector3(0.5, 0, 0);
    ps.start();
    this._electronPS = ps;
    this._iNa = na; this._iCl = cl;
  }

  _buildCovalent() {
    // H-H covalent bond: shared electron cloud
    for (let i = -1; i <= 1; i += 2) {
      const h = MeshBuilder.CreateSphere(`covH_${i}`, { diameter: 0.7, segments: 12 }, this.scene);
      h.position = new Vector3(i * 1.0, 0, 0);
      const mat = new PBRMaterial(`covHMat_${i}`, this.scene);
      mat.albedoColor = new Color3(0.95, 0.95, 0.95);
      mat.metallic = 0.1; mat.roughness = 0.4;
      h.material = mat; h.isPickable = false;
      this._meshes.push(h);
    }

    // Shared electron cloud (ellipsoid)
    const cloud = MeshBuilder.CreateSphere('covalCloud', { diameter: 1.8, segments: 12 }, this.scene);
    cloud.scaling = new Vector3(1.6, 0.7, 0.7);
    const cmat = new StandardMaterial('cloudMat', this.scene);
    cmat.emissiveColor = new Color3(0.3, 0.5, 1);
    cmat.alpha = 0.2;
    cmat.backFaceCulling = false;
    cloud.material = cmat; cloud.isPickable = false;
    this._meshes.push(cloud);
    this._covalCloud = cloud;

    const lbl = this._makeTextTile('H₂ — Covalent Bond', 0, 2.5);
    this._meshes.push(lbl);
  }

  _buildMetallic() {
    // Metal lattice (Na atoms) + electron sea
    const positions = [
      [-2,-2],[-2,0],[-2,2],[0,-2],[0,0],[0,2],[2,-2],[2,0],[2,2]
    ];
    positions.forEach(([x,y], i) => {
      const atom = MeshBuilder.CreateSphere(`metal_${i}`, { diameter: 0.7, segments: 8 }, this.scene);
      atom.position = new Vector3(x, y, 0);
      const mat = new PBRMaterial(`metalMat_${i}`, this.scene);
      mat.albedoColor = new Color3(0.8, 0.8, 0.9);
      mat.metallic = 0.9; mat.roughness = 0.1;
      atom.material = mat; atom.isPickable = false;
      this._meshes.push(atom);
    });

    // Free electron sea
    const ps = new ParticleSystem('electronSea', 120, this.scene);
    const tex = new DynamicTexture('seaTex', { width: 8, height: 8 }, this.scene);
    const ctx = tex.getContext();
    ctx.fillStyle = '#aaddff'; ctx.beginPath(); ctx.arc(4,4,3,0,Math.PI*2); ctx.fill();
    tex.update();
    ps.particleTexture = tex;
    ps.createBoxEmitter(new Vector3(-3,-3,0), new Vector3(3,3,0), new Vector3(-1,-1,0), new Vector3(1,1,0));
    ps.minEmitPower = 1; ps.maxEmitPower = 3;
    ps.minLifeTime = 0.5; ps.maxLifeTime = 1.5;
    ps.emitRate = 80;
    ps.minSize = 0.06; ps.maxSize = 0.14;
    ps.color1 = new Color4(0.6, 0.8, 1, 0.8);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.start();
    this._electronPS = ps;
    const lbl = this._makeTextTile('Metallic Bond — Electron Sea', 0, 3.5);
    this._meshes.push(lbl);
  }

  _buildHydrogen() {
    // Water molecules showing H-bonds
    const molDefs = [
      { O: [0,0,0], H1: [0.9, 0.4, 0], H2: [-0.9, 0.4, 0] },
      { O: [0,3,0], H1: [0.9, 2.6, 0], H2: [-0.9, 2.6, 0] },
      { O: [3,1.5,0], H1: [3.9, 1.9, 0], H2: [2.1, 1.9, 0] },
    ];
    molDefs.forEach((m, mi) => {
      const sphere = (name, pos, r, color) => {
        const s = MeshBuilder.CreateSphere(name, { diameter: r, segments: 10 }, this.scene);
        s.position = new Vector3(...pos);
        const mat = new PBRMaterial(name+'Mat', this.scene);
        mat.albedoColor = color; mat.metallic = 0.1; mat.roughness = 0.5;
        s.material = mat; s.isPickable = false;
        this._meshes.push(s);
        return s;
      };
      const oSph = sphere(`hO_${mi}`, m.O, 0.8, new Color3(0.9, 0.1, 0.1));
      sphere(`hH1_${mi}`, m.H1, 0.4, new Color3(0.9, 0.9, 0.9));
      sphere(`hH2_${mi}`, m.H2, 0.4, new Color3(0.9, 0.9, 0.9));
    });

    // H-bond dashed lines between molecules
    const hBonds = [
      [new Vector3(0.9,0.4,0), new Vector3(0.9,2.6,0)],
      [new Vector3(0.9,0.4,0), new Vector3(2.1,1.9,0)],
    ];
    hBonds.forEach(([a,b], i) => {
      const dashCount = 6;
      for (let d = 0; d < dashCount; d++) {
        const t0 = d / dashCount, t1 = (d + 0.5) / dashCount;
        const p0 = a.add(b.subtract(a).scale(t0));
        const p1 = a.add(b.subtract(a).scale(t1));
        const dash = MeshBuilder.CreateLines(`hbond_${i}_${d}`, { points: [p0, p1] }, this.scene);
        dash.color = new Color3(0.3, 0.6, 1); dash.isPickable = false;
        this._meshes.push(dash);
      }
    });
    const lbl = this._makeTextTile('Hydrogen Bonds (dashed)', 0, -2.2);
    this._meshes.push(lbl);
  }

  _makeTextTile(text, x, y) {
    const plane = MeshBuilder.CreatePlane('lbl', { width: 3, height: 0.7 }, this.scene);
    plane.position = new Vector3(x, y, 0.1);
    const tex = new DynamicTexture('lblTex', { width: 256, height: 64 }, this.scene);
    const ctx = tex.getContext();
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = '#88ccff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 40);
    tex.update();
    const mat = new StandardMaterial('lblMat', this.scene);
    mat.emissiveTexture = tex;
    mat.disableLighting = true;
    mat.alpha = 0.9;
    plane.material = mat;
    plane.isPickable = false;
    return plane;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px';

    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center';
    ['ionic', 'covalent', 'metallic', 'hydrogen'].forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn chem-topic' + (m === this._mode ? ' active' : '');
      btn.textContent = { ionic: '⚡ Ionic', covalent: '🔗 Covalent', metallic: '🔩 Metallic', hydrogen: '💧 H-Bond' }[m];
      btn.style.fontSize = '0.78rem';
      btn.addEventListener('click', () => {
        modeRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._buildMode(m);
      });
      modeRow.appendChild(btn);
    });

    wrap.append(modeRow);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  update(deltaTime) {
    this._t += deltaTime * 0.001;
    if (this._mode === 'covalent' && this._covalCloud) {
      this._covalCloud.scaling.x = 1.6 + Math.sin(this._t * 4) * 0.1;
    }
  }
}
