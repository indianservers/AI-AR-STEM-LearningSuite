// Phase 3 non-breaking gesture bridge.
// Planned mappings:
// Pinch: zoom telescope or solar-system camera.
// Swipe left/right: switch target or selected planet.
// Open palm: pause/play.
// Point: select object.
// Two-hand expand: scale model.
// Two-hand rotate: rotate galaxy or orbit view.

let activeContext = null;

export function enableAstroGestures(context) {
  activeContext = context;
  context?.astroScene?.showStatus?.('Astro gesture hooks enabled: pinch zoom, swipe target, open palm pause.');
}

export function disableAstroGestures() {
  activeContext = null;
}

export function handleAstroGesture(gesture, context = activeContext) {
  if (!context || !gesture) return false;
  if (gesture === 'openPalm') {
    context.setPaused?.(!context.isPaused?.());
    return true;
  }
  if (gesture === 'pinch') {
    context.zoomByGesture?.(1);
    return true;
  }
  if (gesture === 'swipeLeft' || gesture === 'swipeRight') {
    context.switchTargetByGesture?.(gesture === 'swipeRight' ? 1 : -1);
    return true;
  }
  return false;
}
