import { GestureActions } from '../core/GestureActionRegistry.js';

const STORAGE_KEY = 'cosmiclearn_campaign_director';

const CHAPTERS = [
  {
    id: 'portal_rookie',
    title: 'Portal Rookie',
    subject: null,
    briefing: 'Enter any subject, open two labs, and scan your first object.',
    objectives: [
      { metric: 'subjects', goal: 1, label: 'Enter a subject' },
      { metric: 'labs', goal: 2, label: 'Open 2 labs' },
      { metric: 'inspect', goal: 1, label: 'Inspect 1 object' },
    ],
  },
  {
    id: 'math_runner',
    title: 'Math Runner',
    subject: 'math',
    briefing: 'Use math labs like a game board: rotate, inspect, then challenge a boss.',
    objectives: [
      { metric: 'mathLabs', goal: 2, label: 'Open 2 math labs' },
      { metric: 'transform', goal: 3, label: 'Rotate or scale 3 times' },
      { metric: 'bossWins', goal: 1, label: 'Defeat 1 boss' },
    ],
  },
  {
    id: 'physics_pilot',
    title: 'Physics Pilot',
    subject: 'physics',
    briefing: 'Control motion and parameters until the physics starts answering back.',
    objectives: [
      { metric: 'physicsLabs', goal: 2, label: 'Open 2 physics labs' },
      { metric: 'parameter', goal: 4, label: 'Change parameters 4 times' },
      { metric: 'pause', goal: 2, label: 'Pause and predict twice' },
    ],
  },
  {
    id: 'chem_mapper',
    title: 'Chem Mapper',
    subject: 'chem',
    briefing: 'Read matter through shape, inspection, and one serious chemistry fight.',
    objectives: [
      { metric: 'chemLabs', goal: 2, label: 'Open 2 chemistry labs' },
      { metric: 'inspect', goal: 4, label: 'Inspect 4 objects' },
      { metric: 'bossWins', goal: 2, label: 'Win 2 boss fights total' },
    ],
  },
  {
    id: 'mixed_mastery',
    title: 'Mixed Mastery',
    subject: null,
    briefing: 'Switch contexts, use the learning path, then clear a high-skill run.',
    objectives: [
      { metric: 'subjectSwitches', goal: 3, label: 'Switch subjects 3 times' },
      { metric: 'pathOpen', goal: 2, label: 'Open paths twice' },
      { metric: 'bossWins', goal: 3, label: 'Win 3 boss fights' },
    ],
  },
];

function defaults() {
  return {
    chapterIndex: 0,
    completed: [],
    metrics: {},
    lastSubject: null,
  };
}

function titleCase(text = '') {
  return String(text).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export class CampaignDirector {
  constructor({ gestureEngine, interaction, aiTutor, game, getState }) {
    this.gestureEngine = gestureEngine;
    this.interaction = interaction;
    this.aiTutor = aiTutor;
    this.game = game;
    this.getState = getState || (() => ({}));
    this._state = this._load();
    this._panel = null;
    this._mini = null;
    this._toast = null;
    this._lastDirectiveAt = 0;

    this._buildMini();
    this._bind();
    this.syncContext();
    this._render();
  }

  show() {
    if (this._panel) {
      this._panel.remove();
      this._panel = null;
      return;
    }
    const panel = document.createElement('section');
    panel.id = 'campaign-director-panel';
    panel.innerHTML = `
      <header>
        <div>
          <p>Campaign Director</p>
          <h2></h2>
        </div>
        <button type="button" data-action="close">Close</button>
      </header>
      <p class="campaign-briefing"></p>
      <div class="campaign-objectives"></div>
      <div class="campaign-directive"></div>
      <div class="campaign-actions">
        <button type="button" data-action="focus">Focus</button>
        <button type="button" data-action="advance">Next</button>
      </div>
    `;
    panel.addEventListener('click', event => {
      const action = event.target?.dataset?.action;
      if (action === 'close') this.show();
      if (action === 'focus') this.coach();
      if (action === 'advance') this._advanceIfReady(true);
    });
    document.body.appendChild(panel);
    this._panel = panel;
    this._render();
  }

  syncContext() {
    const state = this.getState();
    if (state.currentSubject && state.currentSubject !== this._state.lastSubject) {
      if (this._state.lastSubject) this._bump('subjectSwitches', 1);
      this._state.lastSubject = state.currentSubject;
      this._save();
    }
    this._render();
  }

  recordEvent(type, detail = {}) {
    if (String(type || '').startsWith('campaign')) return;
    if (type === 'subjectEnter') this._bump('subjects', 1);
    if (type === 'topicEnter') {
      this._bump('labs', 1);
      if (detail.subject === 'math') this._bump('mathLabs', 1);
      if (detail.subject === 'physics') this._bump('physicsLabs', 1);
      if (detail.subject === 'chem') this._bump('chemLabs', 1);
    }
    if (type === 'pathOpen') this._bump('pathOpen', 1);
    if (type === 'quizOpen') this._bump('quizOpen', 1);
    if (type === 'bossComplete') this._bump('bossWins', 1);
    if (type === 'bossFail') this._directive('Boss failed. Run the same lab once more, then start the fight again.');
    this._advanceIfReady();
    this._save();
    this._render();
  }

  coach() {
    const chapter = this._chapter();
    const next = this._nextObjective();
    const state = this.getState();
    const text = next
      ? `${chapter.title}: ${next.label}. Current context is ${titleCase(state.currentTopic || state.currentSubject || 'home')}.`
      : `${chapter.title} is ready to complete. Press Next in the Director panel.`;
    this.aiTutor?.coach?.(text, { kind: 'campaign', speak: false });
    this._directive(text);
  }

  _bind() {
    this.gestureEngine?.onAction?.((action) => {
      if (!action || action.phase !== 'complete') return;
      this._bump('gestures', 1);
      if (action.name === GestureActions.ROTATE || action.name === GestureActions.SCALE) this._bump('transform', 1);
      if (action.name === GestureActions.SWIPE_UP || action.name === GestureActions.SWIPE_DOWN) this._bump('parameter', 1);
      if (action.name === GestureActions.PAUSE) this._bump('pause', 1);
      this._advanceIfReady();
      this._save();
      this._render();
    });

    this.interaction?.onObjectAction?.((event) => {
      if (!event) return;
      if (event.actionName === GestureActions.INSPECT) this._bump('inspect', 1);
      if (event.actionName === GestureActions.ROTATE || event.actionName === GestureActions.SCALE) this._bump('transform', 1);
      this._advanceIfReady();
      this._save();
      this._render();
    });

    document.addEventListener('cosmiclearn:game-event', event => {
      this.recordEvent(event.detail?.type, event.detail?.detail || {});
    });
  }

  _buildMini() {
    const mini = document.createElement('button');
    mini.id = 'campaign-director-mini';
    mini.type = 'button';
    mini.title = 'Campaign Director';
    mini.addEventListener('click', () => this.show());
    document.body.appendChild(mini);
    this._mini = mini;
  }

  _chapter() {
    return CHAPTERS[Math.min(this._state.chapterIndex, CHAPTERS.length - 1)];
  }

  _value(metric) {
    return this._state.metrics[metric] || 0;
  }

  _nextObjective() {
    const chapter = this._chapter();
    return chapter.objectives.find(objective => this._value(objective.metric) < objective.goal) || null;
  }

  _chapterReady() {
    const chapter = this._chapter();
    return chapter.objectives.every(objective => this._value(objective.metric) >= objective.goal);
  }

  _bump(metric, count) {
    this._state.metrics[metric] = (this._state.metrics[metric] || 0) + count;
  }

  _advanceIfReady(force = false) {
    if (!this._chapterReady()) {
      if (force) this.coach();
      return false;
    }
    const chapter = this._chapter();
    if (!this._state.completed.includes(chapter.id)) {
      this._state.completed.push(chapter.id);
      this.game?.recordEvent?.('campaignChapterComplete', { chapter: chapter.title });
      this._toastMessage(`Chapter complete: ${chapter.title}`);
    }
    if (this._state.chapterIndex < CHAPTERS.length - 1) {
      this._state.chapterIndex++;
      this.game?.recordEvent?.('campaignAdvance', { chapter: this._chapter().title });
      this._directive(`New chapter: ${this._chapter().title}. ${this._chapter().briefing}`);
    } else {
      this.game?.recordEvent?.('campaignComplete', { chapters: CHAPTERS.length });
      this._directive('Campaign cleared. Keep using boss fights and paths for mastery runs.');
    }
    this._save();
    this._render();
    return true;
  }

  _directive(text) {
    if (!text) return;
    const now = Date.now();
    if (now - this._lastDirectiveAt < 1200) return;
    this._lastDirectiveAt = now;
    this._lastDirective = text;
    this._render();
  }

  _render() {
    const chapter = this._chapter();
    const next = this._nextObjective();
    const completed = this._state.completed.length;
    if (this._mini) {
      this._mini.innerHTML = `
        <span>DIR</span>
        <strong>${completed}/${CHAPTERS.length}</strong>
      `;
    }
    if (!this._panel) return;
    this._panel.querySelector('h2').textContent = chapter.title;
    this._panel.querySelector('.campaign-briefing').textContent = chapter.briefing;
    this._panel.querySelector('.campaign-directive').textContent = this._lastDirective
      || (next ? `Next: ${next.label}` : 'Chapter ready. Press Next.');
    this._panel.querySelector('.campaign-objectives').innerHTML = chapter.objectives.map(objective => {
      const value = Math.min(this._value(objective.metric), objective.goal);
      const pct = Math.round((value / objective.goal) * 100);
      return `
        <article class="${value >= objective.goal ? 'complete' : ''}">
          <div>
            <strong>${objective.label}</strong>
            <span>${value} / ${objective.goal}</span>
          </div>
          <i><b style="width:${pct}%"></b></i>
        </article>
      `;
    }).join('');
  }

  _toastMessage(message) {
    if (!message) return;
    if (!this._toast) {
      const toast = document.createElement('div');
      toast.id = 'campaign-toast';
      document.body.appendChild(toast);
      this._toast = toast;
    }
    this._toast.textContent = message;
    this._toast.classList.remove('visible');
    requestAnimationFrame(() => this._toast?.classList.add('visible'));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this._toast?.classList.remove('visible'), 1900);
  }

  _load() {
    try { return { ...defaults(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
    catch { return defaults(); }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
  }
}
