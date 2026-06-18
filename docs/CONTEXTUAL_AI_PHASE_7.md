# Phase 7 - Contextual AI Tutor Intelligence

Phase 7 turns the AI tutor into a context-aware learning coach.

## Implemented

- Added tutor memory:
  - Current subject
  - Current topic
  - Current learning mode
  - Current inspected or manipulated object
  - Last gesture intent
  - Recent observations
  - Gesture repetition counts
- Added `LearningIntelligence`:
  - Observes semantic gesture actions.
  - Observes object actions from the interaction manager.
  - Detects repeated gestures and suggests a different learning move.
  - Sends topic-aware prompts when the user enters a subject or lab.
  - Connects mode changes from Phase 6 into the tutor.
- Expanded `AITutor`:
  - `setLearningState`
  - `observeGesture`
  - `observeObjectAction`
  - `remember`
  - `coach`
  - `suggestNextMove`
  - `explainCurrentFocus`
  - `getContextSnapshot`
- Added the AI Coach panel:
  - Hint
  - Why?
  - Challenge
  - Quiet
- Updated app navigation:
  - Returning from a topic back to a subject now restores subject-level tutor and gesture context.

## Behavior

The tutor now reacts differently depending on what the learner is doing:

| Situation | Coach Behavior |
| --- | --- |
| Home | Suggests portal selection and point-hold inspection |
| Subject board | Suggests swiping through topics |
| Lab entry | Gives topic-specific experiment guidance |
| Inspect object | Asks a relevant question about the object |
| Rotate or scale | Explains what to observe |
| Pause simulation | Prompts prediction before resume |
| Repeated gesture | Suggests slowing down or changing one variable |
| Explore mode | Encourages visual observation |
| Challenge mode | Offers an experiment challenge |

## Topic Prompts

Phase 7 includes local prompts for:

- 3D Functions
- 2D Graphs
- Geometry
- Calculus
- Vectors
- Fractals
- Waves
- Pendulum
- Gravity
- Projectile
- Periodic Table
- Molecules
- Titration

## Next Phase Hooks

This creates the foundation for:

- Adaptive learning paths
- Skill mastery tracking
- Gesture-driven quizzes
- Personalized lab goals
- Teacher dashboards with learner intent history
