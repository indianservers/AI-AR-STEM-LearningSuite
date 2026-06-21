# Astro Real Device QA Checklist

## Android Chrome

### Permissions

- Location Allow: sky aligns to approximate rounded location.
- Location Deny: demo/saved location fallback appears.
- Sensors Allow: phone pointing works and says alignment is approximate.
- Sensors Deny: drag/touch fallback remains usable.
- Camera Allow: camera overlay starts only after tap.
- Camera Deny: safe fallback message appears.
- Microphone Allow: voice commands start only after Enable Voice Commands.
- Microphone Deny: text help remains available.

### AR And Camera Overlay

- Start Camera Overlay.
- Exit overlay.
- Rotate phone portrait/landscape.
- Search Jupiter or Moon.
- Guide selected object.
- Confirm Exit AR button is always visible.
- Confirm Sun warning appears when Sun is above horizon.

### Cleanup

- Camera light turns off after Exit AR.
- No stuck microphone or speech.
- No duplicate overlays after three enter/exit cycles.
- No continuous battery-draining loop after leaving Astro.

### Mobile UX

- Buttons are touch-friendly.
- Panels scroll vertically without horizontal overflow.
- Search is usable with keyboard open.
- Bottom panels do not permanently cover all content.
- Night mode remains readable.

## iPhone Safari

- Location permission allow/deny works.
- iOS sensor permission prompt appears only after Enable Sensors.
- Sensor denial falls back to drag controls.
- Camera overlay permission allow/deny works.
- Voice command unsupported or permission-denied state is handled.
- AR labels remain tappable.
- Exit AR remains reachable with safe-area insets.
- Reduced-motion preference slows/removes cinematic effects.

## Desktop Chrome

- Astro Physics hub opens.
- Teacher Lessons panel opens.
- All Astro submodules lazy-load on launch.
- AR Sky Map works in demo/non-AR mode.
- Search finds Jupiter, Moon, Venus, Sirius, Polaris, Orion, Pleiades, and Andromeda.
- Keyboard shortcuts work:
  - `/` focuses search
  - `Esc` exits AR/guide
  - `N` toggles night mode
  - `G` starts guide
  - `L` toggles labels
  - `T` focuses time input
- Camera unsupported or denied fallback is safe.
- Clipboard/share fallback works.

## Classroom Projector Mode

- High Quality or Classroom Display preset is readable from distance.
- Teacher prompts are readable.
- Spectacle mode opens and exits.
- Planetarium captions are readable.
- Large Text accessibility mode does not break layout.
- High Contrast mode remains readable.
- Reduced Motion mode avoids distracting animation.

## Final Sign-Off

- No permission starts automatically.
- No camera or microphone remains active after leaving Astro.
- No duplicate panels after repeated entry/exit.
- No console-breaking errors during normal classroom flow.
- Safety notes are visible but not overwhelming.
