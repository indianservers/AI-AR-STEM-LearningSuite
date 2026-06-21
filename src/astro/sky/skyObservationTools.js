const STORAGE_KEY = 'astroSkyObservations';

export function saveSkyObservation(entry) {
  const observations = getSkyObservations();
  const item = { id: globalThis.crypto?.randomUUID?.() || String(Date.now()), ...entry };
  observations.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(observations.slice(0, 50)));
  return item;
}

export function getSkyObservations() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function deleteSkyObservation(id) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getSkyObservations().filter(item => item.id !== id)));
}

export function clearSkyObservations() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createObservationEntry(object, context = {}, userNote = '') {
  return {
    objectId: object.id,
    objectName: object.name,
    objectType: object.type,
    dateTime: context.currentDateTime?.toISOString?.() || new Date().toISOString(),
    latitudeRounded: Number(context.observerLocation?.latitude?.toFixed?.(2) ?? 0),
    longitudeRounded: Number(context.observerLocation?.longitude?.toFixed?.(2) ?? 0),
    altitudeDeg: object.altitudeDeg == null ? null : Number(object.altitudeDeg.toFixed(1)),
    azimuthDeg: object.azimuthDeg == null ? null : Number(object.azimuthDeg.toFixed(1)),
    visibilityGrade: object.visibilityGrade || 'unknown',
    userNote,
  };
}
