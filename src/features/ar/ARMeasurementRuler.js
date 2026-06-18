/**
 * ARMeasurementRuler.js
 * AR Measurement Ruler — measure distance between two hand positions.
 * FEATURE CLASS INTERFACE: activate(), deactivate(), update(camera, canvas, dt)
 */

import {
  MeshBuilder,
  Vector3,
  Color3,
  Color4,
  StandardMaterial,
  DynamicTexture,
  Mesh
} from '@babylonjs/core';

const DEFAULT_SCALE = 30; // 1 Babylon unit = 30 cm

export class ARMeasurementRuler {
  constructor(scene, gestureEngine) {
    this._scene         = scene;
    this._gestureEngine = gestureEngine;
    this._active        = false;

    this._leftSphere  = null;
    this._rightSphere = null;
    this._rulerLine   = null;
    this._midLabel    = null;
    this._midLabelTex = null;

    this._markedPoints = [];
    this._markedMeshes = [];

    this._panel       = null;
    this._distDisplay = null;
    this._leftInfo    = null;
    this._rightInfo   = null;

    this._scaleMode   = 'cm'; // 'cm' | 'inches' | 'bu'
    this._scalePerUnit = this._loadCalibration();

    this._leftPos  = new Vector3(-0.4, 1.2, 1.0);
    this._rightPos = new Vector3( 0.4, 1.2, 1.0);

    this._observer = null;
  }

  // ── activate ───────────────────────────────────────────────────────────────
  activate() {
    if (this._active) return;
    this._active = true;

    this._buildEndpointSpheres();
    this._buildRulerLine();
    this._buildMidLabel();
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

    if (this._leftSphere)  { this._leftSphere.dispose();  this._leftSphere  = null; }
    if (this._rightSphere) { this._rightSphere.dispose(); this._rightSphere = null; }
    if (this._rulerLine)   { this._rulerLine.dispose();   this._rulerLine   = null; }
    if (this._midLabel)    { this._midLabel.dispose();    this._midLabel    = null; }

    this._clearMarkedPoints();

    if (this._panel && this._panel.parentNode) {
      this._panel.parentNode.removeChild(this._panel);
    }
    this._panel = null;
  }

  // ── update ─────────────────────────────────────────────────────────────────
  update(camera, canvas, dt) {
    if (!this._active) return;

    // Get hand positions from gesture engine, fallback to stored positions
    const newLeft  = this._gestureEngine?.toWorldPosition?.('left')  || null;
    const newRight = this._gestureEngine?.toWorldPosition?.('right') || null;

    if (newLeft  && newLeft.x  != null) this._leftPos.copyFrom(newLeft);
    if (newRight && newRight.x != null) this._rightPos.copyFrom(newRight);

    this._updateLine();
    this._updateMidLabel();
    this._updateDOMDisplay();
  }

  // ── private: endpoint spheres ─────────────────────────────────────────────
  _buildEndpointSpheres() {
    const makeEndpoint = (name, color) => {
      const s = MeshBuilder.CreateSphere(name, { diameter: 0.12, segments: 8 }, this._scene);
      s.isPickable = false;
      const mat = new StandardMaterial(`${name}_mat`, this._scene);
      mat.emissiveColor = color;
      mat.diffuseColor  = color;
      s.material = mat;
      return s;
    };

    this._leftSphere  = makeEndpoint('ruler_left',  new Color3(0.2, 0.8, 1.0));
    this._rightSphere = makeEndpoint('ruler_right', new Color3(1.0, 0.5, 0.1));

    this._leftSphere.position.copyFrom(this._leftPos);
    this._rightSphere.position.copyFrom(this._rightPos);
  }

  // ── private: ruler line ───────────────────────────────────────────────────
  _buildRulerLine() {
    this._rulerLine = MeshBuilder.CreateLines(
      'ruler_line',
      {
        points:    [this._leftPos.clone(), this._rightPos.clone()],
        updatable: true
      },
      this._scene
    );
    this._rulerLine.color    = new Color3(0.0, 0.9, 1.0);
    this._rulerLine.isPickable = false;
  }

  _updateLine() {
    if (!this._rulerLine) return;

    this._leftSphere?.position.copyFrom(this._leftPos);
    this._rightSphere?.position.copyFrom(this._rightPos);

    this._rulerLine = MeshBuilder.CreateLines(
      'ruler_line',
      {
        points:   [this._leftPos.clone(), this._rightPos.clone()],
        instance: this._rulerLine
      },
      this._scene
    );
  }

  // ── private: midpoint label ───────────────────────────────────────────────
  _buildMidLabel() {
    const W = 256, H = 80;
    this._midLabelTex = new DynamicTexture(
      'ruler_mid_tex', { width: W, height: H }, this._scene
    );
    this._midLabelTex.hasAlpha = true;

    this._midLabel = MeshBuilder.CreatePlane('ruler_mid_label', { width: 0.6, height: 0.2 }, this._scene);
    this._midLabel.billboardMode = Mesh.BILLBOARDMODE_ALL;
    this._midLabel.isPickable    = false;

    const mat = new StandardMaterial('ruler_mid_mat', this._scene);
    mat.diffuseTexture  = this._midLabelTex;
    mat.emissiveTexture = this._midLabelTex;
    mat.opacityTexture  = this._midLabelTex;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    this._midLabel.material = mat;
  }

  _updateMidLabel() {
    if (!this._midLabel || !this._midLabelTex) return;

    const mid = Vector3.Lerp(this._leftPos, this._rightPos, 0.5);
    this._midLabel.position.copyFrom(mid);
    this._midLabel.position.y += 0.15;

    const dist    = this._computeDisplayDistance();
    const label   = this._formatDistance(dist);

    const W = 256, H = 80;
    const ctx = this._midLabelTex.getContext();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(10,20,40,0.85)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(2, 2, W - 4, H - 4, 10);
    else ctx.rect(2, 2, W - 4, H - 4);
    ctx.fill();
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, W / 2, H / 2 + 10);
    this._midLabelTex.update();
  }

  // ── private: distance helpers ─────────────────────────────────────────────
  _computeDisplayDistance() {
    const rawDist = Vector3.Distance(this._leftPos, this._rightPos);
    if (this._scaleMode === 'bu')     return rawDist;
    if (this._scaleMode === 'inches') return rawDist * this._scalePerUnit / 2.54;
    return rawDist * this._scalePerUnit; // cm default
  }

  _formatDistance(dist) {
    if (this._scaleMode === 'bu')     return `${dist.toFixed(3)} BU`;
    if (this._scaleMode === 'inches') return `${dist.toFixed(1)}"`;
    const cm = dist;
    if (cm >= 100) return `${(cm / 100).toFixed(2)} m`;
    return `${cm.toFixed(1)} cm`;
  }

  // ── private: DOM display ──────────────────────────────────────────────────
  _updateDOMDisplay() {
    if (!this._distDisplay) return;

    const dist = this._computeDisplayDistance();
    this._distDisplay.textContent = `Left ↔ Right: ${this._formatDistance(dist)}`;

    if (this._leftInfo) {
      this._leftInfo.textContent = `Left hand Y: ${(this._leftPos.y * this._scalePerUnit).toFixed(1)} cm`;
    }
    if (this._rightInfo) {
      this._rightInfo.textContent = `Right hand Y: ${(this._rightPos.y * this._scalePerUnit).toFixed(1)} cm`;
    }
  }

  // ── private: panel ────────────────────────────────────────────────────────
  _buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'ar-ruler-panel';
    Object.assign(panel.style, {
      position:     'fixed',
      top:          '20px',
      left:         '50%',
      transform:    'translateX(-50%)',
      background:   'rgba(10,20,40,0.92)',
      border:       '1px solid rgba(0,212,255,0.3)',
      borderRadius: '12px',
      color:        '#e8f4ff',
      padding:      '14px 22px',
      zIndex:       '2000',
      minWidth:     '320px',
      fontFamily:   'sans-serif',
      textAlign:    'center',
      userSelect:   'none'
    });

    const title = document.createElement('div');
    title.textContent = 'AR Measurement Ruler';
    Object.assign(title.style, { fontWeight: 'bold', marginBottom: '6px', color: '#00d4ff', fontSize: '16px' });
    panel.appendChild(title);

    // Main distance display
    this._distDisplay = document.createElement('div');
    this._distDisplay.textContent = 'Left ↔ Right: — cm';
    Object.assign(this._distDisplay.style, {
      fontSize: '26px', fontWeight: 'bold', color: '#fff',
      margin: '6px 0', letterSpacing: '0.5px'
    });
    panel.appendChild(this._distDisplay);

    // Secondary info
    this._leftInfo  = document.createElement('div');
    this._rightInfo = document.createElement('div');
    this._leftInfo.textContent  = 'Left hand Y: — cm';
    this._rightInfo.textContent = 'Right hand Y: — cm';
    Object.assign(this._leftInfo.style,  { fontSize: '12px', opacity: '0.7', marginBottom: '2px' });
    Object.assign(this._rightInfo.style, { fontSize: '12px', opacity: '0.7', marginBottom: '8px' });
    panel.appendChild(this._leftInfo);
    panel.appendChild(this._rightInfo);

    // Scale selector
    const scaleRow = document.createElement('div');
    scaleRow.style.cssText = 'display:flex;gap:6px;justify-content:center;margin-bottom:8px;';
    [['cm', 'cm'], ['inches', 'in'], ['bu', 'BU']].forEach(([mode, label]) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      Object.assign(btn.style, {
        padding: '4px 10px', cursor: 'pointer', borderRadius: '6px',
        background: mode === this._scaleMode ? 'rgba(0,150,255,0.7)' : 'rgba(0,40,80,0.7)',
        color: '#e8f4ff', border: '1px solid rgba(0,212,255,0.3)', fontSize: '13px'
      });
      btn.addEventListener('click', () => {
        this._scaleMode = mode;
        scaleRow.querySelectorAll('button').forEach(b => {
          b.style.background = b.textContent === label
            ? 'rgba(0,150,255,0.7)' : 'rgba(0,40,80,0.7)';
        });
      });
      scaleRow.appendChild(btn);
    });
    panel.appendChild(scaleRow);

    // Calibrate button
    const calibBtn = document.createElement('button');
    calibBtn.textContent = 'Calibrate (30cm)';
    Object.assign(calibBtn.style, {
      padding: '6px 14px', marginRight: '6px', cursor: 'pointer', borderRadius: '8px',
      background: 'rgba(40,120,40,0.7)', color: '#e8f4ff',
      border: '1px solid rgba(0,255,100,0.4)', fontSize: '13px'
    });
    calibBtn.addEventListener('click', () => this._calibrate());
    panel.appendChild(calibBtn);

    // Mark Point button
    const markBtn = document.createElement('button');
    markBtn.textContent = 'Mark Point';
    Object.assign(markBtn.style, {
      padding: '6px 14px', cursor: 'pointer', borderRadius: '8px',
      background: 'rgba(80,40,120,0.7)', color: '#e8f4ff',
      border: '1px solid rgba(150,80,255,0.4)', fontSize: '13px'
    });
    markBtn.addEventListener('click', () => this._markPoint());
    panel.appendChild(markBtn);

    // Area display
    this._areaDisplay = document.createElement('div');
    this._areaDisplay.style.cssText = 'margin-top:6px;font-size:12px;opacity:0.75;';
    panel.appendChild(this._areaDisplay);

    document.body.appendChild(panel);
    this._panel = panel;
  }

  // ── private: calibration ──────────────────────────────────────────────────
  _calibrate() {
    const rawDist = Vector3.Distance(this._leftPos, this._rightPos);
    if (rawDist < 0.001) return;
    this._scalePerUnit = 30 / rawDist; // 30cm reference
    localStorage.setItem('cosmiclearn_ruler_scale', String(this._scalePerUnit));
    console.log(`[ARMeasurementRuler] Calibrated: 1 BU = ${(30 / rawDist).toFixed(2)} cm`);
  }

  _loadCalibration() {
    const stored = localStorage.getItem('cosmiclearn_ruler_scale');
    return stored ? parseFloat(stored) : DEFAULT_SCALE;
  }

  // ── private: mark points ──────────────────────────────────────────────────
  _markPoint() {
    if (this._markedPoints.length >= 4) {
      this._clearMarkedPoints();
    }

    const pos = this._leftPos.clone();
    this._markedPoints.push(pos);

    const marker = MeshBuilder.CreateSphere(
      `ruler_mark_${this._markedPoints.length}`,
      { diameter: 0.08, segments: 6 },
      this._scene
    );
    marker.position.copyFrom(pos);
    marker.isPickable = false;

    const mat = new StandardMaterial(`ruler_mark_mat_${this._markedPoints.length}`, this._scene);
    mat.emissiveColor = new Color3(1.0, 0.8, 0.0);
    marker.material = mat;
    this._markedMeshes.push(marker);

    this._updateAreaDisplay();
  }

  _clearMarkedPoints() {
    for (const m of this._markedMeshes) m.dispose();
    this._markedMeshes = [];
    this._markedPoints = [];
    if (this._areaDisplay) this._areaDisplay.textContent = '';
  }

  _updateAreaDisplay() {
    if (!this._areaDisplay) return;
    const pts = this._markedPoints;

    if (pts.length === 3) {
      // Triangle area via cross product
      const ab = pts[1].subtract(pts[0]);
      const ac = pts[2].subtract(pts[0]);
      const cross = Vector3.Cross(ab, ac);
      const area  = cross.length() / 2;
      const areaCm2 = area * this._scalePerUnit * this._scalePerUnit;
      this._areaDisplay.textContent =
        `Triangle area: ${areaCm2.toFixed(1)} cm²`;
    } else if (pts.length === 4) {
      // Quadrilateral area (two triangles)
      const a012 = this._triArea(pts[0], pts[1], pts[2]);
      const a023 = this._triArea(pts[0], pts[2], pts[3]);
      const area  = a012 + a023;
      const areaCm2 = area * this._scalePerUnit * this._scalePerUnit;
      this._areaDisplay.textContent =
        `Quad area: ${areaCm2.toFixed(1)} cm²`;
    } else {
      this._areaDisplay.textContent =
        `${pts.length}/4 points marked`;
    }
  }

  _triArea(a, b, c) {
    const ab = b.subtract(a);
    const ac = c.subtract(a);
    return Vector3.Cross(ab, ac).length() / 2;
  }
}
