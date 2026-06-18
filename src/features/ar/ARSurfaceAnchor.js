/**
 * ARSurfaceAnchor.js
 * AR Surface Anchor — place 3D objects on real-world surfaces.
 * FEATURE CLASS INTERFACE: activate(), deactivate(), update(camera, canvas, dt)
 */

import {
  MeshBuilder,
  Vector3,
  Color3,
  Color4,
  StandardMaterial,
  DynamicTexture,
  Mesh,
  Animation
} from '@babylonjs/core';

const CONTENT_COLORS = {
  molecule: new Color3(0.2, 0.8, 1.0),
  atom:     new Color3(1.0, 0.6, 0.1),
  formula:  new Color3(0.4, 1.0, 0.4),
  planet:   new Color3(0.8, 0.3, 1.0)
};

export class ARSurfaceAnchor {
  constructor(scene, xrManager) {
    this._scene      = scene;
    this._xrManager  = xrManager;
    this._active     = false;
    this._anchors    = [];
    this._reticle    = null;
    this._panel      = null;
    this._hitPos     = new Vector3(0, 0, 0);
    this._t          = 0;
    this._hitSource  = null;
    this._useXR      = false;
    this._groundMesh = null;
    this._selectedType = 'atom';
    this._observer   = null;
    this._clickHandler = null;
  }

  // ── activate ─────────────────────────────────────────────────────────────
  activate() {
    if (this._active) return;
    this._active = true;

    this._tryInitXR();
    if (!this._useXR) {
      this._buildGroundFallback();
    }

    this._buildReticle();
    this._buildPanel();

    this._observer = this._scene.onBeforeRenderObservable.add(() => {
      this.update(
        this._scene.activeCamera,
        this._scene.getEngine().getRenderingCanvas(),
        this._scene.getEngine().getDeltaTime()
      );
    });
  }

  // ── deactivate ────────────────────────────────────────────────────────────
  deactivate() {
    if (!this._active) return;
    this._active = false;

    if (this._observer) {
      this._scene.onBeforeRenderObservable.remove(this._observer);
      this._observer = null;
    }

    if (this._reticle) {
      this._reticle.dispose();
      this._reticle = null;
    }

    if (this._groundMesh) {
      this._groundMesh.dispose();
      this._groundMesh = null;
    }

    if (this._clickHandler) {
      this._scene.getEngine().getRenderingCanvas()
        .removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }

    this._clearAnchors();

    if (this._panel && this._panel.parentNode) {
      this._panel.parentNode.removeChild(this._panel);
    }
    this._panel = null;
  }

  // ── update ────────────────────────────────────────────────────────────────
  update(camera, canvas, dt) {
    if (!this._active) return;
    this._t += dt;

    this._updateReticlePosition(camera, canvas);

    // Pulse reticle scale
    if (this._reticle) {
      const pulse = 1.0 + 0.1 * Math.sin(this._t * 0.003);
      this._reticle.scaling.setAll(pulse);
    }

    // Update panel count
    if (this._countLabel) {
      this._countLabel.textContent = `AR Anchors: ${this._anchors.length} placed`;
    }
  }

  // ── private: XR init ─────────────────────────────────────────────────────
  _tryInitXR() {
    try {
      const session =
        this._xrManager?._xrSessionManager?._session ||
        this._xrManager?._xrHelper?.baseExperience?.sessionManager?.session;

      if (!session) return;

      const features = session.enabledFeatures || [];
      if (!features.includes('hit-test')) return;

      this._useXR = true;

      session.requestHitTestSource({ space: session.viewerSpace })
        .then(src => { this._hitSource = src; })
        .catch(() => { this._useXR = false; this._buildGroundFallback(); });

    } catch (_e) {
      this._useXR = false;
    }
  }

  // ── private: desktop fallback ground ─────────────────────────────────────
  _buildGroundFallback() {
    this._groundMesh = MeshBuilder.CreateGround(
      'ar_anchor_ground',
      { width: 20, height: 20, subdivisions: 20 },
      this._scene
    );

    const mat = new StandardMaterial('ar_anchor_ground_mat', this._scene);
    mat.diffuseColor  = new Color3(0.1, 0.15, 0.25);
    mat.specularColor = new Color3(0, 0, 0);
    mat.alpha         = 0.4;
    mat.wireframe     = true;
    this._groundMesh.material = mat;
    this._groundMesh.isPickable = true;

    this._clickHandler = (e) => {
      if (!this._active) return;
      const pickResult = this._scene.pick(
        this._scene.pointerX,
        this._scene.pointerY,
        mesh => mesh === this._groundMesh
      );
      if (pickResult.hit && pickResult.pickedPoint) {
        this._hitPos.copyFrom(pickResult.pickedPoint);
      }
    };

    this._scene.getEngine().getRenderingCanvas()
      .addEventListener('click', this._clickHandler);
  }

  // ── private: reticle ─────────────────────────────────────────────────────
  _buildReticle() {
    this._reticle = MeshBuilder.CreateTorus(
      'ar_reticle',
      { diameter: 0.5, thickness: 0.02, tessellation: 32 },
      this._scene
    );

    const mat = new StandardMaterial('ar_reticle_mat', this._scene);
    mat.emissiveColor = new Color3(0.0, 0.85, 1.0);
    mat.disableLighting = true;
    this._reticle.material = mat;
    this._reticle.isPickable = false;

    // Lay flat (XZ plane)
    this._reticle.rotation.x = Math.PI / 2;
  }

  // ── private: update reticle position ─────────────────────────────────────
  _updateReticlePosition(camera, canvas) {
    if (!this._reticle) return;

    if (this._useXR && this._hitSource) {
      // XR: hit position updated externally
      this._reticle.position.copyFrom(this._hitPos);
      return;
    }

    // Desktop: cast ray from camera to ground
    if (this._groundMesh) {
      const centerX = canvas ? canvas.width / 2  : 400;
      const centerY = canvas ? canvas.height / 2 : 300;
      const pick = this._scene.pick(centerX, centerY,
        mesh => mesh === this._groundMesh);

      if (pick.hit && pick.pickedPoint) {
        this._hitPos.copyFrom(pick.pickedPoint);
      }
    }

    this._reticle.position.copyFrom(this._hitPos);
    this._reticle.position.y += 0.01; // lift slightly above ground
  }

  // ── private: panel ───────────────────────────────────────────────────────
  _buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'ar-anchor-panel';
    Object.assign(panel.style, {
      position:        'fixed',
      top:             '80px',
      right:           '20px',
      background:      'rgba(10,20,40,0.92)',
      border:          '1px solid rgba(0,212,255,0.3)',
      borderRadius:    '12px',
      color:           '#e8f4ff',
      padding:         '14px 18px',
      zIndex:          '2000',
      minWidth:        '200px',
      fontFamily:      'sans-serif',
      fontSize:        '14px',
      userSelect:      'none'
    });

    // Title
    const title = document.createElement('div');
    title.textContent = 'AR Surface Anchors';
    Object.assign(title.style, { fontWeight: 'bold', marginBottom: '8px', color: '#00d4ff' });
    panel.appendChild(title);

    // Count label
    this._countLabel = document.createElement('div');
    this._countLabel.textContent = 'AR Anchors: 0 placed';
    this._countLabel.style.marginBottom = '10px';
    panel.appendChild(this._countLabel);

    // Type selector
    const typeLabel = document.createElement('div');
    typeLabel.textContent = 'Anchor type:';
    typeLabel.style.marginBottom = '4px';
    panel.appendChild(typeLabel);

    const typeSelect = document.createElement('select');
    Object.assign(typeSelect.style, {
      width: '100%', marginBottom: '10px', background: 'rgba(0,20,40,0.9)',
      color: '#e8f4ff', border: '1px solid rgba(0,212,255,0.3)',
      borderRadius: '6px', padding: '4px'
    });
    ['molecule', 'atom', 'formula', 'planet'].forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      typeSelect.appendChild(opt);
    });
    typeSelect.value = this._selectedType;
    typeSelect.addEventListener('change', () => { this._selectedType = typeSelect.value; });
    panel.appendChild(typeSelect);

    // Anchor Here button
    const anchorBtn = document.createElement('button');
    anchorBtn.textContent = '📌 Anchor Here';
    Object.assign(anchorBtn.style, {
      width: '100%', marginBottom: '8px', padding: '8px',
      background: 'rgba(0,100,200,0.7)', color: '#e8f4ff',
      border: '1px solid rgba(0,212,255,0.5)', borderRadius: '8px',
      cursor: 'pointer', fontSize: '14px'
    });
    anchorBtn.addEventListener('click', () => this._placeAnchor());
    panel.appendChild(anchorBtn);

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Anchors';
    Object.assign(clearBtn.style, {
      width: '100%', padding: '8px',
      background: 'rgba(150,20,20,0.6)', color: '#e8f4ff',
      border: '1px solid rgba(255,80,80,0.4)', borderRadius: '8px',
      cursor: 'pointer', fontSize: '14px'
    });
    clearBtn.addEventListener('click', () => this._clearAnchors());
    panel.appendChild(clearBtn);

    document.body.appendChild(panel);
    this._panel = panel;
  }

  // ── private: place anchor ─────────────────────────────────────────────────
  _placeAnchor() {
    const pos  = this._hitPos.clone();
    const type = this._selectedType;
    const color = CONTENT_COLORS[type] || new Color3(1, 1, 1);

    const sphere = MeshBuilder.CreateSphere(
      `anchor_${type}_${this._anchors.length}`,
      { diameter: 0.35, segments: 10 },
      this._scene
    );
    sphere.position.copyFrom(pos);
    sphere.position.y += 0.2;

    const mat = new StandardMaterial(`anchor_mat_${this._anchors.length}`, this._scene);
    mat.emissiveColor = color;
    mat.diffuseColor  = color;
    sphere.material = mat;

    // Label above sphere
    const label = this._buildLabel(type, sphere);

    this._anchors.push({ mesh: sphere, label, type });
  }

  _buildLabel(type, parentMesh) {
    const tex = new DynamicTexture('anchor_label_tex', { width: 128, height: 64 }, this._scene);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = 'rgba(10,20,40,0.85)';
    ctx.roundRect(2, 2, 124, 60, 8);
    ctx.fill();
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(type.toUpperCase(), 64, 38);
    tex.update();

    const plane = MeshBuilder.CreatePlane('anchor_label_plane', { width: 0.5, height: 0.25 }, this._scene);
    plane.position.copyFrom(parentMesh.position);
    plane.position.y += 0.45;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.isPickable = false;

    const mat = new StandardMaterial('anchor_label_mat', this._scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    plane.material = mat;

    return plane;
  }

  // ── private: clear anchors ────────────────────────────────────────────────
  _clearAnchors() {
    for (const a of this._anchors) {
      if (a.mesh)  a.mesh.dispose();
      if (a.label) a.label.dispose();
    }
    this._anchors = [];
  }
}
