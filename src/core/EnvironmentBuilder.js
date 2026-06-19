import {
  MeshBuilder, StandardMaterial, Color3, Color4, Vector3,
  ParticleSystem, DynamicTexture, GlowLayer, HighlightLayer
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
    const stars = new ParticleSystem('stars', 6500, this.scene);

    const starTex = new DynamicTexture('starTex', { width: 8, height: 8 }, this.scene);
    const ctx = starTex.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    starTex.update();
    stars.particleTexture = starTex;

    stars.createSphereEmitter(340, 1);
    stars.minEmitPower = 0;
    stars.maxEmitPower = 0;
    stars.minLifeTime = 99999;
    stars.maxLifeTime = 99999;
    stars.emitRate = 6500;
    stars.minSize = 0.05;
    stars.maxSize = 0.42;
    stars.color1 = new Color4(1, 1, 1, 1);
    stars.color2 = new Color4(0.45, 0.72, 1, 0.72);
    stars.colorDead = new Color4(0, 0, 0, 0);
    stars.blendMode = ParticleSystem.BLENDMODE_ADD;
    stars.gravity = Vector3.Zero();
    stars.start();

    this._starSystem = stars;
  }

  _buildNebulaRings() {
    const colors = [
      new Color3(0.08, 0.32, 0.95),
      new Color3(0.62, 0.12, 0.74),
      new Color3(0.02, 0.55, 0.82),
      new Color3(1.0, 0.38, 0.12),
    ];
    const params = [
      { diameter: 64, thickness: 7, y: -7, z: -8, rx: 0.42, ry: -0.15 },
      { diameter: 92, thickness: 5, y: 12, z: 12, rx: -0.25, ry: 0.55 },
      { diameter: 126, thickness: 4, y: 0, z: -18, rx: 0.75, ry: 0.18 },
      { diameter: 154, thickness: 3, y: 18, z: 28, rx: -0.65, ry: -0.38 },
    ];

    params.forEach((p, i) => {
      const torus = MeshBuilder.CreateTorus(`nebula${i}`, {
        diameter: p.diameter,
        thickness: p.thickness,
        tessellation: 48,
      }, this.scene);
      torus.position.y = p.y;
      torus.position.z = p.z;
      torus.rotation.x = p.rx;
      torus.rotation.y = p.ry;

      const mat = new StandardMaterial(`nebulaMat${i}`, this.scene);
      mat.emissiveColor = colors[i % colors.length];
      mat.alpha = 0.075;
      mat.backFaceCulling = false;
      torus.material = mat;
      torus.isPickable = false;

      this._nebulaMeshes.push(torus);
    });
  }

  _buildGlowLayers() {
    this.glowLayer = new GlowLayer('glow', this.scene);
    this.glowLayer.intensity = 1.18;

    this.highlightLayer = new HighlightLayer('highlight', this.scene);
    this.highlightLayer.innerGlow = true;
    this.highlightLayer.outerGlow = true;
  }

  _buildFloatingGrid() {
    const ground = MeshBuilder.CreateGround('grid', { width: 48, height: 48, subdivisions: 24 }, this.scene);
    ground.position.y = -4.4;
    ground.isPickable = false;

    const mat = new StandardMaterial('gridMat', this.scene);
    mat.wireframe = true;
    mat.emissiveColor = new Color3(0.03, 0.13, 0.28);
    mat.alpha = 0.16;
    ground.material = mat;
  }

  highlight(mesh, color = new Color3(0, 0.85, 1)) {
    this.highlightLayer.addMesh(mesh, color);
  }

  unhighlight(mesh) {
    this.highlightLayer.removeMesh(mesh);
  }

  update(deltaTime) {
    this._nebulaMeshes.forEach((mesh, i) => {
      mesh.rotation.y += (i % 2 === 0 ? 0.00007 : -0.000045) * deltaTime;
      mesh.rotation.z += (i % 2 === 0 ? 0.000018 : -0.000014) * deltaTime;
    });
  }
}
