import {
  MeshBuilder, StandardMaterial, Color3, Vector3, TransformNode
} from '@babylonjs/core';

// MediaPipe hand bone connections (pairs of landmark indices)
const BONES = [
  [0,1],[1,2],[2,3],[3,4],           // thumb
  [0,5],[5,6],[6,7],[7,8],           // index
  [0,9],[9,10],[10,11],[11,12],      // middle
  [0,13],[13,14],[14,15],[15,16],    // ring
  [0,17],[17,18],[18,19],[19,20],    // pinky
  [5,9],[9,13],[13,17],              // palm cross
];

const HAND_COLORS = [
  new Color3(0, 0.85, 1),    // left hand — cyan
  new Color3(1, 0.4, 0.1),   // right hand — orange
];

export class HandVisualizer {
  constructor(scene, gestureEngine) {
    this.scene = scene;
    this.gestureEngine = gestureEngine;
    this._joints = [[], []];   // sphere meshes per hand
    this._bones  = [[], []];   // cylinder meshes per hand
    this._roots  = [null, null];
    this._init();
  }

  _init() {
    for (let h = 0; h < 2; h++) {
      this._roots[h] = new TransformNode(`handRoot${h}`, this.scene);

      // 21 joint spheres
      for (let j = 0; j < 21; j++) {
        const sphere = MeshBuilder.CreateSphere(`jnt_${h}_${j}`, { diameter: 0.06, segments: 4 }, this.scene);
        sphere.parent = this._roots[h];
        sphere.isPickable = false;

        const mat = new StandardMaterial(`jntMat_${h}_${j}`, this.scene);
        mat.emissiveColor = HAND_COLORS[h];
        mat.disableLighting = true;
        sphere.material = mat;
        sphere.setEnabled(false);
        this._joints[h].push(sphere);
      }

      // Bone cylinders
      BONES.forEach((_, i) => {
        const cyl = MeshBuilder.CreateCylinder(`bone_${h}_${i}`, {
          height: 1,
          diameter: 0.025,
          tessellation: 4,
        }, this.scene);
        cyl.parent = this._roots[h];
        cyl.isPickable = false;

        const mat = new StandardMaterial(`boneMat_${h}_${i}`, this.scene);
        mat.emissiveColor = HAND_COLORS[h].scale(0.5);
        mat.alpha = 0.7;
        mat.disableLighting = true;
        cyl.material = mat;
        cyl.setEnabled(false);
        this._bones[h].push(cyl);
      });
    }
  }

  /** Call every frame with gesture engine results and camera ref */
  update(camera, canvas) {
    for (let h = 0; h < 2; h++) {
      const lmPos = this.gestureEngine.wristPositions[h];
      const indexPos = this.gestureEngine.indexTipPositions[h];

      if (!lmPos) {
        this._setVisible(h, false);
        continue;
      }
      this._setVisible(h, true);

      // We need raw landmarks — fetch from gestureEngine's last results
      // They are stored on the engine from the last process() call
      const rawLandmarks = this._getRawLandmarks(h);
      if (!rawLandmarks) continue;

      const world = rawLandmarks.map(lm => this._toWorld(lm, camera, canvas));

      // Update joints
      world.forEach((pos, j) => {
        if (pos) this._joints[h][j].position.copyFrom(pos);
      });

      // Update bones
      BONES.forEach(([a, b], i) => {
        const pa = world[a], pb = world[b];
        if (!pa || !pb) return;
        const mid = pa.add(pb).scale(0.5);
        const len = Vector3.Distance(pa, pb);
        const bone = this._bones[h][i];
        bone.position.copyFrom(mid);

        const dir = pb.subtract(pa).normalize();
        const up = new Vector3(0, 1, 0);
        const axis = Vector3.Cross(up, dir).normalize();
        const angle = Math.acos(Vector3.Dot(up, dir));
        bone.rotationQuaternion = null;
        bone.rotation = Vector3.Zero();
        if (axis.length() > 0.001) {
          bone.rotate(axis, angle);
        }
        bone.scaling.y = len;
      });
    }
  }

  _getRawLandmarks(handIdx) {
    // GestureEngine stores last results array
    if (!this.gestureEngine._lastLandmarks) return null;
    return this.gestureEngine._lastLandmarks[handIdx] || null;
  }

  _toWorld(lm, camera, canvas) {
    const sx = (1 - lm.x) * canvas.clientWidth;
    const sy = lm.y * canvas.clientHeight;
    const depth = 5 + (lm.z || 0) * 8;
    try {
      const ray = camera.getScene().createPickingRay(sx, sy, null, camera);
      if (!ray) return null;
      return ray.origin.add(ray.direction.scale(depth));
    } catch (_) {
      return null;
    }
  }

  _setVisible(h, visible) {
    this._joints[h].forEach(m => m.setEnabled(visible));
    this._bones[h].forEach(m => m.setEnabled(visible));
  }

  dispose() {
    for (let h = 0; h < 2; h++) {
      this._joints[h].forEach(m => m.dispose());
      this._bones[h].forEach(m => m.dispose());
    }
  }
}
