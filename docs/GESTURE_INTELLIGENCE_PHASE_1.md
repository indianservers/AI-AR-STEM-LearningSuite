# Gesture Intelligence Phase 1

Phase 1 adds a semantic action layer on top of raw hand poses.

## Raw Gestures

`GestureEngine` still exposes the existing raw gesture state:

- `currentGestures`
- `pinchPositions`
- `palmPositions`
- `indexTipPositions`
- `pinchStrength`
- `fingerExtended`

This keeps the existing labs working.

## Semantic Actions

Use `gestureEngine.onAction(fn)` for higher-level interaction events:

```js
gestureEngine.onAction(action => {
  if (action.name === 'rotate' && action.phase === 'active') {
    selectedMesh.rotation.y += action.detail.angleDelta;
  }
});
```

Action shape:

```js
{
  name: 'grab' | 'release' | 'move' | 'rotate' | 'scale' | 'throw' | 'inspect' | 'pause' | 'reset' | 'menu',
  phase: 'start' | 'active' | 'complete',
  hand: 0 | 1 | 'both',
  confidence: 0.0-1.0,
  context: 'home' | 'math' | 'gravity' | ...,
  mode: 'beginner' | 'expert',
  detail: {}
}
```

## Built-In Compound Actions

- Pinch start -> `grab:start`
- Pinch held -> `move:active`
- Pinch + wrist twist -> `rotate:active`
- Pinch release -> `release:complete`
- Fast pinch release -> `throw:complete`
- Two-hand pinch spread -> `scale:active`
- Two-hand pinch rotate -> `rotate:active`
- Point hold -> `inspect:complete`
- Open palm hold -> `pause:complete`
- Fist start -> `menu:start`
- Fist hold -> `reset:complete`
- Horizontal and vertical swipes -> `swipe_left`, `swipe_right`, `swipe_up`, `swipe_down`

## Context

The app calls `gestureEngine.setGestureContext(...)` during navigation.
Future phases can resolve the same action differently per lab.

## Debug Overlay

Open the app with:

```txt
?gestureDebug
```

or set:

```js
localStorage.setItem('cosmiclearn_gesture_debug', '1')
```

The overlay shows active raw gestures, semantic actions, context, and mode.
