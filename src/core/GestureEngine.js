/**
 * Classifies MediaPipe hand landmarks into named gestures.
 * Landmark indices: 0=WRIST, 1-4=THUMB, 5-8=INDEX, 9-12=MIDDLE, 13-16=RING, 17-20=PINKY
 */

import { GestureActionRegistry } from './GestureActionRegistry.js';

export const Gestures = {
  NONE: 'none',
  PINCH: 'pinch',
  OPEN_PALM: 'open_palm',
  POINT: 'point',
  FIST: 'fist',
  GRAB: 'grab',
  PEACE: 'peace',
  FOUR_FINGERS: 'four_fingers',
  TWO_HAND_SPREAD: 'two_hand_spread',
  TWO_HAND_ROTATE: 'two_hand_rotate',
  SWIPE_LEFT: 'swipe_left',
  SWIPE_RIGHT: 'swipe_right',
  SWIPE_UP: 'swipe_up',
  SWIPE_DOWN: 'swipe_down',
};

const FINGERTIP = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const MCP       = { thumb: 2, index: 5, middle: 9,  ring: 13, pinky: 17 };
const PIP       = { index: 6, middle: 10, ring: 14, pinky: 18 };

function dist3D(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function isExtended(landmarks, tipIdx, mcpIdx, pipIdx) {
  // Tip must be above MCP (lower y in image space) AND above PIP midpoint
  const aboveMcp = landmarks[tipIdx].y < landmarks[mcpIdx].y - 0.03;
  if (pipIdx !== undefined) {
    const abovePip = landmarks[tipIdx].y < landmarks[pipIdx].y + 0.01;
    return aboveMcp && abovePip;
  }
  return aboveMcp;
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: ((a.z || 0) + (b.z || 0)) / 2 };
}

export class GestureEngine {
  constructor() {
    this._prevGestures = ['none', 'none'];
    this._swipeHistory = [[], []];
    this._listeners = [];
    this._actionListeners = [];
    this.currentGestures = ['none', 'none'];
    this.lastActions = [];
    this.actions = new GestureActionRegistry();
    this.pinchPositions = [null, null];
    this.palmPositions = [null, null];
    this.indexTipPositions = [null, null];
    this.wristPositions = [null, null];
    this.thumbTipPositions = [null, null];
    this.pinchStrength = [0, 0];   // 0=open, 1=fully pinched
    this.fingerExtended = [        // per-hand per-finger extension state
      { thumb: false, index: false, middle: false, ring: false, pinky: false },
      { thumb: false, index: false, middle: false, ring: false, pinky: false },
    ];
    this._prevTwoHandDist = null;
    this._lastLandmarks = [];
  }

  process(results) {
    const oldGestures = [...this.currentGestures];

    if (!results || !results.landmarks) {
      this.currentGestures = ['none', 'none'];
      this._prevGestures = oldGestures;
      this.pinchPositions = [null, null];
      this.palmPositions = [null, null];
      this.indexTipPositions = [null, null];
      this.thumbTipPositions = [null, null];
      this.wristPositions = [null, null];
      this.pinchStrength = [0, 0];
      this.lastActions = this.actions.update(this._snapshot(['none', 'none']));
      return;
    }

    const hands = results.landmarks;
    const newGestures = ['none', 'none'];

    for (let h = 0; h < Math.min(hands.length, 2); h++) {
      const lm = hands[h];
      const g = this._classifySingleHand(lm, h);
      newGestures[h] = g;

      this.wristPositions[h] = lm[0];
      this.indexTipPositions[h] = lm[FINGERTIP.index];
      this.thumbTipPositions[h] = lm[FINGERTIP.thumb];
      this.palmPositions[h] = midpoint(lm[0], lm[9]);

      // Continuous pinch strength (0=max-open, 1=fully-pinched)
      const pd = dist3D(lm[FINGERTIP.thumb], lm[FINGERTIP.index]);
      this.pinchStrength[h] = Math.max(0, Math.min(1, 1 - (pd - 0.02) / 0.09));

      if (g === Gestures.PINCH) {
        this.pinchPositions[h] = midpoint(lm[FINGERTIP.thumb], lm[FINGERTIP.index]);
      } else {
        this.pinchPositions[h] = null;
      }
    }

    for (let h = hands.length; h < 2; h++) {
      newGestures[h] = 'none';
      this.pinchPositions[h] = null;
      this.palmPositions[h] = null;
      this.indexTipPositions[h] = null;
      this.thumbTipPositions[h] = null;
      this.wristPositions[h] = null;
      this.pinchStrength[h] = 0;
    }

    // Two-hand gestures
    if (hands.length === 2 && this.pinchPositions[0] && this.pinchPositions[1]) {
      const d = dist3D(this.pinchPositions[0], this.pinchPositions[1]);
      const prevD = this._prevTwoHandDist || d;
      const delta = d - prevD;
      newGestures[0] = newGestures[1] =
        Math.abs(delta) > 0.007 ? Gestures.TWO_HAND_SPREAD : Gestures.TWO_HAND_ROTATE;
      this._prevTwoHandDist = d;
    } else {
      this._prevTwoHandDist = null;
    }

    // Swipe detection
    for (let h = 0; h < 2; h++) {
      if (this.wristPositions[h]) {
        this._swipeHistory[h].push({
          x: this.wristPositions[h].x,
          y: this.wristPositions[h].y,
          t: performance.now(),
        });
        if (this._swipeHistory[h].length > 10) this._swipeHistory[h].shift();
        const swipe = this._detectSwipe(h);
        if (swipe) newGestures[h] = swipe;
      }
    }

    for (let h = 0; h < 2; h++) {
      if (newGestures[h] !== oldGestures[h]) {
        this._listeners.forEach(fn => fn(newGestures[h], h, newGestures));
      }
    }

    this._prevGestures = oldGestures;
    this.currentGestures = newGestures;
    this.lastActions = this.actions.update(this._snapshot(newGestures));
    this.lastActions.forEach(action => this._actionListeners.forEach(fn => fn(action)));
    return newGestures;
  }

  _classifySingleHand(lm, handIdx) {
    // Thumb: compare tip.x to base (works for right hand facing camera)
    const thumbExt = dist3D(lm[FINGERTIP.thumb], lm[MCP.thumb]) > 0.06;
    const indexExt  = isExtended(lm, FINGERTIP.index,  MCP.index,  PIP.index);
    const middleExt = isExtended(lm, FINGERTIP.middle, MCP.middle, PIP.middle);
    const ringExt   = isExtended(lm, FINGERTIP.ring,   MCP.ring,   PIP.ring);
    const pinkyExt  = isExtended(lm, FINGERTIP.pinky,  MCP.pinky,  PIP.pinky);

    this.fingerExtended[handIdx] = { thumb: thumbExt, index: indexExt, middle: middleExt, ring: ringExt, pinky: pinkyExt };

    const pinchDist = dist3D(lm[FINGERTIP.thumb], lm[FINGERTIP.index]);

    // PINCH: thumb and index close (generous threshold)
    if (pinchDist < 0.07) return Gestures.PINCH;

    // PEACE: index + middle extended
    if (indexExt && middleExt && !ringExt && !pinkyExt) return Gestures.PEACE;

    // FOUR FINGERS: four fingers extended with thumb tucked.
    if (!thumbExt && indexExt && middleExt && ringExt && pinkyExt) return Gestures.FOUR_FINGERS;

    // OPEN PALM: all four fingers extended
    if (indexExt && middleExt && ringExt && pinkyExt) return Gestures.OPEN_PALM;

    // POINT: only index extended
    if (indexExt && !middleExt && !ringExt && !pinkyExt) return Gestures.POINT;

    // FIST: all fingers curled
    if (!indexExt && !middleExt && !ringExt && !pinkyExt) return Gestures.FIST;

    // GRAB: 3+ fingers curled but not fist (used for large-object grab)
    const curledCount = [indexExt, middleExt, ringExt, pinkyExt].filter(e => !e).length;
    if (curledCount >= 3) return Gestures.GRAB;

    return Gestures.NONE;
  }

  _detectSwipe(h) {
    const hist = this._swipeHistory[h];
    if (hist.length < 8) return null;
    const first = hist[0];
    const last = hist[hist.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    if (Math.abs(dx) > Math.abs(dy) && dx < -0.18) { this._swipeHistory[h] = []; return Gestures.SWIPE_LEFT; }
    if (Math.abs(dx) > Math.abs(dy) && dx >  0.18) { this._swipeHistory[h] = []; return Gestures.SWIPE_RIGHT; }
    if (Math.abs(dy) > Math.abs(dx) && dy < -0.15) { this._swipeHistory[h] = []; return Gestures.SWIPE_UP; }
    if (Math.abs(dy) > Math.abs(dx) && dy >  0.15) { this._swipeHistory[h] = []; return Gestures.SWIPE_DOWN; }
    return null;
  }

  onChange(fn) { this._listeners.push(fn); }
  onAction(fn) { this._actionListeners.push(fn); return () => this._actionListeners = this._actionListeners.filter(f => f !== fn); }

  justStarted(gesture, handIdx = 0) {
    return this.currentGestures[handIdx] === gesture && this._prevGestures[handIdx] !== gesture;
  }

  setGestureContext(context) {
    this.actions.setContext(context);
  }

  setGestureMode(mode) {
    this.actions.setMode(mode);
  }

  setGestureSensitivity(config) {
    this.actions.setSensitivity(config);
  }

  setGestureDebugEnabled(enabled) {
    this.actions.setDebugEnabled(enabled);
  }

  getPinchDist() {
    if (!this.pinchPositions[0] || !this.pinchPositions[1]) return null;
    return dist3D(this.pinchPositions[0], this.pinchPositions[1]);
  }

  /** Convert normalized hand position [0-1] → Babylon world-space Vector3 */
  toWorldPosition(normPos, camera, canvas, depth = 7) {
    if (!normPos || !camera) return null;
    // Use z from MediaPipe as depth hint (z is relative depth, more negative = further)
    const depthAdjust = depth - (normPos.z || 0) * 8;
    const sx = (1 - normPos.x) * canvas.clientWidth;
    const sy = normPos.y * canvas.clientHeight;
    try {
      const ray = camera.getScene().createPickingRay(sx, sy, null, camera);
      if (!ray) return null;
      return ray.origin.add(ray.direction.scale(Math.max(2, depthAdjust)));
    } catch (_) {
      return null;
    }
  }

  _snapshot(gestures) {
    return {
      time: performance.now(),
      hands: [0, 1].map(h => ({
        gesture: gestures[h] || Gestures.NONE,
        palm: this.palmPositions[h],
        pinch: this.pinchPositions[h],
        wrist: this.wristPositions[h],
        indexTip: this.indexTipPositions[h],
        thumbTip: this.thumbTipPositions[h],
        pinchStrength: this.pinchStrength[h] || 0,
        fingers: this.fingerExtended[h],
      })),
    };
  }
}
