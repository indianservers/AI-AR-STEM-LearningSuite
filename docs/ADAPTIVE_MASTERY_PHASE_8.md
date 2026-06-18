# Phase 8 - Adaptive Mastery and Missions

Phase 8 adds a personalized learning loop on top of the contextual AI tutor.

## Implemented

- Added `AdaptiveMissionControl`:
  - Selects a mission based on the active topic and learner level.
  - Tracks mission goals from real gestures and object interactions.
  - Completes missions automatically when goals are met.
  - Records challenge wins into progress and adaptive difficulty.
- Upgraded `ProgressDashboard`:
  - Tracks gestures.
  - Tracks challenge completions.
  - Tracks per-lab mastery score.
  - Shows strongest labs and average mastery.
  - Adds adaptive trophies.
- Upgraded `AdaptiveDifficulty`:
  - Tracks lab visits, interactions, gesture counts, and challenge wins.
  - Produces Beginner, Intermediate, or Advanced profiles.
  - Recommends missions by level.
- Challenge Mode now has real behavior:
  - Inside a lab, the `QZ` button starts an adaptive mission.
  - Outside a lab, `QZ` still opens the subject quiz.
  - The Phase 6 Advanced Controls Challenge button starts the active lab mission.
  - Hidden missions do not score in the background; mission scoring starts only after Challenge Mode is activated.
- Cleaned old quiz and progress UI text:
  - Removed corrupted symbols.
  - Converted quiz UI to reusable CSS classes.

## Mission Types

| Level | Mission | Goal |
| --- | --- | --- |
| Beginner | Inspect, Change, Compare | Inspect an object, then rotate or scale it |
| Intermediate | Parameter Prediction | Change parameters and pause to predict |
| Advanced | Before / After Proof | Inspect, transform, then reflect with pause or reset |

## Topic-Specific Missions

- Waves: Node Hunt
- Pendulum: Energy Trade
- Molecules: Shape Reader
- 3D Functions: Surface Sleuth
- Titration: Slow Zone

## Data Flow

1. Gesture or object action occurs.
2. `AdaptiveMissionControl` records it.
3. `ProgressDashboard` updates mastery and gesture totals.
4. `AdaptiveDifficulty` updates learner profile.
5. AI Coach gives mission feedback.

## Next Phase Hooks

Phase 8 prepares the app for:

- Multi-step guided learning paths
- AI-generated challenges
- Teacher-facing mastery analytics
- Skill badges per gesture family
- Personalized topic recommendations
