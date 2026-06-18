import {
  MeshBuilder, PBRMaterial, StandardMaterial, Color3, Vector3
} from '@babylonjs/core';

const SHAPES = [
  { id: 'sphere',       label: 'Sphere',         build: s => MeshBuilder.CreateSphere('geo', { diameter: 2.5, segments: 24 }, s) },
  { id: 'cube',         label: 'Cube',            build: s => MeshBuilder.CreateBox('geo', { size: 2.2 }, s) },
  { id: 'cylinder',     label: 'Cylinder',        build: s => MeshBuilder.CreateCylinder('geo', { height: 3, diameter: 2, tessellation: 32 }, s) },
  { id: 'cone',         label: 'Cone',            build: s => MeshBuilder.CreateCylinder('geo', { height: 3, diameterTop: 0, diameterBottom: 2.2, tessellation: 32 }, s) },
  { id: 'torus',        label: 'Torus',           build: s => MeshBuilder.CreateTorus('geo', { diameter: 3, thickness: 0.8, tessellation: 32 }, s) },
  { id: 'torusknot',    label: 'Torus Knot',      build: s => MeshBuilder.CreateTorusKnot('geo', { radius: 1.5, tube: 0.35, radialSegments: 128, tubularSegments: 32, p: 2, q: 3 }, s) },
  { id: 'icosphere',    label: 'Icosahedron',     build: s => MeshBuilder.CreateSphere('geo', { diameter: 2.5, segments: 1 }, s) },
  { id: 'capsule',      label: 'Capsule',         build: s => MeshBuilder.CreateCapsule('geo', { height: 3.5, radius: 0.9 }, s) },
  { id: 'plane',        label: 'Plane',           build: s => MeshBuilder.CreatePlane('geo', { width: 3, height: 3 }, s) },
  { id: 'dodecahedron', label: 'Dodecahedron',    build: s => MeshBuilder.CreatePolyhedron('geo', { type: 2, size: 1.3 }, s) },
  { id: 'tetrahedron',  label: 'Tetrahedron',     build: s => MeshBuilder.CreatePolyhedron('geo', { type: 0, size: 1.5 }, s) },
  { id: 'octahedron',   label: 'Octahedron',      build: s => MeshBuilder.CreatePolyhedron('geo', { type: 1, size: 1.5 }, s) },
];

export class GeometryLab {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._mesh = null;
    this._ui = null;
    this._infoEl = null;
    this._currentIdx = 0;
    this._t = 0;
  }

  show() {
    this._buildShape(this._currentIdx);
    this._buildUI();
  }

  hide() {
    this._mesh?.dispose();
    this._mesh = null;
    this._ui?.remove();
    this._ui = null;
  }

  _buildShape(idx) {
    if (this._mesh) {
      this.interaction.unregister(this._mesh);
      this._mesh.dispose();
    }
    this._currentIdx = idx;
    const shape = SHAPES[idx];
    this._mesh = shape.build(this.scene);

    const mat = new PBRMaterial('geoMat', this.scene);
    mat.albedoColor = new Color3(0.1, 0.5, 0.9);
    mat.metallic = 0.3;
    mat.roughness = 0.4;
    mat.emissiveColor = new Color3(0.02, 0.1, 0.25);
    this._mesh.material = mat;
    this._mesh.position = Vector3.Zero();

    this.interaction.register(this._mesh);
    this.env.highlight(this._mesh, new Color3(0.1, 0.6, 1));

    this._updateInfo(shape);
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom: 110px; display: flex; flex-direction: column; gap: 10px; padding: 16px 24px; max-width: 700px;';

    // Shape buttons
    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center';
    SHAPES.forEach((sh, i) => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn' + (i === this._currentIdx ? ' active' : '');
      btn.textContent = sh.label;
      btn.style.fontSize = '0.72rem';
      btn.addEventListener('click', () => {
        grid.querySelectorAll('button').forEach((b, j) => b.classList.toggle('active', j === i));
        this._buildShape(i);
      });
      grid.appendChild(btn);
    });
    wrap.appendChild(grid);

    // Wireframe toggle
    const wfRow = document.createElement('div');
    wfRow.style.cssText = 'display:flex;align-items:center;gap:10px;justify-content:center';
    const wfLabel = document.createElement('label');
    wfLabel.textContent = 'Wireframe';
    wfLabel.style.cssText = 'font-size:0.8rem;color:#7ba3cc';
    const wfChk = document.createElement('input');
    wfChk.type = 'checkbox';
    wfChk.style.accentColor = '#00d4ff';
    wfChk.addEventListener('change', () => {
      if (this._mesh?.material) this._mesh.material.wireframe = wfChk.checked;
    });
    wfRow.appendChild(wfLabel);
    wfRow.appendChild(wfChk);

    // Info
    this._infoEl = document.createElement('div');
    this._infoEl.style.cssText = 'font-size:0.78rem;color:#7ba3cc;text-align:center';

    wrap.appendChild(wfRow);
    wrap.appendChild(this._infoEl);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
    this._updateInfo(SHAPES[this._currentIdx]);
  }

  _updateInfo(shape) {
    if (!this._infoEl) return;
    const info = {
      sphere:       'V = (4/3)πr³ | A = 4πr²',
      cube:         'V = a³ | A = 6a²',
      cylinder:     'V = πr²h | A = 2πr(r+h)',
      cone:         'V = (1/3)πr²h | A = πr(r+l)',
      torus:        'V = 2π²Rr² | A = 4π²Rr',
      torusknot:    'Parametric surface — no closed form',
      icosphere:    '20 equilateral triangle faces',
      capsule:      'Cylinder + 2 hemispheres',
      plane:        '2D flat surface in 3D space',
      dodecahedron: '12 pentagonal faces | Platonic solid',
      tetrahedron:  '4 triangular faces | Platonic solid',
      octahedron:   '8 triangular faces | Platonic solid',
    };
    this._infoEl.textContent = info[shape.id] || '';
  }

  update(deltaTime) {
    if (!this._mesh) return;
    this._t += deltaTime * 0.0005;
    this._mesh.rotation.y = this._t;
    this._mesh.rotation.x = Math.sin(this._t * 0.4) * 0.15;
  }
}
