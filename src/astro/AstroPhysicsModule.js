import './astro.css';
import { ASTRO_SUBMODULES, getAstroSubmodule } from './astroRegistry.js';
import { AstroSceneManager } from './AstroSceneManager.js';
import { AstroHub } from './ui/AstroHub.js';
import { AstroToolbar } from './ui/AstroToolbar.js';
import { AstroInfoPanel } from './ui/AstroInfoPanel.js';
import { AstroTeacherPanel } from './ui/AstroTeacherPanel.js';
import { AstroSpectacleMode } from './ui/AstroSpectacleMode.js';
import { applySceneQuality, getQualityPreset, setQualityPreset } from './utils/astroVisualQuality.js';
import { enterAstroAR, enterAstroVR, exitAstroXR } from './utils/astroXR.js';
import { disableAstroGestures, enableAstroGestures as enableGestureBridge, handleAstroGesture as handleGestureBridge } from './utils/astroGestures.js';

export class AstroPhysicsModule {
  constructor(scene, interaction, environment, sceneManager, xrManager, gestureEngine) {
    this.scene = scene;
    this.interaction = interaction;
    this.environment = environment;
    this.sceneManager = sceneManager;
    this.xrManager = xrManager;
    this.gestureEngine = gestureEngine;
    this.astroScene = new AstroSceneManager(scene, sceneManager, environment);
    this.info = new AstroInfoPanel();
    this._qualityPreset = getQualityPreset();
    applySceneQuality(this.scene, this._qualityPreset);
    this._active = null;
    this._activeMeta = null;
    this._onLaunch = null;
    this._xrHelper = null;
    this._isVisible = false;
    this._hub = new AstroHub(ASTRO_SUBMODULES, id => {
      if (this._onLaunch) this._onLaunch(id);
      else this.showTopic(id);
    });
    this._toolbar = new AstroToolbar({
      onReset: () => this.resetView(),
      onPause: paused => this._active?.setPaused?.(paused),
      onLabels: visible => this._active?.setLabelsVisible?.(visible),
      onSpeed: speed => this._active?.setSpeed?.(speed),
      onQuality: preset => this.setVisualQuality(preset),
      onAR: () => this.enterARMode(),
      onVR: () => this.enterVRMode(),
      onGesture: () => this.enableAstroGestures(),
      onTeacher: () => this._teacherPanel.toggle(),
      onSpectacle: () => this._spectacle.toggle(),
      onHelp: () => this.showHelp(),
    });
    this._teacherPanel = new AstroTeacherPanel({
      getActive: () => this._active,
      onPause: paused => this._active?.setPaused?.(paused),
      onReset: () => this.resetView(),
    });
    this._spectacle = new AstroSpectacleMode({
      getActive: () => this._active,
    });
  }

  showHub() {
    this.hide();
    this._isVisible = true;
    this.astroScene.beginScene('hub');
    this._hub.show();
    this._toolbar.hide();
    this.info.hide();
  }

  setLaunchHandler(fn) {
    this._onLaunch = fn;
  }

  async showTopic(topicId) {
    const meta = getAstroSubmodule(topicId);
    if (!meta) return;
    this._hub.hide();
    this._active?.hide?.();
    this.astroScene.cleanup();

    this._activeMeta = meta;
    this.astroScene.showStatus(`Loading ${meta.title}...`);
    let SubmoduleClass;
    try {
      SubmoduleClass = await meta.load();
    } catch (error) {
      console.error(`Failed to load Astro submodule: ${topicId}`, error);
      this.astroScene.showStatus(`Could not load ${meta.title}. Please try again.`);
      this.showHub();
      return;
    }
    this._active = new SubmoduleClass({
      scene: this.scene,
      interaction: this.interaction,
      environment: this.environment,
      sceneManager: this.sceneManager,
      xrManager: this.xrManager,
      gestureEngine: this.gestureEngine,
      astroScene: this.astroScene,
      info: this.info,
      module: this,
    });
    this._active.show();
    this._toolbar.show();
    this._teacherPanel.hide();
    this._spectacle.hide();
  }

  setVisualQuality(preset) {
    this._qualityPreset = setQualityPreset(preset);
    applySceneQuality(this.scene, this._qualityPreset);
    this.astroScene.showStatus(`Astro visual quality: ${this._qualityPreset}`);
    return this._qualityPreset;
  }

  resetView() {
    const preset = this._activeMeta?.id === 'solar-system' ? 'solarSystem'
      : this._activeMeta?.id === 'ar-sky-map' ? 'skyMap'
      : this._activeMeta?.id === 'telescope' ? 'telescope'
      : this._activeMeta?.id === 'earth-moon-sun' ? 'earthMoonSun'
      : this._activeMeta?.id === 'galaxy-deep-space' ? 'galaxy'
      : 'hub';
    this.astroScene.applyCameraPreset(preset);
  }

  enterARMode() {
    this._active?.startARSkySession?.();
    if (this.xrManager?.toggleAR) this.xrManager.toggleAR();
    else enterAstroAR(this.scene).then(result => {
      this._xrHelper = result.helper || null;
      this.astroScene.showStatus(result.message);
    });
  }

  enterVRMode() {
    if (this.xrManager?.toggleVR) this.xrManager.toggleVR();
    else enterAstroVR(this.scene).then(result => {
      this._xrHelper = result.helper || null;
      this.astroScene.showStatus(result.message);
    });
  }

  enterMixedRealityMode() {
    this.astroScene.showStatus('Mixed Reality placeholder: MR spectacle integration comes later.');
  }

  exitXRMode() {
    exitAstroXR(this._xrHelper).then(result => this.astroScene.showStatus(result.message));
  }

  enableAstroGestures() {
    enableGestureBridge(this._gestureContext());
  }

  disableAstroGestures() {
    disableAstroGestures();
    this.astroScene.showStatus('Astro gesture mode disabled.');
  }

  handleAstroGesture(gesture) {
    if (!handleGestureBridge(gesture, this._gestureContext())) {
      this.astroScene.showStatus(`Astro gesture received: ${gesture}`);
    }
  }

  _gestureContext() {
    return {
      astroScene: this.astroScene,
      setPaused: value => this._active?.setPaused?.(value),
      isPaused: () => Boolean(this._active?._paused),
      zoomByGesture: amount => this._active?.zoomByGesture?.(amount),
      switchTargetByGesture: direction => this._active?.switchTargetByGesture?.(direction),
    };
  }

  showHelp() {
    this.astroScene.showStatus('Observe the concept, try the toolbar, then use Back to return to the Astro hub.');
  }

  hide() {
    this._hub.hide();
    this._toolbar.hide();
    this._teacherPanel.hide();
    this._spectacle.hide();
    this.info.hide();
    this._active?.hide?.();
    this._active = null;
    this._activeMeta = null;
    this.astroScene.cleanup();
    this._isVisible = false;
  }

  update(deltaTime) {
    this._active?.update?.(deltaTime);
  }

  getActiveLab() {
    return this._active;
  }

  get isVisible() {
    return this._isVisible;
  }
}
