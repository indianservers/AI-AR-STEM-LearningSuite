import { PLANET_ORDER } from '../data/solarSystemData.js';

const STORAGE_KEY = 'astroMissionsProgress';
const CAMPAIGN_KEY = 'astroCampaignProgress';
const BADGES_KEY = 'astroBadges';
const BOSS_KEY = 'astroBossScores';

const MISSIONS = [
  {
    id: 'planet-order',
    title: 'Planet Order Challenge',
    objective: 'Click planets in order from the Sun.',
    concept: 'Solar System order',
    difficulty: 'Beginner',
    choices: ['Earth', 'Mercury', 'Neptune', 'Venus', 'Mars', 'Jupiter', 'Uranus', 'Saturn'],
    answer: PLANET_ORDER,
  },
  {
    id: 'find-polaris',
    title: 'Find Polaris',
    objective: 'Select the star that marks the North Star.',
    concept: 'North direction and celestial pole',
    difficulty: 'Beginner',
    choices: ['Sirius', 'Polaris', 'Vega', 'Rigel'],
    answer: ['Polaris'],
  },
  {
    id: 'radec-detective',
    title: 'RA/Dec Detective',
    objective: 'RA about 6h 45m and Dec about -17 degrees identifies which star?',
    concept: 'Celestial coordinates',
    difficulty: 'Intermediate',
    choices: ['Sirius', 'Polaris', 'Antares', 'Capella'],
    answer: ['Sirius'],
  },
  {
    id: 'seasons-cause',
    title: 'Why Seasons Happen',
    objective: 'Select the main cause of seasons on Earth.',
    concept: 'Axial tilt',
    difficulty: 'Beginner',
    choices: ['Earth is closer to the Sun', 'Earth axial tilt', 'The Moon blocks sunlight', 'Jupiter pulls Earth'],
    answer: ['Earth axial tilt'],
  },
  {
    id: 'telescope-setup',
    title: 'Telescope Setup Challenge',
    objective: 'Choose reasonable observing setups.',
    concept: 'Aperture and useful magnification',
    difficulty: 'Intermediate',
    choices: ['Moon = medium magnification', 'Jupiter = steady medium-high magnification', 'Andromeda = wide field', 'Andromeda = maximum zoom'],
    answer: ['Moon = medium magnification', 'Jupiter = steady medium-high magnification', 'Andromeda = wide field'],
  },
  {
    id: 'habitable-zone',
    title: 'Habitable Zone Challenge',
    objective: 'Identify the planet shown inside the simple habitable-zone placeholder.',
    concept: 'Habitable zone',
    difficulty: 'Beginner',
    choices: ['Mercury', 'Earth', 'Neptune', 'Jupiter'],
    answer: ['Earth'],
  },
  {
    id: 'constellation-builder',
    title: 'Constellation Builder',
    objective: 'Choose stars that form the Orion Belt.',
    concept: 'Constellation patterns',
    difficulty: 'Intermediate',
    choices: ['Mintaka', 'Alnilam', 'Alnitak', 'Polaris', 'Vega'],
    answer: ['Mintaka', 'Alnilam', 'Alnitak'],
  },
  {
    id: 'moon-phase',
    title: 'Identify the Moon Phase',
    objective: 'Which phase appears when the Moon is opposite the Sun from Earth?',
    concept: 'Moon phases',
    difficulty: 'Beginner',
    choices: ['New Moon', 'First Quarter', 'Full Moon', 'Waning Crescent'],
    answer: ['Full Moon'],
  },
  {
    id: 'target-match',
    title: 'Telescope Target Match',
    objective: 'Match each target with its object type.',
    concept: 'Observational astronomy',
    difficulty: 'Intermediate',
    choices: ['Moon = natural satellite', 'Jupiter = gas giant', 'Orion Nebula = nebula', 'Andromeda = galaxy', 'Pleiades = star cluster'],
    answer: ['Moon = natural satellite', 'Jupiter = gas giant', 'Orion Nebula = nebula', 'Andromeda = galaxy', 'Pleiades = star cluster'],
  },
  {
    id: 'star-hunt',
    title: 'Star Name Hunt',
    objective: 'Find the four named stars in the AR Sky Map.',
    concept: 'Bright stars',
    difficulty: 'Beginner',
    choices: ['Sirius', 'Polaris', 'Vega', 'Betelgeuse'],
    answer: ['Sirius', 'Polaris', 'Vega', 'Betelgeuse'],
  },
  {
    id: 'eclipse-alignment',
    title: 'Eclipse Alignment',
    objective: 'Identify which body is in the middle.',
    concept: 'Eclipses',
    difficulty: 'Intermediate',
    choices: ['Solar eclipse = Moon in the middle', 'Lunar eclipse = Earth in the middle', 'Solar eclipse = Sun in the middle'],
    answer: ['Solar eclipse = Moon in the middle', 'Lunar eclipse = Earth in the middle'],
  },
];

const CAMPAIGN_LEVELS = [
  { id: 'rookie-observer', title: 'Rookie Observer', story: 'Learn the sky map, planet order, and Moon phases.', missions: ['planet-order', 'find-polaris', 'moon-phase'], badge: 'Sky Starter' },
  { id: 'system-navigator', title: 'System Navigator', story: 'Connect Solar System scale, eclipses, seasons, and telescope setup.', missions: ['habitable-zone', 'eclipse-alignment', 'telescope-setup'], badge: 'Orbit Guide' },
  { id: 'deep-space-cadet', title: 'Deep Space Cadet', story: 'Move from stars to galaxies, redshift, and observing evidence.', missions: ['radec-detective', 'constellation-builder', 'target-match'], badge: 'Deep Space Cadet' },
];

const BOSS_CHALLENGES = [
  { id: 'eclipse-boss', title: 'Eclipse Boss', prompt: 'Choose the two statements that make an eclipse possible.', answer: ['Correct alignment', 'Moon near orbital node'], choices: ['Correct alignment', 'Moon near orbital node', 'Earth closest to Sun', 'Jupiter blocks the Moon'] },
  { id: 'redshift-boss', title: 'Redshift Boss', prompt: 'What does galaxy redshift usually tell astronomers?', answer: ['Wavelengths shifted longer', 'Distant galaxies receding'], choices: ['Wavelengths shifted longer', 'Distant galaxies receding', 'Stars become colder', 'Telescopes add red color'] },
];

export class AstroMissions {
  constructor(context) {
    this.context = context;
    this.astroScene = context.astroScene;
    this._panel = null;
    this._activeMission = null;
    this._selected = [];
    this._progress = this._loadProgress();
    this._campaign = this._loadKey(CAMPAIGN_KEY, {});
    this._badges = this._loadKey(BADGES_KEY, []);
    this._bossScores = this._loadKey(BOSS_KEY, {});
  }

  show() {
    this.astroScene.beginScene('hub');
    this._renderBoard();
    this.context.info.show({
      title: 'Astro Missions',
      goal: 'Practice astronomy concepts through lightweight guided challenges.',
      concepts: ['Planet order', 'Moon phases', 'Telescope targets', 'Stars', 'Eclipses'],
      observe: 'Each mission has an objective, concept, status, score placeholder, and start button.',
      explanation: 'Phase 2 uses simple interactions so the mission system can later connect to progress and achievements.',
      tryThis: 'Start Planet Order Challenge and click planets from Mercury to Neptune.',
      misconception: 'A mission is not a separate lesson yet; it points you back toward the simulations.',
    });
  }

  _renderBoard() {
    this._panel?.remove();
    const panel = document.createElement('div');
    panel.className = 'astro-missions-panel';
    panel.innerHTML = `
      <p class="astro-kicker">Mission board</p>
      <h3>Astro Missions</h3>
      <div class="astro-campaign-strip">
        ${CAMPAIGN_LEVELS.map(level => `
          <article>
            <strong>${level.title}</strong>
            <p>${level.story}</p>
            <small>Badge: ${level.badge} | ${this._campaign[level.id]?.complete ? 'Complete' : 'In progress'}</small>
            <button data-campaign="${level.id}">Open Level</button>
          </article>
        `).join('')}
      </div>
      <div class="astro-badge-row">${this._badges.length ? this._badges.map(badge => `<span>${badge}</span>`).join('') : '<span>No badges yet</span>'}</div>
      <div class="astro-mission-grid">
        ${MISSIONS.map(mission => `
          <article class="astro-mission-card">
            <span>${mission.difficulty}</span>
            <strong>${mission.title}</strong>
            <p>${mission.objective}</p>
            <small>Concept: ${mission.concept}</small>
            <small>Status: ${this._progress[mission.id]?.complete ? 'Complete' : 'Ready'} | Score: ${this._progress[mission.id]?.score || 0} | Stars: ${this._progress[mission.id]?.stars || 0}</small>
            <button data-start="${mission.id}">Start Mission</button>
          </article>
        `).join('')}
      </div>
      <div class="astro-boss-row">
        ${BOSS_CHALLENGES.map(boss => `<button data-boss="${boss.id}">${boss.title} ${this._bossScores[boss.id]?.best ? `(${this._bossScores[boss.id].best})` : ''}</button>`).join('')}
      </div>
      <div data-mission-workspace class="astro-mission-workspace"></div>
    `;
    panel.addEventListener('click', event => {
      const start = event.target.closest('[data-start]');
      const choice = event.target.closest('[data-choice]');
      const check = event.target.closest('[data-check]');
      const campaign = event.target.closest('[data-campaign]');
      const boss = event.target.closest('[data-boss]');
      if (start) this._startMission(start.dataset.start);
      if (campaign) this._openCampaignLevel(campaign.dataset.campaign);
      if (boss) this._startBossChallenge(boss.dataset.boss);
      if (choice) this._selectChoice(choice.dataset.choice, choice);
      if (check) this._checkMission();
    });
    document.body.appendChild(panel);
    this._panel = panel;
  }

  _startMission(id) {
    this._activeMission = MISSIONS.find(mission => mission.id === id);
    this._selected = [];
    this.recordAstroMissionStarted(id);
    const workspace = this._panel.querySelector('[data-mission-workspace]');
    workspace.innerHTML = `
      <h4>${this._activeMission.title}</h4>
      <p>${this._activeMission.objective}</p>
      <div class="astro-choice-row">
        ${this._activeMission.choices.map(choice => `<button data-choice="${choice}">${choice}</button>`).join('')}
      </div>
      <div class="astro-mission-answer">Selected: <span data-selected>none</span></div>
      <button data-check>Check Mission</button>
      <p data-result></p>
    `;
    this.context.info.update({
      title: this._activeMission.title,
      concepts: [this._activeMission.concept, this._activeMission.difficulty],
      goal: this._activeMission.objective,
      observe: 'Click choices in the order you think is correct.',
      explanation: 'The mission checks your selected sequence against a simple answer key.',
      tryThis: 'Use the simulations if you need evidence before answering.',
      challenge: 'Explain your answer out loud before checking.',
    });
  }

  _selectChoice(choice, button) {
    if (!this._activeMission) return;
    this._selected.push(choice);
    button.classList.add('active');
    this._panel.querySelector('[data-selected]').textContent = this._selected.join(' -> ');
  }

  _checkMission() {
    if (!this._activeMission) return;
    const answer = this._activeMission.answer;
    const trimmed = this._selected.slice(0, answer.length);
    const score = trimmed.filter((choice, index) => choice === answer[index]).length;
    const complete = score === answer.length;
    const attempts = (this._progress[this._activeMission.id]?.attempts || 0) + 1;
    const stars = complete ? Math.max(1, 3 - Math.min(2, attempts - 1)) : 0;
    const result = this._panel.querySelector('[data-result]');
    result.textContent = complete ? `Complete. Score ${score}/${answer.length}. Stars earned: ${stars}.` : `Keep trying. Score ${score}/${answer.length}. Attempts: ${attempts}.`;
    this._progress[this._activeMission.id] = { attempts, score, stars, complete };
    this._saveProgress();
    if (complete) {
      this.recordAstroMissionCompleted(this._activeMission.id, score);
      this._updateCampaignProgress(this._activeMission.id);
    }
  }

  _openCampaignLevel(id) {
    const level = CAMPAIGN_LEVELS.find(item => item.id === id);
    if (!level) return;
    const workspace = this._panel.querySelector('[data-mission-workspace]');
    const completed = level.missions.filter(missionId => this._progress[missionId]?.complete);
    workspace.innerHTML = `
      <h4>${level.title}</h4>
      <p>${level.story}</p>
      <p>Complete ${level.missions.length} linked missions to earn <strong>${level.badge}</strong>.</p>
      <div class="astro-choice-row">
        ${level.missions.map(missionId => {
          const mission = MISSIONS.find(item => item.id === missionId);
          return `<button data-start="${missionId}">${mission.title} ${this._progress[missionId]?.complete ? 'Done' : 'Start'}</button>`;
        }).join('')}
      </div>
      <p>${completed.length}/${level.missions.length} complete</p>
    `;
    this.context.info.update({
      title: level.title,
      concepts: ['Campaign', 'Mission sequence', level.badge],
      goal: level.story,
      observe: `Linked missions: ${level.missions.map(m => MISSIONS.find(item => item.id === m)?.title).join(', ')}`,
      explanation: 'Campaign levels group short challenges into a story path across the Astro module.',
      tryThis: 'Finish the linked missions, then return to this campaign card to check badge progress.',
    });
  }

  _startBossChallenge(id) {
    const boss = BOSS_CHALLENGES.find(item => item.id === id);
    if (!boss) return;
    this._activeMission = { ...boss, concept: 'Boss challenge', difficulty: 'Boss' };
    this._selected = [];
    const workspace = this._panel.querySelector('[data-mission-workspace]');
    workspace.innerHTML = `
      <h4>${boss.title}</h4>
      <p>${boss.prompt}</p>
      <div class="astro-choice-row">
        ${boss.choices.map(choice => `<button data-choice="${choice}">${choice}</button>`).join('')}
      </div>
      <div class="astro-mission-answer">Selected: <span data-selected>none</span></div>
      <button data-check>Check Mission</button>
      <p data-result></p>
    `;
    this.context.info.update({
      title: boss.title,
      concepts: ['Boss challenge', 'Synthesis', 'Evidence'],
      goal: boss.prompt,
      observe: 'Boss challenges combine concepts from multiple Astro labs.',
      explanation: 'Pick the statements that match the evidence from the simulations.',
      tryThis: 'Explain each selected answer before checking.',
    });
  }

  _updateCampaignProgress(missionId) {
    CAMPAIGN_LEVELS.forEach(level => {
      if (!level.missions.includes(missionId)) return;
      const complete = level.missions.every(id => this._progress[id]?.complete);
      this._campaign[level.id] = { complete, updatedAt: Date.now() };
      if (complete && !this._badges.includes(level.badge)) this._badges.push(level.badge);
    });
    this._saveKey(CAMPAIGN_KEY, this._campaign);
    this._saveKey(BADGES_KEY, this._badges);
  }

  recordAstroMissionStarted(missionId) {
    this.astroScene.showStatus(`Mission started: ${missionId}`);
  }

  recordAstroMissionCompleted(missionId, score) {
    this.astroScene.showStatus(`Mission complete: ${missionId} score ${score}`);
    if (BOSS_CHALLENGES.some(boss => boss.id === missionId)) {
      this._bossScores[missionId] = { best: Math.max(this._bossScores[missionId]?.best || 0, score), updatedAt: Date.now() };
      this._saveKey(BOSS_KEY, this._bossScores);
    }
  }

  _loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }

  _saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._progress)); } catch (_) {}
  }

  _loadKey(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  _saveKey(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  attachProgressDashboard() {
    this.astroScene.showStatus('Phase 3 hook: connect Astro missions to progress dashboard trophies.');
  }

  setPaused() {}
  setSpeed() {}
  setLabelsVisible() {}
  getLessonObjective() { return 'Practice Astro Physics concepts through missions, story campaign levels, badges, and synthesis boss challenges.'; }
  getDiscussionQuestions() { return ['Which mission needed evidence from a simulation?', 'What badge path are you closest to finishing?', 'Which boss answer could be proven visually?']; }
  getTeacherSpotlight() { return 'Spotlight evidence-based answering: students should cite the lab view that supports a mission choice.'; }
  pauseSimulation() {}
  resetForClassroom() { this._renderBoard(); }
  update() {}

  hide() {
    this._panel?.remove();
    this._panel = null;
    this.astroScene.cleanup();
  }
}
