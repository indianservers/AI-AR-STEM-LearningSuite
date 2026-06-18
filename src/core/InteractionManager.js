import {
  Vector3, Color3, PointerEventTypes,
  MeshBuilder, StandardMaterial, GlowLayer,
  ParticleSystem, DynamicTexture, Color4
} from '@babylonjs/core';
import { Gestures } from './GestureEngine.js';
import { GestureActions } from './GestureActionRegistry.js';

const DEFAULT_CAPABILITIES = {
  canGrab: true,
  canMove: true,
  canRotate: true,
  canScale: true,
  canThrow: true,
  canInspect: true,
  canShake: true,
  minScale: 0.18,
  maxScale: 6,
  rotateSpeed: 1.15,
  scaleSpeed: 18,
  snapBack: false,
};

/**
 * Manages object picking, dragging, hover highlights, and universal hand manipulation.
 * Supports legacy register(mesh, onClick, onProximity) plus capability-aware options.
 */
export class InteractionManager {
  constructor(scene, gestureEngine, environment, sceneManager) {
    this.scene = scene;
    this.gestureEngine = gestureEngine;
    this.env = environment;
    this.sceneManager = sceneManager;

    this._grabbed = [null, null];
    this._grabOffset = [null, null];
    this._velocity = [Vector3.Zero(), Vector3.Zero()];
    this._hovered = null;
    this._selected = null;
    this._interactableMeshes = new Set();
    this._clickCallbacks = new Map();
    this._proximityCallbacks = new Map();
    this._actionCallbacks = new Map();
    this._objectActionListeners = new Set();
    this._capabilities = new Map();
    this._metadata = new Map();
    this._initialState = new Map();
    this._appliedActions = new Set();

    this._dwellMesh = [null, null];
    this._dwellTimer = [0, 0];
    this._dwellThreshold = 1200;

    this._mouseGrabbed = null;
    this._mouseStartPickDist = 7;

    this._cursors = [null, null];
    this._cursorMats = [null, null];
    this._glowLayer = null;
    this._statusEl = null;
    this._statusTimer = null;

    this._buildCursors();
    this._buildStatusEl();
    this._setupMouseFallback();
    this._setupHover();
  }

  _buildCursors() {
    this._glowLayer = this.scene.getGlowLayerByName?.('interactionGlow')
      || new GlowLayer('interactionGlow', this.scene);
    this._glowLayer.intensity = 0.6;

    const COLORS = [
      new Color3(0, 0.85, 1),
      new Color3(1, 0.45, 0.1),
    ];

    for (let h = 0; h < 2; h++) {
      const cursor = MeshBuilder.CreateSphere(`handCursor_${h}`, { diameter: 0.18, segments: 8 }, this.scene);
      cursor.isPickable = false;
      cursor.setEnabled(false);

      const mat = new StandardMaterial(`handCursorMat_${h}`, this.scene);
      mat.emissiveColor = COLORS[h];
      mat.disableLighting = true;
      mat.alpha = 0.75;
      cursor.material = mat;

      this._glowLayer.addIncludedOnlyMesh(cursor);
      this._cursors[h] = cursor;
      this._cursorMats[h] = mat;
    }
  }

  _buildStatusEl() {
    const el = document.createElement('div');
    el.id = 'manipulation-status';
    el.className = 'hidden';
    document.body.appendChild(el);
    this._statusEl = el;
  }

  register(mesh, onClick = null, onProximity = null, options = {}) {
    if (!mesh) return;

    if (onClick && typeof onClick === 'object') {
      options = onClick;
      onClick = options.onClick || null;
      onProximity = options.onProximity || null;
    } else if (onProximity && typeof onProximity === 'object') {
      options = onProximity;
      onProximity = options.onProximity || null;
    }

    const capabilities = {
      ...DEFAULT_CAPABILITIES,
      ...(options.capabilities || {}),
    };

    this._interactableMeshes.add(mesh);
    this._capabilities.set(mesh, capabilities);
    this._initialState.set(mesh, {
      position: mesh.position?.clone?.() || Vector3.Zero(),
      rotation: mesh.rotation?.clone?.() || Vector3.Zero(),
      scaling: mesh.scaling?.clone?.() || Vector3.One(),
    });

    if (onClick) this._clickCallbacks.set(mesh, onClick);
    if (onProximity) this._proximityCallbacks.set(mesh, onProximity);
    if (options.onAction) this._actionCallbacks.set(mesh, options.onAction);
    if (options.metadata || options.inspect) this._metadata.set(mesh, options.metadata || options.inspect);
    mesh.isPickable = true;
  }

  unregister(mesh) {
    this._interactableMeshes.delete(mesh);
    this._clickCallbacks.delete(mesh);
    this._proximityCallbacks.delete(mesh);
    this._actionCallbacks.delete(mesh);
    this._metadata.delete(mesh);
    this._capabilities.delete(mesh);
    this._initialState.delete(mesh);
    if (this._selected === mesh) this._selected = null;
    if (this._hovered === mesh) {
      this.env.unhighlight?.(mesh);
      this._hovered = null;
    }
  }

  setCapabilities(mesh, capabilities = {}) {
    if (!mesh) return;
    this._capabilities.set(mesh, {
      ...DEFAULT_CAPABILITIES,
      ...(this._capabilities.get(mesh) || {}),
      ...capabilities,
    });
  }

  getCapabilities(mesh) {
    return { ...DEFAULT_CAPABILITIES, ...(this._capabilities.get(mesh) || {}) };
  }

  setMetadata(mesh, metadata = {}) {
    if (!mesh) return;
    this._metadata.set(mesh, { ...(this._metadata.get(mesh) || {}), ...metadata });
  }

  getMetadata(mesh) {
    return { ...(this._metadata.get(mesh) || {}) };
  }

  getSelected() {
    return this._selected;
  }

  onObjectAction(fn) {
    this._objectActionListeners.add(fn);
    return () => this._objectActionListeners.delete(fn);
  }

  _setupHover() {
    this.scene.onPointerObservable.add((info) => {
      if (info.type !== PointerEventTypes.POINTERMOVE) return;
      const mesh = info.pickInfo?.pickedMesh;
      if (mesh && this._interactableMeshes.has(mesh)) {
        if (this._hovered !== mesh) {
          if (this._hovered) this.env.unhighlight?.(this._hovered);
          this._hovered = mesh;
          this.env.highlight?.(mesh, new Color3(0, 0.9, 1));
        }
      } else if (this._hovered) {
        this.env.unhighlight?.(this._hovered);
        this._hovered = null;
      }
    });
  }

  _setupMouseFallback() {
    let isDragging = false, startX = 0, startY = 0;
    const canvas = this.scene.getEngine().getRenderingCanvas();

    canvas.addEventListener('pointerdown', (e) => {
      const pick = this.scene.pick(e.clientX, e.clientY);
      if (pick?.pickedMesh && this._interactableMeshes.has(pick.pickedMesh)) {
        this._mouseGrabbed = pick.pickedMesh;
        this._selected = pick.pickedMesh;
        this._mouseStartPickDist = Vector3.Distance(
          this.scene.activeCamera.position,
          pick.pickedPoint || Vector3.Zero()
        );
        this.sceneManager.lockCamera();
        startX = e.clientX; startY = e.clientY;
        isDragging = false;
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this._mouseGrabbed) return;
      if (Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4) isDragging = true;
      if (!isDragging || !this._can(this._mouseGrabbed, 'canMove')) return;
      const ray = this.scene.createPickingRay(e.clientX, e.clientY, null, this.scene.activeCamera);
      if (ray) this._mouseGrabbed.position.copyFrom(ray.origin.add(ray.direction.scale(this._mouseStartPickDist)));
    });

    canvas.addEventListener('pointerup', () => {
      if (!this._mouseGrabbed) return;
      if (!isDragging) this._clickCallbacks.get(this._mouseGrabbed)?.(this._mouseGrabbed);
      this._mouseGrabbed = null;
      this.sceneManager.unlockCamera();
    });
  }

  update(camera, canvas, deltaTime = 16) {
    for (let h = 0; h < 2; h++) {
      const gesture = this.gestureEngine.currentGestures[h];
      const pinchNorm = this.gestureEngine.pinchPositions[h];
      const palmNorm = this.gestureEngine.palmPositions[h];
      const indexNorm = this.gestureEngine.indexTipPositions[h];

      const cursorNorm = pinchNorm || palmNorm;
      const cursorWorld = cursorNorm
        ? this.gestureEngine.toWorldPosition(cursorNorm, camera, canvas)
        : null;

      this._updateCursor(h, cursorWorld);
      this._updateProximity(cursorWorld);
      this._updateGrab(h, gesture, cursorWorld);
      this._updateDwellSelect(h, gesture, indexNorm, canvas, deltaTime);

      if (gesture === Gestures.FIST && this.gestureEngine.justStarted?.(Gestures.FIST, h)) {
        this._onFist?.();
      }
    }

    this._applySemanticActions(this.gestureEngine.lastActions || []);
  }

  _updateCursor(handIdx, cursorWorld) {
    if (cursorWorld) {
      this._cursors[handIdx].setEnabled(true);
      this._cursors[handIdx].position = Vector3.Lerp(this._cursors[handIdx].position, cursorWorld, 0.45);
      const s = 0.10 + this.gestureEngine.pinchStrength[handIdx] * 0.12;
      this._cursors[handIdx].scaling.setAll(s / 0.18);
    } else {
      this._cursors[handIdx].setEnabled(false);
    }
  }

  _updateProximity(cursorWorld) {
    if (!cursorWorld) return;
    this._interactableMeshes.forEach(mesh => {
      if (!mesh || mesh.isDisposed?.()) return;
      const d = Vector3.Distance(mesh.getAbsolutePosition(), cursorWorld);
      if (d < 2.0) {
        const fn = this._proximityCallbacks.get(mesh);
        if (fn) fn(d);
        if (this._hovered !== mesh) {
          if (this._hovered && this._hovered !== this._grabbed[0] && this._hovered !== this._grabbed[1]) {
            this.env.unhighlight?.(this._hovered);
          }
          this._hovered = mesh;
          this.env.highlight?.(mesh, new Color3(0.2, 1, 0.8));
        }
      }
    });
  }

  _updateGrab(handIdx, gesture, cursorWorld) {
    if ((gesture === Gestures.PINCH || gesture === Gestures.GRAB) && cursorWorld) {
      if (!this._grabbed[handIdx]) {
        const nearest = this._findNearest(cursorWorld, mesh => this._can(mesh, 'canGrab'));
        if (nearest) {
          this._grabbed[handIdx] = nearest;
          this._selected = nearest;
          this._grabOffset[handIdx] = nearest.position.subtract(cursorWorld);
          this.sceneManager.lockCamera();
          this.env.highlight?.(nearest, new Color3(1, 0.85, 0));
          this._showStatus('Grabbed');
          this._emitMeshAction(nearest, GestureActions.GRAB, { hand: handIdx });
        }
      } else {
        const grabbed = this._grabbed[handIdx];
        if (this._can(grabbed, 'canMove')) {
          const target = cursorWorld.add(this._grabOffset[handIdx]);
          const prev = grabbed.position.clone();
          grabbed.position = Vector3.Lerp(grabbed.position, target, 0.5);
          this._velocity[handIdx] = grabbed.position.subtract(prev).scale(60);
        }
      }
    } else if (this._grabbed[handIdx]) {
      this._release(handIdx);
    }
  }

  _release(handIdx) {
    const grabbed = this._grabbed[handIdx];
    if (!grabbed) return;

    if (this._can(grabbed, 'canThrow') && grabbed.physicsImpostor) {
      grabbed.physicsImpostor.setLinearVelocity(this._velocity[handIdx]);
    }

    if (this._capabilities.get(grabbed)?.snapBack) {
      this._snapBack(grabbed);
    }

    this.env.unhighlight?.(grabbed);
    this._emitMeshAction(grabbed, GestureActions.RELEASE, { hand: handIdx, velocity: this._velocity[handIdx] });
    this._burst(grabbed, new Color3(1, 0.85, 0));
    this._showStatus('Released');
    this._grabbed[handIdx] = null;
    this._grabOffset[handIdx] = null;
    this.sceneManager.unlockCamera();
  }

  _updateDwellSelect(handIdx, gesture, indexNorm, canvas, deltaTime) {
    if (gesture === Gestures.POINT && indexNorm) {
      const sx = (1 - indexNorm.x) * canvas.clientWidth;
      const sy = indexNorm.y * canvas.clientHeight;
      const pick = this.scene.pick(sx, sy, mesh => this._interactableMeshes.has(mesh));
      const dwellTarget = pick?.hit ? pick.pickedMesh : null;

      if (dwellTarget && dwellTarget === this._dwellMesh[handIdx]) {
        this._dwellTimer[handIdx] += deltaTime;
        if (this._dwellTimer[handIdx] >= this._dwellThreshold) {
          this._selected = dwellTarget;
          this._clickCallbacks.get(dwellTarget)?.(dwellTarget);
          this._dwellTimer[handIdx] = 0;
        }
      } else {
        this._dwellMesh[handIdx] = dwellTarget;
        this._dwellTimer[handIdx] = 0;
      }

      if (dwellTarget && this._hovered !== dwellTarget) {
        if (this._hovered) this.env.unhighlight?.(this._hovered);
        this._hovered = dwellTarget;
        this.env.highlight?.(dwellTarget, new Color3(0, 0.9, 1));
      }
    } else {
      this._dwellMesh[handIdx] = null;
      this._dwellTimer[handIdx] = 0;
    }
  }

  _applySemanticActions(actions) {
    actions.forEach(action => {
      const key = `${action.name}:${action.hand}:${Math.round(action.time)}`;
      if (this._appliedActions.has(key)) return;
      this._appliedActions.add(key);
      if (this._appliedActions.size > 160) this._appliedActions.clear();

      if (action.name === GestureActions.ROTATE) this._applyRotate(action);
      if (action.name === GestureActions.SCALE) this._applyScale(action);
      if (action.name === GestureActions.THROW) this._applyThrow(action);
      if (action.name === GestureActions.INSPECT) this._applyInspect(action);
      if (action.name === 'shake') this._applyShake(action);
    });
  }

  _applyRotate(action) {
    const target = this._targetFor(action, { requireGrabbedForSingleHand: true });
    if (!target || !this._can(target, 'canRotate')) return;
    const caps = this.getCapabilities(target);
    const delta = action.detail?.angleDelta || 0;
    target.rotation.y += delta * caps.rotateSpeed;
    target.rotation.x += delta * 0.2 * caps.rotateSpeed;
    this._selected = target;
    this._emitMeshAction(target, GestureActions.ROTATE, action);
    this._showStatus(action.hand === 'both' ? 'Two-hand rotate' : 'Twist rotate');
  }

  _applyScale(action) {
    const target = this._targetFor(action);
    if (!target || !this._can(target, 'canScale')) return;
    const caps = this.getCapabilities(target);
    const delta = action.detail?.delta || 0;
    const current = target.scaling.x || 1;
    const next = Math.max(caps.minScale, Math.min(caps.maxScale, current + delta * caps.scaleSpeed));
    target.scaling.setAll(next);
    this._selected = target;
    this._emitMeshAction(target, GestureActions.SCALE, action);
    this._showStatus(action.detail?.direction === 'out' ? 'Scale up' : 'Scale down');
  }

  _applyThrow(action) {
    const target = this._selected || this._hovered;
    if (!target || !this._can(target, 'canThrow')) return;
    this._emitMeshAction(target, GestureActions.THROW, action);
    this._burst(target, new Color3(1, 0.35, 0.1));
    this._showStatus('Flick throw');
  }

  _applyInspect(action) {
    const target = this._targetFor(action, { allowHovered: true });
    if (!target || !this._can(target, 'canInspect')) return;
    this._selected = target;
    this._emitMeshAction(target, GestureActions.INSPECT, action);
    this.env.highlight?.(target, new Color3(0.6, 0.9, 1));
    this._showStatus(target.name ? `Inspecting ${target.name}` : 'Inspecting object');
  }

  _applyShake(action) {
    const target = this._targetFor(action, { requireGrabbedForSingleHand: true });
    if (!target || !this._can(target, 'canShake')) return;
    target.rotation.x += 0.18;
    target.rotation.z -= 0.14;
    this._burst(target, new Color3(1, 0.15, 0.75));
    this._emitMeshAction(target, 'shake', action);
    this._showStatus('Shake energy');
  }

  _targetFor(action, opts = {}) {
    if (action.hand === 'both') return this._grabbed[0] || this._grabbed[1] || this._selected || this._hovered;
    const handTarget = this._grabbed[action.hand];
    if (opts.requireGrabbedForSingleHand) return handTarget;
    return handTarget || this._selected || (opts.allowHovered ? this._hovered : null);
  }

  _findNearest(cursorWorld, predicate = () => true) {
    let nearest = null;
    let nearestDist = 2.0;
    this._interactableMeshes.forEach(mesh => {
      if (!mesh || mesh.isDisposed?.() || !predicate(mesh)) return;
      const d = Vector3.Distance(mesh.getAbsolutePosition(), cursorWorld);
      if (d < nearestDist) { nearestDist = d; nearest = mesh; }
    });
    return nearest;
  }

  _can(mesh, capability) {
    return Boolean(this.getCapabilities(mesh)[capability]);
  }

  _snapBack(mesh) {
    const state = this._initialState.get(mesh);
    if (!state) return;
    mesh.position.copyFrom(state.position);
    mesh.rotation.copyFrom(state.rotation);
    mesh.scaling.copyFrom(state.scaling);
  }

  _emitMeshAction(mesh, actionName, detail) {
    const cb = this._actionCallbacks.get(mesh);
    if (cb) cb(actionName, mesh, detail);
    const event = {
      actionName,
      mesh,
      detail,
      capabilities: this.getCapabilities(mesh),
      metadata: this.getMetadata(mesh),
    };
    this._objectActionListeners.forEach(fn => fn(event));
  }

  _burst(mesh, color = new Color3(0, 0.85, 1)) {
    if (!mesh || mesh.isDisposed?.()) return;
    const ps = new ParticleSystem(`manipBurst_${Date.now()}`, 36, this.scene);
    const tex = new DynamicTexture(`manipBurstTex_${Date.now()}`, { width: 16, height: 16 }, this.scene);
    const ctx = tex.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, 8, 7, 0, Math.PI * 2);
    ctx.fill();
    tex.update();
    ps.particleTexture = tex;
    ps.emitter = mesh.getAbsolutePosition().clone();
    ps.createSphereEmitter(0.35, 0.2);
    ps.minEmitPower = 0.6;
    ps.maxEmitPower = 1.6;
    ps.minLifeTime = 0.18;
    ps.maxLifeTime = 0.45;
    ps.emitRate = 180;
    ps.minSize = 0.035;
    ps.maxSize = 0.1;
    ps.color1 = new Color4(color.r, color.g, color.b, 1);
    ps.color2 = new Color4(color.r, color.g, color.b, 0.45);
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.gravity = Vector3.Zero();
    ps.start();
    setTimeout(() => {
      ps.stop();
      setTimeout(() => ps.dispose(), 600);
    }, 120);
  }

  _showStatus(text) {
    if (!this._statusEl) return;
    this._statusEl.textContent = text;
    this._statusEl.classList.remove('hidden');
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => this._statusEl.classList.add('hidden'), 900);
  }

  onFist(fn) { this._onFist = fn; }

  clearAll() {
    for (let h = 0; h < 2; h++) {
      this._grabbed[h] = null;
      this._grabOffset[h] = null;
      this._cursors[h]?.setEnabled(false);
    }
    this._interactableMeshes.clear();
    this._clickCallbacks.clear();
    this._proximityCallbacks.clear();
    this._actionCallbacks.clear();
    this._capabilities.clear();
    this._metadata.clear();
    this._initialState.clear();
    this._hovered = null;
    this._selected = null;
  }
}
