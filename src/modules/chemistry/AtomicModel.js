import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Vector3,
  ParticleSystem, DynamicTexture
} from '@babylonjs/core';
import { ELEMENTS } from '../../data/elements.js';

const SHELL_CONFIG = [2, 8, 18, 32, 50, 72, 98];

function distributeElectrons(z) {
  const shells = [];
  let remaining = z;
  for (const cap of SHELL_CONFIG) {
    if (remaining <= 0) break;
    const n = Math.min(remaining, cap);
    shells.push(n);
    remaining -= n;
  }
  return shells;
}

export class AtomicModel {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._electronMeshes = [];
    this._ui = null;
    this._t = 0;
    this._z = 6; // Carbon default
    this._mode = 'bohr';
    this._shells = [];
    this._electronAngles = [];
  }

  show() {
    this._buildAtom(this._z);
    this._buildUI();
  }

  hide() {
    this._clearMeshes();
    this._ui?.remove();
    this._ui = null;
  }

  _clearMeshes() {
    this._meshes.forEach(m => m.dispose());
    this._electronMeshes.forEach(m => m.dispose());
    this._meshes = [];
    this._electronMeshes = [];
    this._shells = [];
    this._electronAngles = [];
  }

  _buildAtom(z) {
    this._clearMeshes();
    this._z = z;
    const el = ELEMENTS[z - 1];
    const shells = distributeElectrons(z);
    this._shells = shells;
    this._electronAngles = shells.map(n => Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2));

    // Nucleus
    const nucleusR = 0.3 + Math.log(z + 1) * 0.12;
    const nucleus = MeshBuilder.CreateSphere('nucleus', { diameter: nucleusR * 2, segments: 16 }, this.scene);
    const nmat = new PBRMaterial('nucMat', this.scene);
    nmat.albedoColor = new Color3(1, 0.6, 0.1);
    nmat.emissiveColor = new Color3(0.4, 0.15, 0);
    nmat.metallic = 0.3;
    nucleus.material = nmat;
    nucleus.isPickable = false;
    this.env.glowLayer?.addIncludedOnlyMesh(nucleus);
    this._meshes.push(nucleus);

    // Electron shells
    shells.forEach((n, si) => {
      const radius = 1.5 + si * 1.2;

      // Shell orbit ring
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        pts.push(new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      const ring = MeshBuilder.CreateLines(`shell_${si}`, { points: pts }, this.scene);
      ring.color = new Color3(0.1 + si * 0.12, 0.3, 0.7 - si * 0.05);
      ring.alpha = 0.4;
      ring.isPickable = false;
      this._meshes.push(ring);

      // Electrons
      this._electronAngles[si].forEach((angle, ei) => {
        const electron = MeshBuilder.CreateSphere(`e_${si}_${ei}`, { diameter: 0.15, segments: 6 }, this.scene);
        electron.position = new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        const emat = new StandardMaterial(`eMat_${si}_${ei}`, this.scene);
        emat.emissiveColor = new Color3(0.2, 0.6, 1);
        emat.disableLighting = true;
        electron.material = emat;
        electron.isPickable = false;
        this._electronMeshes.push({ mesh: electron, shell: si, idx: ei, radius, baseAngle: angle });
        this._meshes.push(electron);
      });
    });

    // Quantum orbital clouds (if mode = quantum)
    if (this._mode === 'quantum') this._buildOrbitals(z);

    if (this._infoEl) {
      this._infoEl.innerHTML = `<b>${el.sym} — ${el.name}</b><br>Z=${z} | Shells: [${shells.join(', ')}]`;
    }
  }

  _buildOrbitals(z) {
    // s orbital (sphere cloud)
    const s = MeshBuilder.CreateSphere('sOrb', { diameter: 2.5, segments: 8 }, this.scene);
    const smat = new StandardMaterial('sOrbMat', this.scene);
    smat.emissiveColor = new Color3(0.2, 0.4, 0.9);
    smat.alpha = 0.12;
    smat.backFaceCulling = false;
    s.material = smat;
    s.isPickable = false;
    this._meshes.push(s);

    if (z > 2) {
      // p orbital dumbbells on x/y/z axes
      [new Vector3(1,0,0), new Vector3(0,1,0), new Vector3(0,0,1)].forEach((ax, i) => {
        [-1,1].forEach(dir => {
          const lobe = MeshBuilder.CreateSphere(`pOrb_${i}_${dir}`, {
            diameter: 1.8, segments: 8,
          }, this.scene);
          lobe.position = ax.scale(dir * 1.1);
          lobe.scaling = new Vector3(0.5, 0.9, 0.5);
          const pmat = new StandardMaterial(`pOrbMat_${i}`, this.scene);
          const pColors = [new Color3(1,0.3,0.3), new Color3(0.3,1,0.3), new Color3(0.3,0.5,1)];
          pmat.emissiveColor = pColors[i];
          pmat.alpha = 0.12; pmat.backFaceCulling = false;
          lobe.material = pmat; lobe.isPickable = false;
          this._meshes.push(lobe);
        });
      });
    }
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px;min-width:340px';

    const sliderRow = document.createElement('div');
    sliderRow.style.cssText = 'display:flex;align-items:center;gap:10px';
    const lbl = document.createElement('label');
    lbl.textContent = 'Element (Z):';
    lbl.style.cssText = 'font-size:0.8rem;color:#7ba3cc';
    const sl = document.createElement('input');
    sl.type = 'range'; sl.min = 1; sl.max = 118; sl.value = this._z;
    sl.style.width = '150px'; sl.style.accentColor = '#7fff7f';
    const vl = document.createElement('span');
    vl.className = 'param-value'; vl.textContent = `${this._z} ${ELEMENTS[this._z-1].sym}`;
    sl.addEventListener('input', () => {
      this._z = parseInt(sl.value);
      vl.textContent = `${this._z} ${ELEMENTS[this._z-1].sym}`;
      this._buildAtom(this._z);
    });
    sliderRow.append(lbl, sl, vl);

    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:8px;justify-content:center';
    ['bohr', 'quantum'].forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn chem-topic' + (m === this._mode ? ' active' : '');
      btn.textContent = m === 'bohr' ? '🔵 Bohr Model' : '☁️ Quantum Orbitals';
      btn.style.fontSize = '0.76rem';
      btn.addEventListener('click', () => {
        modeRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._mode = m;
        this._buildAtom(this._z);
      });
      modeRow.appendChild(btn);
    });

    this._infoEl = document.createElement('div');
    this._infoEl.style.cssText = 'font-size:0.8rem;color:#7ba3cc;text-align:center';
    const el = ELEMENTS[this._z - 1];
    this._infoEl.innerHTML = `<b>${el.sym} — ${el.name}</b><br>Z=${this._z}`;

    wrap.append(sliderRow, modeRow, this._infoEl);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  update(deltaTime) {
    this._t += deltaTime * 0.001;
    this._electronMeshes.forEach(ed => {
      const speed = 0.5 + (1 / (ed.shell + 1)) * 1.5;
      const angle = ed.baseAngle + this._t * speed;
      ed.mesh.position = new Vector3(
        Math.cos(angle) * ed.radius,
        0,
        Math.sin(angle) * ed.radius
      );
    });
  }
}
