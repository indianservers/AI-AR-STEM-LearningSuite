# Phase 17.4 - MR/AR Spectacle Mode

This is phase 4 of the four-phase wow STEM game shift.

## Implemented

- Added `MRSpectacleMode`.
- Added `MR` toolbar button.
- Added persistent MR spectacle HUD.
- Added desktop fallback MR-style portal.
- Added room-scale floor rift visualization.
- Added animated portal rings.
- Added floating room-rift label.
- Added particle field around the portal.
- Added room-scale projection bursts for:
  - STEM power use
  - Arena clears
  - Boss finisher readiness
  - Boss completions
- Added XR mode awareness:
  - Desktop
  - VR
  - AR
- Added voice commands:
  - `mixed reality`
  - `mr mode`
  - `mr spectacle`
  - `spectacle mode`
  - `room mode`
- Connected MR events to:
  - XP
  - Badges
  - Competitive ladder score
  - Ladder achievements

## User Flow

1. Press `MR`.
2. A room-scale STEM rift appears in the scene.
3. Press `WOW` or clear arena/boss moments.
4. The event projects into the room as a large animated MR burst.

## Design Goal

This phase makes the app feel less like a dashboard and more like a STEM showpiece:

- The room becomes the stage.
- STEM powers feel physical.
- Arena and boss wins become projected events.
- AR/VR sessions can reuse the same spectacle layer.

## Four-Phase Set Complete

The wow STEM shift now includes:

1. STEM Power Engine
2. STEM Arena Combat
3. Boss Weak-Point Intelligence
4. MR/AR Spectacle Mode
