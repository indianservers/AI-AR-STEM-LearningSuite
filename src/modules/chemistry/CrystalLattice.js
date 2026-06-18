import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3
} from '@babylonjs/core';

const LATTICE_TYPES = {
  nacl: {
    label: 'NaCl (Cubic)',
    desc: 'Face-centered cubic ionic lattice. Na⁺ and Cl⁻ alternate.',
    build: (scene, meshes, interaction) => {
      const SIZE = 3, SPACING = 1.5;
      const mats = {
        Na: null, Cl: null,
      };
      const naMat = new PBRMaterial('lNaMat', scene);
      naMat.albedoColor = new Color3(0.6, 0.3, 0.9); naMat.metallic = 0.1; naMat.roughness = 0.5;
      const clMat = new PBRMaterial('lClMat', scene);
      clMat.albedoColor = new Color3(0.1, 0.9, 0.1); clMat.metallic = 0.1; clMat.roughness = 0.5;
      for (let x = 0; x < SIZE; x++) for (let y = 0; y < SIZE; y++) for (let z = 0; z < SIZE; z++) {
        const isNa = (x + y + z) % 2 === 0;
        const sphere = MeshBuilder.CreateSphere(`lat_${x}_${y}_${z}`, { diameter: isNa ? 0.55 : 0.7, segments: 10 }, scene);
        sphere.position = new Vector3((x - 1) * SPACING, (y - 1) * SPACING, (z - 1) * SPACING);
        sphere.material = isNa ? naMat : clMat;
        sphere.isPickable = false;
        meshes.push(sphere);
        // Bond lines to neighbors
        if (x < SIZE - 1) {
          const l = MeshBuilder.CreateLines(`bond_x_${x}_${y}_${z}`, {
            points: [sphere.position, new Vector3((x) * SPACING, (y - 1) * SPACING, (z - 1) * SPACING)],
          }, scene);
          l.color = new Color3(0.4, 0.4, 0.5); l.alpha = 0.4; l.isPickable = false;
          meshes.push(l);
        }
      }
    },
  },
  diamond: {
    label: 'Diamond (Cubic)',
    desc: 'Tetrahedral covalent lattice. Each C bonded to 4 neighbors.',
    build: (scene, meshes) => {
      const positions = [
        [0,0,0],[2,2,0],[2,0,2],[0,2,2],[1,1,1],[3,3,1],[3,1,3],[1,3,3]
      ].map(p => new Vector3(p[0]-1.5, p[1]-1.5, p[2]-1.5));
      const bonds = [[0,1],[0,2],[0,3],[4,5],[4,6],[4,7],[0,4],[1,5],[2,6],[3,7]];
      const mat = new PBRMaterial('diamMat', scene);
      mat.albedoColor = new Color3(0.7, 0.9, 1); mat.metallic = 0.2; mat.roughness = 0.2;
      mat.alpha = 0.85;
      positions.forEach((pos, i) => {
        const s = MeshBuilder.CreateSphere(`diamAtom_${i}`, { diameter: 0.45, segments: 10 }, scene);
        s.position = pos; s.material = mat; s.isPickable = false;
        meshes.push(s);
      });
      bonds.forEach(([a, b]) => {
        const l = MeshBuilder.CreateLines(`diamBond_${a}_${b}`, { points: [positions[a], positions[b]] }, scene);
        l.color = new Color3(0.5, 0.8, 1); l.isPickable = false;
        meshes.push(l);
      });
    },
  },
  bcc: {
    label: 'BCC (Iron)',
    desc: 'Body-centered cubic — 1 atom at center, 8 at corners.',
    build: (scene, meshes) => {
      const r = 1.5;
      const positions = [
        new Vector3(-r,-r,-r),new Vector3(r,-r,-r),new Vector3(r,r,-r),new Vector3(-r,r,-r),
        new Vector3(-r,-r,r), new Vector3(r,-r,r), new Vector3(r,r,r), new Vector3(-r,r,r),
        new Vector3(0,0,0),
      ];
      const mat = new PBRMaterial('bccMat', scene);
      mat.albedoColor = new Color3(0.9, 0.6, 0.2); mat.metallic = 0.8; mat.roughness = 0.2;
      positions.forEach((pos, i) => {
        const s = MeshBuilder.CreateSphere(`bccAtom_${i}`, { diameter: i === 8 ? 0.7 : 0.55, segments: 10 }, scene);
        s.position = pos; s.material = mat; s.isPickable = false;
        meshes.push(s);
      });
      // Unit cell edges
      const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      edges.forEach(([a,b]) => {
        const l = MeshBuilder.CreateLines(`bccEdge_${a}_${b}`, { points: [positions[a], positions[b]] }, scene);
        l.color = new Color3(0.8, 0.5, 0.1); l.alpha = 0.4; l.isPickable = false;
        meshes.push(l);
      });
    },
  },
  fcc: {
    label: 'FCC (Copper)',
    desc: 'Face-centered cubic — 14 atoms: 8 corners + 6 face centers.',
    build: (scene, meshes) => {
      const r = 1.5;
      const corners = [
        [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
        [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],
      ].map(p => new Vector3(p[0]*r, p[1]*r, p[2]*r));
      const faces = [
        [0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],
      ].map(p => new Vector3(p[0]*r, p[1]*r, p[2]*r));
      const mat = new PBRMaterial('fccMat', scene);
      mat.albedoColor = new Color3(0.9, 0.7, 0.2); mat.metallic = 0.9; mat.roughness = 0.1;
      [...corners, ...faces].forEach((pos, i) => {
        const s = MeshBuilder.CreateSphere(`fccAtom_${i}`, { diameter: i >= 8 ? 0.65 : 0.5, segments: 10 }, scene);
        s.position = pos; s.material = mat; s.isPickable = false;
        meshes.push(s);
      });
    },
  },
};

export class CrystalLattice {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._type = 'nacl';
    this._t = 0;
  }

  show() {
    this._build(this._type);
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
  }

  _build(type) {
    this._clearMeshes();
    this._type = type;
    const def = LATTICE_TYPES[type];
    if (def) def.build(this.scene, this._meshes, this.interaction);
    if (this._descEl && def) this._descEl.textContent = def.desc;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center';
    Object.entries(LATTICE_TYPES).forEach(([id, def]) => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn chem-topic' + (id === this._type ? ' active' : '');
      btn.textContent = def.label;
      btn.style.fontSize = '0.76rem';
      btn.addEventListener('click', () => {
        row.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._build(id);
      });
      row.appendChild(btn);
    });

    this._descEl = document.createElement('div');
    this._descEl.style.cssText = 'font-size:0.76rem;color:#7ba3cc;text-align:center';
    this._descEl.textContent = LATTICE_TYPES[this._type]?.desc || '';

    wrap.append(row, this._descEl);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  update(deltaTime) {
    this._t += deltaTime * 0.001;
    this._meshes.forEach(m => {
      if (m.name.startsWith('lat_') || m.name.includes('Atom')) {
        m.rotation.y = this._t * 0.15;
        m.rotation.x = this._t * 0.08;
      }
    });
  }
}
