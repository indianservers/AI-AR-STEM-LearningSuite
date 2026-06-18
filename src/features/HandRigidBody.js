import {
  MeshBuilder,
  Vector3,
  StandardMaterial,
  Color3,
  PhysicsImpostor,
} from '@babylonjs/core';

const GLOVE_DIAMETER = 0.25;
const GLOVE_RADIUS = GLOVE_DIAMETER / 2;
const COLLISION_RANGE = 0.5;
const IMPULSE_SCALE = 5;

export class HandRigidBody {
  constructor(scene, gestureEngine) {
    this._scene = scene;
    this._ge = gestureEngine;
    this._active = false;

    this._handSpheres = [null, null];
    this._prevPos = [null, null];
    this._vel = [Vector3.Zero(), Vector3.Zero()];
    this._physicsAvailable = false;

    this._domEl = null;
    this._badgeEl = null;
    this._physicsOn = true;
  }

  activate() {
    if (this._active) return;
    this._active = true;

    // Detect physics availability
    try {
      const engine = this._scene.getPhysicsEngine && this._scene.getPhysicsEngine();
      this._physicsAvailable = !!engine;
    } catch (e) {
      this._physicsAvailable = false;
    }

    for (let h = 0; h < 2; h++) {
      const sphere = MeshBuilder.CreateSphere(`handGlove_${h}`, {
        diameter: GLOVE_DIAMETER,
        segments: 8,
      }, this._scene);

      const mat = new StandardMaterial(`handGloveMat_${h}`, this._scene);
      mat.diffuseColor = h === 0 ? new Color3(0.2, 0.8, 1.0) : new Color3(1.0, 0.5, 0.2);
      mat.alpha = 0.15;
      sphere.material = mat;
      sphere.isPickable = false;

      if (this._physicsAvailable) {
        try {
          sphere.physicsImpostor = new PhysicsImpostor(
            sphere,
            PhysicsImpostor.SphereImpostor,
            { mass: 0, restitution: 0.3, friction: 0.5 },
            this._scene
          );
        } catch (e) {
          this._physicsAvailable = false;
        }
      }

      this._handSpheres[h] = sphere;
      this._prevPos[h] = Vector3.Zero();
    }

    this._buildDOM();
  }

  deactivate() {
    if (!this._active) return;
    this._active = false;

    for (let h = 0; h < 2; h++) {
      if (this._handSpheres[h]) {
        if (this._handSpheres[h].physicsImpostor) {
          this._handSpheres[h].physicsImpostor.dispose();
        }
        this._handSpheres[h].dispose();
        this._handSpheres[h] = null;
      }
    }

    if (this._domEl) { this._domEl.remove(); this._domEl = null; }
  }

  update(camera, canvas, dt) {
    if (!this._active || !this._physicsOn) return;

    const dtSec = Math.max(dt / 1000, 0.001);

    for (let h = 0; h < 2; h++) {
      let pos = null;

      if (this._ge && this._ge.toWorldPosition) {
        pos = this._ge.toWorldPosition(h);
      }

      if (!pos) continue;

      const sphere = this._handSpheres[h];
      if (!sphere) continue;

      // Teleport (not lerp) for accurate physics
      sphere.position.copyFrom(pos);

      // Compute velocity
      if (this._prevPos[h]) {
        this._vel[h] = pos.subtract(this._prevPos[h]).scale(1 / dtSec);
      }
      this._prevPos[h] = pos.clone();

      // Physics impulse on nearby meshes
      if (this._vel[h].length() > 0.1) {
        this._checkCollisionsFor(h, pos);
      }
    }
  }

  _checkCollisionsFor(handIndex, handPos) {
    const meshes = this._scene.meshes;
    for (const mesh of meshes) {
      if (
        !mesh.isEnabled() ||
        mesh === this._handSpheres[0] ||
        mesh === this._handSpheres[1] ||
        !mesh.physicsImpostor ||
        mesh.physicsImpostor.mass === 0
      ) continue;

      const meshPos = mesh.getAbsolutePosition();
      const dist = Vector3.Distance(handPos, meshPos);

      if (dist < COLLISION_RANGE + GLOVE_RADIUS) {
        const impulse = this._vel[handIndex].scale(IMPULSE_SCALE);
        const contactPoint = handPos.add(meshPos).scale(0.5);
        try {
          mesh.physicsImpostor.applyImpulse(impulse, contactPoint);
        } catch (e) { /* ignore */ }
        console.log(`HandRigidBody: collision with ${mesh.name} (hand ${handIndex})`);
      }
    }

    // Proximity-based force fallback (no physics engine)
    if (!this._physicsAvailable) {
      for (const mesh of meshes) {
        if (
          !mesh.isEnabled() ||
          mesh === this._handSpheres[0] ||
          mesh === this._handSpheres[1]
        ) continue;
        const meshPos = mesh.getAbsolutePosition();
        const dist = Vector3.Distance(handPos, meshPos);
        if (dist < COLLISION_RANGE) {
          const push = meshPos.subtract(handPos).normalize().scale(this._vel[handIndex].length() * 0.05);
          mesh.position.addInPlace(push);
          console.log(`HandRigidBody: collision (kinematic) with ${mesh.name}`);
        }
      }
    }
  }

  _buildDOM() {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; top:20px; left:50%; transform:translateX(-50%);
      background:rgba(10,20,40,0.92); border:1px solid rgba(0,212,255,0.3);
      border-radius:20px; color:#e8f4ff; padding:6px 16px; z-index:2000;
      font-family:monospace; font-size:12px; display:flex; align-items:center; gap:10px;
    `;
    el.innerHTML = `
      <span id="hrpBadge" style="color:#00ffaa;font-weight:bold">Hand Physics ON</span>
      <button id="hrpToggle" style="padding:4px 10px;background:rgba(0,150,255,0.3);
        border:1px solid rgba(0,212,255,0.5);border-radius:8px;color:#e8f4ff;cursor:pointer;font-size:11px">
        Toggle
      </button>
    `;
    document.body.appendChild(el);
    this._domEl = el;
    this._badgeEl = el.querySelector('#hrpBadge');

    el.querySelector('#hrpToggle').addEventListener('click', () => {
      this._physicsOn = !this._physicsOn;
      this._badgeEl.textContent = `Hand Physics ${this._physicsOn ? 'ON' : 'OFF'}`;
      this._badgeEl.style.color = this._physicsOn ? '#00ffaa' : '#ff6666';
      for (const s of this._handSpheres) {
        if (s) s.setEnabled(this._physicsOn);
      }
    });
  }
}
