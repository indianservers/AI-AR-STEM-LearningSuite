import {
  MeshBuilder, StandardMaterial, Color3, Color4, Vector3,
  ParticleSystem, DynamicTexture
} from '@babylonjs/core';
import { Gestures } from '../core/GestureEngine.js';

const GESTURE_LABELS = {
  [Gestures.PINCH]: '🤏 Grab sparkle',
  [Gestures.OPEN_PALM]: '✋ Release',
  [Gestures.POINT]: '☝ Select beam',
  [Gestures.FIST]: '✊ Quick menu',
  [Gestures.TWO_HAND_SPREAD]: '🤲 Scale space',
  [Gestures.TWO_HAND_ROTATE]: '👏 Spin it',
  [Gestures.SWIPE_LEFT]: '← Swipe',
  [Gestures.SWIPE_RIGHT]: '→ Swipe',
};

export class GestureFeedback {
  constructor(scene, gestureEngine) {
    this.scene = scene;
    this.gestureEngine = gestureEngine;
    this._hintEl = document.getElementById('gesture-hint');
    this._hintTimer = null;
    this._rayMesh = null;
    this._fingertipParticles = [null, null];
    this._init();
  }

  _init() {
    this._buildRayBeam();
    this._buildFingertipGlow();
  }

  _buildRayBeam() {
    const ray = MeshBuilder.CreateCylinder('rayBeam', {
      height: 8, diameter: 0.012, tessellation: 4,
    }, this.scene);
    ray.isPickable = false;
    ray.setEnabled(false);

    const mat = new StandardMaterial('rayMat', this.scene);
    mat.emissiveColor = new Color3(0, 0.9, 1);
    mat.alpha = 0.6;
    mat.disableLighting = true;
    ray.material = mat;
    this._rayMesh = ray;
  }

  _buildFingertipGlow() {
    for (let h = 0; h < 2; h++) {
      const ps = new ParticleSystem(`fingertipPS_${h}`, 60, this.scene);
      const tex = new DynamicTexture(`ftTex${h}`, { width: 16, height: 16 }, this.scene);
      const ctx = tex.getContext();
      ctx.fillStyle = h === 0 ? '#00d4ff' : '#ff6a1a';
      ctx.beginPath();
      ctx.arc(8, 8, 7, 0, Math.PI * 2);
      ctx.fill();
      tex.update();
      ps.particleTexture = tex;

      ps.createPointEmitter(new Vector3(-0.1, -0.1, -0.1), new Vector3(0.1, 0.1, 0.1));
      ps.minEmitPower = 0.5;
      ps.maxEmitPower = 1.2;
      ps.minLifeTime = 0.15;
      ps.maxLifeTime = 0.35;
      ps.emitRate = 40;
      ps.minSize = 0.04;
      ps.maxSize = 0.1;
      const c = h === 0 ? new Color4(0, 0.85, 1, 1) : new Color4(1, 0.4, 0.1, 1);
      ps.color1 = c;
      ps.color2 = c.clone();
      ps.colorDead = new Color4(0, 0, 0, 0);
      ps.blendMode = ParticleSystem.BLENDMODE_ADD;
      ps.gravity = Vector3.Zero();

      this._fingertipParticles[h] = ps;
    }
  }

  showGestureHint(gesture) {
    const label = GESTURE_LABELS[gesture];
    if (!label || !this._hintEl) return;
    this._hintEl.textContent = label;
    this._hintEl.classList.add('visible');
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => {
      this._hintEl.classList.remove('visible');
    }, 1800);
  }

  update(camera, canvas) {
    for (let h = 0; h < 2; h++) {
      const indexPos = this.gestureEngine.indexTipPositions[h];
      const ps = this._fingertipParticles[h];

      if (indexPos && ps) {
        const worldPos = this.gestureEngine.toWorldPosition(indexPos, camera, canvas, 5.5);
        if (worldPos) {
          if (!ps.isStarted()) ps.start();
          ps.emitter = worldPos;
        }
      } else if (ps && ps.isStarted()) {
        ps.stop();
      }
    }

    const gesture0 = this.gestureEngine.currentGestures[0];
    const indexPos0 = this.gestureEngine.indexTipPositions[0];
    if (gesture0 === Gestures.POINT && indexPos0) {
      const worldPos = this.gestureEngine.toWorldPosition(indexPos0, camera, canvas, 5);
      if (worldPos) {
        this._rayMesh.setEnabled(true);
        this._rayMesh.position = worldPos.add(new Vector3(0, 4, 0));
        this._rayMesh.lookAt(worldPos);
      }
    } else {
      this._rayMesh.setEnabled(false);
    }
  }

  dispose() {
    this._fingertipParticles.forEach(ps => ps && ps.dispose());
    this._rayMesh?.dispose();
  }
}
