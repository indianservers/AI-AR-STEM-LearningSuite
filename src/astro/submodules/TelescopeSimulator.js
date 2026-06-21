import { MeshBuilder, Color3, Vector3 } from '@babylonjs/core';
import { TELESCOPE_TARGETS } from '../data/telescopeTargets.js';
import { getObservations, saveObservation } from '../utils/astroObservationLog.js';

export class TelescopeSimulator {
  constructor(context) {
    this.context = context;
    this.scene = context.scene;
    this.astroScene = context.astroScene;
    this._panel = null;
    this._targetResources = [];
    this._activeTarget = TELESCOPE_TARGETS[0];
    this._magnification = 80;
    this._focus = 80;
    this._aperture = 80;
    this._eyepieceFocalLength = 20;
    this._telescopeFocalLength = 800;
    this._seeing = 40;
    this._paused = false;
    this._finderMode = false;
    this._nightMode = false;
    this._logPanel = null;
  }

  show() {
    this.astroScene.beginScene('telescope');
    this.astroScene.addLight('telescope_key', new Vector3(3, 4, -6), new Color3(0.75, 0.85, 1), 1.6);
    this._buildPanel();
    this._buildTarget(this._activeTarget.id);
  }

  _buildPanel() {
    const panel = document.createElement('div');
    panel.className = 'astro-telescope-panel';
    panel.innerHTML = `
      <p class="astro-kicker">Telescope controls</p>
      <label>Target</label>
      <select>${TELESCOPE_TARGETS.map(target => `<option value="${target.id}">${target.name}</option>`).join('')}</select>
      <label>Magnification <b data-mag>${this._magnification}x</b></label>
      <input data-control="mag" type="range" min="20" max="220" value="${this._magnification}" step="5" />
      <label>Focus <b data-focus>${this._focus}%</b></label>
      <input data-control="focus" type="range" min="0" max="100" value="${this._focus}" step="1" />
      <details open>
        <summary>Optics Learning Mode</summary>
        <label>Aperture <b data-aperture>${this._aperture} mm</b></label>
        <input data-control="aperture" type="range" min="40" max="250" value="${this._aperture}" step="5" />
        <label>Eyepiece focal length <b data-eye>${this._eyepieceFocalLength} mm</b></label>
        <input data-control="eyepiece" type="range" min="4" max="40" value="${this._eyepieceFocalLength}" step="1" />
        <label>Telescope focal length <b data-scope>${this._telescopeFocalLength} mm</b></label>
        <input data-control="scope" type="range" min="300" max="1800" value="${this._telescopeFocalLength}" step="50" />
        <label>Atmospheric seeing <b data-seeing>${this._seeing}%</b></label>
        <input data-control="seeing" type="range" min="0" max="100" value="${this._seeing}" step="1" />
        <div class="astro-fov">Formula magnification: <strong data-formula-mag></strong></div>
        <div class="astro-fov">Brightness estimate: <strong data-brightness></strong></div>
      </details>
      <div class="astro-fov">Field of view: <strong data-fov>wide</strong></div>
      <div class="astro-scope-types">
        <button type="button" data-scope-type="refractor">Refractor</button>
        <button type="button" data-scope-type="reflector">Reflector</button>
        <button type="button" data-scope-type="dobsonian">Dobsonian</button>
      </div>
      <button type="button" data-night>Observation Night</button>
      <button type="button" data-finder>Finder Scope</button>
      <button type="button" data-save-log>Save Observation</button>
      <button type="button" data-reset>Reset Telescope</button>
      <button type="button" data-teacher-demo>Teacher Demo</button>
      <textarea data-log-note rows="3" placeholder="Observation note"></textarea>
      <div data-observation-log class="astro-observation-log"></div>
      <p data-warning class="astro-warning"></p>
    `;
    panel.querySelector('select').addEventListener('change', event => this._buildTarget(event.target.value));
    panel.querySelector('[data-control="mag"]').addEventListener('input', event => {
      this._magnification = Number(event.target.value);
      this._applyOptics();
    });
    panel.querySelector('[data-control="focus"]').addEventListener('input', event => {
      this._focus = Number(event.target.value);
      this._applyOptics();
    });
    ['aperture', 'eyepiece', 'scope', 'seeing'].forEach(control => {
      panel.querySelector(`[data-control="${control}"]`).addEventListener('input', event => {
        if (control === 'aperture') this._aperture = Number(event.target.value);
        if (control === 'eyepiece') this._eyepieceFocalLength = Number(event.target.value);
        if (control === 'scope') this._telescopeFocalLength = Number(event.target.value);
        if (control === 'seeing') this._seeing = Number(event.target.value);
        this._magnification = Math.round(this._telescopeFocalLength / this._eyepieceFocalLength);
        panel.querySelector('[data-control="mag"]').value = Math.min(220, Math.max(20, this._magnification));
        this._applyOptics();
      });
    });
    panel.querySelector('[data-reset]').addEventListener('click', () => {
      this._magnification = this._activeTarget.recommendedMagnification;
      this._focus = 80;
      panel.querySelector('[data-control="mag"]').value = this._magnification;
      panel.querySelector('[data-control="focus"]').value = this._focus;
      this._applyOptics();
    });
    panel.querySelector('[data-teacher-demo]').addEventListener('click', () => {
      this._aperture = 70; this._eyepieceFocalLength = 6; this._telescopeFocalLength = 900; this._seeing = 80;
      panel.querySelector('[data-control="aperture"]').value = this._aperture;
      panel.querySelector('[data-control="eyepiece"]').value = this._eyepieceFocalLength;
      panel.querySelector('[data-control="scope"]').value = this._telescopeFocalLength;
      panel.querySelector('[data-control="seeing"]').value = this._seeing;
      this._magnification = Math.round(this._telescopeFocalLength / this._eyepieceFocalLength);
      this._applyOptics();
      this.astroScene.showStatus('Teacher Demo: maximum zoom can be dim, shaky, and less useful than a wide field.');
    });
    panel.querySelector('[data-night]').addEventListener('click', () => this._toggleObservationNight());
    panel.querySelector('[data-finder]').addEventListener('click', () => this._toggleFinderScope());
    panel.querySelector('[data-save-log]').addEventListener('click', () => this._saveCurrentObservation());
    panel.querySelectorAll('[data-scope-type]').forEach(button => {
      button.addEventListener('click', () => this._compareTelescopeType(button.dataset.scopeType));
    });
    document.body.appendChild(panel);
    this._panel = panel;
    this._renderObservationLog();
  }

  _buildTarget(id) {
    this._disposeTarget();
    this._activeTarget = TELESCOPE_TARGETS.find(target => target.id === id) || TELESCOPE_TARGETS[0];
    this._magnification = this._activeTarget.recommendedMagnification;
    if (this._panel) {
      this._panel.querySelector('[data-control="mag"]').value = this._magnification;
      this._panel.querySelector('[data-mag]').textContent = `${this._magnification}x`;
    }

    const builders = {
      moon: () => this._buildMoon(),
      jupiter: () => this._buildJupiter(),
      saturn: () => this._buildSaturn(),
      mars: () => this._buildMars(),
      'orion-nebula': () => this._buildNebula(),
      andromeda: () => this._buildAndromeda(),
      pleiades: () => this._buildPleiades(),
    };
    builders[this._activeTarget.id]?.();
    this._applyOptics();
    this._updateInfo();
  }

  _track(resource) {
    this._targetResources.push(resource);
    this.astroScene.track(resource);
    return resource;
  }

  _buildMoon() {
    const moon = this._sphere('Moon', 2.5, new Color3(0.68, 0.68, 0.64), 0.12);
    for (let i = 0; i < 16; i++) {
      const crater = MeshBuilder.CreateDisc(`astro_moon_crater_${i}`, { radius: 0.08 + Math.random() * 0.16, tessellation: 24 }, this.scene);
      crater.position = new Vector3((Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 1.8, -1.26);
      crater.material = this.astroScene.createMaterial(`crater_${i}`, new Color3(0.38, 0.38, 0.36), { emissive: 0.04, alpha: 0.65 });
      this._track(crater);
    }
    return moon;
  }

  _buildJupiter() {
    const jupiter = this._sphere('Jupiter', 2.6, new Color3(0.86, 0.62, 0.42), 0.18);
    for (let i = 0; i < 7; i++) {
      const band = MeshBuilder.CreateTorus(`astro_jupiter_band_${i}`, { diameter: 2.62, thickness: 0.018, tessellation: 96 }, this.scene);
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.78 + i * 0.26;
      band.material = this.astroScene.createMaterial(`jupiter_band_${i}`, i % 2 ? new Color3(0.72, 0.42, 0.28) : new Color3(0.96, 0.82, 0.58), { emissive: 0.08 });
      this._track(band);
    }
    return jupiter;
  }

  _buildSaturn() {
    const saturn = this._sphere('Saturn', 2.15, new Color3(0.9, 0.76, 0.48), 0.16);
    const ring = MeshBuilder.CreateTorus('astro_scope_saturn_ring', { diameter: 4.1, thickness: 0.08, tessellation: 128 }, this.scene);
    ring.rotation.x = Math.PI / 2.25;
    ring.material = this.astroScene.createMaterial('scope_saturn_ring', new Color3(0.86, 0.78, 0.58), { emissive: 0.13, alpha: 0.82 });
    this._track(ring);
    return saturn;
  }

  _buildMars() {
    return this._sphere('Mars', 2.05, new Color3(0.86, 0.24, 0.13), 0.14);
  }

  _buildNebula() {
    for (let i = 0; i < 70; i++) {
      const puff = MeshBuilder.CreateSphere(`astro_orion_puff_${i}`, { diameter: 0.14 + Math.random() * 0.38, segments: 8 }, this.scene);
      puff.position = new Vector3((Math.random() - 0.5) * 4.2, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 0.8);
      puff.material = this.astroScene.createMaterial(`orion_puff_${i}`, new Color3(0.45 + Math.random() * 0.35, 0.25, 0.9), { emissive: 0.55, alpha: 0.38 });
      this._track(puff);
    }
  }

  _buildAndromeda() {
    for (let i = 0; i < 9; i++) {
      const disc = MeshBuilder.CreateDisc(`astro_andromeda_${i}`, { radius: 2.8 - i * 0.22, tessellation: 96 }, this.scene);
      disc.rotation.x = Math.PI / 2.05;
      disc.scaling.y = 0.26;
      disc.material = this.astroScene.createMaterial(`andromeda_disc_${i}`, new Color3(0.48, 0.7, 1), { emissive: 0.18 + i * 0.04, alpha: 0.12 });
      this._track(disc);
    }
  }

  _buildPleiades() {
    for (let i = 0; i < 22; i++) {
      const star = MeshBuilder.CreateSphere(`astro_pleiades_${i}`, { diameter: 0.08 + Math.random() * 0.16, segments: 10 }, this.scene);
      star.position = new Vector3((Math.random() - 0.5) * 3.4, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 0.8);
      star.material = this.astroScene.createMaterial(`pleiades_star_${i}`, new Color3(0.72, 0.86, 1), { emissive: 0.95 });
      this._track(star);
    }
  }

  _sphere(name, diameter, color, emissive) {
    const mesh = MeshBuilder.CreateSphere(`astro_scope_${name}`, { diameter, segments: 56 }, this.scene);
    mesh.material = this.astroScene.createMaterial(`scope_${name}`, color, { emissive });
    this._track(mesh);
    return mesh;
  }

  _applyOptics() {
    if (!this._panel) return;
    const scale = Math.max(0.55, this._magnification / 80);
    const brightness = Math.min(100, Math.round((this._aperture / 80) ** 2 * 45));
    const seeingJitter = (this._seeing / 100) * 0.04;
    this._targetResources.forEach((resource, index) => {
      if (resource?.scaling) resource.scaling.setAll(scale * (1 + seeingJitter));
      if (resource?.position && this._seeing > 55) {
        resource.position.x += Math.sin(Date.now() * 0.003 + index) * seeingJitter * 0.08;
      }
      if (resource?.material) resource.material.alpha = Math.max(0.18, Math.min(1, (this._focus / 70) * (brightness / 70)));
    });
    if (this.scene.activeCamera) this.scene.activeCamera.fov = Math.max(0.18, 0.82 - this._magnification * 0.0027);
    this._panel.querySelector('[data-mag]').textContent = `${this._magnification}x`;
    this._panel.querySelector('[data-focus]').textContent = `${this._focus}%`;
    this._panel.querySelector('[data-aperture]').textContent = `${this._aperture} mm`;
    this._panel.querySelector('[data-eye]').textContent = `${this._eyepieceFocalLength} mm`;
    this._panel.querySelector('[data-scope]').textContent = `${this._telescopeFocalLength} mm`;
    this._panel.querySelector('[data-seeing]').textContent = `${this._seeing}%`;
    this._panel.querySelector('[data-formula-mag]').textContent = `${Math.round(this._telescopeFocalLength / this._eyepieceFocalLength)}x`;
    this._panel.querySelector('[data-brightness]').textContent = `${brightness}%`;
    this._panel.querySelector('[data-fov]').textContent = this._magnification > 150 ? 'narrow' : this._magnification > 80 ? 'medium' : 'wide';
    this._panel.querySelector('[data-warning]').textContent = this._magnification > 170
      ? 'Empty magnification: increasing zoom beyond useful limits does not reveal more detail.'
      : this._focus < 45
        ? 'Low focus simulates a soft view. Increase focus to sharpen the target.'
        : this._seeing > 70
          ? 'Poor atmospheric seeing makes high magnification unstable.'
        : '';
  }

  _toggleObservationNight() {
    this._nightMode = !this._nightMode;
    document.body.classList.toggle('astro-observation-night', this._nightMode);
    this.astroScene.showStatus(this._nightMode ? 'Observation Night: dim classroom-safe palette enabled.' : 'Observation Night disabled.');
    this.context.info.update({
      title: 'Observation Night Mode',
      concepts: ['Dark adaptation', 'Seeing', 'Light pollution'],
      goal: 'Treat telescope viewing as an observing session with changing sky conditions.',
      observe: 'Dimmed controls reduce glare while the target remains visible.',
      explanation: 'Real observing depends on darkness, atmospheric steadiness, aperture, focus, and target brightness.',
      tryThis: 'Increase atmospheric seeing and compare the view before saving an observation note.',
      misconception: 'A telescope does not automatically make every object colorful and sharp.',
    });
  }

  _toggleFinderScope() {
    this._finderMode = !this._finderMode;
    if (this.scene.activeCamera) this.scene.activeCamera.fov = this._finderMode ? 1.05 : Math.max(0.18, 0.82 - this._magnification * 0.0027);
    this.astroScene.showStatus(this._finderMode ? 'Finder scope: wide field for locating the target.' : 'Finder scope disabled.');
  }

  _compareTelescopeType(type) {
    const notes = {
      refractor: 'Refractor: simple sealed tube, crisp lunar/planet views, smaller aperture for cost.',
      reflector: 'Reflector: mirrors gather more light for faint objects, needs alignment practice.',
      dobsonian: 'Dobsonian: large reflector on a simple mount, excellent classroom deep-sky value.',
    };
    this.context.info.update({
      title: `${type[0].toUpperCase()}${type.slice(1)} Telescope`,
      concepts: ['Telescope design', 'Aperture', 'Mount', 'Use case'],
      goal: 'Compare telescope types by classroom use rather than by one best answer.',
      observe: notes[type],
      explanation: 'Different telescope designs trade portability, cost, light gathering, maintenance, and field of view.',
      tryThis: 'Pick one target and decide which telescope type would be practical for a school observation night.',
    });
  }

  _saveCurrentObservation() {
    const note = this._panel?.querySelector('[data-log-note]')?.value || '';
    const entry = saveObservation({
      target: this._activeTarget.name,
      magnification: this._magnification,
      focus: this._focus,
      seeing: this._seeing,
      note,
    });
    this.astroScene.showStatus(`Observation saved: ${entry.target}`);
    this._panel.querySelector('[data-log-note]').value = '';
    this._renderObservationLog();
  }

  _renderObservationLog() {
    const el = this._panel?.querySelector('[data-observation-log]');
    if (!el) return;
    const observations = getObservations().slice(0, 4);
    el.innerHTML = observations.length
      ? observations.map(item => `<p><strong>${item.target}</strong> ${item.magnification}x, seeing ${item.seeing}%<br><span>${item.note || 'No note'}</span></p>`).join('')
      : '<p>No observations saved yet.</p>';
  }

  _updateInfo() {
    const t = this._activeTarget;
    this.context.info.update({
      title: t.name,
      concepts: [t.objectType, 'Aperture', 'Focal length', 'Magnification', 'Field of view'],
      goal: `Observe a procedural ${t.objectType.toLowerCase()} view and learn how telescope settings change the experience.`,
      observe: t.apparentVisualDescription,
      explanation: `Magnification = telescope focal length / eyepiece focal length. Best seen with: ${t.bestSeenWith}. Recommended magnification: ${t.recommendedMagnification}x. ${t.fieldOfViewNote}`,
      tryThis: 'Move magnification upward, then adjust focus until the view feels stable.',
      misconception: 'More magnification is not always better; brightness, stability, and field of view matter too.',
      teacherNote: 'Use this view to introduce magnification, aperture, focus, and atmospheric seeing.',
      challenge: `Explain why ${t.name} is a ${t.objectType}.`,
    });
  }

  _disposeTarget() {
    this._targetResources.forEach(resource => {
      try { resource.dispose?.(); } catch (_) {}
    });
    this._targetResources = [];
  }

  setPaused(paused) { this._paused = paused; }
  setSpeed() {}
  setLabelsVisible(visible) { this.astroScene.setLabelsVisible(visible); }
  getLessonObjective() { return 'Explore how magnification, aperture, focus, field of view, telescope type, and seeing shape observations.'; }
  getDiscussionQuestions() { return ['Why can too much magnification make an image worse?', 'Which targets need a wide field?', 'What should an observation log record?']; }
  getTeacherSpotlight() { return 'Spotlight useful magnification: sharp evidence beats maximum zoom.'; }
  pauseSimulation() { this.setPaused(true); }
  resetForClassroom() { this._focus = 80; this._seeing = 40; this._magnification = this._activeTarget.recommendedMagnification; this._applyOptics(); this.context.module?.resetView?.(); }

  update(deltaTime) {
    if (this._paused) return;
    this._targetResources.forEach(resource => {
      if (resource?.rotation) resource.rotation.y += deltaTime * 0.00012;
    });
  }

  hide() {
    if (this.scene.activeCamera) this.scene.activeCamera.fov = 0.72;
    this._panel?.remove();
    document.body.classList.remove('astro-observation-night');
    this._panel = null;
    this._disposeTarget();
    this.astroScene.cleanup();
  }
}
