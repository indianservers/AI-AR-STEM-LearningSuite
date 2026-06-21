const CACHE_KEY = 'astroSkyOfflinePreferences';

export function cacheSkyData(preferences = {}) {
  const payload = { ...preferences, cachedAt: new Date().toISOString(), catalogues: ['stars', 'deep-sky', 'meteor-showers', 'tours'] };
  localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  return payload;
}

export function getCachedSkyDataStatus() {
  try {
    const payload = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    return payload ? { ready: true, ...payload } : { ready: false };
  } catch {
    return { ready: false };
  }
}

export function clearSkyDataCache() { localStorage.removeItem(CACHE_KEY); return { ready: false }; }
export const isOfflineMode = () => typeof navigator !== 'undefined' && navigator.onLine === false;

export function getOfflineCapabilitySummary() {
  return {
    offline: isOfflineMode(),
    appShell: 'Service worker cache available when installed by browser.',
    catalogues: 'Bundled Sun, Moon, planets, stars, deep-sky objects, meteor showers, tours, and lessons.',
    note: 'Offline mode uses built-in catalogues, device time, and browser permissions. No live weather/cloud data.',
  };
}
