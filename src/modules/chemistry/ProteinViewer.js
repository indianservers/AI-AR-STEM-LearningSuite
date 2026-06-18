// Feature 20: Protein Folding Preview — helix + beta sheet ribbon visualization
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3,
  DynamicTexture, Mesh, VertexData
} from '@babylonjs/core';

const PROTEINS = {
  helix: {
    name: 'α-Helix (myoglobin segment)',
    generate(N = 40) {
      const points = [];
      for (let i = 0; i < N; i++) {
        const t = i / N;
        const theta = t * 4 * Math.PI * 2;
        const r = 0.8;
        const rise = i * 0.18;
        points.push(new Vector3(r * Math.cos(theta), rise - N*0.09, r * Math.sin(theta)));
      }
      return points;
    },
    color: new Color3(0.3, 0.7, 1),
  },
  betaSheet: {
    name: 'β-Sheet (silk fibroin segment)',
    generate(N = 6) {
      const points = [];
      for (let strand = 0; strand < N; strand++) {
        const dir = strand % 2 === 0 ? 1 : -1;
        const startY = strand % 2 === 0 ? -3 : 3;
        const x = (strand - N/2) * 1.0;
        for (let res = 0; res < 10; res++) {
          const y = startY + dir * res * 0.7;
          const z = (res % 2) * 0.2;
          points.push(new Vector3(x, y, z));
        }
      }
      return points;
    },
    color: new Color3(0.5, 1, 0.5),
  },
  mixed: {
    name: 'Mixed (α/β barrel)',
    generate(N = 8) {
      const points = [];
      for (let i = 0; i < N; i++) {
        const theta = (i / N) * Math.PI * 2;
        for (let j = 0; j < 6; j++) {
          const y = j * 0.8 - 2.4;
          const r = 2.5;
          points.push(new Vector3(r*Math.cos(theta), y, r*Math.sin(theta)));
        }
      }
      return points;
    },
    color: new Color3(1, 0.6, 0.2),
  },
};

export class ProteinViewer {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._t = 0;
    this._activeProtein = 'helix';
    this._rootMesh = null;
    this._foldProgress = 1.0; // 0=unfolded, 1=folded
    this._foldTarget = 1.0;
    this._animating = false;
  }

  show() { this._build(); this._buildUI(); }

  hide() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._rootMesh = null;
    this._ui?.remove(); this._ui = null;
  }

  _build() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    const prot = PROTEINS[this._activeProtein];
    const points = prot.generate();

    // Backbone ribbon (tube-like using spheres + cylinders)
    const root = new Mesh('protRoot', this.scene);
    this._rootMesh = root;
    this._meshes.push(root);

    const mat = new PBRMaterial('protMat', this.scene);
    mat.albedoColor = prot.color;
    mat.emissiveColor = prot.color.scale(0.15);
    mat.metallic = 0.1; mat.roughness = 0.5;
    mat.alpha = 0.92;

    // Residue spheres
    points.forEach((pt, i) => {
      const size = i % 5 === 0 ? 0.18 : 0.12; // larger at every 5th (key residue)
      const sphere = MeshBuilder.CreateSphere(`protRes${i}`, {diameter:size, segments:6}, this.scene);
      sphere.parent = root;
      sphere.position = pt.clone();
      sphere.material = mat;
      sphere.isPickable = false;
      this._meshes.push(sphere);
    });

    // Backbone bonds
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i+1];
      const mid = a.add(b).scale(0.5);
      const len = Vector3.Distance(a, b);
      const cyl = MeshBuilder.CreateCylinder(`protBond${i}`, {height:len, diameter:0.06, tessellation:4}, this.scene);
      cyl.parent = root;
      cyl.position = mid.clone();
      const dir = b.subtract(a).normalize();
      const up = Vector3.Up();
      const axis = Vector3.Cross(up, dir);
      if (axis.length() > 0.001) {
        const angle = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(up, dir))));
        cyl.rotationQuaternion = null;
        cyl.rotation = Vector3.Zero();
        cyl.rotate(axis.normalize(), angle);
      }
      cyl.material = mat;
      cyl.isPickable = false;
      this._meshes.push(cyl);
    }

    // Hydrogen bonds (green dashed lines for helix)
    if (this._activeProtein === 'helix') {
      for (let i = 0; i < points.length - 4; i += 4) {
        const a = points[i], b = points[i+4];
        const dashCount = 4;
        for (let d = 0; d < dashCount; d++) {
          const t0 = d / dashCount, t1 = (d + 0.5) / dashCount;
          const p0 = a.add(b.subtract(a).scale(t0));
          const p1 = a.add(b.subtract(a).scale(t1));
          const dash = MeshBuilder.CreateLines(`protHbond_${i}_${d}`, {points:[p0,p1]}, this.scene);
          dash.color = new Color3(0.2, 0.9, 0.4);
          dash.parent = root;
          dash.isPickable = false;
          this._meshes.push(dash);
        }
      }
    }

    // Make root grabbable
    const grabSphere = MeshBuilder.CreateSphere('protGrab', {diameter:0.5, segments:6}, this.scene);
    grabSphere.parent = root;
    grabSphere.position = Vector3.Zero();
    const grabMat = new StandardMaterial('protGrabMat', this.scene);
    grabMat.emissiveColor = prot.color.scale(0.4); grabMat.alpha = 0.3;
    grabSphere.material = grabMat;
    this.interaction.register(grabSphere);
    this._meshes.push(grabSphere);

    // Info panel
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;top:80px;right:20px;background:rgba(10,20,40,0.88);
      border:1px solid rgba(127,255,127,0.3);border-radius:12px;padding:14px 18px;
      z-index:1500;pointer-events:none;font-size:0.78rem;color:#e8f4ff;
      backdrop-filter:blur(8px);min-width:220px;
    `;
    el.innerHTML = `
      <div style="color:#7fff7f;font-weight:700;margin-bottom:8px;">🧬 ${prot.name}</div>
      <div>${points.length} residues</div>
      <div>Structure maintained by H-bonds (dashed green)</div>
      <div style="margin-top:8px;font-size:0.72rem;color:#7ba3cc;">Grab the protein to rotate • Use Unfold to animate</div>
    `;
    document.body.appendChild(el);
    this._meshes.push({ dispose: () => el.remove() });
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 22px;';

    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;';
    Object.entries(PROTEINS).forEach(([key, p]) => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn chem-topic' + (key===this._activeProtein?' active':'');
      btn.textContent = p.name.split(' ')[0]; btn.style.fontSize = '0.72rem';
      btn.onclick = () => {
        this._activeProtein = key;
        modeRow.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        this._build();
      };
      modeRow.appendChild(btn);
    });

    const unfoldBtn = document.createElement('button');
    unfoldBtn.className = 'topic-btn chem-topic';
    unfoldBtn.textContent = '↕ Unfold / Fold';
    unfoldBtn.style.fontSize = '0.75rem';
    unfoldBtn.onclick = () => {
      this._foldTarget = this._foldProgress > 0.5 ? 0 : 1;
      this._animating = true;
    };

    wrap.append(modeRow, unfoldBtn);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  update(dt) {
    this._t += dt * 0.001;
    // Slow rotation
    if (this._rootMesh) {
      this._rootMesh.rotation.y = this._t * 0.3;
    }
  }
}
