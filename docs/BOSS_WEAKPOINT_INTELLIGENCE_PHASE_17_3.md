# Phase 17.3 - Boss Weak-Point Intelligence

This is phase 3 of the four-phase wow STEM game shift.

## Implemented

- Added boss weak-point profiles.
- Added visible boss weak-point panel.
- Added weak-point states:
  - Locked
  - Exposed
  - Finisher
  - Hit
  - Partial
  - Miss
- Added power-specific boss vulnerabilities.
- Added repeated-power resistance.
- Added finisher readiness when boss progress is high.
- Connected boss weak-point events to:
  - XP
  - Badges
  - Competitive ladder score
  - Ladder achievements

## Boss Weakness Examples

- Node Warden
  - Weak point: Resonance Eye
  - Weakness: Wave Surge
  - Expose: parameter control
  - Finisher: Two-hand Wave Surge

- Energy Sentinel
  - Weak point: Energy Apex
  - Weakness: Time Freeze
  - Expose: pause
  - Finisher: Freeze Crush

- Shape Guardian
  - Weak point: Unstable Bond
  - Weakness: Molecule Forge
  - Expose: transform
  - Finisher: Bond Collapse

- Surface Titan
  - Weak point: Critical Point
  - Weakness: Function Rift
  - Expose: transform
  - Finisher: Critical Rift

- pH Hydra
  - Weak point: Equivalence Core
  - Weakness: Molecule Forge
  - Expose: parameter control
  - Finisher: Reaction Break

## Combat Behavior

- Correct setup gestures expose the weak point.
- Correct STEM power hits progress the boss faster.
- Repeating the same power too many times causes resistance.
- Near defeat, bosses enter finisher-ready state.

## Next Phase

Phase 17.4 should add AR/MR Spectacle Mode:

- Floor-anchored portals
- Room-scale power bursts
- Boss projection mode
- Walk-around object scale
- AR power finishers
