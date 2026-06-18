# Simulation Control Phase 5

Phase 5 adds `SimulationControlBus`, a standard gesture layer for controlling active labs.

## User Gestures

- Open palm hold: pause/resume active simulation
- Fist hold: reset active simulation
- Swipe up: increase active parameter
- Swipe down: decrease active parameter
- Swipe right: next preset/item where supported
- Swipe left: previous preset/item where supported

## App Integration

`main.js` creates one bus:

```js
const simControl = new SimulationControlBus(gestureEngine);
```

When a topic opens, the active lab is registered:

```js
simControl.setActiveLab(activeLab, { subject, topic });
```

The main render loop asks the bus whether to update the current lab:

```js
if (simControl.shouldUpdate(activeLab)) activeModule.update(deltaTime);
```

## Lab Opt-In API

Labs can implement any of these methods:

```js
setPaused(paused)
reset()
trigger()
increaseParameter()
decreaseParameter()
nextPreset()
previousPreset()
```

The bus also has conservative fallbacks for common fields:

- `_paused`
- `_running`
- `_freq`
- `_amp`
- `_speed`
- `_angle`
- `_g`
- `_gravity`
- `_z`
- `_iter`
- `_speedMultiplier`
- `_presetIdx`
- `_currentFn`
- `_activeTitration`

## First Explicit Integrations

The following labs now expose explicit controls:

- `WaveLab`: pause, reset, frequency up/down, trigger pulse
- `PendulumLab`: pause, reset, gravity up/down, trigger energy kick
- `FunctionPlotter3D`: reset, next/previous preset
- `TitrationSim`: pause, reset, drip trigger, volume up/down

## UI Feedback

Phase 5 adds:

- `#simulation-status`: short gesture feedback
- `#simulation-hint`: active simulation control hints

## Next Improvements

Future phases should add explicit APIs to every lab instead of relying on fallbacks.
Clap/double-fist detection can be added at the gesture-recognition layer when richer pose detection is introduced.
