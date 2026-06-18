import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';

const SPECTRUM = [
  new Color3(0.55, 0, 1),
  new Color3(0, 0, 1),
  new Color3(0, 0.5, 1),
  new Color3(0, 1, 0),
  new Color3(1, 1, 0),
  new Color3(1, 0.5, 0),
  new Color3(1, 0, 0),
];

export class OpticsLab {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._mode = 'reflection';
    this._mirror = null;
    this._lens = null;
    this._prism = null;
    this._rays = [];
    this._mirrorAngle = 0;
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
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._rays = [];
    this._mirror = null;
    this._lens = null;
    this._prism = null;
  }

  _buildMode(mode) {
    this._clearMeshes();
    this._mode = mode;
    if (mode === 'reflection') this._buildReflection();
    else if (mode === 'refraction') this._buildRefraction();
    else if (mode === 'prism') this._buildPrism();
  }

  _buildReflection() {
    // Mirror surface
    this._mirror = MeshBuilder.CreateBox('mirror', { width: 0.1, height: 4, depth: 3 }, this.scene);
    this._mirror.position = new Vector3(0, 0, 0);
    this._mirror.rotation.y = this._mirrorAngle;
    const mirMat = new StandardMaterial('mirMat', this.scene);
    mirMat.emissiveColor = new Color3(0.6, 0.8, 1);
    mirMat.alpha = 0.7;
    this._mirror.material = mirMat;
    this.interaction.register(this._mirror);
    this._meshes.push(this._mirror);
    this._drawReflectionRays();
  }

  _drawReflectionRays() {
    this._rays.forEach(r => { r.dispose(); });
    this._rays = [];

    const angle = this._mirror.rotation.y;
    const normal = new Vector3(-Math.cos(angle), 0, Math.sin(angle));
    const incident = new Vector3(1, 0, 0.3).normalize();
    const reflected = incident.subtract(normal.scale(2 * Vector3.Dot(incident, normal)));

    const incidentPts = [new Vector3(-6, 0, 0), Vector3.Zero()];
    const reflectedPts = [Vector3.Zero(), reflected.scale(6)];

    const inc = MeshBuilder.CreateLines('inc', { points: incidentPts }, this.scene);
    inc.color = new Color3(1, 1, 0); inc.isPickable = false;
    const ref = MeshBuilder.CreateLines('ref', { points: reflectedPts }, this.scene);
    ref.color = new Color3(0, 1, 1); ref.isPickable = false;

    this._rays.push(inc, ref);
    this._meshes.push(...this._rays);
  }

  _buildRefraction() {
    // Two media boundary
    const boundary = MeshBuilder.CreateBox('boundary', { width: 10, height: 0.08, depth: 8 }, this.scene);
    boundary.position.y = 0;
    const bmat = new StandardMaterial('bMat', this.scene);
    bmat.emissiveColor = new Color3(0.2, 0.4, 0.8);
    bmat.alpha = 0.3;
    boundary.material = bmat;
    boundary.isPickable = false;
    this._meshes.push(boundary);

    // Medium below
    const medium = MeshBuilder.CreateBox('medium', { width: 10, height: 4, depth: 8 }, this.scene);
    medium.position.y = -2;
    const mmat = new StandardMaterial('mMat', this.scene);
    mmat.emissiveColor = new Color3(0.05, 0.1, 0.3);
    mmat.alpha = 0.2;
    mmat.backFaceCulling = false;
    medium.material = mmat;
    medium.isPickable = false;
    this._meshes.push(medium);

    // Snell's law: n1 sin θ1 = n2 sin θ2 (n1=1 air, n2=1.5 glass)
    const n1 = 1.0, n2 = 1.5;
    const theta1 = Math.PI / 4;
    const sinTheta2 = (n1 / n2) * Math.sin(theta1);
    const theta2 = Math.asin(sinTheta2);

    const inc = MeshBuilder.CreateLines('refInc', {
      points: [new Vector3(-4, 4, 0), new Vector3(0, 0, 0)],
    }, this.scene);
    inc.color = new Color3(1, 1, 0); inc.isPickable = false;

    const refr = MeshBuilder.CreateLines('refRefr', {
      points: [new Vector3(0, 0, 0), new Vector3(Math.sin(theta2) * 4, -Math.cos(theta2) * 4, 0)],
    }, this.scene);
    refr.color = new Color3(0, 1, 1); refr.isPickable = false;

    const norm = MeshBuilder.CreateLines('refNorm', {
      points: [new Vector3(0, 3, 0), new Vector3(0, -3, 0)],
    }, this.scene);
    norm.color = new Color3(0.4, 0.4, 0.4); norm.isPickable = false;
    norm.alpha = 0.5;

    this._meshes.push(inc, refr, norm);
  }

  _buildPrism() {
    // Prism shape
    this._prism = MeshBuilder.CreatePolyhedron('prism', { type: 0, size: 1.5 }, this.scene);
    this._prism.position = new Vector3(0, 0, 0);
    this._prism.rotation.z = Math.PI / 6;
    const pmat = new StandardMaterial('prismMat', this.scene);
    pmat.emissiveColor = new Color3(0.3, 0.5, 0.8);
    pmat.alpha = 0.5;
    pmat.backFaceCulling = false;
    this._prism.material = pmat;
    this.interaction.register(this._prism);
    this._meshes.push(this._prism);

    // Incident white ray
    const whiteRay = MeshBuilder.CreateLines('whiteRay', {
      points: [new Vector3(-6, 0.5, 0), new Vector3(-1.4, 0.5, 0)],
    }, this.scene);
    whiteRay.color = new Color3(1, 1, 1); whiteRay.isPickable = false;
    this._meshes.push(whiteRay);

    // Spectrum rays fanning out
    SPECTRUM.forEach((col, i) => {
      const spread = (i - 3) * 0.18;
      const ray = MeshBuilder.CreateLines(`specRay_${i}`, {
        points: [new Vector3(1.4, 0.5, 0), new Vector3(6, 0.5 + spread, 0)],
      }, this.scene);
      ray.color = col; ray.isPickable = false;
      this._meshes.push(ray);
    });
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px';

    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:8px;justify-content:center';
    ['reflection', 'refraction', 'prism'].forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn' + (m === this._mode ? ' active' : '');
      btn.textContent = { reflection: 'Reflection', refraction: 'Refraction (Snell)', prism: 'Prism (Dispersion)' }[m];
      btn.style.fontSize = '0.78rem';
      btn.addEventListener('click', () => {
        modeRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._buildMode(m);
      });
      modeRow.appendChild(btn);
    });

    const info = document.createElement('div');
    info.style.cssText = 'font-size:0.74rem;color:#7ba3cc;text-align:center';
    info.textContent = '🔴 Incident ray  |  🔵 Reflected/Refracted ray  |  Grab mirror/prism to rotate';

    wrap.append(modeRow, info);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  update(deltaTime) {
    if (this._mode === 'reflection' && this._mirror) {
      // Redraw rays if mirror was grabbed and rotated
      this._drawReflectionRays();
    }
  }
}
