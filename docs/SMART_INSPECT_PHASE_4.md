# Smart Inspect Phase 4

Phase 4 adds a universal inspect layer for 3D objects.

## User Gesture

Point at an interactable object and hold.

The app emits an `inspect` action, highlights the object, and opens the Smart Inspect panel.

## What The Panel Shows

- Object title and type
- Context-aware explanation
- Live position
- Live rotation
- Live scale
- Vertex count
- Capability badges
- Quick question/prompt
- Explain, Pin Label, and Compare actions

## Adding Metadata

Objects can expose better inspect content through `interaction.register`:

```js
interaction.register(mesh, {
  metadata: {
    title: 'Planet',
    type: 'Physics Body',
    summary: 'A movable body controlled by gravity and initial velocity.',
    question: 'What happens if you flick it faster?',
  },
  capabilities: {
    canMove: true,
    canRotate: true,
    canScale: true,
    canThrow: true,
    canInspect: true,
  },
});
```

You can also add metadata later:

```js
interaction.setMetadata(mesh, {
  title: 'Oxygen Atom',
  summary: 'A reactive nonmetal with six valence electrons.',
});
```

## Listening For Object Actions

Universal object actions now flow through:

```js
interaction.onObjectAction(event => {
  if (event.actionName === 'inspect') {
    console.log(event.mesh, event.metadata, event.capabilities);
  }
});
```

## Current Scope

The inspect panel works generically for every registered object.
Home subject portals already include metadata.
Future phases should add richer metadata to physics, chemistry, and math lab objects.
