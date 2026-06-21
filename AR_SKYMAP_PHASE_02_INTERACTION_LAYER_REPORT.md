# AR Sky Map Phase 2 - Better-than-SkyMap Interaction Layer

## 1. Phase Title

AR Sky Map Phase 2 - Better-than-SkyMap Interaction Layer

## 2. Summary

Phase 2 extends the Phase 1 real-sky engine with an interaction layer: live pointing identification, approximate object guidance, constellation overlays, visibility intelligence, rise/set summaries, time travel, sky highlights, richer object cards, calibration assistance, observation logging, and student/teacher learning prompts.

## 3. Files Created

- `src/astro/sky/constellationCatalog.js`
- `src/astro/sky/constellationRenderer.js`
- `src/astro/sky/skyGuidance.js`
- `src/astro/sky/skyVisibility.js`
- `src/astro/sky/riseSetEngine.js`
- `src/astro/sky/skyEvents.js`
- `src/astro/sky/skyObjectInfo.js`
- `src/astro/sky/skyCalibration.js`
- `src/astro/sky/skyObservationTools.js`
- `src/astro/sky/skyTutorials.js`

## 4. Files Modified

- `src/astro/submodules/ARSkyMap.js`
- `src/astro/sky/skyRenderer.js`
- `src/astro/sky/skySearch.js`
- `src/astro/sky/skyState.js`
- `src/astro/sky/skyTime.js`
- `src/astro/sky/skyMap.css`

## 5. What Am I Looking At Mode

Added live pointing state and UI. The map estimates the current pointing direction from phone sensors when active, otherwise from the manual Babylon camera view. It finds the nearest visible object and reports approximate altitude, azimuth, direction, angular distance, visibility note, and learning fact.

## 6. Object Lock And Guidance

Selected objects now support Lock Object, Guide Me, Center in View, and Show Path. Guidance text says whether to move left/right/up/down or whether the object is below the horizon. Guidance remains approximate and sensor-dependent.

## 7. Direction Helper

Added compass direction and look-direction helpers in `skyGuidance.js`, used by object info, highlights, pointing, and guidance.

## 8. Constellation Catalogue

Added 15 simplified educational constellations: Orion, Ursa Major, Ursa Minor, Cassiopeia, Scorpius, Taurus, Gemini, Leo, Cygnus, Lyra, Canis Major, Crux, Pegasus, Andromeda, and Sagittarius.

## 9. Constellation Renderer

Added a constellation renderer that draws local simplified line art between visible catalogue stars, supports highlighting selected constellations, and keeps lines subtle.

## 10. Visibility Intelligence

Added twilight-aware visibility grades: excellent, good, difficult, not-visible, requires-optical-aid, and unsafe-sun. Highlights can filter beginner targets, planets, stars, and high-in-sky targets.

## 11. Rise/Set/Transit Implementation

Added an educational one-hour sampled approximation for rise, set, and transit using RA/Dec and observer location. It is useful for learning but not precision planning.

## 12. Time Travel Controls

Added -1/+1 hour, -1/+1 day, play, pause, and speed controls. Time travel switches state to `time-travel` and throttles sky recalculation through existing refresh logic.

## 13. Sky Highlights

Added Sky Highlights Now cards for bright planets, Moon/planet nearness, close visible objects, and top visible objects.

## 14. Object Info Card Upgrades

Object cards now include richer planet, Moon, Sun, star, and constellation information with visibility, look direction, coordinates, brightness, distance, rise/set, student challenge, teacher note, and Sun safety warning.

## 15. Search UX Improvements

Search now includes constellations, richer aliases through major star names, and visible-first ranking. Results expose select and guide affordances.

## 16. Calibration Assistant

Added calibration assistant state and UI with north calibration, reset, reliability status, and clear sensor caveats.

## 17. Observation Tools

Added local-only observation logging with rounded location, selected object, date/time, altitude, azimuth, visibility grade, and user note. Storage key: `astroSkyObservations`.

## 18. Student/Tutor Layer

Added tutorial steps, misconception corrections, student challenges, and teacher prompts for object cards and help content.

## 19. Renderer Upgrades

Renderer now supports locked object highlight, guidance path marker, view reticle, live pointing marker, constellation lines, constellation highlight, label density support, and centering on selected objects.

## 20. Mobile UX Improvements

Phase 2 panels are collapsible and touch-friendly, with highlight cards, guidance cards, observation log, tutorial, calibration assistant, and night-mode-compatible styling.

## 21. Safety And Accuracy Notes

The UI preserves the required safety notes: educational sky map, approximate sensor alignment, sky-condition-dependent visibility, no direct Sun viewing, and not a professional navigation/telescope pointing tool.

## 22. Cleanup Improvements

Cleanup now includes new renderer resources, constellation resources, time animation, observation UI, sensor state, and existing Phase 1 cleanup paths. No duplicate render loops were added.

## 23. Known Limitations

- Phone pointing guidance is approximate and depends heavily on sensor quality.
- Constellation lines are simplified educational patterns.
- Rise/set/transit uses a one-hour sampled approximation.
- Sky visibility is estimated and depends on weather, light pollution, horizon obstruction, twilight, and eyesight.
- True camera-aligned AR remains a Phase 3 item.
- Vite still warns about the large main bundle.

## 24. Recommended Phase 3

- True AR camera overlay.
- Real camera permission flow.
- AR label anchoring.
- Object arrows over camera view.
- More accurate sensor fusion.
- Gyroscope/compass correction.
- Richer constellation tours.
- Meteor showers.
- Optional ISS/satellite support.
- Voice guidance.
- Offline cache and PWA improvements.

## 25. Build/Test Results

- `npm run build`: passed.
- `npm run lint`: not available.
- `npm test`: not available.
- `npm run typecheck`: not available.
