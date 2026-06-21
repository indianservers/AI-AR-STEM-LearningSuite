export function estimateTwilightState(sunAltitudeDeg) {
  if (sunAltitudeDeg > 0) return 'daylight';
  if (sunAltitudeDeg > -6) return 'civil-twilight';
  if (sunAltitudeDeg > -12) return 'nautical-twilight';
  if (sunAltitudeDeg > -18) return 'astronomical-twilight';
  return 'dark';
}

export function estimateSkyCondition(date, observerLocation, solarObjects) {
  const sun = solarObjects.find(object => object.type === 'sun');
  const moon = solarObjects.find(object => object.type === 'moon');
  return {
    twilightState: estimateTwilightState(sun?.altitudeDeg ?? -20),
    sunAltitudeDeg: sun?.altitudeDeg ?? -20,
    moonIlluminationPercent: moon?.illuminationPercent ?? 0,
  };
}

export function isObjectLikelyVisible(object, context) {
  return getVisibilityGrade(object, context) !== 'not-visible';
}

export function getVisibilityGrade(object, context = {}) {
  if (object.type === 'sun') return object.isAboveHorizon ? 'unsafe-sun' : 'not-visible';
  if (!object.isAboveHorizon) return 'not-visible';
  if (object.name === 'Neptune' || object.name === 'Uranus') return 'requires-optical-aid';
  if ((object.apparentMagnitude ?? 8) > (context.magnitudeLimit ?? 6)) return 'difficult';
  if (context.twilightState === 'daylight' && object.type !== 'moon') return 'difficult';
  if (object.altitudeDeg > 25 && (object.apparentMagnitude ?? 6) <= 1.5) return 'excellent';
  if (object.altitudeDeg > 10) return 'good';
  return 'difficult';
}

export function getVisibilityExplanation(object, context = {}) {
  const grade = getVisibilityGrade(object, context);
  const text = {
    excellent: 'Excellent naked-eye target under good sky conditions.',
    good: 'Good naked-eye target if the sky is clear.',
    difficult: 'Possible but difficult because of altitude, brightness, twilight, or sky conditions.',
    'not-visible': 'Below the horizon from your current location.',
    'requires-optical-aid': 'Usually requires binoculars or a telescope.',
    'unsafe-sun': 'Visible but unsafe to look at directly.',
  };
  if (object.name === 'Mercury') return 'Often difficult because it stays near the Sun.';
  return text[grade] || object.visibilityExplanation;
}

export function sortVisibleHighlights(objects, context = {}) {
  const gradeWeight = { excellent: 5, good: 4, difficult: 2, 'requires-optical-aid': 1, 'unsafe-sun': 0, 'not-visible': -1 };
  return objects
    .filter(object => object.isAboveHorizon && object.type !== 'sun')
    .map(object => ({ ...object, visibilityGrade: getVisibilityGrade(object, context), visibilityExplanation: getVisibilityExplanation(object, context) }))
    .sort((a, b) => (gradeWeight[b.visibilityGrade] - gradeWeight[a.visibilityGrade]) || ((a.apparentMagnitude ?? 6) - (b.apparentMagnitude ?? 6)));
}
