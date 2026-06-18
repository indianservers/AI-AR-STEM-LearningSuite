import {
  MeshBuilder,
  Vector3,
  Color3,
  Color4,
  StandardMaterial,
  DynamicTexture,
  Mesh,
  VertexData,
} from '@babylonjs/core';

const N_BEADS = 30;
const BEAD_TYPES = [
  { name: 'nonpolar',   color: new Color3(1.0, 0.55, 0.0)  },
  { name: 'polar',      color: new Color3(0.0, 0.85, 0.85) },
  { name: 'charged+',  color: new Color3(0.9, 0.1, 0.1)   },
  { name: 'charged-',  color: new Color3(0.1, 0.2, 0.9)   },
  { name: 'aromatic',  color: new Color3(0.7, 0.1, 0.9)   },
];

function nativePos(i) {
  const angle = (i * 100 * Math.PI) / 180;
  return new Vector3(Math.cos(angle) * 1.5, i * 0.35 - 5, Math.sin(angle) * 1.5);
}

function extendedPos(i) {
  return new Vector3(-7.25 + i * 0.5, 0, 0);
}

export class ProteinFolding {
  constructor(scene, interaction, environment) {
    this._scene = scene;
    this._interaction = interaction;
    this._environment = environment;
    this._active = false;

    this._beadMeshes = [];
    this._beadPos = [];
    this._beadVel = [];
    this._beadMass = 1.0;

    this._lineMeshes = [];
    this._hbondMesh = null;

    this._root = null;
    this._domEl = null;
    this._energyBar = null;
    this._statusText = null;

    this._simSpeed = 1.0;
    this._refoldTimer = 0;
    this._accumTime = 0;
    this._DT_SIM = 0.0005;
    this._STEPS_PER_FRAME = 10;

    this._nativeContacts = [];
    this._precomputeNativeContacts();
  }

  _precomputeNativeContacts() {
    for (let i = 0; i < N_BEADS; i++) {
      for (let j = i + 4; j < N_BEADS; j++) {
        const pi = nativePos(i);
        const pj = nativePos(j);
        const d = Vector3.Distance(pi, pj);
        if (d < 2.5) {
          this._nativeContacts.push({ i, j, d });
        }
      }
    }
  }

  show() {
    if (this._active) return;
    this._active = true;

    this._root = new Mesh('pfRoot', this._scene);

    // Create bead meshes
    for (let i = 0; i < N_BEADS; i++) {
      const bead = MeshBuilder.CreateSphere(`bead_${i}`, { diameter: 0.4, segments: 8 }, this._scene);
      bead.parent = this._root;
      const mat = new StandardMaterial(`beadMat_${i}`, this._scene);
      const t = BEAD_TYPES[i % BEAD_TYPES.length];
      mat.diffuseColor = t.color;
      mat.emissiveColor = t.color.scale(0.3);
      bead.material = mat;
      this._beadMeshes.push(bead);
      this._beadPos.push(extendedPos(i).clone());
      this._beadVel.push(Vector3.Zero());
    }

    this._syncMeshPositions();
    this._buildDOM();
  }

  hide() {
    if (!this._active) return;
    this._active = false;

    if (this._root) { this._root.dispose(); this._root = null; }
    if (this._hbondMesh) { this._hbondMesh.dispose(); this._hbondMesh = null; }
    this._lineMeshes.forEach(l => l.dispose());
    this._lineMeshes = [];
    this._beadMeshes = [];
    this._beadPos = [];
    this._beadVel = [];

    if (this._domEl) { this._domEl.remove(); this._domEl = null; }
  }

  update(dt) {
    if (!this._active) return;

    if (this._refoldTimer > 0) this._refoldTimer -= dt;

    const dtSec = Math.min(dt / 1000, 0.05) * this._simSpeed;
    const dtSim = this._DT_SIM;
    const steps = this._STEPS_PER_FRAME;

    for (let s = 0; s < steps; s++) {
      this._stepSimulation(dtSim);
    }

    this._syncMeshPositions();
    this._updateHBonds();
    this._updateEnergyUI();
    this._checkHelixFormation();
  }

  _stepSimulation(dt) {
    const forces = Array.from({ length: N_BEADS }, () => Vector3.Zero());

    // Bond springs: adjacent beads, equilibrium 0.5
    for (let i = 0; i < N_BEADS - 1; i++) {
      const diff = this._beadPos[i + 1].subtract(this._beadPos[i]);
      const d = diff.length();
      if (d < 1e-6) continue;
      const fmag = 20 * (d - 0.5);
      const fdir = diff.normalize();
      forces[i].addInPlace(fdir.scale(fmag));
      forces[i + 1].addInPlace(fdir.scale(-fmag));
    }

    // Local angle constraint: prefer 60° for helix
    for (let i = 0; i < N_BEADS - 2; i++) {
      const a = this._beadPos[i];
      const b = this._beadPos[i + 1];
      const c = this._beadPos[i + 2];
      const ba = a.subtract(b);
      const bc = c.subtract(b);
      const lenBA = ba.length();
      const lenBC = bc.length();
      if (lenBA < 1e-6 || lenBC < 1e-6) continue;
      const cosA = Vector3.Dot(ba, bc) / (lenBA * lenBC);
      const clampedCos = Math.max(-1, Math.min(1, cosA));
      const angle = Math.acos(clampedCos);
      const target = (60 * Math.PI) / 180;
      const dAngle = angle - target;
      const fmag = 5 * dAngle;
      // Apply torque-like restoring force
      const axis = Vector3.Cross(ba, bc);
      if (axis.length() < 1e-6) continue;
      axis.normalizeInPlace();
      const fA = Vector3.Cross(axis, ba.normalize()).scale(-fmag / lenBA);
      const fC = Vector3.Cross(bc.normalize(), axis).scale(-fmag / lenBC);
      forces[i].addInPlace(fA);
      forces[i + 2].addInPlace(fC);
      forces[i + 1].subtractInPlace(fA.add(fC));
    }

    // Native contacts
    const refoldBoost = this._refoldTimer > 0 ? 5 : 1;
    for (const nc of this._nativeContacts) {
      const diff = this._beadPos[nc.j].subtract(this._beadPos[nc.i]);
      const d = diff.length();
      if (d < 1e-6) continue;
      const fmag = 2 * refoldBoost * (d - nc.d);
      const fdir = diff.normalize();
      forces[nc.i].addInPlace(fdir.scale(fmag));
      forces[nc.j].addInPlace(fdir.scale(-fmag));
    }

    // Excluded volume repulsion
    for (let i = 0; i < N_BEADS; i++) {
      for (let j = i + 2; j < N_BEADS; j++) {
        const diff = this._beadPos[j].subtract(this._beadPos[i]);
        const d = diff.length();
        if (d < 0.4 && d > 1e-6) {
          const fmag = 10 * (0.4 - d);
          const fdir = diff.normalize();
          forces[i].addInPlace(fdir.scale(-fmag));
          forces[j].addInPlace(fdir.scale(fmag));
        }
      }
    }

    // Integrate
    for (let i = 0; i < N_BEADS; i++) {
      const acc = forces[i].scale(1 / this._beadMass);
      this._beadVel[i].addInPlace(acc.scale(dt));
      this._beadVel[i].scaleInPlace(0.92);
      this._beadPos[i].addInPlace(this._beadVel[i].scale(dt));
    }
  }

  _syncMeshPositions() {
    for (let i = 0; i < N_BEADS; i++) {
      this._beadMeshes[i].position.copyFrom(this._beadPos[i]);
    }
  }

  _updateHBonds() {
    if (this._hbondMesh) { this._hbondMesh.dispose(); this._hbondMesh = null; }
    const points = [];
    for (let i = 0; i < N_BEADS - 4; i++) {
      const d = Vector3.Distance(this._beadPos[i], this._beadPos[i + 4]);
      if (d < 1.2) {
        const p1 = this._beadPos[i].clone();
        const p2 = this._beadPos[i + 4].clone();
        const mid = p1.add(p2).scale(0.5);
        // Dashed: p1 → mid-gap → mid → mid+gap → p2
        const dir = p2.subtract(p1).normalize();
        const segLen = d / 6;
        for (let seg = 0; seg < 3; seg++) {
          const start = p1.add(dir.scale(seg * 2 * segLen));
          const end = p1.add(dir.scale((seg * 2 + 1) * segLen));
          points.push([start, end]);
        }
      }
    }

    if (points.length > 0) {
      const allLines = points.map(pair =>
        MeshBuilder.CreateLines('hbond', { points: pair }, this._scene)
      );
      allLines.forEach(l => { l.color = new Color3(0.2, 1, 0.5); });
      // group under root
      allLines.forEach(l => { l.parent = this._root; });
      // Store all for disposal next frame
      this._hbondMesh = { dispose: () => allLines.forEach(l => l.dispose()) };
    }
  }

  _calcTotalEnergy() {
    let E = 0;
    for (let i = 0; i < N_BEADS - 1; i++) {
      const d = Vector3.Distance(this._beadPos[i], this._beadPos[i + 1]);
      E += 0.5 * 20 * (d - 0.5) ** 2;
    }
    for (const nc of this._nativeContacts) {
      const d = Vector3.Distance(this._beadPos[nc.i], this._beadPos[nc.j]);
      E += 0.5 * 2 * (d - nc.d) ** 2;
    }
    return E;
  }

  _checkHelixFormation() {
    if (!this._statusText) return;
    let helixCount = 0;
    for (let i = 0; i < N_BEADS - 4; i++) {
      const d = Vector3.Distance(this._beadPos[i], this._beadPos[i + 4]);
      if (d < 1.2) helixCount++;
    }
    if (helixCount > 10) {
      this._statusText.textContent = 'α-helix forming!';
      this._statusText.style.color = '#00ffaa';
    } else {
      this._statusText.textContent = 'Unfolded';
      this._statusText.style.color = '#aaccff';
    }
  }

  _updateEnergyUI() {
    if (!this._energyBar) return;
    const E = this._calcTotalEnergy();
    const maxE = 500;
    const pct = Math.min(100, (E / maxE) * 100);
    this._energyBar.style.width = `${pct}%`;
    const hue = Math.round(120 - (pct / 100) * 120);
    this._energyBar.style.background = `hsl(${hue},100%,50%)`;
    if (this._energyLabel) this._energyLabel.textContent = `Energy: ${E.toFixed(1)}`;
  }

  _buildDOM() {
    const el = document.createElement('div');
    el.id = 'proteinFoldingUI';
    el.style.cssText = `
      position:fixed; top:20px; right:20px; width:280px;
      background:rgba(10,20,40,0.92); border:1px solid rgba(0,212,255,0.3);
      border-radius:12px; color:#e8f4ff; padding:16px; z-index:2000;
      font-family:monospace; font-size:13px;
    `;

    el.innerHTML = `
      <div style="font-size:15px;font-weight:bold;margin-bottom:10px;color:#00d4ff">
        Protein Folding Simulator
      </div>
      <div style="margin-bottom:6px">
        <span id="pfStatus">Unfolded</span>
      </div>
      <div style="margin-bottom:8px">
        <div id="pfEnergyLabel" style="margin-bottom:3px">Energy: 0.0</div>
        <div style="background:rgba(255,255,255,0.1);border-radius:4px;height:14px;overflow:hidden">
          <div id="pfEnergyBar" style="height:100%;width:0%;background:hsl(120,100%,50%);transition:width 0.1s"></div>
        </div>
      </div>
      <div style="margin-bottom:8px">
        <label>Speed: <span id="pfSpeedVal">1.0x</span></label><br>
        <input id="pfSpeed" type="range" min="5" max="40" value="10"
          style="width:100%;margin-top:4px">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="pfUnfold" style="flex:1;padding:6px;background:rgba(0,150,255,0.3);
          border:1px solid rgba(0,212,255,0.5);border-radius:6px;color:#e8f4ff;cursor:pointer">
          Unfold
        </button>
        <button id="pfRefold" style="flex:1;padding:6px;background:rgba(0,255,150,0.2);
          border:1px solid rgba(0,255,150,0.4);border-radius:6px;color:#e8f4ff;cursor:pointer">
          Refold
        </button>
      </div>
      <div style="margin-top:10px;font-size:11px;color:rgba(200,220,255,0.6)">
        H-bonds shown in green dashes
      </div>
    `;
    document.body.appendChild(el);
    this._domEl = el;

    this._statusText = el.querySelector('#pfStatus');
    this._energyBar = el.querySelector('#pfEnergyBar');
    this._energyLabel = el.querySelector('#pfEnergyLabel');

    el.querySelector('#pfSpeed').addEventListener('input', (e) => {
      this._simSpeed = parseInt(e.target.value) / 10;
      el.querySelector('#pfSpeedVal').textContent = `${this._simSpeed.toFixed(1)}x`;
    });

    el.querySelector('#pfUnfold').addEventListener('click', () => {
      for (let i = 0; i < N_BEADS; i++) {
        this._beadPos[i].copyFrom(extendedPos(i));
        this._beadVel[i].setAll(0);
      }
    });

    el.querySelector('#pfRefold').addEventListener('click', () => {
      this._refoldTimer = 3000;
    });
  }
}
