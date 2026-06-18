const CATEGORIES = [
  {
    id: 'object',
    label: 'Object Control',
    items: [
      { action: 'grab', gesture: 'Pinch', title: 'Grab', detail: 'Pick up an object, orb, atom, graph handle, or lab control.', works: ['home', 'math', 'physics', 'chem', 'all'], difficulty: 'Easy' },
      { action: 'move', gesture: 'Pinch + drag', title: 'Move', detail: 'Move grabbed objects through the 3D scene.', works: ['math', 'physics', 'chem', 'all'], difficulty: 'Easy' },
      { action: 'rotate', gesture: 'Pinch + twist', title: 'Rotate Object', detail: 'Twist your wrist while pinching to rotate the selected object.', works: ['math', 'physics', 'chem', 'all'], difficulty: 'Medium' },
      { action: 'scale', gesture: 'Two-hand pinch + spread', title: 'Scale', detail: 'Pull hands apart to zoom or enlarge; push together to shrink.', works: ['math', 'physics', 'chem', 'all'], difficulty: 'Medium' },
      { action: 'throw', gesture: 'Pinch + flick', title: 'Throw', detail: 'Release a fast pinch to throw or launch a movable object.', works: ['physics', 'projectile', 'gravity', 'all'], difficulty: 'Advanced' },
      { action: 'release', gesture: 'Open after pinch', title: 'Release', detail: 'Let go of the current object and return control to the scene.', works: ['home', 'math', 'physics', 'chem', 'all'], difficulty: 'Easy' },
    ],
  },
  {
    id: 'learn',
    label: 'Learning Tools',
    items: [
      { action: 'inspect', gesture: 'Point + hold', title: 'Inspect', detail: 'Hold your point on an object to open details, values, or explanations.', works: ['math', 'physics', 'chem', 'all'], difficulty: 'Easy' },
      { action: 'focus', gesture: 'Both palms facing object', title: 'Focus', detail: 'Frame an object to isolate it and dim distractions. Coming in a later phase.', works: ['math', 'physics', 'chem'], difficulty: 'Medium', planned: true },
      { action: 'draw_ready', gesture: 'Two-finger draw', title: 'Air Draw', detail: 'Sketch arrows, paths, labels, and visual notes in space.', works: ['math', 'physics', 'chem', 'all'], difficulty: 'Medium' },
      { action: 'marker', gesture: 'Finger tap', title: 'Place Marker', detail: 'Drop a point, charge, label, graph marker, or measurement pin. Coming in a later phase.', works: ['math', 'physics', 'chem'], difficulty: 'Medium', planned: true },
    ],
  },
  {
    id: 'simulation',
    label: 'Simulation Control',
    items: [
      { action: 'pause', gesture: 'Open palm hold', title: 'Pause / Resume', detail: 'Hold an open palm to pause or resume active simulations.', works: ['physics', 'chem', 'math', 'all'], difficulty: 'Easy' },
      { action: 'reset', gesture: 'Fist hold', title: 'Reset', detail: 'Hold a fist to reset the current interaction or return to a clean state.', works: ['home', 'math', 'physics', 'chem', 'all'], difficulty: 'Medium' },
      { action: 'swipe_up', gesture: 'Swipe up', title: 'Increase Parameter', detail: 'Raise frequency, temperature, gravity, mass, or the active parameter.', works: ['math', 'physics', 'chem', 'all'], difficulty: 'Easy' },
      { action: 'swipe_down', gesture: 'Swipe down', title: 'Decrease Parameter', detail: 'Lower the current active parameter.', works: ['math', 'physics', 'chem', 'all'], difficulty: 'Easy' },
      { action: 'trigger', gesture: 'Clap', title: 'Trigger Event', detail: 'Start a reaction, collision, wave pulse, or challenge. Coming in a later phase.', works: ['physics', 'chem'], difficulty: 'Advanced', planned: true },
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    items: [
      { action: 'menu', gesture: 'Fist', title: 'Menu / Home', detail: 'Open the quick menu or jump back depending on context.', works: ['home', 'math', 'physics', 'chem', 'all'], difficulty: 'Easy' },
      { action: 'swipe_left', gesture: 'Swipe left', title: 'Previous', detail: 'Move to the previous preset, topic, or carousel item.', works: ['home', 'math', 'physics', 'chem', 'all'], difficulty: 'Easy' },
      { action: 'swipe_right', gesture: 'Swipe right', title: 'Next', detail: 'Move to the next preset, topic, or carousel item.', works: ['home', 'math', 'physics', 'chem', 'all'], difficulty: 'Easy' },
      { action: 'explore_mode', gesture: 'Peace sign hold', title: 'Explore Mode', detail: 'Hide panels and make the scene immersive; repeat to return to Learn Mode.', works: ['math', 'physics', 'chem', 'all'], difficulty: 'Easy' },
      { action: 'advanced_controls', gesture: 'Four fingers hold', title: 'Advanced Controls', detail: 'Reveal mode switches, progress, guide, and quick navigation actions.', works: ['home', 'math', 'physics', 'chem', 'all'], difficulty: 'Medium' },
      { action: 'home', gesture: 'Two open palms hold', title: 'Return Home', detail: 'Use both open palms to clear overlays and return to the portal scene.', works: ['home', 'math', 'physics', 'chem', 'all'], difficulty: 'Easy' },
    ],
  },
];

const CONTEXT_LABELS = {
  home: 'Home',
  math: 'Math',
  physics: 'Physics',
  chem: 'Chemistry',
};

export class GestureGuide {
  constructor(gestureEngine, getContext = () => 'home') {
    this.gestureEngine = gestureEngine;
    this.getContext = getContext;
    this._overlay = null;
    this._activeCategory = 'object';
    this._practiceAction = null;
    this._practiceEl = null;
    this._completed = this._loadCompleted();

    this.gestureEngine?.onAction?.((action) => this._handleAction(action));
  }

  show(category = this._activeCategory) {
    this._activeCategory = category;
    this._render();
  }

  hide() {
    this._overlay?.remove();
    this._overlay = null;
    this._practiceEl = null;
    this._practiceAction = null;
  }

  toggle() {
    if (this._overlay) this.hide();
    else this.show();
  }

  setCategory(category) {
    this._activeCategory = category;
    this._renderBody();
  }

  _render() {
    this.hide();

    const overlay = document.createElement('div');
    overlay.id = 'gesture-guide-overlay';

    const panel = document.createElement('section');
    panel.className = 'gesture-guide-panel';
    panel.innerHTML = `
      <header class="gesture-guide-header">
        <div>
          <p class="guide-kicker">Phase 2 Gesture Guide</p>
          <h2>What Your Hands Can Do</h2>
        </div>
        <button class="guide-close" type="button" aria-label="Close gesture guide">Close</button>
      </header>
      <div class="gesture-guide-tabs"></div>
      <div class="gesture-guide-context"></div>
      <div class="gesture-guide-body"></div>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) this.hide();
    });
    panel.querySelector('.guide-close').addEventListener('click', () => this.hide());

    this._overlay = overlay;
    this._renderTabs();
    this._renderBody();
  }

  _renderTabs() {
    const tabs = this._overlay?.querySelector('.gesture-guide-tabs');
    if (!tabs) return;
    tabs.innerHTML = '';
    CATEGORIES.forEach(category => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = category.id === this._activeCategory ? 'active' : '';
      btn.textContent = category.label;
      btn.addEventListener('click', () => this.setCategory(category.id));
      tabs.appendChild(btn);
    });
  }

  _renderBody() {
    if (!this._overlay) return;
    this._renderTabs();

    const context = this.getContext() || 'home';
    const contextEl = this._overlay.querySelector('.gesture-guide-context');
    const body = this._overlay.querySelector('.gesture-guide-body');
    const category = CATEGORIES.find(c => c.id === this._activeCategory) || CATEGORIES[0];
    const relevant = category.items.filter(item => this._isRelevant(item, context));
    const secondary = category.items.filter(item => !this._isRelevant(item, context));

    contextEl.innerHTML = `
      <div>
        <strong>Active context: ${CONTEXT_LABELS[context] || context}</strong>
        <span>${relevant.length} high-priority gesture${relevant.length === 1 ? '' : 's'} for this screen.</span>
      </div>
      <button class="guide-practice-all" type="button">Practice next</button>
    `;
    contextEl.querySelector('.guide-practice-all').addEventListener('click', () => {
      const next = relevant.find(item => !this._completed[item.action]) || relevant[0] || category.items[0];
      if (next) this._startPractice(next);
    });

    body.innerHTML = '';
    const list = [...relevant, ...secondary];
    list.forEach(item => body.appendChild(this._card(item, context)));
  }

  _card(item, context) {
    const card = document.createElement('article');
    card.className = `gesture-card ${this._isRelevant(item, context) ? 'is-relevant' : 'is-secondary'} ${item.planned ? 'is-planned' : ''}`;
    const complete = Boolean(this._completed[item.action]);
    card.innerHTML = `
      <div class="gesture-card-top">
        <span class="gesture-token">${item.gesture}</span>
        <span class="gesture-difficulty">${item.difficulty}</span>
      </div>
      <h3>${item.title}</h3>
      <p>${item.detail}</p>
      <div class="gesture-card-meta">
        <span>${item.planned ? 'Planned' : complete ? 'Practiced' : 'Ready'}</span>
        <span>${this._worksText(item)}</span>
      </div>
      <button class="gesture-practice-btn" type="button">${item.planned ? 'Preview' : complete ? 'Practice again' : 'Try it now'}</button>
    `;
    card.querySelector('.gesture-practice-btn').addEventListener('click', () => this._startPractice(item));
    return card;
  }

  _startPractice(item) {
    this._practiceAction = item.planned ? null : item.action;
    if (!this._practiceEl) {
      this._practiceEl = document.createElement('div');
      this._practiceEl.className = 'gesture-practice-panel';
      this._overlay.querySelector('.gesture-guide-panel').appendChild(this._practiceEl);
    }

    this._practiceEl.classList.remove('success');
    this._practiceEl.innerHTML = `
      <div>
        <strong>${item.planned ? 'Preview' : 'Practice'}: ${item.title}</strong>
        <span>${item.gesture}</span>
      </div>
      <p>${item.planned ? 'This gesture is part of the roadmap and will be activated in a later phase.' : 'Perform the gesture with your camera enabled. The guide will light up when it sees the action.'}</p>
    `;
  }

  _handleAction(action) {
    if (!this._practiceAction || action.name !== this._practiceAction) return;
    if (action.phase !== 'start' && action.phase !== 'active' && action.phase !== 'complete') return;

    this._completed[action.name] = true;
    this._saveCompleted();
    if (this._practiceEl) {
      this._practiceEl.classList.add('success');
      this._practiceEl.innerHTML = `
        <div>
          <strong>Nice. ${this._titleFor(action.name)} detected.</strong>
          <span>Confidence ${(action.confidence * 100).toFixed(0)}%</span>
        </div>
        <p>That gesture is now marked as practiced.</p>
      `;
    }
    this._renderBody();
  }

  _titleFor(actionName) {
    for (const category of CATEGORIES) {
      const item = category.items.find(i => i.action === actionName);
      if (item) return item.title;
    }
    return actionName;
  }

  _isRelevant(item, context) {
    return item.works.includes('all') || item.works.includes(context);
  }

  _worksText(item) {
    if (item.works.includes('all')) return 'Works broadly';
    return item.works.map(w => CONTEXT_LABELS[w] || w).join(', ');
  }

  _loadCompleted() {
    try {
      return JSON.parse(localStorage.getItem('cosmiclearn_gesture_practice')) || {};
    } catch {
      return {};
    }
  }

  _saveCompleted() {
    localStorage.setItem('cosmiclearn_gesture_practice', JSON.stringify(this._completed));
  }
}
