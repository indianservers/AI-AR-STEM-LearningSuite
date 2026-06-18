import {
  MeshBuilder,
  Vector3,
  Color3,
  Color4,
  StandardMaterial,
  HemisphericLight,
  GlowLayer
} from '@babylonjs/core';

export class TesseractViewer {
  constructor(scene, interaction, environment) {
    this._scene = scene;
    this._interaction = interaction;
    this._environment = environment;
    this._active = false;
    this._root = null;
    this._domEl = null;
    this._angleXW = 0;
    this._angleYZ = 0;
    this._speedMultiplier = 1.0;
    this._innerLines = null;
    this._outerLines = null;
    this._glowLayer = null;
    this._light = null;

    // 16 vertices: all (±1,±1,±1,±1)
    this._vertices4D = [];
    for (let i = 0; i < 16; i++) {
      this._vertices4D.push([
        (i & 1) ? 1 : -1,
        (i & 2) ? 1 : -1,
        (i & 4) ? 1 : -1,
        (i & 8) ? 1 : -1
      ]);
    }

    // 32 edges: vertices differing in exactly one coordinate
    this._edges = [];
    for (let a = 0; a < 16; a++) {
      for (let b = a + 1; b < 16; b++) {
        let diff = 0;
        for (let k = 0; k < 4; k++) {
          if (this._vertices4D[a][k] !== this._vertices4D[b][k]) diff++;
        }
        if (diff === 1) this._edges.push([a, b]);
      }
    }

    // Classify edges: inner (w=-1 for both) vs outer (w=+1 for both) vs connecting
    // For visual distinction: edges where both vertices have w=-1 = "inner", w=+1 = "outer", else "connecting"
    this._innerEdges = [];
    this._outerEdges = [];
    this._connectEdges = [];
    for (const [a, b] of this._edges) {
      const wa = this._vertices4D[a][3];
      const wb = this._vertices4D[b][3];
      if (wa === -1 && wb === -1) this._innerEdges.push([a, b]);
      else if (wa === 1 && wb === 1) this._outerEdges.push([a, b]);
      else this._connectEdges.push([a, b]);
    }
  }

  _rotate4D(vertices) {
    const cosXW = Math.cos(this._angleXW);
    const sinXW = Math.sin(this._angleXW);
    const cosYZ = Math.cos(this._angleYZ);
    const sinYZ = Math.sin(this._angleYZ);

    return vertices.map(([x, y, z, w]) => {
      // XW rotation
      const x2 = x * cosXW - w * sinXW;
      const w2 = x * sinXW + w * cosXW;
      // YZ rotation
      const y2 = y * cosYZ - z * sinYZ;
      const z2 = y * sinYZ + z * cosYZ;
      return [x2, y2, z2, w2];
    });
  }

  _project4Dto3D(v4) {
    // Perspective projection: distance factor w-component
    const [x, y, z, w] = v4;
    const d = 2 - w; // perspective distance
    const scale = 2;
    return new Vector3((x / d) * scale, (y / d) * scale, (z / d) * scale);
  }

  _buildLinePositions(edgeList, projected) {
    const positions = [];
    for (const [a, b] of edgeList) {
      const pa = projected[a];
      const pb = projected[b];
      positions.push(pa.x, pa.y, pa.z);
      positions.push(pb.x, pb.y, pb.z);
    }
    return positions;
  }

  _buildEdgeColors(edgeList, color) {
    const colors = [];
    for (let i = 0; i < edgeList.length; i++) {
      colors.push(color.r, color.g, color.b, color.a);
      colors.push(color.r, color.g, color.b, color.a);
    }
    return colors;
  }

  _computeProjected() {
    const rotated = this._rotate4D(this._vertices4D);
    return rotated.map(v => this._project4Dto3D(v));
  }

  show() {
    if (this._active) return;
    this._active = true;

    this._light = new HemisphericLight('tesseractLight', new Vector3(0, 1, 0), this._scene);
    this._light.intensity = 0.8;

    this._glowLayer = new GlowLayer('tesseractGlow', this._scene);
    this._glowLayer.intensity = 0.6;

    const projected = this._computeProjected();

    // Inner edges
    const innerPositions = this._buildLinePositions(this._innerEdges, projected);
    const innerColors = this._buildEdgeColors(this._innerEdges, { r: 0, g: 0.8, b: 1, a: 1 });
    this._innerLines = MeshBuilder.CreateLines('tesseractInner', {
      points: this._innerEdges.map(([a]) => projected[a]),
      updatable: true,
      useVertexAlpha: true
    }, this._scene);
    this._innerLines.color = new Color3(0, 0.8, 1);

    // Outer edges
    this._outerLines = MeshBuilder.CreateLines('tesseractOuter', {
      points: this._outerEdges.map(([a]) => projected[a]),
      updatable: true,
      useVertexAlpha: true
    }, this._scene);
    this._outerLines.color = new Color3(1, 0.5, 0.1);

    // Connecting edges
    this._connectLines = MeshBuilder.CreateLines('tesseractConnect', {
      points: this._connectEdges.map(([a]) => projected[a]),
      updatable: true,
      useVertexAlpha: true
    }, this._scene);
    this._connectLines.color = new Color3(0.6, 0.4, 0.9);

    this._rebuildLines(projected);
    this._buildDOM();
  }

  _rebuildLines(projected) {
    // Rebuild inner lines
    if (this._innerLines) {
      const pts = [];
      for (const [a, b] of this._innerEdges) {
        pts.push(projected[a]);
        pts.push(projected[b]);
      }
      // Interleave pairs as line segments using colors array
      this._innerLines = MeshBuilder.CreateLines('tesseractInner', {
        points: pts,
        instance: this._innerLines,
        useVertexAlpha: true,
        colors: this._innerEdges.flatMap(() => [
          new Color4(0, 0.8, 1, 1),
          new Color4(0, 0.8, 1, 1)
        ])
      });
    }

    if (this._outerLines) {
      const pts = [];
      for (const [a, b] of this._outerEdges) {
        pts.push(projected[a]);
        pts.push(projected[b]);
      }
      this._outerLines = MeshBuilder.CreateLines('tesseractOuter', {
        points: pts,
        instance: this._outerLines,
        useVertexAlpha: true,
        colors: this._outerEdges.flatMap(() => [
          new Color4(1, 0.5, 0.1, 1),
          new Color4(1, 0.5, 0.1, 1)
        ])
      });
    }

    if (this._connectLines) {
      const pts = [];
      for (const [a, b] of this._connectEdges) {
        pts.push(projected[a]);
        pts.push(projected[b]);
      }
      this._connectLines = MeshBuilder.CreateLines('tesseractConnect', {
        points: pts,
        instance: this._connectLines,
        useVertexAlpha: true,
        colors: this._connectEdges.flatMap(() => [
          new Color4(0.6, 0.4, 0.9, 0.8),
          new Color4(0.6, 0.4, 0.9, 0.8)
        ])
      });
    }
  }

  _buildDOM() {
    const el = document.createElement('div');
    el.id = 'tesseract-panel';
    el.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10,20,40,0.92);
      border: 1px solid rgba(0,212,255,0.3);
      border-radius: 12px;
      color: #e8f4ff;
      padding: 16px 28px;
      z-index: 2000;
      font-family: 'Segoe UI', Arial, sans-serif;
      min-width: 320px;
      text-align: center;
      box-shadow: 0 0 24px rgba(0,212,255,0.15);
    `;
    el.innerHTML = `
      <div style="font-size:18px;font-weight:700;letter-spacing:2px;color:#00d4ff;margin-bottom:10px;">
        4D TESSERACT
      </div>
      <div style="font-size:12px;color:#88aacc;margin-bottom:14px;">
        Projecting onto XYZ — 16 vertices, 32 edges
      </div>
      <div style="display:flex;align-items:center;gap:12px;justify-content:center;margin-bottom:8px;">
        <label style="font-size:12px;color:#aaccee;">Rotation Speed</label>
        <input id="tesseract-speed" type="range" min="0.1" max="3" step="0.05" value="1"
          style="width:140px;accent-color:#00d4ff;">
        <span id="tesseract-speed-val" style="font-size:12px;color:#00d4ff;width:30px;">1.0x</span>
      </div>
      <div style="font-size:11px;color:#5577aa;margin-top:8px;">
        <span style="color:#0cf;">■</span> Inner cube &nbsp;
        <span style="color:#f80;">■</span> Outer cube &nbsp;
        <span style="color:#a6f;">■</span> Connecting edges
      </div>
    `;
    document.body.appendChild(el);
    this._domEl = el;

    const speedInput = el.querySelector('#tesseract-speed');
    const speedVal = el.querySelector('#tesseract-speed-val');
    speedInput.addEventListener('input', () => {
      this._speedMultiplier = parseFloat(speedInput.value);
      speedVal.textContent = this._speedMultiplier.toFixed(1) + 'x';
    });
  }

  hide() {
    this._active = false;
    if (this._innerLines) { this._innerLines.dispose(); this._innerLines = null; }
    if (this._outerLines) { this._outerLines.dispose(); this._outerLines = null; }
    if (this._connectLines) { this._connectLines.dispose(); this._connectLines = null; }
    if (this._glowLayer) { this._glowLayer.dispose(); this._glowLayer = null; }
    if (this._light) { this._light.dispose(); this._light = null; }
    if (this._domEl) { this._domEl.remove(); this._domEl = null; }
    this._root = null;
  }

  update(dt) {
    if (!this._active) return;
    const dtSec = dt / 1000;
    this._angleXW += 0.3 * dtSec * this._speedMultiplier;
    this._angleYZ += 0.2 * dtSec * this._speedMultiplier;

    const projected = this._computeProjected();
    this._rebuildLines(projected);
  }
}
