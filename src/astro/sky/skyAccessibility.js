const ACCESS_KEY = 'astroSkyAccessibility';

export const getDefaultAccessibilityPreferences = () => ({
  highContrast: false,
  largeText: false,
  reducedMotion: typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)').matches : false,
});

export function applyAccessibilityPreferences(preferences = {}) {
  const prefs = { ...getDefaultAccessibilityPreferences(), ...preferences };
  document.body.classList.toggle('astro-sky-high-contrast', prefs.highContrast);
  document.body.classList.toggle('astro-sky-large-text', prefs.largeText);
  document.body.classList.toggle('astro-sky-reduced-motion', prefs.reducedMotion);
  return prefs;
}

export function saveAccessibilityPreferences(preferences) {
  localStorage.setItem(ACCESS_KEY, JSON.stringify(preferences));
  return applyAccessibilityPreferences(preferences);
}

export function loadAccessibilityPreferences() {
  try { return { ...getDefaultAccessibilityPreferences(), ...JSON.parse(localStorage.getItem(ACCESS_KEY) || '{}') }; }
  catch { return getDefaultAccessibilityPreferences(); }
}

export function describeSkyObjectForScreenReader(object) {
  if (!object) return 'No sky object selected.';
  return `${object.name}, ${object.type || object.objectType}. ${object.visibilityExplanation || object.visibilityNote || ''}`;
}

export function describeGuidanceForScreenReader(guidance) {
  if (!guidance) return 'No guidance active.';
  return guidance.text || `${guidance.arrow || 'Move slowly'} toward the selected target.`;
}
