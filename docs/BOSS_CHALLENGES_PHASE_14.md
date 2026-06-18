# Phase 14 - Boss Challenge Labs

Phase 14 adds timed boss encounters on top of adaptive missions.

## Implemented

- Added `BossChallengeManager`.
- Added boss encounters for:
  - Waves: Node Warden
  - Pendulum: Energy Sentinel
  - Molecules: Shape Guardian
  - 3D Functions: Surface Titan
  - Titration: pH Hydra
  - Default: Concept Boss
- Boss encounters track real gestures and object actions:
  - Inspect
  - Rotate / scale
  - Swipe parameter changes
  - Pause
  - Reset / reflect
- Boss encounters are timed.
- Boss panel includes:
  - Boss title
  - HP bar
  - Timer
  - Prompt
  - Goal checklist
- Boss completion records:
  - Progress challenge completion
  - Adaptive challenge result
  - Game XP
  - Boss badge
- QZ / Challenge Mode behavior:
  - Outside a lab: subject quiz
  - Inside a lab: boss challenge

## Game Rewards

`GameLayer` now awards XP for:

- Boss start
- Boss progress
- Boss completion
- Boss retry attempt

Boss wins unlock a badge named after the defeated boss.

## Architecture

Boss challenges observe existing gesture and object events.

They do not modify:

- Lab simulation physics
- Gesture recognition
- Object manipulation behavior
- Adaptive mission definitions

## Next Phase Hooks

This prepares the app for:

- Multiplayer boss races
- Scoreboards
- Seasonal challenge ladders
- Teacher-assigned boss encounters
- Boss-specific visual arenas
