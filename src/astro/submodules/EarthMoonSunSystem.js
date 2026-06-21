import { MeshBuilder, Color3, Vector3 } from '@babylonjs/core';

const PHASES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];

export class EarthMoonSunSystem {
  constructor(context) {
    this.context = context;
    this.scene = context.scene;
    this.astroScene = context.astroScene;
    this._panel = null;
    this._earth = null;
    this._moon = null;
    this._phaseAngle = 45;
    this._paused = true;
    this._speed = 1;
    this._shadowMeshes = [];
    this._seasonMeshes = [];
    this._yearAngle = 0;
    this._showTilt = true;
    this._showSunlight = true;
    this._moonOrbitTilt = true;
    this._tideMeshes = [];
  }

  show() {
    this.astroScene.beginScene('earthMoonSun');
    this.astroScene.addLight('sun_system_light', new Vector3(-7, 0, 0), new Color3(1, 0.82, 0.42), 2.6);
    this._buildScene();
    this._buildPanel();
    this._updateMoonPosition();
  }

  _buildScene() {
    const sun = MeshBuilder.CreateSphere('astro_ems_sun', { diameter: 3.2, segments: 48 }, this.scene);
    sun.position = new Vector3(-7, 0, 0);
    sun.material = this.astroScene.createMaterial('ems_sun', new Color3(1, 0.68, 0.16), { emissive: 0.9 });
    this.astroScene.track(sun);
    this.astroScene.createLabel('Sun', sun.position.add(new Vector3(0, 2.05, 0)));

    this._earth = MeshBuilder.CreateSphere('astro_ems_earth', { diameter: 1.55, segments: 48 }, this.scene);
    this._earth.position = new Vector3(2.5, 0, 0);
    this._earth.material = this.astroScene.createMaterial('ems_earth', new Color3(0.16, 0.46, 1), { emissive: 0.08 });
    this.astroScene.track(this._earth);
    this.astroScene.createLabel('Earth', this._earth.position.add(new Vector3(0, 1.25, 0)));

    this._moon = MeshBuilder.CreateSphere('astro_ems_moon', { diameter: 0.44, segments: 28 }, this.scene);
    this._moon.material = this.astroScene.createMaterial('ems_moon', new Color3(0.76, 0.76, 0.72), { emissive: 0.04 });
    this.astroScene.track(this._moon);
    this.astroScene.createLabel('Moon', new Vector3(4.5, 0.7, 0), { width: 1.25, height: 0.3 });

    this.astroScene.createOrbitRing('moon_path_phase', 2.25, new Color3(0.55, 0.75, 1)).position = this._earth.position.clone();
    const lightLine = MeshBuilder.CreateLines('astro_sunlight_direction', {
      points: [new Vector3(-5.3, 1.8, 0), new Vector3(1.5, 1.8, 0)],
    }, this.scene);
    lightLine.color = new Color3(1, 0.85, 0.35);
    this.astroScene.track(lightLine);

    const tilt = MeshBuilder.CreateLines('astro_axial_tilt', {
      points: [this._earth.position.add(new Vector3(-0.35, -1.0, 0)), this._earth.position.add(new Vector3(0.35, 1.0, 0))],
    }, this.scene);
    tilt.color = new Color3(0.85, 1, 1);
    this.astroScene.track(tilt);
  }

  _buildPanel() {
    const panel = document.createElement('div');
    panel.className = 'astro-mode-panel';
    panel.innerHTML = `
      <p class="astro-kicker">Moon phases</p>
      <label>Moon position <b data-angle>${this._phaseAngle} deg</b></label>
      <input data-phase type="range" min="0" max="360" value="${this._phaseAngle}" step="1" />
      <div class="astro-fov">Current phase: <strong data-phase-name></strong></div>
      <button data-action="play">Play phase orbit</button>
      <button data-action="solar">Solar Eclipse</button>
      <button data-action="lunar">Lunar Eclipse</button>
      <button data-action="orbit-tilt">Moon Orbit Tilt</button>
      <button data-action="tides">Tides Concept</button>
      <button data-action="seasons">Seasons Mode</button>
      <p class="astro-panel-note" data-explain></p>
    `;
    panel.querySelector('[data-phase]').addEventListener('input', event => {
      this._phaseAngle = Number(event.target.value);
      this._paused = true;
      this._updateMoonPosition();
    });
    panel.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      if (button.dataset.action === 'play') {
        this._paused = !this._paused;
        button.textContent = this._paused ? 'Play phase orbit' : 'Pause phase orbit';
      }
      if (button.dataset.action === 'solar') this.showEclipseMode('solar');
      if (button.dataset.action === 'lunar') this.showEclipseMode('lunar');
      if (button.dataset.action === 'orbit-tilt') { this._moonOrbitTilt = !this._moonOrbitTilt; this._updateMoonPosition(); this.astroScene.showStatus(this._moonOrbitTilt ? 'Moon orbit tilt enabled.' : 'Moon orbit tilt disabled for eclipse alignment.'); }
      if (button.dataset.action === 'tides') this.showTidesMode();
      if (button.dataset.action === 'seasons') this.showSeasonsMode();
      if (button.dataset.action === 'tilt') { this._showTilt = !this._showTilt; this._updateSeasonEarth(); }
      if (button.dataset.action === 'rays') { this._showSunlight = !this._showSunlight; this._updateSeasonEarth(); }
    });
    document.body.appendChild(panel);
    this._panel = panel;
  }

  _updateMoonPosition() {
    if (!this._earth || !this._moon) return;
    const angle = (this._phaseAngle * Math.PI) / 180;
    const radius = 2.25;
    const tiltY = this._moonOrbitTilt ? Math.sin(angle) * 0.18 : 0;
    this._moon.position = this._earth.position.add(new Vector3(Math.cos(angle) * radius, tiltY, Math.sin(angle) * radius));
    const phase = this._phaseName(this._phaseAngle);
    const explanation = this._phaseExplanation(phase);
    if (this._panel) {
      this._panel.querySelector('[data-angle]').textContent = `${Math.round(this._phaseAngle)} deg`;
      this._panel.querySelector('[data-phase-name]').textContent = phase;
      this._panel.querySelector('[data-explain]').textContent = explanation;
      this._panel.querySelector('[data-phase]').value = this._phaseAngle;
    }
    this.context.info.update({
      title: phase,
      concepts: ['Moon phases', 'Sunlight', 'Orbit', 'Eclipses'],
      goal: 'Use Moon position around Earth to understand why the visible lit portion changes.',
      observe: 'The Sun is on the left. The Moon moves around Earth while sunlight comes from the Sun.',
      explanation,
      tryThis: 'Move the slider to 0, 90, 180, and 270 degrees and name the phase.',
      misconception: 'The Moon does not make its own light. We see sunlight reflected from its surface.',
      teacherNote: "Real eclipses do not happen every month because the Moon's orbit is tilted.",
      challenge: 'Where is the Moon during a Full Moon compared with the Sun and Earth?',
    });
  }

  _phaseName(degrees) {
    const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
    return PHASES[index];
  }

  _phaseExplanation(phase) {
    const explanations = {
      'New Moon': 'The Moon is near the Sun direction, so its lit side mostly faces away from Earth.',
      'Waxing Crescent': 'A small growing slice of the lit side becomes visible.',
      'First Quarter': "Half of the Moon's visible face appears lit.",
      'Waxing Gibbous': 'More than half is lit as the Moon approaches Full Moon.',
      'Full Moon': 'Earth is between the Sun and Moon, so the visible face is fully lit.',
      'Waning Gibbous': 'The lit portion begins shrinking after Full Moon.',
      'Last Quarter': 'Half the visible face is lit again, but on the opposite side.',
      'Waning Crescent': 'Only a small shrinking slice remains before New Moon.',
    };
    return explanations[phase];
  }

  showMoonPhases() {
    this._paused = false;
    this.astroScene.showStatus('Moon phase animation running.');
  }

  showEclipseMode(type = 'solar') {
    this._shadowMeshes.forEach(mesh => mesh.dispose());
    this._shadowMeshes = [];
    const solar = type === 'solar';
    this._phaseAngle = solar ? 0 : 180;
    this._updateMoonPosition();
    const cone = MeshBuilder.CreateCylinder(`astro_${type}_umbra`, {
      diameterTop: solar ? 0.18 : 0.3,
      diameterBottom: solar ? 1.2 : 1.6,
      height: 3.2,
      tessellation: 32,
    }, this.scene);
    cone.position = solar ? new Vector3(3.25, 0, 0) : new Vector3(1.0, 0, 0);
    cone.rotation.z = Math.PI / 2;
    cone.material = this.astroScene.createMaterial(`${type}_umbra`, new Color3(0.02, 0.03, 0.08), { alpha: 0.38, emissive: 0.05 });
    this.astroScene.track(cone);
    this._shadowMeshes.push(cone);
    const penumbra = MeshBuilder.CreateCylinder(`astro_${type}_penumbra`, {
      diameterTop: solar ? 0.7 : 1.0,
      diameterBottom: solar ? 2.2 : 2.6,
      height: 3.6,
      tessellation: 32,
    }, this.scene);
    penumbra.position = solar ? new Vector3(3.15, 0, 0) : new Vector3(0.95, 0, 0);
    penumbra.rotation.z = Math.PI / 2;
    penumbra.material = this.astroScene.createMaterial(`${type}_penumbra`, new Color3(0.18, 0.2, 0.28), { alpha: 0.16, emissive: 0.04 });
    this.astroScene.track(penumbra);
    this._shadowMeshes.push(penumbra);
    this.context.info.update({
      title: solar ? 'Solar Eclipse Simulator' : 'Lunar Eclipse Simulator',
      concepts: ['Umbra', 'Penumbra', 'Alignment', 'Moon orbit tilt'],
      goal: 'Show why eclipses need a near-perfect Sun-Earth-Moon alignment.',
      observe: solar ? 'Moon sits between Sun and Earth, casting shadow toward Earth.' : 'Earth sits between Sun and Moon, casting shadow toward the Moon.',
      explanation: 'The dark cone is umbra; the wider transparent cone is penumbra. The Moon orbit tilt toggle explains why eclipses do not happen every month.',
      tryThis: 'Toggle Moon Orbit Tilt off and compare the alignment.',
      misconception: "Moon phases happen monthly, but eclipses require alignment near the Moon's orbital nodes.",
    });
    this.astroScene.showStatus(solar ? 'Solar eclipse: Moon between Sun and Earth.' : 'Lunar eclipse: Earth between Sun and Moon.');
  }

  showTidesMode() {
    this._tideMeshes.forEach(mesh => mesh.dispose?.());
    this._tideMeshes = [];
    const bulgeA = MeshBuilder.CreateSphere('astro_tide_bulge_near', { diameter: 1.95, segments: 40 }, this.scene);
    const bulgeB = MeshBuilder.CreateSphere('astro_tide_bulge_far', { diameter: 1.95, segments: 40 }, this.scene);
    [bulgeA, bulgeB].forEach((bulge, index) => {
      bulge.position = this._earth.position.clone();
      bulge.scaling = new Vector3(1.45, 0.68, 0.68);
      bulge.rotation.y = index ? Math.PI : 0;
      bulge.material = this.astroScene.createMaterial(`tide_bulge_${index}`, new Color3(0.25, 0.78, 1), { emissive: 0.22, alpha: 0.28 });
      this.astroScene.track(bulge);
      this._tideMeshes.push(bulge);
    });
    const line = MeshBuilder.CreateLines('astro_tide_moon_line', { points: [this._earth.position.clone(), this._moon.position.clone()] }, this.scene);
    line.color = new Color3(0.72, 0.9, 1);
    this.astroScene.track(line);
    this._tideMeshes.push(line);
    this.context.info.update({
      title: 'Tides Concept Mode',
      concepts: ['Tides', 'Moon gravity', 'Near-side bulge', 'Far-side bulge'],
      goal: 'Introduce tides as ocean bulges aligned roughly with the Moon-Earth line.',
      observe: 'Transparent bulges mark high-tide regions in a simplified classroom view.',
      explanation: 'The Moon is the main tide driver; the Sun also contributes. This mode shows concept direction, not local tide timing.',
      tryThis: 'Move the Moon phase slider and watch which direction the tide line points.',
      misconception: 'Tides are not only water being pulled up on the side nearest the Moon; the far-side bulge matters too.',
    });
    this.astroScene.showStatus('Tides Concept Mode enabled.');
  }

  showSeasonsMode() {
    this._clearSeasons();
    this._yearAngle = 0;
    const orbit = this.astroScene.createOrbitRing('earth_year_orbit', 4.8, new Color3(0.25, 0.55, 1));
    orbit.position.y = -2.8;
    this._seasonMeshes.push(orbit);
    const sun = MeshBuilder.CreateSphere('astro_seasons_sun', { diameter: 1.4, segments: 32 }, this.scene);
    sun.position = new Vector3(0, -2.8, 0);
    sun.material = this.astroScene.createMaterial('seasons_sun', new Color3(1, 0.72, 0.18), { emissive: 0.85 });
    this.astroScene.track(sun);
    this._seasonMeshes.push(sun);
    this._buildSeasonControls();
    this._buildSeasonEarth();
    this.context.info.update({
      title: 'Seasons Mode',
      concepts: ['Axial tilt', 'Direct sunlight', 'Indirect sunlight', 'Solstice', 'Equinox'],
      goal: 'Show that seasons are caused mainly by Earth axial tilt, not by distance from the Sun.',
      observe: 'Earth keeps an approximately 23.5 degree tilted axis as it moves around the Sun.',
      explanation: 'Direct sunlight heats more strongly than indirect sunlight. Opposite hemispheres experience opposite seasons.',
      tryThis: 'Move the year slider to solstice and equinox labels, then answer: tilt or distance?',
      misconception: 'Common misconception: Earth is hotter in summer because it is closer to the Sun. Actually, axial tilt is the main reason.',
      challenge: 'Predict which hemisphere receives more direct sunlight at each solstice.',
    });
    this.astroScene.showStatus('Seasons Mode: use the year slider.');
  }

  _buildSeasonControls() {
    if (this._panel.querySelector('[data-year]')) return;
    this._panel.insertAdjacentHTML('beforeend', `
      <label>Year position <b data-year-label>0 deg</b></label>
      <input data-year type="range" min="0" max="360" value="0" step="1" />
      <button data-action="tilt">Toggle axial tilt</button>
      <button data-action="rays">Toggle sunlight rays</button>
    `);
    this._panel.querySelector('[data-year]').addEventListener('input', event => {
      this._yearAngle = Number(event.target.value);
      this._updateSeasonEarth();
    });
  }

  _buildSeasonEarth() {
    const earth = MeshBuilder.CreateSphere('astro_seasons_earth', { diameter: 0.82, segments: 32 }, this.scene);
    earth.material = this.astroScene.createMaterial('seasons_earth', new Color3(0.16, 0.46, 1), { emissive: 0.08 });
    earth.metadata = { seasonEarth: true };
    this.astroScene.track(earth);
    this._seasonMeshes.push(earth);
    this._seasonMeshes.push(this.astroScene.createLabel('Summer Solstice', new Vector3(4.8, -2.0, 0), { width: 2.1, height: 0.3 }));
    this._seasonMeshes.push(this.astroScene.createLabel('Winter Solstice', new Vector3(-4.8, -2.0, 0), { width: 2.1, height: 0.3 }));
    this._seasonMeshes.push(this.astroScene.createLabel('Equinox', new Vector3(0, -2.0, 4.8), { width: 1.4, height: 0.3 }));
    this._updateSeasonEarth();
  }

  _updateSeasonEarth() {
    const earth = this._seasonMeshes.find(mesh => mesh?.metadata?.seasonEarth);
    if (!earth) return;
    const angle = (this._yearAngle * Math.PI) / 180;
    earth.position = new Vector3(Math.cos(angle) * 4.8, -2.8, Math.sin(angle) * 4.8);
    this._seasonMeshes.filter(mesh => mesh?.metadata?.seasonLine).forEach(mesh => mesh.dispose());
    this._seasonMeshes = this._seasonMeshes.filter(mesh => !mesh?.metadata?.seasonLine);
    if (this._showTilt) {
      const axis = MeshBuilder.CreateLines('astro_season_axis', { points: [earth.position.add(new Vector3(-0.28, -0.82, 0)), earth.position.add(new Vector3(0.28, 0.82, 0))] }, this.scene);
      axis.color = new Color3(0.85, 1, 1);
      axis.metadata = { seasonLine: true };
      this.astroScene.track(axis);
      this._seasonMeshes.push(axis);
      const equator = MeshBuilder.CreateTorus('astro_season_equator', { diameter: 0.85, thickness: 0.01, tessellation: 48 }, this.scene);
      equator.position = earth.position.clone();
      equator.rotation.x = Math.PI / 2;
      equator.material = this.astroScene.createMaterial('season_equator', new Color3(0.9, 1, 1), { emissive: 0.4, alpha: 0.55 });
      equator.metadata = { seasonLine: true };
      this.astroScene.track(equator);
      this._seasonMeshes.push(equator);
      this._seasonMeshes.push(this.astroScene.createLabel('Axial Tilt', earth.position.add(new Vector3(0.85, 0.9, 0)), { width: 1.5, height: 0.3 }));
    }
    if (this._showSunlight) {
      [-0.35, 0, 0.35].forEach((y, i) => {
        const ray = MeshBuilder.CreateLines(`astro_direct_sunlight_${i}`, { points: [new Vector3(0, -2.8 + y, 0), earth.position.add(new Vector3(-0.45, y, 0))] }, this.scene);
        ray.color = new Color3(1, 0.85, 0.28);
        ray.metadata = { seasonLine: true };
        this.astroScene.track(ray);
        this._seasonMeshes.push(ray);
      });
      this._seasonMeshes.push(this.astroScene.createLabel('Direct / Indirect Sunlight', earth.position.add(new Vector3(0, 1.2, 0)), { width: 2.8, height: 0.3 }));
    }
    const label = this._panel?.querySelector('[data-year-label]');
    if (label) label.textContent = `${Math.round(this._yearAngle)} deg`;
  }

  _clearSeasons() {
    this._seasonMeshes.forEach(mesh => {
      try { mesh.dispose?.(); } catch (_) {}
    });
    this._seasonMeshes = [];
  }

  setPaused(paused) { this._paused = paused; }
  setSpeed(speed) { this._speed = speed; }
  setLabelsVisible(visible) { this.astroScene.setLabelsVisible(visible); }
  getLessonObjective() { return 'Explain Moon phases, eclipse alignment, seasons, and tides using the Sun-Earth-Moon geometry.'; }
  getDiscussionQuestions() { return ['Why do phases happen more often than eclipses?', 'What causes seasons: distance or tilt?', 'Why do tides have two bulges?']; }
  getTeacherSpotlight() { return 'Spotlight alignment: the same bodies create phases, eclipses, seasons context, and tides depending on geometry.'; }
  pauseSimulation() { this.setPaused(true); }
  resetForClassroom() { this._phaseAngle = 45; this._paused = true; this._updateMoonPosition(); this.context.module?.resetView?.(); }

  update(deltaTime) {
    if (this._earth) this._earth.rotation.y += deltaTime * 0.00022;
    if (this._paused) return;
    this._phaseAngle = (this._phaseAngle + deltaTime * 0.018 * this._speed) % 360;
    this._updateMoonPosition();
  }

  hide() {
    this._panel?.remove();
    this._panel = null;
    this._shadowMeshes = [];
    this._clearSeasons();
    this._tideMeshes.forEach(mesh => mesh.dispose?.());
    this._tideMeshes = [];
    this._earth = null;
    this._moon = null;
    this.astroScene.cleanup();
  }
}
