import { MeshBuilder, Color3, Vector3 } from '@babylonjs/core';
import { SOLAR_SYSTEM_BODIES } from '../data/solarSystemData.js';
import { circularOrbitPosition, meanAnomaly, orbitalSpeedFactor } from '../utils/orbitalMath.js';
import { createTour, exitTour, nextTourStep, pauseTour, previousTourStep, startTour } from '../utils/astroTour.js';

const PLUTO_DWARF_PLANET = {
  id: 'pluto', name: 'Pluto', type: 'Dwarf planet', order: 9, diameterKm: 2377, distanceFromSunKm: 5906400000,
  orbitalPeriod: '248 Earth years', orbitalPeriodDays: 90560, rotationPeriod: '6.4 Earth days', moons: 5,
  color: new Color3(0.72, 0.62, 0.52), simpleRadius: 0.13, simpleDistance: 17.4,
  relativeRadius: 0.1, relativeDistance: 16.2,
  fact: 'Pluto is a dwarf planet in the Kuiper Belt.',
  whatItIs: 'A small icy dwarf planet beyond Neptune.',
  observe: 'It appears past Neptune as an optional dwarf-planet comparison point.',
  tryThis: 'Compare Pluto with Mercury and the Moon.',
  teacherNote: 'Use Pluto to discuss how scientific categories change with evidence.',
  challenge: 'Why is Pluto grouped as a dwarf planet instead of a major planet?',
};

export class SolarSystemExplorer {
  constructor(context) {
    this.context = context;
    this.scene = context.scene;
    this.astroScene = context.astroScene;
    this.interaction = context.interaction;
    this._bodies = [];
    this._panel = null;
    this._time = 0;
    this._paused = false;
    this._speed = 1;
    this._mode = 'simple';
    this._selected = null;
    this._compare = [];
    this._modeResources = [];
    this._tour = null;
    this._tourPanel = null;
    this._scalePanel = null;
  }

  show() {
    this.astroScene.beginScene('solarSystem');
    this.astroScene.addLight('sun_light', new Vector3(0, 0, 0), new Color3(1, 0.78, 0.38), 3.1);
    this._buildPanel();
    this._buildSystem();
    this._showIntro();
  }

  _buildPanel() {
    const panel = document.createElement('div');
    panel.className = 'astro-mode-panel';
    panel.innerHTML = `
      <p class="astro-kicker">Solar modes</p>
      <button data-mode="simple" class="active">Simple Scale</button>
      <button data-mode="compressed">Compressed Orbit</button>
      <button data-mode="relative">Relative Size</button>
      <button data-mode="relativeSpeed">Relative Speed</button>
      <button data-mode="orbit">Orbit Animation</button>
      <button data-mode="focus">Focus Mode</button>
      <button data-mode="comparison">Planet Comparison</button>
      <button data-mode="gravity">Gravity Concept</button>
      <button data-mode="habitable">Habitable Zone</button>
      <button data-mode="tour">Cinematic Tour</button>
      <button data-mode="well">Gravity Well</button>
      <button data-mode="scaleCompare">Compare Scale</button>
      <p class="astro-panel-note">Click a planet to focus and update the learning panel.</p>
    `;
    panel.addEventListener('click', event => {
      const button = event.target.closest('button[data-mode]');
      if (!button) return;
      panel.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      this._mode = button.dataset.mode;
      this._paused = !['orbit', 'relativeSpeed'].includes(this._mode);
      this._clearModeResources();
      this._tourPanel?.remove();
      this._tourPanel = null;
      this._scalePanel?.remove();
      this._scalePanel = null;
      this._applyMode();
      if (this._mode === 'gravity') this._showGravityConcept();
      if (this._mode === 'habitable') this._showHabitableZone();
      if (this._mode === 'tour') this._startCinematicTour();
      if (this._mode === 'well') this._showGravityWell();
      if (this._mode === 'scaleCompare') this._showScaleClassroom();
      this.astroScene.showStatus(`${button.textContent} enabled`);
    });
    document.body.appendChild(panel);
    this._panel = panel;
  }

  _buildSystem() {
    this._bodies = [];
    [...SOLAR_SYSTEM_BODIES, PLUTO_DWARF_PLANET].forEach((body, index) => {
      const radius = this._radiusFor(body);
      const distance = this._distanceFor(body);
      const mesh = MeshBuilder.CreateSphere(`astro_${body.id}`, { diameter: radius * 2, segments: body.id === 'sun' ? 48 : 32 }, this.scene);
      mesh.position = new Vector3(distance, 0, body.id === 'moon' ? 0.55 : 0);
      mesh.material = this.astroScene.createMaterial(body.id, body.color, { emissive: body.id === 'sun' ? 0.88 : 0.06 });
      this.astroScene.track(mesh);

      if (body.id !== 'sun' && body.id !== 'moon') this.astroScene.createOrbitRing(body.id, distance, new Color3(0.22, 0.42, 0.75));
      if (body.id === 'sun') this._addSunGlow(radius);
      if (body.id === 'saturn') this._addSaturnRing(mesh, radius);
      if (body.id === 'earth') this.astroScene.createOrbitRing('moon_around_earth', 0.72, new Color3(0.55, 0.72, 1)).position = mesh.position.clone();

      const label = this.astroScene.createLabel(body.name, mesh.position.add(new Vector3(0, radius + 0.42 + (index % 3) * 0.12, 0)), {
        width: body.name.length > 7 ? 1.9 : 1.45,
        height: 0.34,
      });

      this.interaction?.register?.(mesh, () => this._selectBody(body.id), null, {
        metadata: {
          title: body.name,
          type: body.type,
          summary: body.fact,
          question: body.challenge,
        },
        capabilities: { canMove: false, canThrow: false, canScale: false },
      });

      this._bodies.push({ body, mesh, label, angle: index * 0.45, radius, distance });
    });
    this._buildAsteroidBelt();
  }

  _radiusFor(body) {
    return this._mode === 'relative' ? body.relativeRadius : body.simpleRadius;
  }

  _distanceFor(body) {
    if (this._mode === 'compressed') return body.relativeDistance;
    return this._mode === 'relative' ? body.relativeDistance : body.simpleDistance;
  }

  _addSunGlow(radius) {
    const glow = MeshBuilder.CreateSphere('astro_sun_glow_shell', { diameter: radius * 3.1, segments: 32 }, this.scene);
    glow.material = this.astroScene.createMaterial('sun_glow_shell', new Color3(1, 0.55, 0.1), { emissive: 0.8, alpha: 0.18, backFaceCulling: false });
    glow.isPickable = false;
    this.astroScene.track(glow);
  }

  _addSaturnRing(mesh, radius) {
    const ring = MeshBuilder.CreateTorus('astro_saturn_ring', { diameter: radius * 3.05, thickness: 0.055, tessellation: 128 }, this.scene);
    ring.position = mesh.position.clone();
    ring.rotation.x = Math.PI / 2.18;
    ring.material = this.astroScene.createMaterial('saturn_ring', new Color3(0.88, 0.78, 0.58), { emissive: 0.14, alpha: 0.78 });
    ring.isPickable = false;
    this.astroScene.track(ring);
    mesh.metadata = { ...(mesh.metadata || {}), ring };
  }

  _applyMode() {
    this._bodies.forEach(item => {
      item.radius = this._radiusFor(item.body);
      item.distance = this._distanceFor(item.body);
      item.mesh.scaling.setAll(item.radius / item.body.simpleRadius);
      if (item.body.id === 'sun') return;
      const angleDeg = meanAnomaly(this._time * 80, item.body.orbitalPeriodDays || 365, item.angle * 57.3);
      const pos = circularOrbitPosition(item.distance, angleDeg);
      item.mesh.position.x = pos.x;
      item.mesh.position.z = pos.z + (item.body.id === 'moon' ? 0.55 : 0);
      item.label.position.copyFrom(item.mesh.position.add(new Vector3(0, item.radius + 0.48, 0)));
      if (item.mesh.metadata?.ring) item.mesh.metadata.ring.position.copyFrom(item.mesh.position);
    });
  }

  _selectBody(id) {
    const item = this._bodies.find(entry => entry.body.id === id);
    if (!item) return;
    this._selected = item;
    if (this._mode === 'comparison' && item.body.id !== 'sun' && item.body.id !== 'moon') {
      this._compare = [...this._compare.filter(entry => entry.body.id !== id), item].slice(-2);
      if (this._compare.length === 2) this._showComparison();
    }
    const camera = this.scene.activeCamera;
    if (camera) {
      camera.target = item.mesh.position.clone();
      camera.radius = Math.max(3.2, item.radius * 8);
    }
    this.context.info.update({
      title: item.body.name,
      concepts: [item.body.type, `Order: ${item.body.order || 'center'}`, `Moons: ${item.body.moons}`],
      goal: item.body.whatItIs,
      observe: `${item.body.observe} Diameter: ${item.body.diameterKm.toLocaleString()} km. Distance: ${item.body.distanceFromSunKm.toLocaleString()} km.`,
      explanation: `${item.body.name} orbital period: ${item.body.orbitalPeriod}. Rotation period: ${item.body.rotationPeriod}.`,
      tryThis: item.body.tryThis,
      teacherNote: item.body.teacherNote,
      challenge: item.body.challenge,
      misconception: id === 'moon' ? 'Many students think the Moon produces its own light. We see reflected sunlight.' : null,
    });
  }

  _showComparison() {
    const [a, b] = this._compare;
    this.context.info.update({
      title: `${a.body.name} vs ${b.body.name}`,
      concepts: ['Planet comparison', 'Diameter', 'Orbit', 'Moons'],
      goal: 'Compare two planets using measurable properties rather than appearance alone.',
      observe: `${a.body.name}: ${a.body.diameterKm.toLocaleString()} km diameter, ${a.body.orbitalPeriod}, ${a.body.moons} moons. ${b.body.name}: ${b.body.diameterKm.toLocaleString()} km diameter, ${b.body.orbitalPeriod}, ${b.body.moons} moons.`,
      explanation: `${a.body.name} is a ${a.body.type}; ${b.body.name} is a ${b.body.type}. Distances from Sun: ${a.body.distanceFromSunKm.toLocaleString()} km vs ${b.body.distanceFromSunKm.toLocaleString()} km.`,
      tryThis: 'Compare one rocky planet with one gas or ice giant.',
      misconception: 'A planet farther from the Sun is not automatically larger.',
    });
  }

  _showGravityConcept() {
    this._bodies.forEach(item => {
      if (item.body.id === 'sun' || item.body.id === 'moon') return;
      const line = MeshBuilder.CreateLines(`astro_gravity_arrow_${item.body.id}`, { points: [item.mesh.position.clone(), Vector3.Zero()] }, this.scene);
      line.color = new Color3(1, 0.85, 0.25);
      this.astroScene.track(line);
      this._modeResources.push(line);
    });
    this.context.info.update({
      title: 'Gravity Concept Mode',
      concepts: ['Gravity', 'Centripetal acceleration', 'Orbits'],
      goal: 'See gravity as the inward pull that keeps planets moving around the Sun.',
      observe: 'Yellow lines point from planets toward the Sun.',
      explanation: 'This is not a full N-body simulation. It shows the concept that orbital motion requires inward acceleration.',
      tryThis: 'Watch inner planets move faster in Relative Speed mode.',
      misconception: 'Planets are not pushed around by rings; orbit rings are visual guides.',
    });
  }

  _showHabitableZone() {
    const inner = this.astroScene.createOrbitRing('habitable_zone_inner', 4.75, new Color3(0.2, 1, 0.48));
    const outer = this.astroScene.createOrbitRing('habitable_zone_outer', 5.9, new Color3(0.2, 1, 0.48));
    const label = this.astroScene.createLabel('Habitable zone placeholder', new Vector3(0, 0.65, 5.35), { width: 3, height: 0.34 });
    this._modeResources.push(inner, outer, label);
    this.context.info.update({
      title: 'Habitable Zone Placeholder',
      concepts: ['Habitable zone', 'Liquid water', 'Planet conditions'],
      goal: 'Introduce the region where liquid water may exist under suitable conditions.',
      observe: 'Earth sits inside the green placeholder zone.',
      explanation: 'The habitable zone depends on star brightness and planet atmosphere, not distance alone.',
      tryThis: 'Select Earth, Venus, and Mars and compare their positions.',
      misconception: 'Being in the habitable zone does not guarantee life.',
    });
  }

  _buildAsteroidBelt() {
    for (let i = 0; i < 96; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 7.55 + Math.random() * 0.85;
      const rock = MeshBuilder.CreateSphere(`astro_asteroid_${i}`, { diameter: 0.025 + Math.random() * 0.055, segments: 6 }, this.scene);
      rock.position = new Vector3(Math.cos(angle) * radius, (Math.random() - 0.5) * 0.18, Math.sin(angle) * radius);
      rock.material = this.astroScene.createMaterial(`asteroid_${i}`, new Color3(0.42, 0.38, 0.32), { emissive: 0.05 });
      rock.isPickable = false;
      this.astroScene.track(rock);
    }
    this.astroScene.createLabel('Asteroid belt', new Vector3(0, 0.72, 7.95), { width: 2.2, height: 0.32 });
  }

  _startCinematicTour() {
    this._tour = createTour([
      { id: 'sun', title: 'The Sun', bodyId: 'sun', caption: 'The Sun anchors nearly all Solar System mass.' },
      { id: 'earth', title: 'Earth and Moon', bodyId: 'earth', caption: 'Earth is shown with its local Moon orbit guide.' },
      { id: 'jupiter', title: 'Jupiter', bodyId: 'jupiter', caption: 'The largest planet reveals why scale modes matter.' },
      { id: 'outer', title: 'Outer System', bodyId: 'neptune', caption: 'Outer planets move more slowly and sit much farther out.' },
      { id: 'pluto', title: 'Pluto', bodyId: 'pluto', caption: 'Pluto adds a dwarf-planet category discussion.' },
    ]);
    startTour(this._tour);
    this._showTourPanel();
    this._applyTourStep();
  }

  _showTourPanel() {
    this._tourPanel?.remove();
    const panel = document.createElement('div');
    panel.className = 'astro-tour-panel';
    panel.innerHTML = `
      <strong data-tour-title>Cinematic Tour</strong>
      <p data-tour-caption></p>
      <div>
        <button type="button" data-tour="prev">Prev</button>
        <button type="button" data-tour="pause">Pause</button>
        <button type="button" data-tour="next">Next</button>
        <button type="button" data-tour="exit">Exit</button>
      </div>
    `;
    panel.addEventListener('click', event => {
      const action = event.target.closest('[data-tour]')?.dataset.tour;
      if (action === 'prev') { previousTourStep(this._tour); this._applyTourStep(); }
      if (action === 'next') { nextTourStep(this._tour); this._applyTourStep(); }
      if (action === 'pause') { pauseTour(this._tour); this.astroScene.showStatus('Cinematic tour paused.'); }
      if (action === 'exit') { exitTour(this._tour); this._tourPanel?.remove(); this._tourPanel = null; }
    });
    document.body.appendChild(panel);
    this._tourPanel = panel;
  }

  _applyTourStep() {
    const step = this._tour?.currentStep;
    if (!step) return;
    const item = this._bodies.find(entry => entry.body.id === step.bodyId);
    if (item && this.scene.activeCamera) {
      this.scene.activeCamera.target = item.mesh.position.clone();
      this.scene.activeCamera.radius = Math.max(4, item.radius * 9);
    }
    this._tourPanel.querySelector('[data-tour-title]').textContent = step.title;
    this._tourPanel.querySelector('[data-tour-caption]').textContent = step.caption;
    this.context.info.update({
      title: step.title,
      concepts: ['Cinematic tour', 'Observation sequence', 'Scale'],
      goal: 'Follow a teacher-led path through the Solar System without losing the whole model.',
      observe: step.caption,
      explanation: 'The tour changes the camera target while preserving the same procedural Solar System.',
      tryThis: 'Ask students what changed between this stop and the previous stop.',
    });
  }

  _showGravityWell() {
    [1.7, 2.6, 3.6, 4.7].forEach((diameter, i) => {
      const ring = MeshBuilder.CreateTorus(`astro_gravity_well_${i}`, { diameter, thickness: 0.018, tessellation: 96 }, this.scene);
      ring.position = new Vector3(0, -0.12 - i * 0.08, 0);
      ring.material = this.astroScene.createMaterial(`gravity_well_${i}`, new Color3(0.55, 0.75, 1), { emissive: 0.35, alpha: 0.48 });
      this._modeResources.push(this.astroScene.track(ring));
    });
    this.context.info.update({
      title: 'Gravity Well Concept',
      concepts: ['Gravity', 'Curved space placeholder', 'Mass'],
      goal: 'Use nested rings as a classroom metaphor for stronger gravity near more massive objects.',
      observe: 'The rings sit below the Sun as a symbolic gravity well.',
      explanation: 'This is a visual metaphor, not a general-relativity simulation. It supports discussion before formal math.',
      tryThis: 'Compare the Sun well with the gravity arrows mode.',
      misconception: 'Objects do not orbit because they roll on a literal fabric sheet in space.',
    });
  }

  _showScaleClassroom() {
    this._scalePanel?.remove();
    const panel = document.createElement('div');
    panel.className = 'astro-scale-compare-panel';
    panel.innerHTML = `
      <strong>Classroom Scale Compare</strong>
      <p>Sun diameter: about 109 Earth diameters.</p>
      <p>Jupiter diameter: about 11 Earth diameters.</p>
      <p>Moon diameter: about 0.27 Earth diameters.</p>
      <p>Model note: distances and sizes are compressed separately so the class can inspect both.</p>
    `;
    document.body.appendChild(panel);
    this._scalePanel = panel;
    this.context.info.update({
      title: 'Compare Scale Classroom Mode',
      concepts: ['Scale model', 'Diameter ratio', 'Compressed distance'],
      goal: 'Separate size comparison from distance comparison.',
      observe: 'The side panel names ratios that the procedural scene cannot show at true scale on one screen.',
      explanation: 'True Solar System scale is mostly empty space, so classroom models often compress distance.',
      tryThis: 'Ask: which is harder to show accurately in a classroom, size or distance?',
    });
  }

  _clearModeResources() {
    this._modeResources.forEach(resource => {
      try { resource.dispose?.(); } catch (_) {}
    });
    this._modeResources = [];
  }

  _showIntro() {
    this.context.info.show({
      title: 'Solar System Explorer',
      goal: 'Compare planet order, sizes, and orbital motion using classroom-friendly scale modes.',
      concepts: ['Solar system', 'Orbits', 'Relative size', 'Planet facts'],
      observe: 'Orbit rings show paths around the Sun. Saturn has rings, and Earth includes a small Moon orbit guide.',
      explanation: 'Distances and sizes are compressed so students can see the full system on one screen.',
      tryThis: 'Switch to Relative Size, then select Jupiter and compare it with Earth.',
      misconception: 'The distances are not exact in this view; the model compresses space so it is usable.',
    });
  }

  _orbitalSpeed(body) {
    if (body.id === 'moon') return 2.2;
    return Math.max(0.08, 1.4 / Math.max(1, body.order || 1));
  }

  setPaused(paused) { this._paused = paused; }
  setSpeed(speed) { this._speed = speed; }
  setLabelsVisible(visible) { this.astroScene.setLabelsVisible(visible); }
  getLessonObjective() { return 'Compare Solar System order, scale, orbits, and gravity using simplified but explicit classroom modes.'; }
  getDiscussionQuestions() { return ['Why do inner planets orbit faster?', 'What does this model compress or exaggerate?', 'Why did Pluto become a dwarf planet category example?']; }
  getTeacherSpotlight() { return 'Spotlight the difference between true size, true distance, and usable classroom scale.'; }
  pauseSimulation() { this.setPaused(true); }
  resetForClassroom() { this._mode = 'simple'; this._clearModeResources(); this.context.module?.resetView?.(); this._showIntro(); }

  update(deltaTime) {
    if (this._paused && !['orbit', 'relativeSpeed'].includes(this._mode)) return;
    if (!this._paused) this._time += deltaTime * 0.001 * this._speed;
    this._bodies.forEach(item => {
      item.mesh.rotation.y += 0.004 * Math.max(0.2, this._speed);
      if (item.body.id === 'sun') return;
      const speedBoost = this._mode === 'relativeSpeed' ? orbitalSpeedFactor(item.body.orbitalPeriodDays || 365) : 1;
      const angleDeg = meanAnomaly(this._time * 80 * speedBoost, item.body.orbitalPeriodDays || 365, item.angle * 57.3);
      const pos = circularOrbitPosition(item.distance, angleDeg);
      item.mesh.position.x = pos.x;
      item.mesh.position.z = pos.z + (item.body.id === 'moon' ? 0.55 : 0);
      item.label.position.copyFrom(item.mesh.position.add(new Vector3(0, item.radius + 0.48, 0)));
      if (item.mesh.metadata?.ring) item.mesh.metadata.ring.position.copyFrom(item.mesh.position);
    });
  }

  hide() {
    this._panel?.remove();
    this._tourPanel?.remove();
    this._scalePanel?.remove();
    this._panel = null;
    this._tourPanel = null;
    this._scalePanel = null;
    this._bodies.forEach(item => this.interaction?.unregister?.(item.mesh));
    this._clearModeResources();
    this._bodies = [];
    this.astroScene.cleanup();
  }
}
