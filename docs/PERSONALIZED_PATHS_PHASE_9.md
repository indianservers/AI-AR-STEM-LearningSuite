# Phase 9 - Personalized Learning Paths

Phase 9 adds topic recommendations and learner-specific path planning on top of Phase 8 mastery data.

## Implemented

- Added `LearningPathPlanner`.
- Added personalized recommendations from:
  - Visited labs
  - Per-lab mastery score
  - Adaptive difficulty profile
  - Concept graph prerequisites
  - Subject topic order
- Added subject-level recommendation strip.
- Added full Personalized Path overlay.
- Added `Path` command to fist quick menu and four-finger Advanced Controls.
- Added voice commands:
  - `learning path`
  - `personal path`
  - `recommend`
  - `recommendation`
  - `next path`
- Updated `MAP` button behavior:
  - On subject boards, it opens the personalized path.
  - Inside labs or at home, it opens the concept map.
- Cleaned `ConceptGraph` and `VoiceCommands` corrupted text.
- Exported concept nodes and edges for recommendation scoring.

## Recommendation Logic

Each candidate topic receives a score from:

| Signal | Effect |
| --- | --- |
| Unvisited lab | Strong priority |
| Low mastery | Practice priority |
| Completed prerequisites | Next-step priority |
| Topic order | Keeps subject flow coherent |
| Adaptive profile | Raises challenge readiness |

## User Flow

1. Enter a subject board.
2. The path strip recommends the next topic.
3. Select `Start` to jump directly into that lab.
4. Select `Path` to see the ranked list.
5. As missions, gestures, and mastery change, the recommendations update.

## Next Phase Hooks

Phase 9 prepares the app for:

- Teacher-facing path assignment
- AI-generated custom lesson sequences
- Remediation paths for weak topics
- Cross-subject pathing, such as trigonometry to waves
- Group/class path analytics
