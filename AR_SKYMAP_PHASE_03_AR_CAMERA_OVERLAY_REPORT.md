# AR Sky Map Phase 03 - AR Camera Overlay Report

## Scope

Completed Phase 3 for the existing CosmicLearn / AI-AR-STEM-LearningSuite AR Sky Map without rewriting Phase 1 real-sky calculations or Phase 2 interaction features.

This phase adds an AR-facing experience layer on top of the existing sky engine:

- WebXR AR session detection and startup where the browser/device supports `immersive-ar`.
- Camera overlay fallback using `getUserMedia` for devices without WebXR AR.
- Screen-space AR labels for planets, stars, the Moon, and the Sun.
- AR guidance card with direction, centered, and below-horizon states.
- Alignment confidence warnings based on sensor, calibration, and location state.
- Guided planetarium tours.
- Voice-friendly guide narration using browser speech synthesis when enabled.
- Teacher Sky Mode with classroom prompts, misconception cards, and simplified discussion labels.
- Local text-only learning session recorder.
- Diagnostics panel for sensors, location, AR mode, object count, and update rate.
- Cleanup for camera streams, WebXR sessions, voice playback, tour state, timers, and overlay DOM.

## Files Added

- `src/astro/sky/arSkyOverlay.js`
- `src/astro/sky/cameraOverlayFallback.js`
- `src/astro/sky/arAlignment.js`
- `src/astro/sky/arLabelRenderer.js`
- `src/astro/sky/arGuidanceRenderer.js`
- `src/astro/sky/skyTours.js`
- `src/astro/sky/skyVoiceGuide.js`
- `src/astro/sky/teacherSkyMode.js`
- `src/astro/sky/skySessionRecorder.js`
- `src/astro/sky/skyDiagnostics.js`

## Files Updated

- `src/astro/submodules/ARSkyMap.js`
  - Added Phase 3 UI sections for AR Camera Overlay, guided tours, voice/teacher/session controls, and diagnostics.
  - Wired WebXR AR startup, camera fallback startup, AR exit, label updates, guidance updates, tour controls, voice output, teacher mode, and local session recording.
  - Added event hooks for location, sensors, selected objects, guided objects, time travel, constellations, observations, and tours.
  - Added cleanup for AR sessions, camera streams, timers, speech synthesis, labels, guidance, and overlay DOM.

- `src/astro/sky/skyState.js`
  - Added AR mode, camera overlay, AR session, label density, update rate, voice guide, teacher mode, tour, session, diagnostics, permission, and manual offset state fields.

- `src/astro/sky/skyCalibration.js`
  - Added known-object calibration and manual overlay offset helpers.

- `src/astro/sky/deviceSensors.js`
  - Added orientation jitter estimation helper.

- `src/astro/sky/skyTutorials.js`
  - Added AR sky tutorial steps and alignment explanation.

- `src/astro/sky/skyMap.css`
  - Added camera overlay video, AR label layer, tappable object labels, AR guidance card, AR status bar, exit button, Sun warning, and mobile-safe overlay rules.

## User Experience

The AR Sky Map panel now includes:

- **Start AR Sky** for WebXR AR-capable browsers.
- **Camera Overlay** for camera-backed fallback mode.
- **Exit AR** and **Normal Sky Map** controls.
- Label density options: `minimal`, `normal`, `detailed`.
- Update rate options: `battery-saver`, `balanced`, `smooth`.
- Guided tour selection and step controls.
- Voice Guide toggle.
- Teacher Sky Mode toggle.
- Local Learning Session start/end controls.
- Diagnostics refresh panel.

In overlay mode, visible objects are projected into screen space using altitude/azimuth plus the current alignment model. Labels are tappable and synchronize with the existing object information and guidance panels.

## Safety And Privacy

- The Sun warning is shown in AR overlay mode when the Sun is above the horizon.
- The app continues to state that sensor alignment is approximate and not suitable for navigation or telescope pointing.
- Camera overlay uses a live local camera stream only.
- Learning sessions store text-only events in local storage.
- No video, audio, images, or camera frames are recorded or uploaded by the Phase 3 session recorder.

## Limitations

- WebXR AR support depends on the browser, OS, HTTPS context, and device hardware.
- Camera Overlay fallback is educational and approximate because it does not provide true world tracking.
- Device orientation sensors can drift or be unavailable on desktop browsers.
- Indoor use, magnetic interference, denied permissions, and poor calibration can reduce alignment confidence.
- The AR labels are screen-space overlays, not physically anchored world meshes in fallback mode.

## Verification

Ran:

```bash
npm.cmd run build
```

Result:

- Build passed.
- Vite still reports the existing large bundle warning for the main chunk.

No lint, test, or typecheck scripts are currently defined in `package.json`.
