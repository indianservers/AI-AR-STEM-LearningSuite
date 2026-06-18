import { GestureActions } from '../core/GestureActionRegistry.js';

const BASE_MISSIONS = [
  {
    id: 'inspect_change_compare',
    level: 0,
    title: 'Inspect, Change, Compare',
    prompt: 'Inspect one object, then rotate or scale it once.',
    goals: { inspect: 1, transform: 1 },
  },
  {
    id: 'parameter_prediction',
    level: 1,
    title: 'Parameter Prediction',
    prompt: 'Change a parameter twice, then pause and predict what happens next.',
    goals: { parameter: 2, pause: 1 },
  },
  {
    id: 'expert_before_after',
    level: 2,
    title: 'Before / After Proof',
    prompt: 'Inspect, transform twice, then reset or pause to explain the pattern.',
    goals: { inspect: 1, transform: 2, reflect: 1 },
  },
];

const TOPIC_MISSIONS = {
  waves: {
    id: 'wave_node_hunt',
    level: 1,
    title: 'Node Hunt',
    prompt: 'Adjust the wave parameter twice, then pause at a quiet region.',
    goals: { parameter: 2, pause: 1 },
  },
  pendulum: {
    id: 'pendulum_energy_trade',
    level: 1,
    title: 'Energy Trade',
    prompt: 'Change the pendulum, pause, and inspect the motion at an extreme.',
    goals: { parameter: 1, pause: 1, inspect: 1 },
  },
  molecules: {
    id: 'molecule_shape_reader',
    level: 0,
    title: 'Shape Reader',
    prompt: 'Inspect a molecule, rotate it, then explain what the shape reveals.',
    goals: { inspect: 1, transform: 1 },
  },
  function3d: {
    id: 'surface_sleuth',
    level: 0,
    title: 'Surface Sleuth',
    prompt: 'Inspect the surface and rotate until you find a peak, valley, or saddle.',
    goals: { inspect: 1, transform: 1 },
  },
  titration: {
    id: 'titration_slow_zone',
    level: 1,
    title: 'Slow Zone',
    prompt: 'Adjust slowly near the steep curve and pause to observe the pH shift.',
    goals: { parameter: 2, pause: 1 },
  },
};

function blankStats() {
  return { inspect: 0, transform: 0, parameter: 0, pause: 0, reflect: 0 };
}

function percent(stats, goals) {
  const keys = Object.keys(goals);
  if (!keys.length) return 0;
  const total = keys.reduce((sum, key) => sum + Math.min(stats[key] || 0, goals[key]) / goals[key], 0);
  return Math.round((total / keys.length) * 100);
}

export class AdaptiveMissionControl {
  constructor({ gestureEngine, interaction, aiTutor, progress, adaptive, game, getState }) {
    this.gestureEngine = gestureEngine;
    this.interaction = interaction;
    this.aiTutor = aiTutor;
    this.progress = progress;
    this.adaptive = adaptive;
    this.game = game;
    this.getState = getState || (() => ({}));
    this._mission = null;
    this._stats = blankStats();
    this._panel = null;
    this._lastKey = '';
    this._active = false;

    this._bind();
  }

  syncContext() {
    const state = this.getState();
    const key = `${state.currentSubject || 'home'}:${state.currentTopic || ''}`;
    if (key === this._lastKey) return;
    this._lastKey = key;
    this._stats = blankStats();
    this._mission = state.currentTopic ? this._selectMission(state.currentTopic) : null;
    this._active = false;
    this._panel?.classList.add('hidden');
    this._render();
  }

  startChallenge() {
    const state = this.getState();
    if (!state.currentTopic) {
      this.aiTutor?.coach?.('Open a lab first, then Challenge Mode can build a mission around it.', { kind: 'challenge' });
      return;
    }
    this._mission = this._selectMission(state.currentTopic);
    this._stats = blankStats();
    this._active = true;
    this._showPanel();
    this.game?.recordEvent?.('missionStart', { mission: this._mission.id });
    this.aiTutor?.coach?.(this._mission.prompt, { kind: 'challenge', speak: false });
  }

  getCurrentMission() {
    return this._mission ? { ...this._mission, stats: { ...this._stats }, progress: percent(this._stats, this._mission.goals) } : null;
  }

  _bind() {
    this.gestureEngine?.onAction?.((action) => {
      const state = this.getState();
      if (action?.name && state.currentTopic && (action.phase === 'complete' || action.phase === 'start')) {
        this.progress?.recordGesture?.(action.name, state.currentSubject, state.currentTopic);
        this.adaptive?.recordGesture?.(state.currentTopic, action.name);
      }
      if (!this._active || !this._mission || action.phase !== 'complete') return;
      if (action.name === GestureActions.ROTATE || action.name === GestureActions.SCALE) this._tick('transform');
      if (action.name === GestureActions.SWIPE_UP || action.name === GestureActions.SWIPE_DOWN) this._tick('parameter');
      if (action.name === GestureActions.PAUSE) this._tick('pause');
      if (action.name === GestureActions.RESET) this._tick('reflect');
    });

    this.interaction?.onObjectAction?.((event) => {
      if (!this._active || !this._mission) return;
      if (event.actionName === GestureActions.INSPECT) this._tick('inspect');
      if (event.actionName === GestureActions.ROTATE || event.actionName === GestureActions.SCALE) this._tick('transform');
    });
  }

  _selectMission(topicId) {
    const level = this.adaptive?.getLevel?.(topicId) || 0;
    const topicMission = TOPIC_MISSIONS[topicId];
    if (topicMission && topicMission.level <= level + 1) return topicMission;
    return BASE_MISSIONS.find(m => m.level === level) || BASE_MISSIONS[0];
  }

  _tick(key) {
    if (!this._mission?.goals?.[key]) return;
    this._stats[key] = (this._stats[key] || 0) + 1;
    this.game?.recordEvent?.('missionProgress', { key, mission: this._mission.id });
    this._render();
    if (percent(this._stats, this._mission.goals) >= 100) this._complete();
  }

  _complete() {
    const state = this.getState();
    this.progress?.recordChallenge?.(state.currentSubject, state.currentTopic, true);
    this.adaptive?.recordChallengeResult?.(state.currentTopic, true);
    this.game?.recordEvent?.('missionComplete', {
      subject: state.currentSubject,
      topic: state.currentTopic,
      mission: this._mission.id,
    });
    this.aiTutor?.coach?.(`Mission complete: ${this._mission.title}. Nice. Try explaining what changed in one sentence.`, { kind: 'challenge' });
    this._mission = this._selectMission(state.currentTopic);
    this._stats = blankStats();
    this._render();
  }

  _showPanel() {
    if (!this._panel) {
      const panel = document.createElement('section');
      panel.id = 'adaptive-mission-panel';
      panel.innerHTML = `
        <header>
          <div>
            <p>Adaptive Challenge</p>
            <h2></h2>
          </div>
          <button type="button" aria-label="Close mission panel">Close</button>
        </header>
        <p class="mission-prompt"></p>
        <div class="mission-progress"><span></span></div>
        <div class="mission-goals"></div>
      `;
      panel.querySelector('header button').addEventListener('click', () => {
        panel.classList.add('hidden');
        this._active = false;
      });
      document.body.appendChild(panel);
      this._panel = panel;
    }
    this._panel.classList.remove('hidden');
    this._render();
  }

  _render() {
    if (!this._panel || !this._mission) return;
    const pct = percent(this._stats, this._mission.goals);
    this._panel.querySelector('h2').textContent = this._mission.title;
    this._panel.querySelector('.mission-prompt').textContent = this._mission.prompt;
    this._panel.querySelector('.mission-progress span').style.width = `${pct}%`;
    this._panel.querySelector('.mission-goals').innerHTML = Object.entries(this._mission.goals).map(([key, goal]) => `
      <div>
        <span>${key}</span>
        <b>${Math.min(this._stats[key] || 0, goal)} / ${goal}</b>
      </div>
    `).join('');
  }
}
