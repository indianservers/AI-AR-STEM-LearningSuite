import { GestureActions } from './GestureActionRegistry.js';
import { SUBJECT_TOPICS } from '../ui/SubjectHub.js';

const SUBJECTS = ['math', 'physics', 'chem'];
const MODE_LABELS = {
  learn: 'Learn Mode',
  explore: 'Explore Mode',
  inspect: 'Inspect Mode',
  draw: 'Draw Mode',
  challenge: 'Challenge Mode',
  teach: 'Teach Mode',
};

export class NavigationGestureController {
  constructor(gestureEngine, options = {}) {
    this.gestureEngine = gestureEngine;
    this.options = options;
    this.mode = 'learn';
    this._quickMenu = null;
    this._advancedPanel = null;
    this._toast = null;
    this._lastSubjectIdx = 0;
    this._lastTopicIdx = {};

    this._buildModeBadge();
    this._bindGestures();
  }

  setMode(mode) {
    const next = MODE_LABELS[mode] ? mode : 'learn';
    this.mode = next;
    document.body.dataset.navMode = next;
    document.body.classList.toggle('mode-explore', next === 'explore');
    document.body.classList.toggle('mode-draw', next === 'draw');
    const badge = document.getElementById('learning-mode-badge');
    if (badge) badge.textContent = MODE_LABELS[next];
    this.gestureEngine?.setGestureMode?.(next === 'learn' ? 'beginner' : 'expert');
    this.options.onModeChange?.(next);
    this._showToast(MODE_LABELS[next]);
  }

  toggleMode(mode) {
    this.setMode(this.mode === mode ? 'learn' : mode);
  }

  showQuickMenu() {
    if (this._quickMenu) {
      this._quickMenu.remove();
      this._quickMenu = null;
      document.body.classList.remove('nav-menu-open');
      return;
    }

    const state = this._state();
    const menu = document.createElement('div');
    menu.id = 'nav-quick-menu';
    menu.innerHTML = `
      <span class="nav-menu-title">Command Menu</span>
      <button type="button" data-cmd="home">Home</button>
      <button type="button" data-cmd="back">Back</button>
      <button type="button" data-cmd="guide">Guide</button>
      <button type="button" data-cmd="explore">${this.mode === 'explore' ? 'Learn' : 'Explore'}</button>
      <button type="button" data-cmd="draw">Draw</button>
      <button type="button" data-cmd="dashboard">Progress</button>
      <button type="button" data-cmd="path">Path</button>
      <button type="button" data-cmd="loadout">Loadout</button>
      <button type="button" data-cmd="avatar">Avatar</button>
      <span class="nav-menu-context">${state.currentTopic ? 'Lab navigation' : state.currentSubject ? 'Subject navigation' : 'Home navigation'}</span>
    `;
    menu.addEventListener('click', (event) => {
      const cmd = event.target?.dataset?.cmd;
      if (!cmd) return;
      this._runCommand(cmd);
      this.showQuickMenu();
    });
    document.body.appendChild(menu);
    document.body.classList.add('nav-menu-open');
    this._quickMenu = menu;
  }

  showAdvancedControls() {
    if (this._advancedPanel) {
      this._advancedPanel.remove();
      this._advancedPanel = null;
      return;
    }

    const state = this._state();
    const panel = document.createElement('section');
    panel.id = 'advanced-controls-panel';
    panel.innerHTML = `
      <header>
        <div>
          <strong>Advanced Controls</strong>
          <span>${this._contextLabel(state)}</span>
        </div>
        <button type="button" aria-label="Close advanced controls">Close</button>
      </header>
      <div class="advanced-control-grid">
        <button type="button" data-cmd="inspect">Inspect Mode</button>
        <button type="button" data-cmd="challenge">Challenge Mode</button>
        <button type="button" data-cmd="teach">Teach Mode</button>
        <button type="button" data-cmd="guide">Gesture Guide</button>
        <button type="button" data-cmd="dashboard">Progress</button>
        <button type="button" data-cmd="path">Learning Path</button>
        <button type="button" data-cmd="loadout">Loadout</button>
        <button type="button" data-cmd="avatar">Avatar</button>
        <button type="button" data-cmd="next">Next</button>
      </div>
      <p>Four fingers opens this panel. Peace sign toggles immersive explore. Two open palms returns home.</p>
    `;
    panel.querySelector('header button').addEventListener('click', () => this.showAdvancedControls());
    panel.addEventListener('click', (event) => {
      const cmd = event.target?.dataset?.cmd;
      if (!cmd) return;
      this._runCommand(cmd);
    });
    document.body.appendChild(panel);
    this._advancedPanel = panel;
  }

  hideOverlays() {
    this._quickMenu?.remove();
    this._quickMenu = null;
    document.body.classList.remove('nav-menu-open');
    this._advancedPanel?.remove();
    this._advancedPanel = null;
    this.options.hideOverlays?.();
    this._showToast('Overlays cleared');
  }

  _bindGestures() {
    this.gestureEngine?.onAction?.((action) => {
      if (!action || action.phase !== 'complete' && action.phase !== 'start') return;
      const state = this._state();

      if (action.name === GestureActions.MENU && action.phase === 'start') {
        this.showQuickMenu();
      } else if (action.name === GestureActions.HOME) {
        this.options.goHome?.();
        this.hideOverlays();
      } else if (action.name === GestureActions.EXPLORE_MODE) {
        this.toggleMode('explore');
      } else if (action.name === GestureActions.ADVANCED_CONTROLS) {
        this.showAdvancedControls();
      } else if (action.name === GestureActions.SWIPE_LEFT && !state.currentTopic) {
        this._previous(state);
      } else if (action.name === GestureActions.SWIPE_RIGHT && !state.currentTopic) {
        this._next(state);
      } else if (action.name === GestureActions.SWIPE_DOWN && !state.currentTopic) {
        this.hideOverlays();
      }
    });
  }

  _next(state = this._state()) {
    if (!state.currentSubject) {
      this._lastSubjectIdx = (this._lastSubjectIdx + 1) % SUBJECTS.length;
      this.options.goSubject?.(SUBJECTS[this._lastSubjectIdx]);
      return;
    }
    const topics = SUBJECT_TOPICS[state.currentSubject] || [];
    if (!topics.length) return;
    const idx = this._topicIndex(state.currentSubject);
    const next = (idx + 1) % topics.length;
    this._lastTopicIdx[state.currentSubject] = next;
    this._highlightTopic(topics[next]);
  }

  _previous(state = this._state()) {
    if (!state.currentSubject) {
      this._lastSubjectIdx = (this._lastSubjectIdx - 1 + SUBJECTS.length) % SUBJECTS.length;
      this.options.goSubject?.(SUBJECTS[this._lastSubjectIdx]);
      return;
    }
    const topics = SUBJECT_TOPICS[state.currentSubject] || [];
    if (!topics.length) return;
    const idx = this._topicIndex(state.currentSubject);
    const next = (idx - 1 + topics.length) % topics.length;
    this._lastTopicIdx[state.currentSubject] = next;
    this._highlightTopic(topics[next]);
  }

  _highlightTopic(topic) {
    if (!topic) return;
    document.querySelectorAll('#topic-panel .topic-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent === topic.label);
    });
    this._showToast(`${topic.label}: point, click, or say topic to enter`);
  }

  _topicIndex(subject) {
    const topics = SUBJECT_TOPICS[subject] || [];
    const stored = this._lastTopicIdx[subject] ?? 0;
    return Math.max(0, Math.min(topics.length - 1, stored));
  }

  _runCommand(cmd) {
    if (cmd === 'home') this.options.goHome?.();
    if (cmd === 'back') this.options.goBack?.();
    if (cmd === 'guide') this.options.showGuide?.('navigation');
    if (cmd === 'explore') this.toggleMode('explore');
    if (cmd === 'draw') {
      this.toggleMode('draw');
      this.options.toggleDraw?.();
    }
    if (cmd === 'dashboard') this.options.showDashboard?.();
    if (cmd === 'path') this.options.showPath?.();
    if (cmd === 'loadout') this.options.showLoadout?.();
    if (cmd === 'avatar') this.options.showAvatar?.();
    if (cmd === 'inspect') this.setMode('inspect');
    if (cmd === 'challenge') this.setMode('challenge');
    if (cmd === 'teach') this.setMode('teach');
    if (cmd === 'next') this._next();
  }

  _state() {
    return this.options.getState?.() || { currentSubject: null, currentTopic: null };
  }

  _contextLabel(state) {
    if (state.currentTopic) return `Inside ${state.currentTopic}`;
    if (state.currentSubject) return `${state.currentSubject} topic board`;
    return 'Home portals';
  }

  _buildModeBadge() {
    let badge = document.getElementById('learning-mode-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'learning-mode-badge';
      document.body.appendChild(badge);
    }
    badge.textContent = MODE_LABELS[this.mode];
  }

  _showToast(message) {
    if (!message) return;
    if (!this._toast) {
      const toast = document.createElement('div');
      toast.id = 'nav-gesture-toast';
      document.body.appendChild(toast);
      this._toast = toast;
    }
    this._toast.textContent = message;
    this._toast.classList.remove('visible');
    requestAnimationFrame(() => this._toast?.classList.add('visible'));
    window.clearTimeout(this._toastTimer);
    this._toastTimer = window.setTimeout(() => this._toast?.classList.remove('visible'), 1800);
  }
}
