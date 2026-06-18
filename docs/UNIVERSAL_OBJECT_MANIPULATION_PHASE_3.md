# Universal Object Manipulation Phase 3

Phase 3 upgrades `InteractionManager` from simple grab/drag into capability-aware object manipulation.

## Backward Compatibility

Existing calls still work:

```js
interaction.register(mesh);
interaction.register(mesh, () => selectThing());
interaction.register(mesh, () => selectThing(), distance => pulse(distance));
```

## Capability-Aware Registration

New object options:

```js
interaction.register(mesh, {
  onClick: () => selectThing(),
  onProximity: distance => pulse(distance),
  onAction: (actionName, mesh, detail) => console.log(actionName, detail),
  capabilities: {
    canGrab: true,
    canMove: true,
    canRotate: true,
    canScale: true,
    canThrow: false,
    canInspect: true,
    canShake: true,
    minScale: 0.4,
    maxScale: 3,
    rotateSpeed: 1.2,
    scaleSpeed: 16,
    snapBack: false,
  },
});
```

## Implemented Universal Gestures

- Pinch near object -> grab
- Pinch + drag -> move
- Pinch + wrist twist -> rotate grabbed object
- Two-hand pinch + spread -> scale selected/grabbed object
- Two-hand pinch + rotate -> rotate selected/grabbed object
- Pinch release -> release
- Fast pinch release -> throw event and burst feedback
- Grab + shake -> shake action and energy burst
- Point + hold -> inspect action

## Recommended Defaults By Lab Type

Molecules:

```js
capabilities: { canMove: false, canRotate: true, canScale: true, canThrow: false }
```

Planets/projectiles:

```js
capabilities: { canMove: true, canRotate: true, canScale: true, canThrow: true }
```

UI handles/buttons:

```js
capabilities: { canMove: false, canRotate: false, canScale: false, canThrow: false, snapBack: true }
```

Graphs and geometry:

```js
capabilities: { canMove: true, canRotate: true, canScale: true, canThrow: false }
```

## Notes

- Capabilities default to permissive behavior so existing labs immediately feel more interactive.
- Labs can call `interaction.setCapabilities(mesh, partialCapabilities)` at any time.
- `onAction` lets lab-specific systems react to universal gestures without reimplementing hand tracking.
