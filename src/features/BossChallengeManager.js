import { GestureActions } from '../core/GestureActionRegistry.js';

const BOSSES = {
  waves: {
    name: 'Node Warden',
    title: 'Defeat the Node Warden',
    timeLimit: 75,
    prompt: 'Build control: adjust wave parameters, pause, then inspect the quiet zone.',
    goals: { parameter: 3, pause: 1, inspect: 1 },
  },
  pendulum: {
    name: 'Energy Sentinel',
    title: 'Defeat the Energy Sentinel',
    timeLimit: 70,
    prompt: 'Show energy control: change the pendulum, pause at an extreme, and inspect.',
    goals: { parameter: 2, pause: 1, inspect: 1 },
  },
  molecules: {
    name: 'Shape Guardian',
    title: 'Defeat the Shape Guardian',
    timeLimit: 70,
    prompt: 'Read the structure: inspect, rotate, and scale the molecule.',
    goals: { inspect: 1, transform: 2 },
  },
  function3d: {
    name: 'Surface Titan',
    title: 'Defeat the Surface Titan',
    timeLimit: 80,
    prompt: 'Control the surface: inspect, rotate twice, and reset your view.',
    goals: { inspect: 1, transform: 2, reflect: 1 },
  },
  titration: {
    name: 'pH Hydra',
    title: 'Defeat the pH Hydra',
    timeLimit: 80,
    prompt: 'Handle the curve: adjust carefully, pause, and inspect the result.',
    goals: { parameter: 3, pause: 1, inspect: 1 },
  },
  default: {
    name: 'Concept Boss',
    title: 'Defeat the Concept Boss',
    timeLimit: 75,
    prompt: 'Prove control: inspect, transform, change a parameter, and pause.',
    goals: { inspect: 1, transform: 1, parameter: 1, pause: 1 },
  },
};

function blankStats(goals) {
  return Object.fromEntries(Object.keys(goals).map(key => [key, 0]));
}

function progress(stats, goals) {
  const keys = Object.keys(goals);
  if (!keys.length) return 0;
  const total = keys.reduce((sum, key) => sum + Math.min(stats[key] || 0, goals[key]) / goals[key], 0);
  return Math.round((total / keys.length) * 100);
}

export class BossChallengeManager {
  constructor({ gestureEngine, interaction, aiTutor, game, progress, adaptive, getState }) {
    this.gestureEngine = gestureEngine;
    this.interaction = interaction;
    this.aiTutor = aiTutor;
    this.game = game;
    this.progress = progress;
    this.adaptive = adaptive;
    this.getState = getState || (() => ({}));
    this._boss = null;
    this._stats = {};
    this._active = false;
    this._startedAt = 0;
    this._remaining = 0;
    this._panel = null;
    this._timer = null;

    this._bind();
  }

  start() {
    const state = this.getState();
    if (!state.currentTopic) {
      this.aiTutor?.coach?.('Open a lab first. Boss challenges need an active lab context.', { kind: 'boss' });
      return false;
    }

    this._boss = BOSSES[state.currentTopic] || BOSSES.default;
    this._stats = blankStats(this._boss.goals);
    this._remaining = this._boss.timeLimit;
    this._startedAt = Date.now();
    this._active = true;
    this._showPanel();
    this.game?.recordEvent?.('bossStart', { topic: state.currentTopic, boss: this._boss.name });
    this.aiTutor?.coach?.(`${this._boss.name}: ${this._boss.prompt}`, { kind: 'boss' });
    this._startTimer();
    return true;
  }

  stop() {
    this._active = false;
    clearInterval(this._timer);
    this._timer = null;
    this._panel?.classList.add('hidden');
  }

  _bind() {
    this.gestureEngine?.onAction?.((action) => {
      if (!this._active || !action || action.phase !== 'complete') return;
      if (action.name === GestureActions.SWIPE_UP || action.name === GestureActions.SWIPE_DOWN) this._tick('parameter');
      if (action.name === GestureActions.ROTATE || action.name === GestureActions.SCALE) this._tick('transform');
      if (action.name === GestureActions.PAUSE) this._tick('pause');
      if (action.name === GestureActions.RESET) this._tick('reflect');
    });

    this.interaction?.onObjectAction?.((event) => {
      if (!this._active || !event) return;
      if (event.actionName === GestureActions.INSPECT) this._tick('inspect');
      if (event.actionName === GestureActions.ROTATE || event.actionName === GestureActions.SCALE) this._tick('transform');
    });
  }

  _tick(key) {
    if (!this._boss?.goals?.[key]) return;
    this._stats[key] = (this._stats[key] || 0) + 1;
    this.game?.recordEvent?.('bossProgress', { key, boss: this._boss.name });
    this._render();
    if (progress(this._stats, this._boss.goals) >= 100) this._complete(true);
  }

  _complete(success) {
    const state = this.getState();
    const elapsed = Math.round((Date.now() - this._startedAt) / 1000);
    this._active = false;
    clearInterval(this._timer);
    this._timer = null;

    if (success) {
      this.progress?.recordChallenge?.(state.currentSubject, state.currentTopic, true);
      this.adaptive?.recordChallengeResult?.(state.currentTopic, true);
      this.game?.recordEvent?.('bossComplete', { boss: this._boss.name, elapsed, topic: state.currentTopic });
      this.aiTutor?.coach?.(`${this._boss.name} defeated in ${elapsed} seconds.`, { kind: 'boss' });
    } else {
      this.game?.recordEvent?.('bossFail', { boss: this._boss.name, topic: state.currentTopic });
      this.aiTutor?.coach?.(`${this._boss.name} survived. Retry after one focused practice mission.`, { kind: 'boss' });
    }

    this._renderResult(success, elapsed);
  }

  _startTimer() {
    clearInterval(this._timer);
    this._timer = setInterval(() => {
      if (!this._active) return;
      const elapsed = Math.floor((Date.now() - this._startedAt) / 1000);
      this._remaining = Math.max(0, this._boss.timeLimit - elapsed);
      this._render();
      if (this._remaining <= 0) this._complete(false);
    }, 500);
  }

  _showPanel() {
    if (!this._panel) {
      const panel = document.createElement('section');
      panel.id = 'boss-challenge-panel';
      panel.innerHTML = `
        <header>
          <div>
            <p>Boss Challenge</p>
            <h2></h2>
          </div>
          <button type="button">Exit</button>
        </header>
        <div class="boss-health"><span></span></div>
        <div class="boss-meta"></div>
        <p class="boss-prompt"></p>
        <div class="boss-goals"></div>
      `;
      panel.querySelector('header button').addEventListener('click', () => this.stop());
      document.body.appendChild(panel);
      this._panel = panel;
    }
    this._panel.classList.remove('hidden');
    this._render();
  }

  _render() {
    if (!this._panel || !this._boss) return;
    const pct = progress(this._stats, this._boss.goals);
    this._panel.querySelector('h2').textContent = this._boss.title;
    this._panel.querySelector('.boss-health span').style.width = `${100 - pct}%`;
    this._panel.querySelector('.boss-meta').textContent = `${this._boss.name} HP ${100 - pct}% / ${this._remaining}s`;
    this._panel.querySelector('.boss-prompt').textContent = this._boss.prompt;
    this._panel.querySelector('.boss-goals').innerHTML = Object.entries(this._boss.goals).map(([key, goal]) => `
      <div>
        <span>${key}</span>
        <b>${Math.min(this._stats[key] || 0, goal)} / ${goal}</b>
      </div>
    `).join('');
  }

  _renderResult(success, elapsed) {
    if (!this._panel || !this._boss) return;
    this._panel.classList.remove('hidden');
    this._panel.classList.toggle('boss-win', success);
    this._panel.classList.toggle('boss-fail', !success);
    this._panel.querySelector('.boss-prompt').textContent = success
      ? `Victory. ${this._boss.name} defeated in ${elapsed}s.`
      : `Time expired. ${this._boss.name} survived.`;
    this._panel.querySelector('.boss-health span').style.width = success ? '0%' : '100%';
  }
}
