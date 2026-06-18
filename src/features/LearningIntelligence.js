import { GestureActions } from '../core/GestureActionRegistry.js';

const COACHABLE_ACTIONS = new Set([
  GestureActions.INSPECT,
  GestureActions.ROTATE,
  GestureActions.SCALE,
  GestureActions.THROW,
  GestureActions.PAUSE,
  GestureActions.SWIPE_UP,
  GestureActions.SWIPE_DOWN,
  GestureActions.EXPLORE_MODE,
]);

const TOPIC_COACH = {
  function3d: 'Look for peaks, valleys, and saddle points. Rotate before deciding what the function is doing.',
  graph2d: 'Change one coefficient and watch which part of the graph moves first.',
  geometry: 'Rotate the shape and compare edges, angles, and symmetry.',
  calculus: 'Ask what is changing, then look for slope or accumulation.',
  vectors: 'Move the arrow tail and head separately in your mind: direction and size both matter.',
  fractal: 'Zoom toward the boundary. The interesting behavior lives where certainty breaks down.',
  waves: 'Swipe up or down to change the active wave parameter, then look for nodes and antinodes.',
  pendulum: 'Pause at the top and bottom. That is where energy changes its costume.',
  gravity: 'Try one small orbit change. Stable motion usually arrives from a careful balance.',
  projectile: 'Compare launch angle and range. Height and speed are having a quiet argument.',
  periodic: 'Pick neighbors, not random elements. Patterns become visible side by side.',
  molecules: 'Rotate slowly and look for symmetry, bond angles, and crowded regions.',
  titration: 'Near the steep pH change, tiny additions matter. Slow gestures are powerful here.',
};

function titleCase(text = '') {
  return String(text)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export class LearningIntelligence {
  constructor({ gestureEngine, interaction, aiTutor, smartHint, getState }) {
    this.gestureEngine = gestureEngine;
    this.interaction = interaction;
    this.aiTutor = aiTutor;
    this.smartHint = smartHint;
    this.getState = getState || (() => ({}));
    this._lastCoachAt = 0;
    this._lastContextKey = '';
    this._gestureWindow = [];

    this._bind();
    this.syncContext();
  }

  syncContext(extra = {}) {
    const state = this.getState();
    const contextKey = `${state.currentSubject || 'home'}:${state.currentTopic || ''}`;
    this.aiTutor?.setLearningState?.({
      subject: state.currentSubject || null,
      topic: state.currentTopic || null,
      ...extra,
    });

    if (contextKey !== this._lastContextKey) {
      this._lastContextKey = contextKey;
      this._coachForContext(state);
    }
  }

  setMode(mode) {
    this.aiTutor?.setLearningState?.({ mode });
    if (mode === 'explore') {
      this._coach('Explore mode is quiet and visual. Pick one object, then ask what changed after you touch it.', 'mode');
    } else if (mode === 'inspect') {
      this._coach('Inspect mode favors details. Point-hold on one object and compare its live values.', 'mode');
    } else if (mode === 'challenge') {
      this._coach(this.aiTutor?.suggestNextMove?.('challenge'), 'challenge');
    } else if (mode === 'teach') {
      this._coach('Teach mode prompt: explain what you changed before showing the result.', 'teach');
    }
  }

  _bind() {
    this.gestureEngine?.onAction?.((action) => {
      this.aiTutor?.observeGesture?.(action);
      this._trackGesture(action);
      if (COACHABLE_ACTIONS.has(action.name) && action.phase === 'complete') {
        this._coachForGesture(action);
      }
    });

    this.interaction?.onObjectAction?.((event) => {
      this.aiTutor?.observeObjectAction?.(event);
      this._coachForObject(event);
    });
  }

  _trackGesture(action) {
    if (!action?.name) return;
    const now = Date.now();
    this._gestureWindow.push({ name: action.name, phase: action.phase, time: now });
    this._gestureWindow = this._gestureWindow.filter(item => now - item.time < 14000);

    const recentSame = this._gestureWindow.filter(item => item.name === action.name).length;
    if (recentSame >= 5 && now - this._lastCoachAt > 10000) {
      this._coach(`You are repeating ${titleCase(action.name)}. Try pausing once, then change only one variable.`, 'pattern');
    }
  }

  _coachForContext(state) {
    if (!state.currentSubject) {
      this._coach('Choose a portal, then use point-hold when you want the app to explain an object.', 'context');
      return;
    }
    if (!state.currentTopic) {
      this._coach(`You are in ${titleCase(state.currentSubject)}. Swipe left or right to scan topics, then open one that makes you curious.`, 'context');
      return;
    }

    const topicHint = TOPIC_COACH[state.currentTopic]
      || `Inside ${titleCase(state.currentTopic)}, change one thing and name the visible effect.`;
    this._coach(topicHint, 'context');
  }

  _coachForGesture(action) {
    const state = this.getState();
    if (action.name === GestureActions.INSPECT) {
      this._coach('Good inspect. Now change the object once and compare the live values.', 'inspect');
    } else if (action.name === GestureActions.ROTATE) {
      this._coach('Rotation is a viewpoint test. Look for hidden symmetry or a shape that was flat from one angle.', 'gesture');
    } else if (action.name === GestureActions.SCALE) {
      this._coach('Scaling asks what stays true when size changes. Watch proportions, not just bigger or smaller.', 'gesture');
    } else if (action.name === GestureActions.PAUSE && state.currentTopic) {
      this._coach('Paused. This is a good moment to predict what will happen when motion resumes.', 'simulation');
    } else if (action.name === GestureActions.SWIPE_UP || action.name === GestureActions.SWIPE_DOWN) {
      this._coach('Parameter changed. Look for cause and effect before changing it again.', 'simulation');
    } else if (action.name === GestureActions.EXPLORE_MODE) {
      this.setMode('explore');
    }
  }

  _coachForObject(event) {
    if (!event?.mesh) return;
    const metadata = event.metadata || {};
    const name = metadata.title || metadata.name || event.mesh.name || 'this object';
    const action = event.actionName;

    if (action === GestureActions.GRAB) {
      this._coach(`You grabbed ${name}. Move slowly first; fast releases can become throws.`, 'object');
    } else if (action === GestureActions.RELEASE) {
      this.aiTutor?.remember?.(`Released ${name}`);
    } else if (action === GestureActions.INSPECT) {
      const question = metadata.question || `What property of ${name} controls what you see?`;
      this._coach(question, 'object');
    }
  }

  _coach(text, kind = 'hint') {
    if (!text) return;
    const now = Date.now();
    if (now - this._lastCoachAt < 5200) return;
    this._lastCoachAt = now;
    this.aiTutor?.coach?.(text, { kind });
  }
}
