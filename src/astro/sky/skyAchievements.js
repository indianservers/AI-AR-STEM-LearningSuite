const ACH_KEY = 'astroSkyAchievements';
const PROGRESS_KEY = 'astroSkyLearningProgress';

export const SKY_ACHIEVEMENTS = [
  'first-sky-view', 'location-enabled', 'sensors-enabled', 'found-jupiter', 'found-moon', 'found-venus',
  'found-polaris', 'found-orion', 'first-constellation', 'first-deep-sky-object', 'first-observation-logged',
  'first-observation-plan', 'time-traveler', 'meteor-shower-explorer', 'teacher-demo-completed', 'ar-explorer',
].map(id => ({ id, title: id.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ') }));

const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export function getSkyAchievements() {
  const unlocked = readJson(ACH_KEY, {});
  return SKY_ACHIEVEMENTS.map(item => ({ ...item, unlocked: Boolean(unlocked[item.id]), unlockedAt: unlocked[item.id] || null }));
}

export function unlockSkyAchievement(id, context = {}) {
  const unlocked = readJson(ACH_KEY, {});
  if (!unlocked[id]) unlocked[id] = new Date().toISOString();
  writeJson(ACH_KEY, unlocked);
  recordSkyLearningAction({ type: 'achievement', id, context });
  return getSkyAchievements();
}

export function recordSkyLearningAction(action) {
  const progress = readJson(PROGRESS_KEY, { actions: [], counts: {} });
  const type = typeof action === 'string' ? action : action.type;
  progress.actions.unshift({ ...(typeof action === 'string' ? { type } : action), at: new Date().toISOString() });
  progress.counts[type] = (progress.counts[type] || 0) + 1;
  writeJson(PROGRESS_KEY, { actions: progress.actions.slice(0, 80), counts: progress.counts });
  return progress;
}

export const getSkyLearningProgress = () => readJson(PROGRESS_KEY, { actions: [], counts: {} });
export function resetSkyLearningProgress() { writeJson(PROGRESS_KEY, { actions: [], counts: {} }); writeJson(ACH_KEY, {}); }
