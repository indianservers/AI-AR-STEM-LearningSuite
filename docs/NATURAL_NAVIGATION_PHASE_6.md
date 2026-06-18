# Phase 6 - Natural Navigation and Modes

Phase 6 adds a screen-aware navigation layer on top of the gesture intelligence foundation.

## Implemented

- Added new raw hand shapes:
  - Peace sign
  - Four-finger hold
- Added new semantic actions:
  - `explore_mode`
  - `advanced_controls`
  - `home`
- Added `NavigationGestureController`:
  - Fist opens a quick menu.
  - Peace sign hold toggles immersive Explore Mode.
  - Four-finger hold opens Advanced Controls.
  - Two open palms hold returns home and clears navigation overlays.
  - Swipe left/right navigates subjects or highlights topics when no lab is active.
  - Swipe down clears navigation overlays outside labs.
- Added mode badge:
  - Learn Mode
  - Explore Mode
  - Inspect Mode
  - Draw Mode
  - Challenge Mode
  - Teach Mode
- Added an Advanced Controls panel with mode switches, progress, guide, and navigation actions.
- Updated Gesture Guide navigation cards for the new live gestures.
- Exported clean subject topic metadata from `SubjectHub` for smarter navigation.
- Replaced corrupted subject icons with stable ASCII labels.

## Context Rules

Swipes are intentionally split by context:

- Inside an active lab, swipes remain simulation controls from Phase 5.
- On home and subject boards, swipes become navigation controls.

This keeps parameter control reliable while still making the app feel navigable by hand.

## Gesture Map

| Gesture | Action | Context |
| --- | --- | --- |
| Fist | Quick menu | All screens |
| Peace sign hold | Explore mode toggle | All screens |
| Four-finger hold | Advanced controls | All screens |
| Two open palms hold | Home | All screens |
| Swipe left/right | Previous/next subject or topic highlight | Home/subject screens |
| Swipe down | Clear overlays | Home/subject screens |

## Next Phase Hooks

The mode system is now ready for deeper behavior:

- Inspect Mode can prioritize object details and labels.
- Draw Mode can expose stroke tools and color palettes.
- Challenge Mode can load gesture-based quizzes.
- Teach Mode can expose teacher cues and guided demonstrations.
