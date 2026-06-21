const STORAGE_KEY = 'astroObservationLog';

export function getObservations() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function saveObservation(entry) {
  const observations = getObservations();
  const item = { id: globalThis.crypto?.randomUUID?.() || String(Date.now()), timestamp: Date.now(), ...entry };
  observations.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(observations.slice(0, 50)));
  return item;
}

export function deleteObservation(id) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getObservations().filter(item => item.id !== id)));
}

export function clearObservations() {
  localStorage.removeItem(STORAGE_KEY);
}
