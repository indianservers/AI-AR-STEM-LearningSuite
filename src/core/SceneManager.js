import {
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight,
  DirectionalLight, Color3, Color4, PointLight, DefaultRenderingPipeline
} from '@babylonjs/core';

export class SceneManager {
  constructor() {
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.pipeline = null;
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
    this.scene.clearColor = new Color4(0.005, 0.008, 0.02, 1);
    this.scene.fogMode = 2;
    this.scene.fogColor = new Color3(0.01, 0.025, 0.065);
    this.scene.fogDensity = 0.012;

    this._setupCamera(canvas);
    this._setupLights();
    this._setupPostFX();

    this.engine.runRenderLoop(() => {
      this.scene.render();
      this._updateFPS();
    });

    window.addEventListener('resize', () => this.engine.resize());

    return { engine: this.engine, scene: this.scene };
  }

  _setupCamera(canvas) {
    this.camera = new ArcRotateCamera(
      'mainCam',
      -Math.PI / 2.15,
      Math.PI / 2.75,
      20,
      new Vector3(0, 0.15, 0),
      this.scene
    );
    this.camera.lowerRadiusLimit = 2;
    this.camera.upperRadiusLimit = 80;
    this.camera.wheelDeltaPercentage = 0.01;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1000;
    this.camera.fov = 0.72;
    this.camera.inertia = 0.72;
    this.camera.panningInertia = 0.72;
    this.camera.attachControl(canvas, true);
    this.camera.useBouncingBehavior = true;
    this.camera.useAutoRotationBehavior = false;
  }

  _setupLights() {
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.22;
    hemi.diffuse = new Color3(0.35, 0.55, 1.0);
    hemi.groundColor = new Color3(0.08, 0.035, 0.12);

    const key = new DirectionalLight('keyLight', new Vector3(-0.85, -1.65, -0.7), this.scene);
    key.intensity = 1.05;
    key.diffuse = new Color3(0.86, 0.93, 1.0);

    const blueRim = new PointLight('blueRim', new Vector3(-8, -4, 8), this.scene);
    blueRim.intensity = 0.85;
    blueRim.diffuse = new Color3(0.05, 0.35, 1.0);
    blueRim.range = 46;

    const warmEdge = new PointLight('warmEdge', new Vector3(9, 5, -6), this.scene);
    warmEdge.intensity = 0.48;
    warmEdge.diffuse = new Color3(1.0, 0.55, 0.22);
    warmEdge.range = 50;
  }

  _setupPostFX() {
    try {
      const pipeline = new DefaultRenderingPipeline('cinematicPipeline', true, this.scene, [this.camera]);
      pipeline.fxaaEnabled = true;
      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 0.28;
      pipeline.bloomWeight = 0.22;
      pipeline.bloomKernel = 72;
      pipeline.imageProcessingEnabled = true;
      pipeline.imageProcessing.contrast = 1.18;
      pipeline.imageProcessing.exposure = 1.08;
      pipeline.imageProcessing.toneMappingEnabled = true;
      pipeline.chromaticAberrationEnabled = true;
      pipeline.chromaticAberration.aberrationAmount = 3;
      pipeline.vignetteEnabled = true;
      pipeline.vignetteWeight = 1.8;
      pipeline.vignetteStretch = 0.55;
      pipeline.vignetteColor = new Color4(0, 0, 0.02, 1);
      this.pipeline = pipeline;
    } catch (err) {
      console.warn('Cinematic post-processing unavailable:', err);
    }
  }

  _updateFPS() {
    if (!this._fpsEl) return;
    const fps = Math.round(this.engine.getFps());
    this._fpsHistory.push(fps);
    if (this._fpsHistory.length > 30) this._fpsHistory.shift();
    const avg = Math.round(this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length);
    this._fpsEl.textContent = `${avg} fps`;
  }

  lockCamera() {
    this.camera.detachControl();
  }

  unlockCamera() {
    this.camera.attachControl(document.getElementById('renderCanvas'), true);
  }

  setTarget(vec3) {
    this.camera.target = vec3;
  }

  resetCamera() {
    this.camera.alpha = -Math.PI / 2.15;
    this.camera.beta = Math.PI / 2.75;
    this.camera.radius = 20;
    this.camera.target = new Vector3(0, 0.15, 0);
  }
}
