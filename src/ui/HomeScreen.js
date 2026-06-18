import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3,
  Animation, ParticleSystem, DynamicTexture, Color4
} from '@babylonjs/core';

const SUBJECTS = [
  {
    id: 'math',
    label: 'Mathematics',
    color: new Color3(0, 0.84, 1),
    pos: new Vector3(-5, 0, 0),
    summary: 'A portal into graphs, geometry, vectors, functions, patterns, and transformations.',
  },
  {
    id: 'physics',
    label: 'Physics',
    color: new Color3(1, 0.42, 0.13),
    pos: new Vector3(0, 0, 0),
    summary: 'A portal into forces, motion, waves, energy, circuits, gravity, and fields.',
  },
  {
    id: 'chem',
    label: 'Chemistry',
    color: new Color3(0.5, 1, 0.5),
    pos: new Vector3(5, 0, 0),
    summary: 'A portal into atoms, molecules, bonds, orbitals, reactions, and matter.',
  },
];

export class HomeScreen {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._orbs = [];
    this._onSelect = null;
    this._active = false;
    this._t = 0;
  }

  show(onSelect) {
    this._onSelect = onSelect;
    this._active = true;
    this._buildOrbs();
    document.getElementById('back-btn').classList.add('hidden');
    document.getElementById('home-btn').classList.add('hidden');
  }

  hide() {
    this._active = false;
    this._orbs.forEach(({ mesh, label, ring, particles }) => {
      this.interaction.unregister(mesh);
      mesh.dispose();
      label.dispose();
      ring.dispose();
      particles.dispose();
    });
    this._orbs = [];
  }

  _buildOrbs() {
    SUBJECTS.forEach((subj, i) => {
      const orb = MeshBuilder.CreateSphere(`portal_${subj.id}`, { diameter: 2, segments: 32 }, this.scene);
      orb.position = subj.pos.clone();

      const mat = new PBRMaterial(`orbMat_${subj.id}`, this.scene);
      mat.emissiveColor = subj.color;
      mat.albedoColor = subj.color.scale(0.32);
      mat.metallic = 0.15;
      mat.roughness = 0.35;
      mat.alpha = 0.94;
      orb.material = mat;

      const ring = MeshBuilder.CreateTorus(`ring_${subj.id}`, {
        diameter: 3.2, thickness: 0.08, tessellation: 64,
      }, this.scene);
      ring.position = subj.pos.clone();
      const ringMat = new StandardMaterial(`ringMat_${subj.id}`, this.scene);
      ringMat.emissiveColor = subj.color;
      ringMat.alpha = 0.6;
      ring.material = ringMat;
      ring.isPickable = false;
      this.env.glowLayer?.addIncludedOnlyMesh(ring);

      const label = this._makeLabel(subj);
      label.position = subj.pos.add(new Vector3(0, -1.9, 0));

      const ps = new ParticleSystem(`orbPS_${subj.id}`, 110, this.scene);
      const tex = new DynamicTexture(`orbTex_${subj.id}`, { width: 8, height: 8 }, this.scene);
      const ctx = tex.getContext();
      ctx.fillStyle = `rgb(${Math.round(subj.color.r * 255)},${Math.round(subj.color.g * 255)},${Math.round(subj.color.b * 255)})`;
      ctx.beginPath(); ctx.arc(4, 4, 3, 0, Math.PI * 2); ctx.fill();
      tex.update();
      ps.particleTexture = tex;
      ps.emitter = orb.position;
      ps.createSphereEmitter(1.25, 0.5);
      ps.minEmitPower = 0.3; ps.maxEmitPower = 0.95;
      ps.minLifeTime = 0.8; ps.maxLifeTime = 2.0;
      ps.emitRate = 36;
      ps.minSize = 0.03; ps.maxSize = 0.12;
      ps.color1 = new Color4(subj.color.r, subj.color.g, subj.color.b, 1);
      ps.color2 = new Color4(subj.color.r, subj.color.g, subj.color.b, 0.45);
      ps.colorDead = new Color4(0, 0, 0, 0);
      ps.blendMode = ParticleSystem.BLENDMODE_ADD;
      ps.gravity = new Vector3(0, 0.2, 0);
      ps.start();

      this.interaction.register(orb, () => {
        this._popOrb(orb, ring);
        this._onSelect?.(subj.id);
      }, (dist) => {
        const near = Math.max(0, 1 - dist / 2);
        orb.scaling.setAll(1 + near * 0.16);
        ring.scaling.setAll(1 + near * 0.1);
      }, {
        metadata: {
          title: `${subj.label} Portal`,
          type: 'Subject Portal',
          summary: subj.summary,
          question: `What kind of ${subj.label.toLowerCase()} experiment do you want to try first?`,
        },
        capabilities: {
          canMove: false,
          canThrow: false,
          minScale: 0.8,
          maxScale: 1.4,
        },
      });

      this._orbs.push({ mesh: orb, label, ring, particles: ps, subj, seed: i * 1.2 });
    });
  }

  _makeLabel(subj) {
    const plane = MeshBuilder.CreatePlane(`label_${subj.id}`, { width: 3.2, height: 0.72 }, this.scene);
    plane.isPickable = false;

    const tex = new DynamicTexture(`labelTex_${subj.id}`, { width: 512, height: 128 }, this.scene);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(5, 10, 26, 0.72)';
    this._roundRect(ctx, 12, 20, 488, 88, 24);
    ctx.fill();
    ctx.strokeStyle = `rgb(${Math.round(subj.color.r * 255)}, ${Math.round(subj.color.g * 255)}, ${Math.round(subj.color.b * 255)})`;
    ctx.lineWidth = 3;
    this._roundRect(ctx, 12, 20, 488, 88, 24);
    ctx.stroke();
    ctx.font = '700 34px Segoe UI, Arial, sans-serif';
    ctx.fillStyle = '#e8f4ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(subj.label, 256, 64);
    tex.update();

    const mat = new StandardMaterial(`labelMat_${subj.id}`, this.scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    plane.material = mat;
    return plane;
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  _popOrb(orb, ring) {
    Animation.CreateAndStartAnimation('orbPop', orb, 'scaling', 60, 16,
      new Vector3(1.18, 1.18, 1.18), Vector3.One(), Animation.ANIMATIONLOOPMODE_CONSTANT);
    Animation.CreateAndStartAnimation('ringPop', ring, 'scaling', 60, 16,
      new Vector3(1.28, 1.28, 1.28), Vector3.One(), Animation.ANIMATIONLOOPMODE_CONSTANT);
  }

  update(deltaTime) {
    if (!this._active) return;
    this._t += deltaTime * 0.001;
    this._orbs.forEach(({ mesh, label, ring, seed }, i) => {
      mesh.position.y = Math.sin(this._t + seed) * 0.3;
      ring.position.y = mesh.position.y;
      label.position.y = mesh.position.y - 1.9;
      if (this.scene.activeCamera) label.lookAt(this.scene.activeCamera.position);
      mesh.scaling = Vector3.Lerp(mesh.scaling, Vector3.One(), 0.05);
      ring.scaling = Vector3.Lerp(ring.scaling, Vector3.One(), 0.05);
      ring.rotation.y = this._t * 0.4 + i * 0.8;
      ring.rotation.x = Math.sin(this._t * 0.3 + i) * 0.3;
      mesh.rotation.y += 0.006 + i * 0.001;
    });
  }
}
