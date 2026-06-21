# Astro Phase 05 Production QA Report

## Scope

This report covers the Phase 5 production QA pass for CosmicLearn Astro Physics and AR Sky Map. The project currently has no Playwright, Vitest, Jest, or other test framework configured, so this phase adds a documented smoke-test checklist instead of introducing a new dependency stack.

## Automated Check Status

Available npm scripts:

- `npm run dev`
- `npm run build`
- `npm run preview`

Unavailable scripts:

- `npm run lint`
- `npm test`
- `npm run typecheck`

Build command run:

```bash
npm.cmd run build
```

Result:

- Passed.
- Astro submodules now produce separate lazy-loaded chunks.
- Vite still reports a large main chunk warning from the broader app/Babylon stack.

## Smoke Test Checklist

Use this checklist for each production candidate build.

### App And Navigation

- App opens without console-breaking errors.
- Home/subject hub shows Astro Physics.
- Astro Physics hub opens quickly.
- Teacher Lessons panel opens from the Astro hub.
- Each Astro submodule launches and returns without crashing:
  - Solar System Explorer
  - AR Sky Map
  - Telescope Simulator
  - Earth-Moon-Sun System
  - Galaxy & Deep Space
  - Astro Missions

### AR Sky Map Core

- AR Sky Map opens in non-AR demo mode.
- Search finds Jupiter, Moon, Venus, Sirius, Polaris, Orion, Pleiades, and Andromeda.
- Quick search buttons select expected targets.
- Search result actions work:
  - Select
  - Guide Me
  - Add to Plan
- Night mode toggles and remains readable.
- Teacher mode opens and closes.
- Spectacle mode opens and exits from Astro toolbar.

### Permission Fallbacks

- Location denied fallback does not crash.
- Sensor unavailable fallback does not crash.
- Camera overlay unsupported fallback does not crash.
- Voice command unsupported fallback shows text help.
- No location, camera, microphone, or sensor permission starts automatically.

### Planner, Logs, And Export

- Observation log saves selected object with a note.
- Observation log delete works.
- Observation planner Plan Tonight works.
- Add Selected Object works.
- Mark Observed works.
- Clear Plan works.
- Download Plan works offline.
- Download Session works without camera/audio data.
- Copy Summary includes date, rounded location, visibility, safety, and reflection prompt.

### Cleanup Smoke

Perform this loop twice:

1. Open AR Sky Map.
2. Enable Location or deny it.
3. Enable Sensors or deny them.
4. Start Camera Overlay or verify unsupported fallback.
5. Search Jupiter.
6. Start Guide.
7. Start a tour.
8. Exit AR.
9. Leave the submodule.
10. Return to AR Sky Map.

Expected:

- No duplicate AR overlays.
- Camera light turns off after exit.
- Voice guide and voice commands stop on cleanup.
- No duplicate sensor callbacks.
- No stuck geolocation watcher.
- No obvious console errors.

## Production QA Notes

- AR alignment remains approximate and depends on browser sensors.
- Weather, clouds, and live light pollution are not integrated.
- Deep-sky and meteor shower visibility are educational estimates.
- Rise/set is a sampled educational approximation.
- Final real-device QA should be performed before classroom use.
