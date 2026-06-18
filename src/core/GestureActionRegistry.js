export const GestureActions = {
  GRAB: 'grab',
  RELEASE: 'release',
  MOVE: 'move',
  ROTATE: 'rotate',
  SCALE: 'scale',
  THROW: 'throw',
  INSPECT: 'inspect',
  PAUSE: 'pause',
  RESET: 'reset',
  MENU: 'menu',
  FOCUS: 'focus',
  SWIPE_LEFT: 'swipe_left',
  SWIPE_RIGHT: 'swipe_right',
  SWIPE_UP: 'swipe_up',
  SWIPE_DOWN: 'swipe_down',
  DRAW_READY: 'draw_ready',
  EXPLORE_MODE: 'explore_mode',
  ADVANCED_CONTROLS: 'advanced_controls',
  HOME: 'home',
};

const RawGestures = {
  NONE: 'none',
  PINCH: 'pinch',
  OPEN_PALM: 'open_palm',
  POINT: 'point',
  FIST: 'fist',
  GRAB: 'grab',
  PEACE: 'peace',
  FOUR_FINGERS: 'four_fingers',
  TWO_HAND_ROTATE: 'two_hand_rotate',
  SWIPE_LEFT: 'swipe_left',
  SWIPE_RIGHT: 'swipe_right',
  SWIPE_UP: 'swipe_up',
  SWIPE_DOWN: 'swipe_down',
};

const DEFAULT_CONFIG = {
  holdMs: 720,
  longHoldMs: 1200,
  cooldownMs: 520,
  flickVelocity: 0.72,
  shakeVelocity: 0.92,
  rotateAngleDelta: 0.09,
  scaleDelta: 0.008,
  confidenceFloor: 0.42,
};

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function dist3D(a, b) {
  if (!a || !b) return 0;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function angle2D(a, b) {
  if (!a || !b) return 0;
  return Math.atan2((b.y || 0) - (a.y || 0), (b.x || 0) - (a.x || 0));
}

function shortestAngleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class GestureActionRegistry {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.context = 'global';
    this.mode = 'beginner';
    this._listeners = new Set();
    this._active = new Map();
    this._cooldowns = new Map();
    this._handState = [this._blankHand(), this._blankHand()];
    this._lastTwoHandDistance = null;
    this._debugEnabled = false;
    this._debugEl = null;
  }

  setContext(context) {
    this.context = context || 'global';
  }

  setMode(mode) {
    this.mode = mode === 'expert' ? 'expert' : 'beginner';
  }

  setSensitivity(partialConfig = {}) {
    this.config = { ...this.config, ...partialConfig };
  }

  onAction(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  getActiveActions() {
    return [...this._active.values()];
  }

  setDebugEnabled(enabled) {
    this._debugEnabled = Boolean(enabled);
    if (!this._debugEnabled && this._debugEl) {
      this._debugEl.remove();
      this._debugEl = null;
    }
  }

  update(snapshot) {
    const time = snapshot.time || nowMs();
    const hands = snapshot.hands || [];
    const actions = [];

    for (let handIdx = 0; handIdx < 2; handIdx++) {
      const hand = hands[handIdx] || {};
      const state = this._handState[handIdx];
      const gesture = hand.gesture || RawGestures.NONE;
      const prevGesture = state.gesture;
      const palmVelocity = this._velocity(state.palm, hand.palm, state.time, time);
      const pinchVelocity = this._velocity(state.pinch, hand.pinch, state.time, time);
      const wristAngle = angle2D(hand.wrist, hand.indexTip);
      const wristAngleDelta = shortestAngleDelta(wristAngle, state.wristAngle || wristAngle);
      const confidence = this._confidenceFor(hand, gesture, palmVelocity, pinchVelocity);

      if (gesture === RawGestures.PINCH && prevGesture !== RawGestures.PINCH) {
        actions.push(this._event(GestureActions.GRAB, 'start', handIdx, confidence, { gesture }));
      }

      if (gesture === RawGestures.PINCH) {
        actions.push(this._event(GestureActions.MOVE, 'active', handIdx, confidence, { gesture }));
        if (Math.abs(wristAngleDelta) > this.config.rotateAngleDelta) {
          actions.push(this._event(GestureActions.ROTATE, 'active', handIdx, confidence, {
            angleDelta: wristAngleDelta,
            gesture,
          }));
        }
      }

      if (prevGesture === RawGestures.PINCH && gesture !== RawGestures.PINCH) {
        const speed = Math.max(palmVelocity.speed, pinchVelocity.speed);
        if (speed > this.config.flickVelocity) {
          actions.push(this._event(GestureActions.THROW, 'complete', handIdx, confidence, {
            velocity: pinchVelocity.vector || palmVelocity.vector,
            speed,
          }));
        }
        actions.push(this._event(GestureActions.RELEASE, 'complete', handIdx, confidence, { gesture }));
      }

      if (gesture === RawGestures.POINT && state.gestureStartedAt && time - state.gestureStartedAt > this.config.holdMs) {
        actions.push(this._event(GestureActions.INSPECT, 'complete', handIdx, confidence, { gesture }, true));
      }

      if (gesture === RawGestures.OPEN_PALM && state.gestureStartedAt && time - state.gestureStartedAt > this.config.holdMs) {
        actions.push(this._event(GestureActions.PAUSE, 'complete', handIdx, confidence, { gesture }, true));
      }

      if (gesture === RawGestures.PEACE && state.gestureStartedAt && time - state.gestureStartedAt > this.config.holdMs) {
        actions.push(this._event(GestureActions.EXPLORE_MODE, 'complete', handIdx, confidence, { gesture }, true));
      }

      if (gesture === RawGestures.FOUR_FINGERS && state.gestureStartedAt && time - state.gestureStartedAt > this.config.holdMs) {
        actions.push(this._event(GestureActions.ADVANCED_CONTROLS, 'complete', handIdx, confidence, { gesture }, true));
      }

      if (gesture === RawGestures.FIST && prevGesture !== RawGestures.FIST) {
        actions.push(this._event(GestureActions.MENU, 'start', handIdx, confidence, { gesture }));
      }

      if (gesture === RawGestures.FIST && state.gestureStartedAt && time - state.gestureStartedAt > this.config.longHoldMs) {
        actions.push(this._event(GestureActions.RESET, 'complete', handIdx, confidence, { gesture }, true));
      }

      if (gesture === RawGestures.SWIPE_LEFT) actions.push(this._event(GestureActions.SWIPE_LEFT, 'complete', handIdx, confidence));
      if (gesture === RawGestures.SWIPE_RIGHT) actions.push(this._event(GestureActions.SWIPE_RIGHT, 'complete', handIdx, confidence));
      if (gesture === RawGestures.SWIPE_UP) actions.push(this._event(GestureActions.SWIPE_UP, 'complete', handIdx, confidence));
      if (gesture === RawGestures.SWIPE_DOWN) actions.push(this._event(GestureActions.SWIPE_DOWN, 'complete', handIdx, confidence));

      if (palmVelocity.speed > this.config.shakeVelocity && gesture === RawGestures.GRAB) {
        actions.push(this._event('shake', 'active', handIdx, confidence, { speed: palmVelocity.speed }, true));
      }

      this._handState[handIdx] = {
        gesture,
        gestureStartedAt: gesture === prevGesture ? state.gestureStartedAt : time,
        time,
        palm: hand.palm || null,
        pinch: hand.pinch || null,
        wrist: hand.wrist || null,
        indexTip: hand.indexTip || null,
        wristAngle,
      };
    }

    this._addTwoHandActions(snapshot, actions, time);
    const emitted = this._dispatch(actions);
    this._updateDebug(snapshot, actions);
    return emitted;
  }

  reset() {
    this._active.clear();
    this._cooldowns.clear();
    this._handState = [this._blankHand(), this._blankHand()];
    this._lastTwoHandDistance = null;
  }

  _addTwoHandActions(snapshot, actions, time) {
    const hands = snapshot.hands || [];
    const h0 = hands[0];
    const h1 = hands[1];
    if (h0?.gesture === RawGestures.OPEN_PALM && h1?.gesture === RawGestures.OPEN_PALM) {
      const started0 = this._handState[0]?.gestureStartedAt || time;
      const started1 = this._handState[1]?.gestureStartedAt || time;
      if (time - Math.min(started0, started1) > this.config.holdMs) {
        actions.push(this._event(GestureActions.HOME, 'complete', 'both', 0.78, { gesture: RawGestures.OPEN_PALM }, true));
      }
    }

    if (!h0?.pinch || !h1?.pinch) {
      this._lastTwoHandDistance = null;
      return;
    }

    const d = dist3D(h0.pinch, h1.pinch);
    const prev = this._lastTwoHandDistance ?? d;
    const delta = d - prev;
    this._lastTwoHandDistance = d;

    const confidence = Math.min(
      this._confidenceFor(h0, h0.gesture || RawGestures.PINCH),
      this._confidenceFor(h1, h1.gesture || RawGestures.PINCH)
    );

    if (Math.abs(delta) > this.config.scaleDelta) {
      actions.push(this._event(GestureActions.SCALE, 'active', 'both', confidence, {
        distance: d,
        delta,
        direction: delta > 0 ? 'out' : 'in',
      }));
    } else {
      const angle = angle2D(h0.pinch, h1.pinch);
      const prevAngle = this._twoHandAngle ?? angle;
      const angleDelta = shortestAngleDelta(angle, prevAngle);
      this._twoHandAngle = angle;
      if (Math.abs(angleDelta) > this.config.rotateAngleDelta * 0.45) {
        actions.push(this._event(GestureActions.ROTATE, 'active', 'both', confidence, {
          angleDelta,
          gesture: RawGestures.TWO_HAND_ROTATE,
        }));
      }
    }
  }

  _dispatch(actions) {
    const emitted = [];
    actions.forEach(action => {
      if (!action || action.confidence < this.config.confidenceFloor) return;
      const key = `${action.name}:${action.hand}`;
      const cooldownKey = action.cooldownKey || key;
      const cooledAt = this._cooldowns.get(cooldownKey) || 0;
      if (action.cooldown && action.time - cooledAt < this.config.cooldownMs) return;
      if (action.cooldown) this._cooldowns.set(cooldownKey, action.time);

      if (action.phase === 'active' || action.phase === 'start') this._active.set(key, action);
      else this._active.delete(key);

      this._listeners.forEach(fn => fn(action));
      emitted.push(action);
    });
    return emitted;
  }

  _event(name, phase, hand, confidence = 0.75, detail = {}, cooldown = false) {
    return {
      name,
      phase,
      hand,
      confidence: Math.max(0, Math.min(1, confidence)),
      detail,
      context: this.context,
      mode: this.mode,
      cooldown,
      time: nowMs(),
    };
  }

  _confidenceFor(hand, gesture, palmVelocity = null, pinchVelocity = null) {
    if (!hand) return 0;
    let confidence = 0.55;
    if (gesture === RawGestures.PINCH) confidence = 0.45 + (hand.pinchStrength || 0) * 0.5;
    if (gesture === RawGestures.OPEN_PALM || gesture === RawGestures.POINT) confidence = 0.72;
    if (gesture === RawGestures.PEACE || gesture === RawGestures.FOUR_FINGERS) confidence = 0.74;
    if (gesture === RawGestures.FIST || gesture === RawGestures.GRAB) confidence = 0.68;
    if (gesture?.startsWith?.('swipe')) confidence = 0.82;
    if (palmVelocity?.speed > 0.7 || pinchVelocity?.speed > 0.7) confidence += 0.08;
    return Math.max(0, Math.min(1, confidence));
  }

  _velocity(prev, next, prevTime, time) {
    if (!prev || !next || !prevTime || time <= prevTime) {
      return { speed: 0, vector: { x: 0, y: 0, z: 0 } };
    }
    const dt = Math.max(0.001, (time - prevTime) / 1000);
    const vector = {
      x: (next.x - prev.x) / dt,
      y: (next.y - prev.y) / dt,
      z: ((next.z || 0) - (prev.z || 0)) / dt,
    };
    const speed = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    return { speed, vector };
  }

  _blankHand() {
    return {
      gesture: RawGestures.NONE,
      gestureStartedAt: null,
      time: null,
      palm: null,
      pinch: null,
      wrist: null,
      indexTip: null,
      wristAngle: 0,
    };
  }

  _updateDebug(snapshot, actions) {
    const wantsDebug = this._debugEnabled
      || (typeof localStorage !== 'undefined' && localStorage.getItem('cosmiclearn_gesture_debug') === '1');
    if (!wantsDebug) return;

    if (!this._debugEl) {
      const el = document.createElement('div');
      el.id = 'gesture-debug';
      el.style.cssText = `
        position:fixed; right:14px; top:54px; z-index:9000; pointer-events:none;
        width:260px; padding:12px; border-radius:12px;
        background:rgba(5,10,26,0.82); border:1px solid rgba(0,212,255,0.28);
        color:#bfeaff; font:12px/1.45 ui-monospace, Consolas, monospace;
        backdrop-filter:blur(10px); white-space:pre-wrap;
      `;
      document.body.appendChild(el);
      this._debugEl = el;
    }

    const gestures = (snapshot.hands || []).map((h, i) => `H${i}: ${h.gesture || 'none'} ${(h.pinchStrength || 0).toFixed(2)}`);
    const active = this.getActiveActions().slice(-4).map(a => `${a.name}:${a.phase}:${a.hand}`);
    const fresh = actions.slice(-4).map(a => `${a.name}:${a.phase}:${a.hand} ${(a.confidence || 0).toFixed(2)}`);
    this._debugEl.textContent = [
      `Context: ${this.context}`,
      `Mode: ${this.mode}`,
      gestures.join('\n') || 'No hands',
      '',
      'Active:',
      active.join('\n') || '-',
      '',
      'Events:',
      fresh.join('\n') || '-',
    ].join('\n');
  }
}
