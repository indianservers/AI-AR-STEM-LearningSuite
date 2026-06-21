import {
  MeshBuilder, StandardMaterial, DynamicTexture, Color3, Vector3,
  PointLight,
} from '@babylonjs/core';
import { ASTRO_CONFIG } from './astroConfig.js';
import { createSpaceDust, createStarfield, getQualityPreset } from './utils/astroVisualQuality.js';

export class AstroSceneManager {
  constructor(scene, sceneManager, environment) {
    this.scene = scene;
    this.sceneManager = sceneManager;
    this.environment = environment;
    this._disposables = new Set();
    this._labelMeshes = new Set();
    this._starfield = null;
    this._spaceDust = null;
    this._statusEl = null;
  }

  beginScene(preset = 'hub') {
    this.cleanup();
    this.applyCameraPreset(preset);
    this.addStarfield();
  }

  applyCameraPreset(presetName) {
    const preset = ASTRO_CONFIG.cameraPresets[presetName] || ASTRO_CONFIG.cameraPresets.hub;
    const camera = this.scene.activeCamera || this.sceneManager.camera;
    if (!camera) return;
    camera.alpha = preset.alpha;
    camera.beta = preset.beta;
    camera.radius = preset.radius;
    camera.target = preset.target.clone();
  }

  createMaterial(name, color, options = {}) {
    const mat = new StandardMaterial(`astro_${name}`, this.scene);
    mat.diffuseColor = color;
    mat.emissiveColor = options.emissive ? color.scale(options.emissive) : Color3.Black();
    mat.alpha = options.alpha ?? 1;
    mat.backFaceCulling = options.backFaceCulling ?? true;
    this.track(mat);
    return mat;
  }

  createOrbitRing(name, radius, color = new Color3(0.35, 0.55, 1)) {
    const points = [];
    const steps = 160;
    for (let i = 0; i <= steps; i++) {
      const angle = (Math.PI * 2 * i) / steps;
      points.push(new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    const ring = MeshBuilder.CreateLines(`astro_orbit_${name}`, { points }, this.scene);
    ring.color = color;
    ring.isPickable = false;
    this.track(ring);
    return ring;
  }

  createLabel(text, position, options = {}) {
    const width = options.width || ASTRO_CONFIG.labels.width;
    const height = options.height || ASTRO_CONFIG.labels.height;
    const plane = MeshBuilder.CreatePlane(`astro_label_${text.replace(/\W+/g, '_')}`, { width, height }, this.scene);
    plane.position = position.clone();
    plane.billboardMode = 7;
    plane.isPickable = false;

    const tex = new DynamicTexture(`astro_label_tex_${text}`, { width: 512, height: 128 }, this.scene);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = ASTRO_CONFIG.labels.background;
    ctx.fillRect(0, 0, 512, 128);
    ctx.font = options.font || ASTRO_CONFIG.labels.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ASTRO_CONFIG.labels.color;
    ctx.fillText(text, 256, 64);
    tex.update();

    const mat = new StandardMaterial(`astro_label_mat_${text}`, this.scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    plane.material = mat;
    this.track(tex);
    this.track(mat);
    this.track(plane);
    this._labelMeshes.add(plane);
    return plane;
  }

  setLabelsVisible(visible) {
    this._labelMeshes.forEach(label => label.setEnabled(visible));
  }

  addStarfield(count = 900) {
    const preset = getQualityPreset();
    const stars = createStarfield(this.scene, { count, preset, radius: 140 });
    const dust = createSpaceDust(this.scene, { preset, radius: 90 });
    this.track(stars.texture);
    this.track(stars.particles);
    this.track(dust.texture);
    this.track(dust.particles);
    this._starfield = stars;
    this._spaceDust = dust;
    return stars;
  }

  addLight(name, position, color, intensity = 1.2) {
    const light = new PointLight(`astro_${name}`, position, this.scene);
    light.diffuse = color;
    light.intensity = intensity;
    this.track(light);
    return light;
  }

  showStatus(message) {
    if (!this._statusEl) {
      const el = document.createElement('div');
      el.className = 'astro-toast';
      document.body.appendChild(el);
      this._statusEl = el;
    }
    this._statusEl.textContent = message;
    this._statusEl.classList.add('visible');
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => this._statusEl?.classList.remove('visible'), 2600);
  }

  track(resource) {
    if (resource) this._disposables.add(resource);
    return resource;
  }

  cleanup() {
    this._labelMeshes.clear();
    this._disposables.forEach(resource => {
      try {
        resource.stop?.();
        resource.dispose?.();
      } catch (_) {}
    });
    this._disposables.clear();
    this._starfield = null;
    this._spaceDust = null;
  }

  dispose() {
    this.cleanup();
    this._statusEl?.remove();
    this._statusEl = null;
  }
}
