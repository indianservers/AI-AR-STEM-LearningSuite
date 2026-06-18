# Phase 13 - Tool Visual Effects

Phase 13 makes equipped tools and avatar trails visible during play.

## Implemented

- Added active tool display in the game HUD.
- Added tool activation pulses:
  - Scanner Lens
  - Mission Booster
  - Path Compass
  - Mission objective progress
- Added avatar trail effects:
  - Spark Trail
  - Combo Trail
  - Mastery Trail
- Added visual feedback triggers:
  - Inspect with Scanner Lens
  - Path open with Path Compass
  - Mission progress
  - Mission completion with Mission Booster
  - XP gains
  - Combo x5
- Added `#game-effects-layer` for non-blocking visual effects.

## Behavior

Tool and trail effects are presentation-only. They do not change gesture detection, lab physics, simulation parameters, or mission scoring.

The current active tool is shown in the game HUD:

```text
Explorer / LV 1
0 XP
No tool / Combo 0
```

When a tool is equipped, the bottom line changes to the tool name.

## Architecture

Effects remain inside `GameLayer`.

This keeps game presentation separate from:

- Subject modules
- Interaction manager
- Simulation control bus
- Learning path scoring
- Adaptive mission rules

## Next Phase Hooks

This prepares the app for:

- Avatar companion effects
- Tool-specific gesture abilities
- Multiplayer identity cards
- Scoreboard animations
- Boss challenge presentation
