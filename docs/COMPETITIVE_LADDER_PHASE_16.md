# Phase 16 - Competitive Ladder

Phase 16 adds an offline-first competitive layer on top of campaigns, bosses, quests, and gesture play.

## Implemented

- Added `CompetitiveLadder`.
- Added a persistent rank mini HUD.
- Added a full ladder panel from:
  - `RANK` toolbar button
  - `leaderboard`, `scoreboard`, `ladder`, `rank`, or `ranking` voice commands
  - teacher command route
- Added rank progression:
  - Bronze Labhand
  - Silver Navigator
  - Gold Analyst
  - Platinum Tactician
  - Diamond Mentor
- Added local leaderboard rows with the learner mixed into rival scores.
- Added daily challenge rotation based on the current date.
- Added achievement chips for:
  - Boss wins
  - Rank-ups
  - Daily completions
  - Lab streaks
  - Inspect depth
  - Gesture combos

## Scoring Inputs

The ladder scores real app behavior:

- Subject entry
- Lab entry
- Learning path opens
- Quiz opens
- Boss starts
- Boss hits
- Boss completions
- Campaign advances
- Campaign chapter completions
- Campaign completion
- Gesture actions
- Inspect actions
- Rotate / scale transforms
- Parameter changes

## User Flow

1. Press `RANK`.
2. Review total score, daily score, and best combo.
3. Open the `Daily` tab for the current challenge.
4. Complete the goals through normal lab play.
5. Open `Wins` to see earned ladder achievements.

## Architecture

The ladder listens to:

- `cosmiclearn:game-event` events emitted by `GameLayer`
- Gesture actions from `GestureEngine`
- Object actions from `InteractionManager`

It stores local progress in `localStorage`.

## Next Phase Hooks

This prepares the app for:

- Real networked scoreboards
- Classroom leaderboards
- Teacher-created daily ladders
- Multiplayer challenge races
- Season resets and tournaments
