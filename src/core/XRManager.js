/**
 * Manages WebXR sessions: VR (immersive-vr) and AR (immersive-ar).
 * Falls back gracefully when XR is unavailable.
 */
export class XRManager {
  constructor(scene, engine) {
    this.scene = scene;
    this.engine = engine;
    this._xrHelper = null;
    this._mode = 'desktop'; // 'desktop' | 'vr' | 'ar'
    this._modeBadge = document.getElementById('mode-badge');
    this._vrBtn = document.getElementById('vr-btn');
    this._arBtn = document.getElementById('ar-btn');
    this._onModeChange = null;
  }

  async init() {
    await this._checkSupport();
    this._vrBtn.addEventListener('click', () => this.toggleVR());
    this._arBtn.addEventListener('click', () => this.toggleAR());
  }

  async _checkSupport() {
    if (!navigator.xr) {
      this._vrBtn.disabled = true;
      this._arBtn.disabled = true;
      return;
    }

    const vrSupported = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
    const arSupported = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);

    if (!vrSupported) this._vrBtn.disabled = true;
    if (!arSupported) this._arBtn.disabled = true;
  }

  async toggleVR() {
    if (this._mode === 'vr') {
      await this._exitXR();
      return;
    }
    try {
      this._xrHelper = await this.scene.createDefaultXRExperienceAsync({
        uiOptions: { sessionMode: 'immersive-vr' },
        optionalFeatures: true,
      });
      this._mode = 'vr';
      this._updateBadge();
      this._vrBtn.textContent = 'Exit VR';
      this._xrHelper.baseExperience.onStateChangedObservable.add((state) => {
        if (state === 0) { // NOT_IN_XR
          this._mode = 'desktop';
          this._updateBadge();
          this._vrBtn.textContent = 'VR';
        }
      });
      this._onModeChange?.('vr');
    } catch (err) {
      console.warn('VR entry failed:', err);
    }
  }

  async toggleAR() {
    if (this._mode === 'ar') {
      await this._exitXR();
      return;
    }
    try {
      this._xrHelper = await this.scene.createDefaultXRExperienceAsync({
        uiOptions: { sessionMode: 'immersive-ar' },
        optionalFeatures: ['hit-test', 'light-estimation', 'anchors'],
      });
      this._mode = 'ar';
      this._updateBadge();
      this._arBtn.textContent = 'Exit AR';
      this._xrHelper.baseExperience.onStateChangedObservable.add((state) => {
        if (state === 0) {
          this._mode = 'desktop';
          this._updateBadge();
          this._arBtn.textContent = 'AR';
        }
      });
      this._onModeChange?.('ar');
    } catch (err) {
      console.warn('AR entry failed:', err);
    }
  }

  async _exitXR() {
    try {
      await this._xrHelper?.baseExperience?.exitXRAsync();
    } catch (_) {}
    this._mode = 'desktop';
    this._updateBadge();
    this._vrBtn.textContent = 'VR';
    this._arBtn.textContent = 'AR';
    this._onModeChange?.('desktop');
  }

  _updateBadge() {
    if (!this._modeBadge) return;
    const labels = { desktop: 'DESKTOP', vr: 'VR MODE', ar: 'AR MODE' };
    this._modeBadge.textContent = labels[this._mode] || 'DESKTOP';
  }

  onModeChange(fn) { this._onModeChange = fn; }
  get mode() { return this._mode; }
}
