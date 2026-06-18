/**
 * ARBodyScaleAtom.js
 * AR Body-Scale Atom — room-scale atom (nucleus at floor, shells to ceiling).
 * FEATURE CLASS INTERFACE: activate(), deactivate(), update(camera, canvas, dt)
 */

import {
  MeshBuilder,
  Vector3,
  Color3,
  Color4,
  StandardMaterial,
  DynamicTexture,
  GlowLayer,
  Mesh
} from '@babylonjs/core';

// ── Element data ──────────────────────────────────────────────────────────────
const ELEMENTS = {
  H:  { symbol:'H',  name:'Hydrogen',  protons:1,  neutrons:0,  shells:[1] },
  He: { symbol:'He', name:'Helium',    protons:2,  neutrons:2,  shells:[2] },
  C:  { symbol:'C',  name:'Carbon',    protons:6,  neutrons:6,  shells:[2,4] },
  N:  { symbol:'N',  name:'Nitrogen',  protons:7,  neutrons:7,  shells:[2,5] },
  O:  { symbol:'O',  name:'Oxygen',    protons:8,  neutrons:8,  shells:[2,6] },
  Na: { symbol:'Na', name:'Sodium',    protons:11, neutrons:12, shells:[2,8,1] },
  Fe: { symbol:'Fe', name:'Iron',      protons:26, neutrons:30, shells:[2,8,14,2] },
  Au: { symbol:'Au', name:'Gold',      protons:79, neutrons:118,shells:[2,8,18,32,18,1] }
};

const SHELL_Y        = [1.5, 3.0, 4.5, 6.0, 7.5, 8.5]; // Y per shell
const SHELL_RADIUS   = [2.0, 3.5, 4.5, 6.0, 7.0, 7.5]; // torus radius
const ORBIT_SPEED    = [1.8, 1.0, 0.6, 0.35, 0.22, 0.15]; // rad/s
const PROTON_COLOR   = new Color3(1.0, 0.2, 0.2);
const NEUTRON_COLOR  = new Color3(0.2, 0.4, 1.0);
const ELECTRON_COLOR = new Color3(0.0, 1.0, 0.85);

// ── Icosahedral-inspired close-pack offsets for nucleus ─────────────────────
function nucleonPositions(count) {
  const positions = [];
  const r = 0.22; // spacing
  if (count === 0) return positions;

  // Shell 0: 1 central
  // Shell 1: up to 12 (icosahedral)
  // Shell 2: up to 42 etc.
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
  for (let i = 0; i < count; i++) {
    const theta = phi * i;
    const y = 1 - (i / (count - 1 || 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    positions.push(new Vector3(x * r, y * r, z * r));
  }
  return positions;
}

export class ARBodyScaleAtom {
  constructor(scene) {
    this._scene         = scene;
    this._active        = false;
    this._element       = 'C';

    // Mesh containers
    this._nucleonMeshes  = [];
    this._shellTori      = [];
    this._electronMeshes = []; // array of arrays (per shell)
    this._electronAngles = []; // current angle per electron
    this._scaleLabel     = null;
    this._scaleLabelTex  = null;

    this._glowLayer = null;
    this._panel     = null;
    this._observer  = null;
    this._t         = 0;
  }

  // ── activate ───────────────────────────────────────────────────────────────
  activate() {
    if (this._active) return;
    this._active = true;

    this._glowLayer = new GlowLayer('body_atom_glow', this._scene);
    this._glowLayer.intensity = 1.2;

    this._buildAtom(this._element);
    this._buildPanel();

    this._observer = this._scene.onBeforeRenderObservable.add(() => {
      this.update(
        this._scene.activeCamera,
        this._scene.getEngine().getRenderingCanvas(),
        this._scene.getEngine().getDeltaTime()
      );
    });
  }

  // ── deactivate ─────────────────────────────────────────────────────────────
  deactivate() {
    if (!this._active) return;
    this._active = false;

    if (this._observer) {
      this._scene.onBeforeRenderObservable.remove(this._observer);
      this._observer = null;
    }

    this._disposeAtom();

    if (this._glowLayer) { this._glowLayer.dispose(); this._glowLayer = null; }

    if (this._panel && this._panel.parentNode) {
      this._panel.parentNode.removeChild(this._panel);
    }
    this._panel = null;
  }

  // ── update ─────────────────────────────────────────────────────────────────
  update(camera, canvas, dt) {
    if (!this._active) return;
    const dtSec = dt * 0.001;
    this._t += dtSec;

    const el = ELEMENTS[this._element];

    // Animate electrons — orbit on their shells
    for (let s = 0; s < el.shells.length; s++) {
      const count   = el.shells[s];
      const speed   = ORBIT_SPEED[s] ?? 0.1;
      const radius  = SHELL_RADIUS[s] ?? 2.0;
      const shellY  = SHELL_Y[s] ?? 1.5;
      const angStep = (2 * Math.PI) / Math.max(count, 1);

      for (let e = 0; e < count; e++) {
        const mesh = this._electronMeshes[s]?.[e];
        if (!mesh) continue;

        const baseAngle  = angStep * e;
        const angle      = baseAngle + this._t * speed;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        mesh.position.set(x, shellY, z);
      }
    }

    // Nucleon vibration
    for (let i = 0; i < this._nucleonMeshes.length; i++) {
      const m   = this._nucleonMeshes[i];
      const amp = 0.008;
      const phase = i * 1.7;
      m.position.y += amp * Math.sin(this._t * 12 + phase);
      // keep centered on Y=0
      if (Math.abs(m.position.y) > 0.4) m.position.y *= 0.98;
    }
  }

  // ── private: build atom ────────────────────────────────────────────────────
  _buildAtom(elementKey) {
    this._disposeAtom();

    const el = ELEMENTS[elementKey];
    if (!el) return;

    this._buildNucleus(el);
    this._buildShells(el);
    this._buildScaleLabel(el);
  }

  _buildNucleus(el) {
    const total = el.protons + el.neutrons;
    const positions = nucleonPositions(total);

    for (let i = 0; i < total; i++) {
      const isProton = i < el.protons;
      const sphere = MeshBuilder.CreateSphere(
        `nucleon_${i}`,
        { diameter: 0.28, segments: 6 },
        this._scene
      );
      sphere.position.copyFrom(positions[i] || Vector3.Zero());
      sphere.isPickable = false;

      const mat = new StandardMaterial(`nucleon_mat_${i}`, this._scene);
      mat.diffuseColor  = isProton ? PROTON_COLOR  : NEUTRON_COLOR;
      mat.emissiveColor = isProton
        ? new Color3(0.4, 0.0, 0.0)
        : new Color3(0.0, 0.0, 0.3);
      sphere.material = mat;

      this._nucleonMeshes.push(sphere);
    }
  }

  _buildShells(el) {
    const TORUS_THICKNESS = 0.04;
    const TORUS_TESS      = 48;

    for (let s = 0; s < el.shells.length; s++) {
      const count   = el.shells[s];
      const radius  = SHELL_RADIUS[s] ?? 2.0;
      const shellY  = SHELL_Y[s] ?? 1.5;

      // Torus ring
      const torus = MeshBuilder.CreateTorus(
        `shell_torus_${s}`,
        { diameter: radius * 2, thickness: TORUS_THICKNESS, tessellation: TORUS_TESS },
        this._scene
      );
      torus.position.y  = shellY;
      torus.rotation.x  = Math.PI / 2; // lay flat in XZ
      torus.isPickable  = false;

      const torusMat = new StandardMaterial(`shell_mat_${s}`, this._scene);
      torusMat.emissiveColor = new Color3(0.0, 0.5, 0.8);
      torusMat.alpha         = 0.25;
      torus.material = torusMat;

      this._shellTori.push(torus);

      // Electrons on this shell
      const electrons = [];
      const angStep   = (2 * Math.PI) / Math.max(count, 1);

      for (let e = 0; e < count; e++) {
        const electron = MeshBuilder.CreateSphere(
          `electron_${s}_${e}`,
          { diameter: 0.18, segments: 5 },
          this._scene
        );

        const angle = angStep * e;
        electron.position.set(
          Math.cos(angle) * radius,
          shellY,
          Math.sin(angle) * radius
        );
        electron.isPickable = false;

        const eMat = new StandardMaterial(`electron_mat_${s}_${e}`, this._scene);
        eMat.emissiveColor = ELECTRON_COLOR;
        eMat.diffuseColor  = ELECTRON_COLOR;
        electron.material  = eMat;

        if (this._glowLayer) this._glowLayer.addIncludedOnlyMesh(electron);

        electrons.push(electron);
      }
      this._electronMeshes.push(electrons);
    }
  }

  _buildScaleLabel(el) {
    const W = 512, H = 96;
    this._scaleLabelTex = new DynamicTexture(
      'atom_scale_tex', { width: W, height: H }, this._scene
    );
    this._scaleLabelTex.hasAlpha = true;

    const ctx = this._scaleLabelTex.getContext();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(10,20,40,0.88)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(4, 4, W - 8, H - 8, 14);
    else ctx.rect(4, 4, W - 8, H - 8);
    ctx.fill();
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `If nucleus = basketball → K shell ≈ 100m away`,
      W / 2, H / 2 + 6
    );
    this._scaleLabelTex.update();

    this._scaleLabel = MeshBuilder.CreatePlane('atom_scale_label', { width: 3.0, height: 0.55 }, this._scene);
    this._scaleLabel.position.set(0, -0.4, 0);
    this._scaleLabel.rotation.x = -Math.PI / 2; // face up
    this._scaleLabel.isPickable = false;

    const mat = new StandardMaterial('atom_scale_label_mat', this._scene);
    mat.diffuseTexture  = this._scaleLabelTex;
    mat.emissiveTexture = this._scaleLabelTex;
    mat.opacityTexture  = this._scaleLabelTex;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    this._scaleLabel.material = mat;
  }

  // ── private: dispose atom ─────────────────────────────────────────────────
  _disposeAtom() {
    for (const m of this._nucleonMeshes) m.dispose();
    this._nucleonMeshes = [];

    for (const t of this._shellTori) t.dispose();
    this._shellTori = [];

    for (const shellElectrons of this._electronMeshes) {
      for (const e of shellElectrons) e.dispose();
    }
    this._electronMeshes = [];

    if (this._scaleLabel)    { this._scaleLabel.dispose();    this._scaleLabel    = null; }
    if (this._scaleLabelTex) { this._scaleLabelTex.dispose(); this._scaleLabelTex = null; }
  }

  // ── private: panel ─────────────────────────────────────────────────────────
  _buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'ar-body-atom-panel';
    Object.assign(panel.style, {
      position:     'fixed',
      bottom:       '20px',
      left:         '50%',
      transform:    'translateX(-50%)',
      background:   'rgba(10,20,40,0.92)',
      border:       '1px solid rgba(0,212,255,0.3)',
      borderRadius: '12px',
      color:        '#e8f4ff',
      padding:      '12px 20px',
      zIndex:       '2000',
      fontFamily:   'sans-serif',
      userSelect:   'none',
      display:      'flex',
      flexDirection:'column',
      alignItems:   'center',
      gap:          '8px'
    });

    const title = document.createElement('div');
    title.textContent = 'Body-Scale Atom';
    Object.assign(title.style, { fontWeight: 'bold', color: '#00d4ff', fontSize: '15px' });
    panel.appendChild(title);

    // Element info display
    this._elemInfo = document.createElement('div');
    this._elemInfo.style.fontSize = '13px';
    this._elemInfo.style.opacity  = '0.85';
    panel.appendChild(this._elemInfo);
    this._updateElemInfo();

    // Element buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;';

    Object.keys(ELEMENTS).forEach(sym => {
      const btn = document.createElement('button');
      btn.textContent = sym;
      const isActive = sym === this._element;
      Object.assign(btn.style, {
        padding:      '6px 12px',
        cursor:       'pointer',
        borderRadius: '8px',
        background:   isActive ? 'rgba(0,150,255,0.7)' : 'rgba(0,40,80,0.7)',
        color:        '#e8f4ff',
        border:       '1px solid rgba(0,212,255,0.3)',
        fontSize:     '14px',
        fontWeight:   'bold'
      });
      btn.addEventListener('click', () => {
        this._element = sym;
        btnRow.querySelectorAll('button').forEach(b => {
          b.style.background = b.textContent === sym
            ? 'rgba(0,150,255,0.7)' : 'rgba(0,40,80,0.7)';
        });
        this._buildAtom(sym);
        this._updateElemInfo();
      });
      btnRow.appendChild(btn);
    });

    panel.appendChild(btnRow);
    document.body.appendChild(panel);
    this._panel = panel;
  }

  _updateElemInfo() {
    if (!this._elemInfo) return;
    const el = ELEMENTS[this._element];
    if (!el) return;
    this._elemInfo.textContent =
      `${el.name} | ${el.protons}p ${el.neutrons}n | shells: [${el.shells.join(', ')}]`;
  }
}
