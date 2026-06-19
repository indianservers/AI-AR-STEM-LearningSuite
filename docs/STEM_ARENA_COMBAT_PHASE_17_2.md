# Phase 17.2 - STEM Arena Combat

This is phase 2 of the four-phase wow STEM game shift.

## Implemented

- Added `STEMArenaCombat`.
- Added automatic arena targets when entering a lab.
- Added an arena HUD with:
  - Arena name
  - Target HP
  - Charge meter
  - Weakness hint
- Added 3D arena target core and rotating halo.
- Added arena hit flashes.
- Added arena clear state.
- Added arena hit and arena clear game events.
- Connected arena hits and clears to:
  - XP
  - Badges
  - Competitive ladder score
  - Ladder achievements

## Arena Examples

- Waves: Resonance Rift, weak to Wave Surge
- Gravity: Orbit Breaker, weak to Gravity Crush
- Pendulum: Time Gate, weak to Time Freeze
- 3D Functions: Surface Rift, weak to Function Rift
- Vectors / Graphs: Vector Duel, weak to Vector Slash
- Atomic / Periodic: Atomic Breach, weak to Atom Burst
- Molecules / Titration: Bond Arena, weak to Molecule Forge

## Combat Inputs

- Inspect: adds scan charge.
- Rotate / Scale: adds control charge.
- Swipe up / down: adds parameter charge.
- Throw: hits with Vector Slash.
- STEM powers: hit the active arena target.

Correct weakness hits do more damage.

Charged hits do more damage.

## Architecture

Arena combat listens to:

- Gesture actions from `GestureEngine`
- `powerUse` events emitted through `GameLayer`
- Current subject/topic context from `main`

It does not replace lab simulations. It adds a game layer above them.

## Next Phases

1. Boss Weak-Point Intelligence
2. AR/MR Spectacle Mode
