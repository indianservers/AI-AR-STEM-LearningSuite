// Feature 23: Progress Dashboard - lab visits, mastery, and trophies
const STORAGE_KEY = 'cosmiclearn_progress';
const TROPHY_DEFS = [
  { id: 'math_explorer',  label: 'Math Explorer',       condition: p => p.mathLabs >= 3 },
  { id: 'physics_ace',    label: 'Physics Ace',         condition: p => p.physicsLabs >= 3 },
  { id: 'chem_builder',   label: 'Chem Builder',        condition: p => p.chemLabs >= 3 },
  { id: 'portal_hopper',  label: 'Portal Hopper',       condition: p => p.mathLabs >= 1 && p.physicsLabs >= 1 && p.chemLabs >= 1 },
  { id: 'completionist',  label: 'Lab Completionist',   condition: p => p.mathLabs >= 9 && p.physicsLabs >= 11 && p.chemLabs >= 11 },
  { id: 'time_tinkerer',  label: 'Time Tinkerer',       condition: p => p.totalMinutes >= 30 },
  { id: 'voice_master',   label: 'Voice Commander',     condition: p => p.voiceCommands >= 5 },
  { id: 'snapshot_pro',   label: 'Snapshot Pro',        condition: p => p.screenshots >= 3 },
  { id: 'gesture_scholar', label: 'Gesture Scholar',    condition: p => Object.values(p.gestures || {}).reduce((a, b) => a + b, 0) >= 30 },
  { id: 'mission_solver', label: 'Mission Solver',      condition: p => (p.challengesCompleted || 0) >= 3 },
];

export class ProgressDashboard {
  constructor() {
    this._data = this._load();
    this._startTime = Date.now();
    this._el = null;
  }

  _load() {
    try { return { ...this._defaults(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
    catch { return this._defaults(); }
  }

  _defaults() {
    return {
      visitedLabs: {},
      mastery: {},
      gestures: {},
      mathLabs: 0,
      physicsLabs: 0,
      chemLabs: 0,
      totalMinutes: 0,
      voiceCommands: 0,
      screenshots: 0,
      challengesCompleted: 0,
      trophies: [],
    };
  }

  _save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data)); }

  recordLab(subject, topicId) {
    const key = subject + ':' + topicId;
    if (!this._data.visitedLabs[key]) {
      this._data.visitedLabs[key] = 0;
      if (subject === 'math') this._data.mathLabs++;
      if (subject === 'physics') this._data.physicsLabs++;
      if (subject === 'chem') this._data.chemLabs++;
    }
    this._data.visitedLabs[key]++;
    this._touchMastery(key, 4);
    this._checkTrophies();
    this._save();
  }

  recordGesture(actionName, subject, topicId) {
    if (!actionName) return;
    this._data.gestures[actionName] = (this._data.gestures[actionName] || 0) + 1;
    if (subject && topicId) this._touchMastery(`${subject}:${topicId}`, 1);
    this._checkTrophies();
    this._save();
  }

  recordChallenge(subject, topicId, success = true) {
    if (success) this._data.challengesCompleted++;
    if (subject && topicId) this._touchMastery(`${subject}:${topicId}`, success ? 14 : 3);
    this._checkTrophies();
    this._save();
  }

  recordVoiceCommand() {
    this._data.voiceCommands++;
    this._checkTrophies();
    this._save();
  }

  recordScreenshot() {
    this._data.screenshots++;
    this._checkTrophies();
    this._save();
  }

  saveSession() {
    const mins = (Date.now() - this._startTime) / 60000;
    this._data.totalMinutes = (this._data.totalMinutes || 0) + mins;
    this._checkTrophies();
    this._save();
  }

  getData() {
    return JSON.parse(JSON.stringify(this._data));
  }

  getMasterySummary(subject = null) {
    const entries = Object.entries(this._data.mastery || {})
      .filter(([key]) => !subject || key.startsWith(subject + ':'))
      .sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
    const totalScore = entries.reduce((sum, [, value]) => sum + (value.score || 0), 0);
    const avg = entries.length ? Math.round(totalScore / entries.length) : 0;
    return { average: avg, strongest: entries[0]?.[0] || null, count: entries.length, entries };
  }

  _touchMastery(key, points) {
    if (!key) return;
    const current = this._data.mastery[key] || { score: 0, touches: 0, lastSeen: 0 };
    current.score = Math.max(0, Math.min(100, current.score + points));
    current.touches++;
    current.lastSeen = Date.now();
    this._data.mastery[key] = current;
  }

  _checkTrophies() {
    TROPHY_DEFS.forEach(t => {
      if (!this._data.trophies.includes(t.id) && t.condition(this._data)) {
        this._data.trophies.push(t.id);
        this._flashTrophy(t.label);
      }
    });
  }

  _flashTrophy(label) {
    const el = document.createElement('div');
    el.className = 'progress-trophy-toast';
    el.textContent = 'Trophy unlocked: ' + label;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  show() {
    this.saveSession();
    this._startTime = Date.now();
    if (this._el) { this._el.remove(); this._el = null; }

    const overlay = document.createElement('div');
    overlay.className = 'progress-overlay';

    const card = document.createElement('section');
    card.className = 'progress-card';

    const total = Object.keys(this._data.visitedLabs).length;
    const mins = Math.round(this._data.totalMinutes);
    const trophies = this._data.trophies.map(id => TROPHY_DEFS.find(t => t.id === id)?.label).filter(Boolean);
    const mastery = this.getMasterySummary();
    const gestureTotal = Object.values(this._data.gestures || {}).reduce((a, b) => a + b, 0);

    card.innerHTML = `
      <header>
        <div>
          <p>Adaptive Mission Log</p>
          <h2>Progress Dashboard</h2>
        </div>
        <button type="button" class="progress-close">Close</button>
      </header>
      <div class="progress-stats">
        <div><strong>${this._data.mathLabs}</strong><span>Math Labs</span></div>
        <div><strong>${this._data.physicsLabs}</strong><span>Physics Labs</span></div>
        <div><strong>${this._data.chemLabs}</strong><span>Chem Labs</span></div>
        <div><strong>${total}</strong><span>Missions Tried</span></div>
        <div><strong>${mins}m</strong><span>Time in Lab</span></div>
        <div><strong>${mastery.average}%</strong><span>Avg Mastery</span></div>
        <div><strong>${gestureTotal}</strong><span>Gestures</span></div>
        <div><strong>${this._data.challengesCompleted}</strong><span>Challenges</span></div>
      </div>
      <div class="progress-section">
        <h3>Trophies (${trophies.length}/${TROPHY_DEFS.length})</h3>
        <div class="progress-trophies">
          ${trophies.length ? trophies.map(t => `<span>${t}</span>`).join('') : '<em>Try three labs in one subject to unlock your first trophy.</em>'}
        </div>
      </div>
      <div class="progress-section">
        <h3>Strongest Labs</h3>
        <div class="progress-mastery">
          ${mastery.entries.slice(0, 5).map(([key, value]) => `
            <div><span>${key.replace(':', ' / ')}</span><meter min="0" max="100" value="${value.score}"></meter><b>${value.score}%</b></div>
          `).join('') || '<em>Open a lab to start mastery tracking.</em>'}
        </div>
      </div>
    `;

    card.querySelector('.progress-close').onclick = () => { overlay.remove(); this._el = null; };
    overlay.appendChild(card);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); this._el = null; } });
    document.body.appendChild(overlay);
    this._el = overlay;
  }

  hide() { this._el?.remove(); this._el = null; }
}
