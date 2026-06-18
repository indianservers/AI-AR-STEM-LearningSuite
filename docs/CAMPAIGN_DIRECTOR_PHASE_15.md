# Phase 15 - Campaign Director

Phase 15 adds a game-session layer above quests, paths, and boss fights.

## Implemented

- Added `CampaignDirector`.
- Added a persistent campaign mini HUD.
- Added a full campaign panel from:
  - `DIR` toolbar button
  - `campaign`, `director`, `story mode`, or `chapter` voice commands
  - teacher command route
- Added chapter-based progression:
  - Portal Rookie
  - Math Runner
  - Physics Pilot
  - Chem Mapper
  - Mixed Mastery
- Added objective tracking for:
  - Subject entry
  - Subject switching
  - Lab entry
  - Math, physics, and chemistry lab visits
  - Inspect actions
  - Rotate / scale transforms
  - Parameter changes
  - Pause actions
  - Learning path opens
  - Boss wins
- Added AI tutor campaign coaching through the Director panel.
- Added campaign XP and badges in `GameLayer`.

## User Flow

1. Press `DIR`.
2. Read the active chapter.
3. Complete the three visible objectives.
4. Press `Next` or continue playing to advance.
5. Use `Focus` when the AI coach should explain the next campaign step.

## Architecture

The campaign director listens to existing app events:

- Gesture actions from `GestureEngine`
- Object actions from `InteractionManager`
- Game events emitted by `GameLayer`

It does not replace:

- Boss challenges
- Adaptive missions
- Learning paths
- Progress dashboard

## Game Rewards

`GameLayer` now awards XP for:

- Campaign chapter advance
- Campaign chapter completion
- Full campaign completion

Campaign completions also unlock chapter badges.

## Next Phase Hooks

This prepares the app for:

- Scoreboards
- Daily challenge ladders
- Multiplayer race chapters
- Teacher-assigned campaign chapters
- Visual chapter arenas
