import { MeshBuilder, Color3, Vector3 } from '@babylonjs/core';

export class GalaxyDeepSpace {
  constructor(context) {
    this.context = context;
    this.scene = context.scene;
    this.astroScene = context.astroScene;
    this._resources = [];
    this._panel = null;
    this._mode = 'structure';
    this._paused = false;
    this._speed = 1;
    this._showArrows = true;
    this._showRedshift = true;
    this._scaleStep = 0;
    this._overlayPanel = null;
  }

  show() {
    this.astroScene.beginScene('galaxy');
    this._buildPanel();
    this._buildStructureMode();
  }

  _buildPanel() {
    const panel = document.createElement('div');
    panel.className = 'astro-mode-panel';
    panel.innerHTML = `
      <p class="astro-kicker">Deep space modes</p>
      <button data-mode="structure" class="active">Milky Way Structure</button>
      <button data-mode="redshift">Redshift Placeholder</button>
      <button data-mode="expansion">Cosmic Expansion</button>
      <button data-mode="blackhole">Black Hole Placeholder</button>
      <button data-mode="spectrum">Redshift Spectrum</button>
      <button data-mode="journey">Cosmic Scale Journey</button>
      <label>Expansion speed <input data-expansion-speed type="range" min="0" max="4" value="1" step="0.1" /></label>
      <button data-action="arrows">Show Arrows</button>
      <button data-action="redshift">Show Redshift</button>
      <button data-action="reset">Reset Universe</button>
      <p class="astro-panel-note">Modes are educational visual foundations, not precision simulations.</p>
      <div class="astro-scale-ladder">
        <strong>Scale Ladder</strong>
        <p>Earth: 12,742 km - our reference world.</p>
        <p>Moon: 384,000 km away - nearest natural neighbor.</p>
        <p>Sun: 150 million km away - one astronomical unit.</p>
        <p>Solar System: billions of km - planets around one star.</p>
        <p>Nearby Stars: light-years - interstellar distance scale.</p>
        <p>Milky Way: about 100,000 light-years wide.</p>
        <p>Local Group: millions of light-years - nearby galaxies.</p>
        <p>Observable Universe: billions of light-years - largest view.</p>
      </div>
    `;
    panel.addEventListener('click', event => {
      const button = event.target.closest('button[data-mode]');
      const action = event.target.closest('button[data-action]');
      if (button) {
        panel.querySelectorAll('button[data-mode]').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this._mode = button.dataset.mode;
        this._clearMode();
        if (this._mode === 'structure') this._buildStructureMode();
        if (this._mode === 'redshift') this.showRedshiftMode();
        if (this._mode === 'expansion') this.showUniverseExpansionMode();
        if (this._mode === 'blackhole') this.showBlackHoleLensingMode();
        if (this._mode === 'spectrum') this.showRedshiftSpectrumMode();
        if (this._mode === 'journey') this.showCosmicScaleJourney();
      }
      if (action?.dataset.action === 'arrows') { this._showArrows = !this._showArrows; this.showUniverseExpansionMode(); }
      if (action?.dataset.action === 'redshift') { this._showRedshift = !this._showRedshift; this.showUniverseExpansionMode(); }
      if (action?.dataset.action === 'reset') { this._clearMode(); this.showUniverseExpansionMode(); }
    });
    panel.querySelector('[data-expansion-speed]').addEventListener('input', event => {
      this._speed = Number(event.target.value);
    });
    document.body.appendChild(panel);
    this._panel = panel;
  }

  _track(resource) {
    this._resources.push(resource);
    this.astroScene.track(resource);
    return resource;
  }

  _buildStructureMode() {
    this.astroScene.addLight('galaxy_core_light', Vector3.Zero(), new Color3(0.65, 0.82, 1), 1.7);
    const core = MeshBuilder.CreateSphere('astro_galaxy_core', { diameter: 2.2, segments: 48 }, this.scene);
    core.material = this.astroScene.createMaterial('galaxy_core', new Color3(1, 0.85, 0.52), { emissive: 0.75, alpha: 0.88 });
    this._track(core);
    this.astroScene.createLabel('Galactic core', new Vector3(0, 2.0, 0), { width: 2.3, height: 0.34 });

    for (let arm = 0; arm < 4; arm++) {
      const offset = (Math.PI * 2 * arm) / 4;
      for (let i = 0; i < 115; i++) {
        const radius = 0.8 + i * 0.09;
        const angle = offset + i * 0.055;
        const star = MeshBuilder.CreateSphere(`astro_galaxy_star_${arm}_${i}`, { diameter: 0.035 + Math.random() * 0.075, segments: 6 }, this.scene);
        star.position = new Vector3(Math.cos(angle) * radius, (Math.random() - 0.5) * 0.55, Math.sin(angle) * radius);
        star.material = this.astroScene.createMaterial(`galaxy_star_${arm}_${i}`, i % 8 === 0 ? new Color3(0.9, 0.6, 1) : new Color3(0.72, 0.86, 1), { emissive: 0.88 });
        star.metadata = { arm };
        this._track(star);
      }
    }

    this.astroScene.createLabel('Spiral arm', new Vector3(7, 1.1, 3), { width: 1.9, height: 0.32 });
    this.astroScene.createLabel('Star-forming region', new Vector3(-6, 1.2, -4), { width: 2.6, height: 0.32 });
    this.astroScene.createLabel('Dark dust lane placeholder', new Vector3(4, -1.0, -5), { width: 3, height: 0.32 });
    this.astroScene.createLabel('Halo placeholder', new Vector3(0, 5.5, 0), { width: 2.3, height: 0.32 });
    this.context.info.update({
      title: 'Galaxy & Deep Space',
      concepts: ['Spiral galaxy', 'Core', 'Spiral arms', 'Halo'],
      goal: 'Identify the main parts of a spiral galaxy using a lightweight procedural model.',
      observe: 'The dense core sits at the center, while star-rich spiral arms rotate around it.',
      explanation: 'The Milky Way is a barred spiral galaxy. This view shows structure, not exact star positions.',
      tryThis: 'Switch to redshift mode and compare local structure with expanding dots.',
      misconception: 'A galaxy is not a solar system. It contains billions of stars and many planetary systems.',
    });
  }

  showRedshiftMode() {
    for (let i = 0; i < 42; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 12;
      const dot = MeshBuilder.CreateSphere(`astro_redshift_dot_${i}`, { diameter: 0.18, segments: 10 }, this.scene);
      dot.position = new Vector3(Math.cos(angle) * radius, (Math.random() - 0.5) * 3, Math.sin(angle) * radius);
      dot.metadata = { velocity: dot.position.normalize().scale(0.002 + Math.random() * 0.004) };
      dot.material = this.astroScene.createMaterial(`redshift_dot_${i}`, new Color3(1, 0.25 + Math.random() * 0.3, 0.2), { emissive: 0.8 });
      this._track(dot);
    }
    this.context.info.update({
      title: 'Redshift Placeholder',
      concepts: ['Cosmic expansion', 'Redshift', 'Distant galaxies'],
      goal: 'See a simple visual metaphor for galaxies moving away from one another.',
      observe: 'Dots drift outward and are colored warm to suggest redshift.',
      explanation: 'Redshift is evidence that distant galaxies are moving away as space expands.',
      tryThis: 'Pause and resume the motion to compare near and far dots.',
      misconception: 'This is not an explosion from one center; Phase 3 will explain expansion of space more carefully.',
    });
  }

  showBlackHoleLensingMode() {
    const hole = MeshBuilder.CreateSphere('astro_black_hole_placeholder', { diameter: 2.0, segments: 48 }, this.scene);
    hole.material = this.astroScene.createMaterial('black_hole', new Color3(0, 0, 0), { emissive: 0.02 });
    this._track(hole);
    const disk = MeshBuilder.CreateTorus('astro_accretion_disk_placeholder', { diameter: 4.0, thickness: 0.12, tessellation: 128 }, this.scene);
    disk.rotation.x = Math.PI / 2.55;
    disk.material = this.astroScene.createMaterial('accretion_disk', new Color3(1, 0.45, 0.12), { emissive: 0.6, alpha: 0.82 });
    this._track(disk);
    const photon = MeshBuilder.CreateTorus('astro_photon_ring_placeholder', { diameter: 2.28, thickness: 0.035, tessellation: 128 }, this.scene);
    photon.rotation.x = Math.PI / 2.45;
    photon.material = this.astroScene.createMaterial('photon_ring', new Color3(1, 0.82, 0.35), { emissive: 0.72, alpha: 0.7 });
    this._track(photon);
    const orbit = MeshBuilder.CreateTorus('astro_black_hole_orbit_safe_zone', { diameter: 6.2, thickness: 0.018, tessellation: 128 }, this.scene);
    orbit.material = this.astroScene.createMaterial('black_hole_orbit', new Color3(0.4, 0.75, 1), { emissive: 0.32, alpha: 0.45 });
    this._track(orbit);
    this.astroScene.createLabel('Event horizon placeholder', new Vector3(0, 2.5, 0), { width: 3.1, height: 0.34 });
    this.context.info.update({
      title: 'Black Hole Learning Mode',
      concepts: ['Event horizon', 'Accretion disk', 'Photon ring', 'Safe distance'],
      goal: 'Identify black-hole vocabulary without presenting the placeholder as a precision simulation.',
      observe: 'A dark center, glowing disk, photon-ring cue, and wider orbit guide are separated visually.',
      explanation: 'The event horizon is the boundary beyond which light cannot escape. The glowing disk is hot material outside it.',
      tryThis: 'Orbit the camera and explain which visible features are matter and which are conceptual guides.',
      misconception: 'Black holes do not suck in everything everywhere; gravity depends on distance and mass.',
    });
  }

  showRedshiftSpectrumMode() {
    this._clearMode();
    this._showSpectrumPanel(0);
    for (let i = 0; i < 7; i++) {
      const line = MeshBuilder.CreateBox(`astro_spectrum_line_${i}`, { width: 0.04, height: 1.6, depth: 0.035 }, this.scene);
      line.position = new Vector3(-2.4 + i * 0.55, 0, 0);
      line.material = this.astroScene.createMaterial(`spectrum_line_${i}`, new Color3(0.12, 0.35 + i * 0.07, 1 - i * 0.08), { emissive: 0.75 });
      line.metadata = { spectrumLine: true, baseX: line.position.x };
      this._track(line);
    }
    this.context.info.update({
      title: 'Redshift Spectrum',
      concepts: ['Spectrum', 'Absorption lines', 'Redshift', 'Recession'],
      goal: 'Represent redshift as spectral lines moving toward longer wavelengths.',
      observe: 'The overlay compares rest lines with shifted lines.',
      explanation: 'When a galaxy is moving away, identifiable spectral features appear shifted toward redder wavelengths.',
      tryThis: 'Use the expansion speed slider and watch the line positions change.',
      misconception: 'Redshift is not just a galaxy changing color like paint; it is a wavelength shift in measured light.',
    });
  }

  showCosmicScaleJourney() {
    this._clearMode();
    this._scaleStep = 0;
    this._showScaleJourneyPanel();
    this._renderScaleStep();
  }

  _showSpectrumPanel(shift) {
    this._overlayPanel?.remove();
    const panel = document.createElement('div');
    panel.className = 'astro-spectrum-panel';
    panel.innerHTML = `
      <strong>Redshift Spectrum</strong>
      <div class="astro-spectrum-gradient"></div>
      <p data-spectrum-caption>Shift: ${shift.toFixed(2)} wavelength units</p>
    `;
    document.body.appendChild(panel);
    this._overlayPanel = panel;
  }

  _showScaleJourneyPanel() {
    this._overlayPanel?.remove();
    const panel = document.createElement('div');
    panel.className = 'astro-scale-journey-panel';
    panel.innerHTML = `
      <strong data-scale-title>Cosmic Scale Journey</strong>
      <p data-scale-caption></p>
      <div>
        <button type="button" data-scale="out">Zoom Out</button>
        <button type="button" data-scale="in">Zoom In</button>
      </div>
    `;
    panel.addEventListener('click', event => {
      const action = event.target.closest('[data-scale]')?.dataset.scale;
      if (!action) return;
      this._scaleStep += action === 'out' ? 1 : -1;
      this._scaleStep = Math.max(0, Math.min(6, this._scaleStep));
      this._renderScaleStep();
    });
    document.body.appendChild(panel);
    this._overlayPanel = panel;
  }

  _renderScaleStep() {
    this._resources.forEach(resource => resource.dispose?.());
    this._resources = [];
    const steps = [
      ['Earth', 0.7, 'A planet-sized reference point.'],
      ['Earth-Moon', 1.4, 'Nearest natural neighbor scale.'],
      ['Solar System', 3.0, 'Planetary orbits around one star.'],
      ['Nearby Stars', 5.0, 'Light-years become the useful unit.'],
      ['Milky Way', 7.0, 'A galaxy contains billions of stars.'],
      ['Local Group', 9.0, 'Neighboring galaxies share a gravitational region.'],
      ['Observable Universe', 11.0, 'The largest classroom scale view.'],
    ];
    const [title, radius, caption] = steps[this._scaleStep];
    const shell = MeshBuilder.CreateSphere(`astro_scale_${this._scaleStep}`, { diameter: radius, segments: 32 }, this.scene);
    shell.material = this.astroScene.createMaterial(`scale_${this._scaleStep}`, new Color3(0.35, 0.62, 1), { emissive: 0.24, alpha: 0.28, backFaceCulling: false });
    this._track(shell);
    this._track(this.astroScene.createLabel(title, new Vector3(0, radius * 0.58, 0), { width: 2.8, height: 0.34 }));
    this._overlayPanel.querySelector('[data-scale-title]').textContent = title;
    this._overlayPanel.querySelector('[data-scale-caption]').textContent = caption;
  }

  showUniverseExpansionMode() {
    this._clearMode();
    for (let i = 0; i < 34; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 11;
      const dot = MeshBuilder.CreateSphere(`astro_expansion_galaxy_${i}`, { diameter: 0.18 + Math.random() * 0.18, segments: 10 }, this.scene);
      dot.position = new Vector3(Math.cos(angle) * radius, (Math.random() - 0.5) * 4, Math.sin(angle) * radius);
      dot.metadata = { velocity: dot.position.normalize().scale(0.0018 + Math.random() * 0.003), expansion: true };
      dot.material = this.astroScene.createMaterial(`expansion_dot_${i}`, this._showRedshift ? new Color3(1, 0.25, 0.15) : new Color3(0.55, 0.75, 1), { emissive: 0.82 });
      this._track(dot);
      if (this._showArrows) {
        const end = dot.position.add(dot.metadata.velocity.normalize().scale(1.2));
        const arrow = MeshBuilder.CreateLines(`astro_expansion_arrow_${i}`, { points: [dot.position.clone(), end] }, this.scene);
        arrow.color = new Color3(1, 0.75, 0.25);
        this._track(arrow);
      }
    }
    this.context.info.update({
      title: 'Cosmic Expansion Mode',
      concepts: ['Expansion of space', 'Redshift', 'Recession direction', 'Scale ladder'],
      goal: 'Visualize the basic idea that, on large scales, galaxies appear to move away as space expands.',
      observe: 'Small galaxies drift outward. Red color suggests redshift; arrows show recession direction.',
      explanation: 'On large scales, galaxies appear to move away from each other because space itself expands.',
      tryThis: 'Change expansion speed, then hide arrows and decide what becomes harder to observe.',
      misconception: 'Cosmic expansion is not ordinary motion through a pre-existing empty room; the scale of space changes.',
    });
  }

  _clearMode() {
    this._overlayPanel?.remove();
    this._overlayPanel = null;
    this._resources.forEach(resource => {
      try { resource.dispose?.(); } catch (_) {}
    });
    this._resources = [];
    this.astroScene.cleanup();
    this.astroScene.addStarfield();
  }

  setPaused(paused) { this._paused = paused; }
  setSpeed(speed) { this._speed = speed; }
  setLabelsVisible(visible) { this.astroScene.setLabelsVisible(visible); }
  getLessonObjective() { return 'Move from galaxy structure to redshift, black holes, and the scale ladder of deep space.'; }
  getDiscussionQuestions() { return ['How is a galaxy different from a solar system?', 'What does redshift measure?', 'Why should black-hole diagrams name their placeholders?']; }
  getTeacherSpotlight() { return 'Spotlight scale: astronomy changes units because distances become too large for everyday numbers.'; }
  pauseSimulation() { this.setPaused(true); }
  resetForClassroom() { this._clearMode(); this._buildStructureMode(); this.context.module?.resetView?.(); }

  update(deltaTime) {
    if (this._paused) return;
    this._resources.forEach(resource => {
      if (resource?.metadata?.velocity) {
        resource.position.addInPlace(resource.metadata.velocity.scale(deltaTime * this._speed));
      } else if (resource?.metadata?.spectrumLine) {
        resource.position.x = resource.metadata.baseX + Math.min(1.25, this._speed * 0.24);
        const caption = this._overlayPanel?.querySelector('[data-spectrum-caption]');
        if (caption) caption.textContent = `Shift: ${Math.min(1.25, this._speed * 0.24).toFixed(2)} wavelength units`;
      } else if (resource?.position) {
        const angle = deltaTime * 0.00008 * this._speed;
        const x = resource.position.x;
        const z = resource.position.z;
        resource.position.x = x * Math.cos(angle) - z * Math.sin(angle);
        resource.position.z = x * Math.sin(angle) + z * Math.cos(angle);
      }
      if (resource?.rotation) resource.rotation.y += deltaTime * 0.00014 * this._speed;
    });
  }

  hide() {
    this._panel?.remove();
    this._overlayPanel?.remove();
    this._panel = null;
    this._overlayPanel = null;
    this._resources = [];
    this.astroScene.cleanup();
  }
}
