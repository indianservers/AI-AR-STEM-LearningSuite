import {
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight,
  DirectionalLight, Color3, Color4, PointLight,
  MeshBuilder, StandardMaterial
} from '@babylonjs/core';

export class SceneManager {
  constructor() {
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this._fpsHistory = [];
    this._fpsEl = document.getElementById('fps-counter');
  }

  async init(canvas) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
      powerPreference: 'high-performance',
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.02, 0.04, 0.1, 1);

    // Subtle exponential fog for depth (Scene.FOGMODE_EXP2 = 2)
    this.scene.fogMode = 2;
    this.scene.fogColor = new Color3(0.02, 0.05, 0.12);
    this.scene.fogDensity = 0.015;

    this._setupCamera(canvas);
    this._setupLights();

    // Render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
      this._updateFPS();
    });

    window.addEventListener('resize', () => this.engine.resize());

    return { engine: this.engine, scene: this.scene };
  }

  _setupCamera(canvas) {
    this.camera = new ArcRotateCamera('mainCam', -Math.PI / 2, Math.PI / 3, 18, Vector3.Zero(), this.scene);
    this.camera.lowerRadiusLimit = 2;
    this.camera.upperRadiusLimit = 80;
    this.camera.wheelDeltaPercentage = 0.01;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1000;
    this.camera.attachControl(canvas, true);
    this.camera.useBouncingBehavior = true;
    this.camera.useAutoRotationBehavior = false;
  }

  _setupLights() {
    // Ambient hemisphere — warm ground, cool sky
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.35;
    hemi.diffuse = new Color3(0.6, 0.8, 1.0);
    hemi.groundColor = new Color3(0.1, 0.05, 0.15);

    // Key directional light
    const dir = new DirectionalLight('dir', new Vector3(-1, -2, -1), this.scene);
    dir.intensity = 0.7;
    dir.diffuse = new Color3(0.9, 0.95, 1.0);

    // Rim fill — blue glow from below
    const rim = new PointLight('rim', new Vector3(0, -8, 0), this.scene);
    rim.intensity = 0.4;
    rim.diffuse = new Color3(0.1, 0.4, 0.8);
    rim.range = 40;
  }

  _updateFPS() {
    if (!this._fpsEl) return;
    const fps = Math.round(this.engine.getFps());
    this._fpsHistory.push(fps);
    if (this._fpsHistory.length > 30) this._fpsHistory.shift();
    const avg = Math.round(this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length);
    this._fpsEl.textContent = `${avg} fps`;
  }

  /** Temporarily disable camera controls (during hand drag) */
  lockCamera() { this.camera.detachControl(); }
  unlockCamera() {
    this.camera.attachControl(document.getElementById('renderCanvas'), true);
  }

  setTarget(vec3) {
    this.camera.target = vec3;
  }

  resetCamera() {
    this.camera.alpha = -Math.PI / 2;
    this.camera.beta = Math.PI / 3;
    this.camera.radius = 18;
    this.camera.target = Vector3.Zero();
  }
}
