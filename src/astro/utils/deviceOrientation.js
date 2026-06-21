let orientationHandler = null;

export function isDeviceOrientationSupported() {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

export async function requestDeviceOrientationAccess() {
  if (!isDeviceOrientationSupported()) {
    return { ok: false, message: 'Device orientation is unavailable. Use drag controls to explore the sky.' };
  }
  const eventType = window.DeviceOrientationEvent;
  if (typeof eventType.requestPermission === 'function') {
    try {
      const result = await eventType.requestPermission();
      return { ok: result === 'granted', message: result === 'granted' ? 'Device orientation available.' : 'Device orientation permission denied.' };
    } catch (_) {
      return { ok: false, message: 'Device orientation permission could not be requested.' };
    }
  }
  return { ok: true, message: 'Device orientation available.' };
}

export function startDeviceOrientationTracking(callback) {
  if (!isDeviceOrientationSupported()) {
    callback?.({ ok: false, message: 'Device orientation is unavailable. Use drag controls to explore the sky.' });
    return false;
  }
  stopDeviceOrientationTracking();
  orientationHandler = event => {
    callback?.({
      ok: true,
      alpha: event.alpha || 0,
      beta: event.beta || 0,
      gamma: event.gamma || 0,
      absolute: Boolean(event.absolute),
    });
  };
  window.addEventListener('deviceorientation', orientationHandler, true);
  return true;
}

export function stopDeviceOrientationTracking() {
  if (orientationHandler) window.removeEventListener('deviceorientation', orientationHandler, true);
  orientationHandler = null;
}
