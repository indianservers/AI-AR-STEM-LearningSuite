import {
  MeshBuilder,
  Vector3,
  Color3,
  StandardMaterial,
  Mesh,
  VertexData,
} from '@babylonjs/core';

const BASE_RADIUS = 1.5;
const SUBDIVISIONS = 4;
const BRUSH_RADIUS = 1.5;

function buildIcosphere(radius, subdivisions) {
  // Generate icosphere via Babylon helper then extract vertex data manually
  const tmp = MeshBuilder.CreateSphere('_tmpIco', {
    radius,
    segments: subdivisions * 2,
  });
  const positions = Array.from(tmp.getVerticesData('position'));
  const indices = Array.from(tmp.getIndices());
  const normals = Array.from(tmp.getVerticesData('normal'));
  const uvs = Array.from(tmp.getVerticesData('uv'));
  tmp.dispose();
  return { positions, indices, normals, uvs };
}

function computeNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3;
    const ax = positions[i1] - positions[i0], ay = positions[i1+1] - positions[i0+1], az = positions[i1+2] - positions[i0+2];
    const bx = positions[i2] - positions[i0], by = positions[i2+1] - positions[i0+1], bz = positions[i2+2] - positions[i0+2];
    const nx = ay*bz - az*by, ny = az*bx - ax*bz, nz = ax*by - ay*bx;
    for (const vi of [indices[i], indices[i+1], indices[i+2]]) {
      normals[vi*3]   += nx;
      normals[vi*3+1] += ny;
      normals[vi*3+2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.sqrt(normals[i]**2 + normals[i+1]**2 + normals[i+2]**2) || 1;
    normals[i] /= len; normals[i+1] /= len; normals[i+2] /= len;
  }
  return normals;
}

export class BimanualSculpting {
  constructor(scene, gestureEngine) {
    this._scene = scene;
    this._ge = gestureEngine;
    this._active = false;
    this._sculptMode = false;

    this._mesh = null;
    this._positions = null;
    this._originalPositions = null;
    this._indices = null;
    this._uvs = null;
    this._vertexCount = 0;

    this._cursorL = null;
    this._cursorR = null;

    this._domEl = null;
    this._statusBadge = null;
    this._prevGestureL = null;
    this._prevGestureR = null;
  }

  activate() {
    if (this._active) return;
    this._active = true;

    const icoData = buildIcosphere(BASE_RADIUS, SUBDIVISIONS);
    this._positions = new Float32Array(icoData.positions);
    this._originalPositions = new Float32Array(icoData.positions);
    this._indices = icoData.indices;
    this._uvs = icoData.uvs;
    this._vertexCount = this._positions.length / 3;

    this._mesh = new Mesh('sculptMesh', this._scene);
    this._applyVertexData();

    const mat = new StandardMaterial('sculptMat', this._scene);
    mat.diffuseColor = new Color3(0.3, 0.7, 1.0);
    mat.emissiveColor = new Color3(0.05, 0.15, 0.25);
    mat.wireframe = false;
    this._mesh.material = mat;

    // Cursor rings
    this._cursorL = MeshBuilder.CreateTorus('cursorL', { diameter: 0.3, thickness: 0.02, tessellation: 24 }, this._scene);
    this._cursorR = MeshBuilder.CreateTorus('cursorR', { diameter: 0.3, thickness: 0.02, tessellation: 24 }, this._scene);
    const cMatL = new StandardMaterial('cMatL', this._scene);
    cMatL.diffuseColor = new Color3(0, 1, 0.8);
    cMatL.emissiveColor = new Color3(0, 0.5, 0.4);
    this._cursorL.material = cMatL;
    const cMatR = new StandardMaterial('cMatR', this._scene);
    cMatR.diffuseColor = new Color3(1, 0.5, 0);
    cMatR.emissiveColor = new Color3(0.5, 0.25, 0);
    this._cursorR.material = cMatR;
    this._cursorL.isPickable = false;
    this._cursorR.isPickable = false;

    this._buildDOM();
  }

  deactivate() {
    if (!this._active) return;
    this._active = false;
    if (this._mesh) { this._mesh.dispose(); this._mesh = null; }
    if (this._cursorL) { this._cursorL.dispose(); this._cursorL = null; }
    if (this._cursorR) { this._cursorR.dispose(); this._cursorR = null; }
    if (this._domEl) { this._domEl.remove(); this._domEl = null; }
  }

  _applyVertexData() {
    const normals = computeNormals(this._positions, this._indices);
    const vd = new VertexData();
    vd.positions = this._positions;
    vd.indices = this._indices;
    vd.normals = normals;
    vd.uvs = this._uvs;
    vd.applyToMesh(this._mesh, true);
  }

  update(camera, canvas, dt) {
    if (!this._active) return;

    let posL = null, posR = null;
    let gestureL = null, gestureR = null;

    if (this._ge) {
      posL = this._ge.toWorldPosition ? this._ge.toWorldPosition(0) : null;
      posR = this._ge.toWorldPosition ? this._ge.toWorldPosition(1) : null;
      gestureL = this._ge.gesture ? this._ge.gesture[0] : null;
      gestureR = this._ge.gesture ? this._ge.gesture[1] : null;
    }

    if (posL && this._cursorL) this._cursorL.position.copyFrom(posL);
    if (posR && this._cursorR) this._cursorR.position.copyFrom(posR);

    const bothPinch = gestureL === 'PINCH' && gestureR === 'PINCH';
    const oneOpenPalm = (gestureL === 'OPEN_PALM') !== (gestureR === 'OPEN_PALM');

    if (this._sculptMode && bothPinch && posL && posR) {
      this._sculptWithHands(posL, posR, dt);
    } else if (oneOpenPalm) {
      const smoothPos = gestureL === 'OPEN_PALM' ? posL : posR;
      if (smoothPos) this._smoothNearby(smoothPos);
    }

    this._prevGestureL = gestureL;
    this._prevGestureR = gestureR;
  }

  _sculptWithHands(posL, posR, dt) {
    const dtS = Math.min(dt / 1000, 0.05);
    let modified = false;

    for (let vi = 0; vi < this._vertexCount; vi++) {
      const vx = this._positions[vi * 3];
      const vy = this._positions[vi * 3 + 1];
      const vz = this._positions[vi * 3 + 2];
      const vp = new Vector3(vx, vy, vz);

      const dL = Vector3.Distance(vp, posL);
      const dR = Vector3.Distance(vp, posR);

      let fx = 0, fy = 0, fz = 0;
      let totalW = 0;

      for (const [cursor, d] of [[posL, dL], [posR, dR]]) {
        if (d < BRUSH_RADIUS && d > 1e-4) {
          const strength = 1 / (d * d);
          const dir = vp.subtract(cursor).normalize();
          // Pull toward cursor (negative = toward)
          const w = Math.max(0, 1 - d / BRUSH_RADIUS);
          fx -= dir.x * strength * w * dtS * 2;
          fy -= dir.y * strength * w * dtS * 2;
          fz -= dir.z * strength * w * dtS * 2;
          totalW += w;
        }
      }

      if (totalW > 0) {
        this._positions[vi * 3]     += fx;
        this._positions[vi * 3 + 1] += fy;
        this._positions[vi * 3 + 2] += fz;
        modified = true;
      }
    }

    if (modified) {
      this._applyVertexData();
      this._updateVertexCount();
    }
  }

  _smoothNearby(center) {
    const SMOOTH_R = 1.5;
    const touched = [];
    for (let vi = 0; vi < this._vertexCount; vi++) {
      const vp = new Vector3(
        this._positions[vi * 3],
        this._positions[vi * 3 + 1],
        this._positions[vi * 3 + 2]
      );
      if (Vector3.Distance(vp, center) < SMOOTH_R) touched.push(vi);
    }

    for (const vi of touched) {
      let sx = 0, sy = 0, sz = 0, cnt = 0;
      const vp = new Vector3(this._positions[vi*3], this._positions[vi*3+1], this._positions[vi*3+2]);
      for (const vj of touched) {
        if (vj === vi) continue;
        const d = Vector3.Distance(vp, new Vector3(this._positions[vj*3], this._positions[vj*3+1], this._positions[vj*3+2]));
        if (d < 0.6) {
          sx += this._positions[vj * 3];
          sy += this._positions[vj * 3 + 1];
          sz += this._positions[vj * 3 + 2];
          cnt++;
        }
      }
      if (cnt > 0) {
        this._positions[vi*3]   = this._positions[vi*3]   * 0.7 + (sx/cnt) * 0.3;
        this._positions[vi*3+1] = this._positions[vi*3+1] * 0.7 + (sy/cnt) * 0.3;
        this._positions[vi*3+2] = this._positions[vi*3+2] * 0.7 + (sz/cnt) * 0.3;
      }
    }

    this._applyVertexData();
  }

  _smoothAll() {
    this._smoothNearby(new Vector3(0, 0, 0));
    for (let pass = 0; pass < 3; pass++) {
      for (let vi = 0; vi < this._vertexCount; vi++) {
        let sx = 0, sy = 0, sz = 0, cnt = 0;
        const vp = new Vector3(this._positions[vi*3], this._positions[vi*3+1], this._positions[vi*3+2]);
        for (let vj = 0; vj < this._vertexCount; vj++) {
          if (vj === vi) continue;
          const d = Vector3.Distance(vp, new Vector3(this._positions[vj*3], this._positions[vj*3+1], this._positions[vj*3+2]));
          if (d < 0.5) { sx += this._positions[vj*3]; sy += this._positions[vj*3+1]; sz += this._positions[vj*3+2]; cnt++; }
        }
        if (cnt > 0) {
          this._positions[vi*3]   = this._positions[vi*3]   * 0.5 + (sx/cnt) * 0.5;
          this._positions[vi*3+1] = this._positions[vi*3+1] * 0.5 + (sy/cnt) * 0.5;
          this._positions[vi*3+2] = this._positions[vi*3+2] * 0.5 + (sz/cnt) * 0.5;
        }
      }
    }
    this._applyVertexData();
  }

  _resetShape() {
    this._positions = new Float32Array(this._originalPositions);
    this._applyVertexData();
  }

  _exportShape() {
    const data = {
      positions: Array.from(this._positions),
      indices: Array.from(this._indices),
      vertexCount: this._vertexCount,
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sculpted_shape.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  _updateVertexCount() {
    if (this._vcLabel) this._vcLabel.textContent = `Vertices: ${this._vertexCount}`;
  }

  _buildDOM() {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; top:20px; left:20px; width:240px;
      background:rgba(10,20,40,0.92); border:1px solid rgba(0,212,255,0.3);
      border-radius:12px; color:#e8f4ff; padding:14px; z-index:2000;
      font-family:monospace; font-size:13px;
    `;
    el.innerHTML = `
      <div style="font-size:15px;font-weight:bold;color:#00d4ff;margin-bottom:10px">
        Bimanual Sculpting
      </div>
      <div id="bsStatusBadge" style="margin-bottom:8px;color:#aaddff">
        Sculpting: OFF
      </div>
      <div id="bsVcLabel" style="margin-bottom:10px;font-size:11px;color:rgba(200,220,255,0.6)">
        Vertices: 0
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <button id="bsToggle" style="padding:6px;background:rgba(0,150,255,0.3);
          border:1px solid rgba(0,212,255,0.5);border-radius:6px;color:#e8f4ff;cursor:pointer">
          Sculpt ON
        </button>
        <button id="bsReset" style="padding:6px;background:rgba(255,100,0,0.3);
          border:1px solid rgba(255,150,0,0.5);border-radius:6px;color:#e8f4ff;cursor:pointer">
          Reset Shape
        </button>
        <button id="bsSmooth" style="padding:6px;background:rgba(100,255,100,0.2);
          border:1px solid rgba(100,255,100,0.4);border-radius:6px;color:#e8f4ff;cursor:pointer">
          Smooth All
        </button>
        <button id="bsExport" style="padding:6px;background:rgba(200,200,0,0.2);
          border:1px solid rgba(255,255,0,0.4);border-radius:6px;color:#e8f4ff;cursor:pointer">
          Export Shape
        </button>
      </div>
      <div style="margin-top:10px;font-size:11px;color:rgba(200,220,255,0.5)">
        Both PINCH = sculpt | OPEN_PALM = smooth
      </div>
    `;
    document.body.appendChild(el);
    this._domEl = el;
    this._statusBadge = el.querySelector('#bsStatusBadge');
    this._vcLabel = el.querySelector('#bsVcLabel');

    el.querySelector('#bsToggle').addEventListener('click', () => {
      this._sculptMode = !this._sculptMode;
      el.querySelector('#bsToggle').textContent = this._sculptMode ? 'Sculpt OFF' : 'Sculpt ON';
      this._statusBadge.textContent = `Sculpting: ${this._sculptMode ? 'ON' : 'OFF'}`;
      this._statusBadge.style.color = this._sculptMode ? '#00ffaa' : '#aaddff';
    });

    el.querySelector('#bsReset').addEventListener('click', () => this._resetShape());
    el.querySelector('#bsSmooth').addEventListener('click', () => this._smoothAll());
    el.querySelector('#bsExport').addEventListener('click', () => this._exportShape());

    this._updateVertexCount();
  }
}
