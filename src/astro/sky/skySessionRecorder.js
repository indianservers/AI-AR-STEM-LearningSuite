const STORAGE_KEY = 'astroSkyLearningSessions';
let session = null;

export function startSkySessionRecording() {
  session = { id: globalThis.crypto?.randomUUID?.() || String(Date.now()), startedAt: Date.now(), events: [] };
  return session;
}

export function recordSkySessionEvent(event) {
  if (!session) return null;
  session.events.push({ timestamp: Date.now(), ...event });
  return session;
}

export function stopSkySessionRecording() {
  if (!session) return null;
  const summary = getSkySessionSummary();
  saveSkySessionSummary(summary);
  session = null;
  return summary;
}

export function getSkySessionSummary() {
  if (!session) return null;
  const objectsViewed = [...new Set(session.events.filter(e => e.type === 'object-selected').map(e => e.objectName))];
  const toursCompleted = session.events.filter(e => e.type === 'tour-completed').map(e => e.tourId);
  const observationsLogged = session.events.filter(e => e.type === 'observation-logged').length;
  const conceptsTouched = [...new Set(session.events.map(e => e.concept).filter(Boolean))];
  return {
    id: session.id,
    startedAt: new Date(session.startedAt).toISOString(),
    endedAt: new Date().toISOString(),
    durationSeconds: Math.round((Date.now() - session.startedAt) / 1000),
    objectsViewed,
    toursCompleted,
    observationsLogged,
    conceptsTouched,
    notes: 'Local text-only learning session. No video recorded.',
  };
}

export function saveSkySessionSummary(summary) {
  if (!summary) return;
  const sessions = getSavedSkySessions();
  sessions.unshift(summary);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 20)));
}

export function getSavedSkySessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function clearSavedSkySessions() {
  localStorage.removeItem(STORAGE_KEY);
}
