export function buildSkyDiagnostics(state, context = {}) {
  const performance = getPerformanceDiagnostics(context.rendererState);
  return {
    location: getLocationDiagnostics(state.observerLocation),
    sensor: getSensorDiagnostics({ mode: state.sensorMode, orientation: context.orientation }),
    ar: getARDiagnostics(state),
    performance,
    objectCount: context.objectCount || 0,
    starCount: context.starCount || 0,
    deepSkyCount: context.deepSkyCount || 0,
    constellationLineCount: context.constellationLineCount || 0,
    arLabelCount: context.arLabelCount || 0,
    cleanup: getCleanupDiagnostics(context.cleanupState),
    recommendation: getPerformanceRecommendation(performance.fps, state.performancePreset),
    lastEphemerisUpdate: new Date(state.lastUpdatedAt).toLocaleTimeString(),
  };
}

export function getSensorDiagnostics(sensorState = {}) {
  return {
    status: sensorState.mode || 'off',
    headingAvailable: Boolean(sensorState.orientation?.webkitCompassHeading || sensorState.orientation?.alpha != null),
  };
}

export function getLocationDiagnostics(locationState = {}) {
  return {
    source: locationState.source || 'unknown',
    latitudeRounded: Number(locationState.latitude?.toFixed?.(2) || 0),
    longitudeRounded: Number(locationState.longitude?.toFixed?.(2) || 0),
  };
}

export function getARDiagnostics(arState = {}) {
  return {
    arMode: arState.arMode || 'off',
    cameraOverlayActive: Boolean(arState.cameraOverlayActive),
    arSessionActive: Boolean(arState.arSessionActive),
    confidence: arState.arAlignmentConfidence || 'unknown',
  };
}

export function getPerformanceDiagnostics(rendererState = {}) {
  return {
    fps: rendererState.fps || 'unknown',
    labelDensity: rendererState.arLabelDensity || 'normal',
    updateRate: rendererState.arUpdateRate || 'balanced',
    preset: rendererState.performancePreset || 'balanced',
    cameraOverlayActive: Boolean(rendererState.cameraOverlayActive),
  };
}

export function getCleanupDiagnostics(cleanupState = {}) {
  return {
    activeIntervals: cleanupState.activeIntervals ?? 'unknown',
    activeEvents: cleanupState.activeEvents ?? 'unknown',
    overlayPresent: Boolean(cleanupState.overlayPresent),
  };
}

export function getPerformanceRecommendation(fps = 'unknown', preset = 'balanced') {
  if (typeof fps === 'number' && fps < 24) return 'Use Battery Saver on weak phones or when camera overlay feels choppy.';
  if (preset === 'battery-saver') return 'Battery Saver is active: best for low-end phones and long classroom sessions.';
  if (preset === 'high-quality') return 'High Quality is best for laptops, projectors, and short demos.';
  if (preset === 'classroom-display') return 'Classroom Display is tuned for teaching visibility from a distance.';
  return 'Balanced is recommended for normal mobile use.';
}
