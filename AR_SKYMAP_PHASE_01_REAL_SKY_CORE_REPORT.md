# AR Sky Map Phase 1 - Real Sky Core Engine

## 1. Phase Title

AR Sky Map Phase 1 - Real Sky Core Engine

## 2. Summary

AR Sky Map was upgraded from a demo star-map view into a real-sky foundation that uses observer location, date/time, local ephemeris calculations, a larger naked-eye star catalogue, local search, sensor-aware camera alignment, and a Babylon.js renderer on the existing shared scene.

## 3. Files Created

- `src/astro/sky/skyConfig.js`
- `src/astro/sky/celestialMath.js`
- `src/astro/sky/observerLocation.js`
- `src/astro/sky/deviceSensors.js`
- `src/astro/sky/ephemerisEngine.js`
- `src/astro/sky/starCatalogNakedEye.js`
- `src/astro/sky/skyProjection.js`
- `src/astro/sky/skyState.js`
- `src/astro/sky/skyRenderer.js`
- `src/astro/sky/skySearch.js`
- `src/astro/sky/skyTime.js`
- `src/astro/sky/skyPermissions.js`
- `src/astro/sky/skyCleanup.js`
- `src/astro/sky/skyMap.css`

## 4. Files Modified

- `package.json`
- `package-lock.json`
- `src/astro/submodules/ARSkyMap.js`

## 5. Dependency Added

- `astronomy-engine`
- Reason: local browser/Node-capable calculations for Sun, Moon, planets, lunar phase/illumination, and observer-based sky position.
- Build status: passed.
- Limitation noticed: the package is strict about date input across JS realms, so the wrapper normalizes dates through numeric UTC Julian date and `Astronomy.MakeTime()`.

## 6. Astronomy Calculation Approach

The app now uses `Astronomy.Observer`, `Astronomy.Equator`, `Astronomy.Horizon`, `Astronomy.Illumination`, and `Astronomy.MoonPhase`. Results are normalized into a common object model with altitude, azimuth, RA, Dec, distance, magnitude, illumination, visibility, and Babylon cartesian position.

## 7. Location Permission Flow

Location is requested only when the user clicks `Enable Location`. Last known location is stored in `astroSkyObserverLocation`; if permission is denied or unavailable, the app falls back to the configured demo location and labels it honestly.

## 8. Device Sensor Flow

Sensors are requested only when the user clicks `Enable Phone Sensors`. iOS `DeviceOrientationEvent.requestPermission()` is supported when present. Sensor events rotate the camera only; sky object positions are recalculated on the ephemeris interval, not every sensor event.

## 9. Sky Rendering Approach

`skyRenderer.js` renders a dark sky dome, horizon ring, North/East/South/West labels, Zenith label, stars, Sun, Moon, planets, labels, Saturn ring marker, Jupiter emphasis, and selected-object highlight. It uses the existing shared Babylon scene and no duplicate render loop.

## 10. Star Catalogue Summary

The existing educational catalogue is reused and extended to 80+ bright stars in `starCatalogNakedEye.js`. Coordinates and magnitudes are approximate and explicitly documented as educational, not navigation-grade.

## 11. Search Implementation

Local search indexes Sun, Moon, all planets, and naked-eye stars. It supports partial case-insensitive matching and prioritizes exact matches, visible objects, and key targets such as Jupiter.

## 12. Mobile UX Implementation

The AR Sky panel is responsive, touch-friendly, and works as a bottom sheet on small screens. It includes permission cards, status badges, search, toggles, date/time picker, magnitude slider, selected-object details, and night mode.

## 13. AR Overlay Status

`startARSkyOverlay()` checks WebXR immersive AR support and shows a safe Phase 1 message. It does not force camera permission and does not make AR the primary path yet.

## 14. Accuracy Limitations

This is an educational sky map. Sensor alignment is approximate. Visibility depends on clouds, light pollution, horizon obstruction, twilight, and eyesight. It is not for navigation or scientific telescope pointing.

## 15. Safety Notes

The UI and Sun object include: never look directly at the real Sun, especially through binoculars or telescopes.

## 16. Cleanup / Memory Handling

`skyCleanup.js` handles meshes, materials, textures, listeners, intervals, timeouts, subscriptions, and sensor/location watchers. `ARSkyMap.hide()` stops clocks, sensors, watchers, disposes the renderer, removes DOM, and cleans the shared Astro scene.

## 17. Known Issues

- Vite still warns that the main bundle is larger than 500 kB.
- Browser/device sensor heading quality varies widely.
- True camera-aligned AR labels are reserved for later phases.
- Rise/set times and twilight classification are not implemented in Phase 1.
- `npm install` reported 2 audit vulnerabilities; no force upgrade was run to avoid unrelated dependency churn.

## 18. Recommended Phase 2

- True constellation overlays.
- Object lock and arrow guidance.
- Rise/set times.
- Twilight calculation.
- Guided tours.
- "What am I looking at?" mode.
- Better AR camera overlay.
- Sensor calibration improvements.
- Observation planner.

## 19. Build / Test Results

- `npm run build`: passed.
- `npm run lint`: not available in `package.json`.
- `npm test`: not available in `package.json`.
- `npm run typecheck`: not available in `package.json`.
- Ephemeris smoke test: Sun, Moon, and Jupiter returned valid altitude/azimuth values for the demo location.
