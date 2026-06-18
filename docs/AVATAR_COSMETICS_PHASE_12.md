# Phase 12 - Avatar Progression and Cosmetics

Phase 12 adds visible player identity to the game layer.

## Implemented

- Added avatar state to `GameLayer`:
  - Active theme
  - Active title
  - Active trail
- Added Avatar tab to the game panel.
- Added cosmetic categories:
  - Themes
  - Titles
  - Trails
- Added default cosmetics:
  - Theme: Nova Blue
  - Title: Explorer
  - Trail: No Trail
- Added unlockable cosmetics:
  - Gold Runner theme
  - Chem Green theme
  - Ember Physics theme
  - Scanner title
  - Combo Pilot title
  - Mission Captain title
  - Spark Trail
  - Combo Trail
  - Mastery Trail
- Game HUD now reflects active avatar title and theme color.
- Added Avatar access through:
  - Game HUD panel
  - Fist quick menu
  - Four-finger Advanced Controls
  - Voice commands: `avatar`, `cosmetic`, `cosmetics`, `profile`
  - Teacher command: `avatar`

## Unlock Rules

| Cosmetic | Unlock |
| --- | --- |
| Gold Runner | Reach Level 2 |
| Chem Green | Enter 3 different labs |
| Ember Physics | Complete Mission Clear |
| Scanner | Complete Scanner quest |
| Combo Pilot | Complete Gesture Combo quest |
| Mission Captain | Complete Mission Clear |
| Spark Trail | Reach Level 2 |
| Combo Trail | Best combo 5 |
| Mastery Trail | Complete 3 missions |

## Architecture

Cosmetics are stored in the existing `cosmiclearn_game_state` local storage object.

Avatar cosmetics affect presentation only:

- HUD label
- HUD accent color
- Avatar panel preview

They do not change learning scores, lab physics, or gesture recognition.

## Next Phase Hooks

This prepares the app for:

- Avatar 3D companion
- Tool-specific visual effects
- Multiplayer identity cards
- Team colors
- Seasonal unlock tracks
