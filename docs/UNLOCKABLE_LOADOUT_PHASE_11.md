# Phase 11 - Unlockable Tools and Loadout

Phase 11 adds game-style unlockable tools on top of the XP and quest system.

## Implemented

- Added tool loadout state to `GameLayer`.
- Added unlockable tools:
  - Scanner Lens
  - Combo Stabilizer
  - Mission Booster
  - Path Compass
- Added unlock rules:
  - Scanner Lens unlocks after the Scanner quest.
  - Combo Stabilizer unlocks at Level 2.
  - Mission Booster unlocks after Mission Clear.
  - Path Compass unlocks after Lab Runner.
- Added equip logic:
  - Only one active tool at a time.
  - First available tool auto-equips if no tool is active.
  - Equipped tool persists in local storage.
- Added tool effects:
  - Scanner Lens grants extra inspect XP and tutor focus prompts.
  - Combo Stabilizer extends the combo timing window.
  - Mission Booster grants extra mission completion XP.
  - Path Compass grants extra path XP and tutor guidance.
- Added Loadout access:
  - Game HUD tab
  - Fist quick menu
  - Four-finger advanced controls
  - Voice commands: `loadout`, `tools`, `equipment`, `inventory`
  - Teacher command: `loadout`
- Added badge view in the game panel.

## UI

The game panel now has three tabs:

| Tab | Purpose |
| --- | --- |
| Quests | Active quest progress |
| Loadout | Unlock and equip tools |
| Badges | Earned badges and unlock markers |

## Architecture

The loadout system remains in `GameLayer`.

Tools modify reward and coaching behavior only. They do not mutate lab physics, object capabilities, or simulation parameters.

## Next Phase Hooks

This prepares the app for:

- Avatar cosmetics
- Tool-specific gesture abilities
- Class/team unlocks
- Seasonal rewards
- Multiplayer scoreboards
