import {
  MeshBuilder, StandardMaterial, Color3, Color4, Vector3,
  ParticleSystem, DynamicTexture,
  GlowLayer, HighlightLayer
} from '@babylonjs/core';

export class EnvironmentBuilder {
  constructor(scene) {
    this.scene = scene;
    this.glowLayer = null;
    this.highlightLayer = null;
    this._starSystem = null;
    this._nebulaMeshes = [];
  }

  build() {
    this._buildStarfield();
    this._buildNebulaRings();
    this._buildGlowLayers();
    this._buildFloatingGrid();
  }

  _buildStarfield() {
    // GPU particle starfield — 4000 stars
    const stars = new ParticleSystem('stars', 4000, this.scene);

    // Use a tiny procedural white dot as emitter texture
    const starTex = new DynamicTexture('starTex', { width: 8, height: 8 }, this.scene);
    const ctx = starTex.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    starTex.update();
    stars.particleTexture = starTex;

    // Emit from a large sphere surface
    stars.createSphereEmitter(280, 1);

    stars.minEmitPower = 0;
    stars.maxEmitPower = 0;
    stars.minLifeTime = 99999;
    stars.maxLifeTime = 99999;
    stars.emitRate = 4000;
    stars.minSize = 0.08;
    stars.maxSize = 0.35;
    stars.color1 = new Color4(1, 1, 1, 1);
    stars.color2 = new Color4(0.7, 0.85, 1, 0.8);
    stars.colorDead = new Color4(0, 0, 0, 0);
    stars.blendMode = ParticleSystem.BLENDMODE_ADD;
    stars.gravity = Vector3.Zero();
    stars.start();

    this._starSystem = stars;
  }

  _buildNebulaRings() {
    // Soft glowing torus rings as nebula suggestion
    const colors = [
      new Color3(0.1, 0.3, 0.7),
      new Color3(0.4, 0.1, 0.6),
      new Color3(0.05, 0.2, 0.5),
    ];
    const params = [
      { diameter: 60, thickness: 8, y: -5, rx: 0.4, ry: 0 },
      { diameter: 90, thickness: 6, y: 10, rx: -0.3, ry: 0.5 },
      { diameter: 120, thickness: 5, y: 0,  rx: 0.8, ry: 0.2 },
    ];

    params.forEach((p, i) => {
      const torus = MeshBuilder.CreateTorus(`nebula${i}`, {
        diameter: p.diameter,
        thickness: p.thickness,
        tessellation: 32,
      }, this.scene);
      torus.position.y = p.y;
      torus.rotation.x = p.rx;
      torus.rotation.y = p.ry;

      const mat = new StandardMaterial(`nebulaMat${i}`, this.scene);
      mat.emissiveColor = colors[i % colors.length];
      mat.alpha = 0.06;
      mat.backFaceCulling = false;
      torus.material = mat;
      torus.isPickable = false;

      this._nebulaMeshes.push(torus);
    });
  }

  _buildGlowLayers() {
    this.glowLayer = new GlowLayer('glow', this.scene);
    this.glowLayer.intensity = 0.8;

    this.highlightLayer = new HighlightLayer('highlight', this.scene);
    this.highlightLayer.innerGlow = true;
    this.highlightLayer.outerGlow = true;
  }

  _buildFloatingGrid() {
    // Faint reference grid at y = -3
    const ground = MeshBuilder.CreateGround('grid', { width: 40, height: 40, subdivisions: 20 }, this.scene);
    ground.position.y = -4;
    ground.isPickable = false;

    const mat = new StandardMaterial('gridMat', this.scene);
    mat.wireframe = true;
    mat.emissiveColor = new Color3(0.05, 0.15, 0.3);
    mat.alpha = 0.25;
    ground.material = mat;
  }

  /** Highlight a mesh with neon glow */
  highlight(mesh, color = new Color3(0, 0.85, 1)) {
    this.highlightLayer.addMesh(mesh, color);
  }

  unhighlight(mesh) {
    this.highlightLayer.removeMesh(mesh);
  }

  /** Smoothly rotate nebula rings for ambient motion */
  update(deltaTime) {
    this._nebulaMeshes.forEach((m, i) => {
      m.rotation.y += (i % 2 === 0 ? 0.00005 : -0.00003) * deltaTime;
    });
  }
}
