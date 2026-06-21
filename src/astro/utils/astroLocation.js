const STORAGE_KEY = 'cosmiclearn_astro_location';
let lastKnown = null;
let watchId = null;

function savedLocation() {
  if (lastKnown) return lastKnown;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed?.latitude != null && parsed?.longitude != null) {
      lastKnown = parsed;
      return parsed;
    }
  } catch (_) {}
  return null;
}

function storeLocation(position) {
  lastKnown = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp || Date.now(),
    message: 'Location available for approximate real-sky alignment.',
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lastKnown)); } catch (_) {}
  return lastKnown;
}

export function requestObserverLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve({ ok: false, message: 'Location is needed to align the real sky, but geolocation is unavailable.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve({ ok: true, location: storeLocation(position), message: 'Location available for approximate real-sky alignment.' }),
      () => resolve({ ok: false, location: savedLocation(), message: savedLocation() ? 'Using approximate saved location.' : 'Location permission denied. Showing demo sky.' }),
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 1000 * 60 * 20 }
    );
  });
}

export function getLastKnownObserverLocation() {
  const loc = savedLocation();
  return loc ? { ...loc, message: 'Using approximate saved location.' } : null;
}

export function watchObserverLocation(callback) {
  if (!navigator.geolocation) {
    callback?.({ ok: false, message: 'Location is needed to align the real sky, but geolocation is unavailable.' });
    return null;
  }
  stopWatchingObserverLocation();
  watchId = navigator.geolocation.watchPosition(
    position => callback?.({ ok: true, location: storeLocation(position), message: 'Location updated.' }),
    () => callback?.({ ok: false, location: savedLocation(), message: 'Location permission denied. Showing demo sky.' }),
    { enableHighAccuracy: false, maximumAge: 1000 * 60 * 10 }
  );
  return watchId;
}

export function stopWatchingObserverLocation() {
  if (watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}
