import {
  MeshBuilder, StandardMaterial, Mesh, VertexData, Color3, Vector3
} from '@babylonjs/core';

// Probability density functions for orbitals (simplified radial)
const ORBITALS = [
  {
    id: '1s', label: '1s', color: new Color3(0.3, 0.6, 1),
    psi2: (x,y,z) => { const r=Math.sqrt(x*x+y*y+z*z); return Math.exp(-2*r)*4; },
    shape: 'sphere',
  },
  {
    id: '2s', label: '2s', color: new Color3(0.4, 0.8, 1),
    psi2: (x,y,z) => { const r=Math.sqrt(x*x+y*y+z*z); return Math.exp(-r)*Math.pow(2-r,2)*0.5; },
    shape: 'sphere',
  },
  {
    id: '2px', label: '2pₓ', color: new Color3(1, 0.3, 0.3),
    psi2: (x,y,z) => { const r=Math.sqrt(x*x+y*y+z*z); return x*x*Math.exp(-r)*2; },
    shape: 'dumbbell_x',
  },
  {
    id: '2py', label: '2pᵧ', color: new Color3(0.3, 1, 0.3),
    psi2: (x,y,z) => { const r=Math.sqrt(x*x+y*y+z*z); return y*y*Math.exp(-r)*2; },
    shape: 'dumbbell_y',
  },
  {
    id: '2pz', label: '2pz', color: new Color3(0.6, 0.6, 1),
    psi2: (x,y,z) => { const r=Math.sqrt(x*x+y*y+z*z); return z*z*Math.exp(-r)*2; },
    shape: 'dumbbell_z',
  },
  {
    id: '3dz2', label: '3d(z²)', color: new Color3(1, 0.8, 0.2),
    psi2: (x,y,z) => { const r=Math.sqrt(x*x+y*y+z*z); const cth=r>0?z/r:0; return Math.exp(-r)*(3*cth*cth-1)*(3*cth*cth-1)*0.3; },
    shape: 'complex',
  },
  {
    id: '3dxy', label: '3d(xy)', color: new Color3(1, 0.5, 0.9),
    psi2: (x,y,z) => { const r=Math.sqrt(x*x+y*y+z*z); return x*y*x*y*Math.exp(-r)*4; },
    shape: 'complex',
  },
];

export class OrbitalViewer {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._currentOrb = '1s';
    this._t = 0;
  }

  show() {
    this._buildOrbital(this._currentOrb);
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

  _buildOrbital(orbId) {
    this._clearMeshes();
    this._currentOrb = orbId;
    const orb = ORBITALS.find(o => o.id === orbId);
    if (!orb) return;

    // Isosurface via marching-squares approximation (simplified: render point cloud)
    const N = 22, range = 3.5, step = (range * 2) / N;
    const points = [], threshold = 0.05;
    const positions = [], indices = [], colors = [];
    let vi = 0;

    for (let ix = 0; ix <= N; ix++) {
      for (let iy = 0; iy <= N; iy++) {
        for (let iz = 0; iz <= N; iz++) {
          const x = -range + ix * step;
          const y = -range + iy * step;
          const z = -range + iz * step;
          const val = orb.psi2(x, y, z);
          if (val > threshold) {
            const s = 0.18;
            const base = vi * 8;
            // Tiny cube for each voxel
            [[-s,-s,-s],[ s,-s,-s],[ s, s,-s],[-s, s,-s],
             [-s,-s, s],[ s,-s, s],[ s, s, s],[-s, s, s]].forEach(([dx,dy,dz]) => {
              positions.push(x+dx, y+dy, z+dz);
              const t = Math.min(1, val * 2);
              colors.push(orb.color.r*t, orb.color.g*t, orb.color.b*t, t * 0.6);
            });
            const CUBE_FACES = [
              [0,1,2,0,2,3],[4,6,5,4,7,6],[0,4,5,0,5,1],
              [2,6,7,2,7,3],[0,3,7,0,7,4],[1,5,6,1,6,2]
            ];
            CUBE_FACES.forEach(fi => {
              fi.forEach(fj => indices.push(base + fj));
            });
            vi++;
          }
        }
      }
    }

    if (positions.length === 0) return;
    const normals = [];
    VertexData.ComputeNormals(positions, indices, normals);
    const vd = new VertexData();
    vd.positions = positions; vd.indices = indices; vd.normals = normals; vd.colors = colors;
    const mesh = new Mesh('orbital', this.scene);
    vd.applyToMesh(mesh);
    const mat = new StandardMaterial('orbMat', this.scene);
    mat.vertexColorsEnabled = true;
    mat.backFaceCulling = false;
    mat.alpha = 0.55;
    mesh.material = mat;
    mesh.isPickable = false;
    this._meshes.push(mesh);
    this._mainMesh = mesh;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center';
    ORBITALS.forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn chem-topic' + (o.id === this._currentOrb ? ' active' : '');
      btn.textContent = o.label;
      btn.style.color = `rgb(${Math.round(o.color.r*255)},${Math.round(o.color.g*255)},${Math.round(o.color.b*255)})`;
      btn.style.fontSize = '0.82rem';
      btn.addEventListener('click', () => {
        grid.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._buildOrbital(o.id);
      });
      grid.appendChild(btn);
    });

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:0.72rem;color:#4d7099;text-align:center';
    hint.textContent = 'Electron probability density cloud — brighter = more likely';

    wrap.append(grid, hint);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  update(deltaTime) {
    this._t += deltaTime * 0.001;
    if (this._mainMesh) {
      this._mainMesh.rotation.y = this._t * 0.3;
    }
  }
}
