# Phase 17.1 - Wow STEM Power Engine

This is phase 1 of the four-phase shift from interactive learning app to pure STEM spectacle game.

## Implemented

- Added `STEMPowerEngine`.
- Added `WOW` toolbar trigger.
- Added power HUD showing the current context power.
- Added discovery popups for first-time power use.
- Added cinematic screen bursts.
- Added 3D scene shockwave ring and particles.
- Added voice commands:
  - `wow`
  - `power`
  - `power surge`
  - `activate power`
  - `stem power`
- Added teacher command route for `wow`.
- Connected power use to:
  - Game XP
  - Game badges
  - Competitive ladder score
  - Ladder achievements

## First Power Set

- Vector Slash
- Function Rift
- Gravity Crush
- Time Freeze
- Atom Burst
- Molecule Forge
- Wave Surge
- Portal Surge

## Context Rules

- Math topics favor vector and function powers.
- Physics topics favor gravity, wave, and time powers.
- Chemistry topics favor atom and molecule powers.
- Home uses Portal Surge.
- Specific topics can override the subject default:
  - Waves: Wave Surge
  - Gravity: Gravity Crush
  - Pendulum: Time Freeze
  - Molecules: Molecule Forge
  - Atomic / Periodic: Atom Burst

## Gesture Hooks

The first phase also maps existing gesture actions to powers:

- Throw: Vector Slash
- Scale: context power
- Pause: Time Freeze
- Inspect + Rotate + Scale chain: context combo power

## Next Three Phases

1. STEM Arena Combat
2. Boss Weak-Point Intelligence
3. AR/MR Spectacle Mode
