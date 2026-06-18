import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3, Mesh
} from '@babylonjs/core';
import { MOLECULES, CPK_COLORS, listMolecules } from '../../data/molecules.js';

const ATOM_RADII = { H:0.25, C:0.35, N:0.35, O:0.35, F:0.3, Cl:0.4, Br:0.45, I:0.5,
  S:0.4, P:0.4, Na:0.55, K:0.6, Ca:0.55, default:0.38 };

function hexToColor3(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  return new Color3(r,g,b);
}

export class MoleculeViewer {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._currentMol = 'water';
    this._displayMode = 'ball-stick'; // 'ball-stick' | 'space-fill' | 'wireframe'
    this._rootMesh = null;
    this._rotating = true;
    this._t = 0;
    this._infoEl = null;
  }

  show() {
    this._buildMolecule(this._currentMol);
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
    this._rootMesh = null;
  }

  _buildMolecule(molId) {
    this._clearMeshes();
    this._currentMol = molId;
    const mol = MOLECULES[molId];
    if (!mol) return;

    // Center molecule
    const cx = mol.atoms.reduce((s,a) => s+a.x, 0) / mol.atoms.length;
    const cy = mol.atoms.reduce((s,a) => s+a.y, 0) / mol.atoms.length;
    const cz = mol.atoms.reduce((s,a) => s+a.z, 0) / mol.atoms.length;
    const SCALE = 0.85;

    const atomMeshes = mol.atoms.map((atom, i) => {
      const hexColor = CPK_COLORS[atom.sym] || CPK_COLORS.default;
      const color = hexToColor3(hexColor);
      const r = this._displayMode === 'space-fill'
        ? (ATOM_RADII[atom.sym] || ATOM_RADII.default) * 2.2
        : (ATOM_RADII[atom.sym] || ATOM_RADII.default) * (atom.sym === 'H' ? 1.0 : 1.1);

      const sphere = MeshBuilder.CreateSphere(`atom_${i}`, { diameter: r * SCALE * 2, segments: 14 }, this.scene);
      sphere.position = new Vector3(
        (atom.x - cx) * SCALE, (atom.y - cy) * SCALE, (atom.z - cz) * SCALE
      );
      const mat = new PBRMaterial(`atomMat_${i}`, this.scene);
      mat.albedoColor = color;
      mat.emissiveColor = color.scale(0.12);
      mat.metallic = 0.1;
      mat.roughness = 0.5;
      sphere.material = mat;
      sphere.isPickable = false;
      if (this._displayMode === 'wireframe') { mat.wireframe = true; mat.alpha = 0.7; }
      this._meshes.push(sphere);
      return sphere;
    });

    // Bonds
    if (this._displayMode !== 'space-fill') {
      mol.bonds.forEach(([a, b, order]) => {
        const pa = atomMeshes[a].position;
        const pb = atomMeshes[b].position;
        const mid = pa.add(pb).scale(0.5);
        const len = Vector3.Distance(pa, pb);
        const offsets = order === 1 ? [0] : order === 2 ? [-0.06, 0.06] : [-0.1, 0, 0.1];
        offsets.forEach(off => {
          const cyl = MeshBuilder.CreateCylinder(`bond_${a}_${b}_${off}`, {
            height: len, diameter: this._displayMode === 'wireframe' ? 0.04 : 0.09,
            tessellation: 8,
          }, this.scene);
          cyl.position = mid.clone().add(new Vector3(off, 0, 0));
          const dir = pb.subtract(pa).normalize();
          const up = new Vector3(0, 1, 0);
          const axis = Vector3.Cross(up, dir).normalize();
          const angle = Math.acos(Math.min(1, Vector3.Dot(up, dir)));
          if (axis.length() > 0.001) cyl.rotate(axis, angle);
          const bmat = new StandardMaterial(`bondMat_${a}_${b}`, this.scene);
          bmat.emissiveColor = new Color3(0.7, 0.7, 0.7);
          if (this._displayMode === 'wireframe') { bmat.wireframe = true; bmat.alpha = 0.5; }
          cyl.material = bmat;
          cyl.isPickable = false;
          this._meshes.push(cyl);
        });
      });
    }

    // Root grab sphere (invisible, large)
    this._rootMesh = MeshBuilder.CreateSphere('molRoot', { diameter: 6 }, this.scene);
    this._rootMesh.position = Vector3.Zero();
    this._rootMesh.material = new StandardMaterial('molRootMat', this.scene);
    this._rootMesh.material.alpha = 0.001;
    this.interaction.register(this._rootMesh);
    this._meshes.push(this._rootMesh);

    if (this._infoEl) {
      this._infoEl.innerHTML = `<b>${mol.name}</b> (${mol.formula})<br>${mol.description}`;
    }
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px;max-width:720px';

    // Molecule selector
    const molGrid = document.createElement('div');
    molGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center';
    listMolecules().forEach(id => {
      const mol = MOLECULES[id];
      const btn = document.createElement('button');
      btn.className = 'topic-btn chem-topic' + (id === this._currentMol ? ' active' : '');
      btn.textContent = mol.formula;
      btn.title = mol.name;
      btn.style.fontSize = '0.75rem';
      btn.addEventListener('click', () => {
        molGrid.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._buildMolecule(id);
      });
      molGrid.appendChild(btn);
    });

    // Display mode
    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:8px;justify-content:center';
    ['ball-stick', 'space-fill', 'wireframe'].forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn chem-topic' + (m === this._displayMode ? ' active' : '');
      btn.textContent = { 'ball-stick': '⚫ Ball & Stick', 'space-fill': '🔵 Space Fill', wireframe: '⬡ Wireframe' }[m];
      btn.style.fontSize = '0.76rem';
      btn.addEventListener('click', () => {
        modeRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._displayMode = m;
        this._buildMolecule(this._currentMol);
      });
      modeRow.appendChild(btn);
    });

    this._infoEl = document.createElement('div');
    this._infoEl.style.cssText = 'font-size:0.8rem;color:#7ba3cc;text-align:center;line-height:1.5';

    const rotBtn = document.createElement('button');
    rotBtn.className = 'topic-btn chem-topic';
    rotBtn.textContent = '⏸ Pause Rotation';
    rotBtn.addEventListener('click', () => {
      this._rotating = !this._rotating;
      rotBtn.textContent = this._rotating ? '⏸ Pause Rotation' : '▶ Resume Rotation';
    });

    wrap.append(molGrid, modeRow, this._infoEl, rotBtn);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
    const mol = MOLECULES[this._currentMol];
    if (mol && this._infoEl) {
      this._infoEl.innerHTML = `<b>${mol.name}</b> (${mol.formula})<br>${mol.description}`;
    }
  }

  update(deltaTime) {
    this._t += deltaTime * 0.001;
    if (this._rotating) {
      this._meshes.forEach(m => {
        if (m !== this._rootMesh) {
          const orig = m._originalPos || m.position.clone();
          m._originalPos = orig;
          const x = orig.x * Math.cos(this._t * 0.4) - orig.z * Math.sin(this._t * 0.4);
          const z = orig.x * Math.sin(this._t * 0.4) + orig.z * Math.cos(this._t * 0.4);
          m.position = new Vector3(x, orig.y, z);
        }
      });
    }
  }
}
