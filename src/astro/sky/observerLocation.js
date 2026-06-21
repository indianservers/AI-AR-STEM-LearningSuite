import { SKY_CONFIG } from './skyConfig.js';

const STORAGE_KEY = 'astroSkyObserverLocation';
let watchId = null;

export const isLocationSupported = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

function normalizeLocation(coords, source = 'gps') {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy ?? null,
    altitude: coords.altitude ?? null,
    altitudeAccuracy: coords.altitudeAccuracy ?? null,
    heading: coords.heading ?? null,
    speed: coords.speed ?? null,
    timestamp: Date.now(),
    source,
    label: source === 'gps' ? 'GPS Location' : coords.label || 'Observer Location',
  };
}

export function requestObserverLocation(options = {}) {
  if (!isLocationSupported()) {
    return Promise.resolve({ ok: false, location: getSavedObserverLocation() || SKY_CONFIG.defaultLocation, message: 'This browser does not support geolocation.' });
  }
  if (typeof window !== 'undefined' && !window.isSecureContext && location.hostname !== 'localhost') {
    return Promise.resolve({ ok: false, location: getSavedObserverLocation() || SKY_CONFIG.defaultLocation, message: 'Location needs a secure browser context. Demo sky mode is active.' });
  }
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const location = normalizeLocation(pos.coords, 'gps');
        saveObserverLocation(location);
        resolve({ ok: true, location, message: 'GPS location acquired.' });
      },
      error => {
        const fallback = getSavedObserverLocation() || { ...SKY_CONFIG.defaultLocation, timestamp: Date.now() };
        const messages = {
          1: 'Location permission denied. Demo sky mode is active.',
          2: 'Location unavailable. Try again outdoors or enable device location.',
          3: 'Location request timed out. Demo sky mode is active.',
        };
        resolve({ ok: false, location: fallback, message: messages[error.code] || 'Location is required to align the real sky.' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000, ...options },
    );
  });
}

export function getSavedObserverLocation() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved ? { ...saved, source: saved.source || 'saved', label: saved.label || 'Saved Location' } : null;
  } catch {
    return null;
  }
}

export function saveObserverLocation(location) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(location)); } catch (_) {}
}

export function clearSavedObserverLocation() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

export function watchObserverLocation(callback, options = {}) {
  stopWatchingObserverLocation();
  if (!isLocationSupported()) return null;
  watchId = navigator.geolocation.watchPosition(
    pos => callback({ ok: true, location: normalizeLocation(pos.coords, 'gps'), message: 'GPS location updated.' }),
    error => callback({ ok: false, location: getSavedObserverLocation() || SKY_CONFIG.defaultLocation, message: error.message || 'Location unavailable.' }),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000, ...options },
  );
  return watchId;
}

export function stopWatchingObserverLocation() {
  if (watchId !== null && isLocationSupported()) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

export function createLocationStatusMessage(locationState) {
  if (!locationState) return 'Location is required to align the real sky.';
  if (locationState.source === 'gps') return `Location active near ${locationState.latitude.toFixed(2)} deg, ${locationState.longitude.toFixed(2)} deg.`;
  if (locationState.source === 'saved') return 'Using saved approximate location.';
  return 'Using demo location.';
}
