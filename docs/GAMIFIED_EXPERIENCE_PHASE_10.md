# Phase 10 - Gamified Experience Layer

Phase 10 makes the app feel more like a game while keeping the learning systems intact.

## Implemented

- Added `GameLayer`.
- Added persistent player state:
  - XP
  - Level
  - Current combo streak
  - Best combo
  - Quest metrics
  - Completed quests
  - Unlocked badges
- Added game HUD:
  - Level
  - XP
  - Level progress bar
  - Combo count
- Added quest panel:
  - Scanner: inspect any object
  - Gesture Combo: use 5 meaningful gestures in a lab
  - Mission Clear: complete one adaptive mission
  - Lab Runner: enter 3 different labs
- Added XP rewards for:
  - Entering subjects
  - Entering labs
  - Opening paths
  - Opening quizzes
  - Starting missions
  - Mission progress
  - Mission completion
  - Inspect, rotate, scale, and parameter gestures
- Added combo feedback:
  - Fast gesture chains increase combo streak.
  - Combo x3 and x5 create game feedback.
- Connected adaptive missions to game rewards:
  - Mission start gives XP.
  - Objective progress gives XP.
  - Mission completion gives XP and badges.

## Design Rules

The game layer is intentionally separate from lab physics and subject modules.

`GameLayer` observes existing events and awards progress. It does not own simulation behavior, navigation behavior, or learning-path scoring.

## User Flow

1. Enter a subject to gain XP.
2. Enter labs to advance Lab Runner.
3. Use gestures in quick succession to build combos.
4. Start adaptive missions from QZ or Challenge Mode.
5. Complete quests and earn badges.
6. Click the game HUD to inspect active quests.

## Next Phase Hooks

This prepares the app for:

- Avatar progression
- Unlockable tools
- Time trials
- Boss-style challenge labs
- Multiplayer scoreboards
- Classroom teams and seasons
