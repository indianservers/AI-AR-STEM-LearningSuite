export function createCalibrationState() {
  return { active: false, headingOffsetDeg: 0, reliability: 'unknown', samples: [] };
}

export function startCalibrationFlow() {
  return { ...createCalibrationState(), active: true, step: 1 };
}

export function calibrateNorthFromCurrentHeading(currentOrientation) {
  const heading = currentOrientation?.webkitCompassHeading ?? (360 - (currentOrientation?.alpha || 0));
  return { headingOffsetDeg: -heading, calibratedAt: Date.now() };
}

export function estimateSensorReliability(orientationSamples = []) {
  if (orientationSamples.length < 3) return 'unknown';
  const headings = orientationSamples.map(sample => sample.webkitCompassHeading ?? sample.alpha ?? 0);
  const spread = Math.max(...headings) - Math.min(...headings);
  if (spread < 8) return 'good';
  if (spread < 22) return 'fair';
  return 'poor';
}

export function getCalibrationInstructions(sensorState) {
  if (sensorState?.mode !== 'active') return 'Enable phone sensors first. You can still drag the sky manually.';
  return 'Hold phone flat, point toward North if known, tap Calibrate North, then move slowly. Compass may be inaccurate near metal or electronics.';
}

export function resetCalibration() {
  return createCalibrationState();
}

export function calibrateUsingKnownObject(selectedObject, screenPosition, viewport) {
  if (!selectedObject || !screenPosition || !viewport) return { x: 0, y: 0 };
  return {
    x: viewport.width / 2 - screenPosition.x,
    y: viewport.height / 2 - screenPosition.y,
    objectId: selectedObject.id,
    note: 'Manual calibration adjusts the overlay for your device. It does not improve real astronomical accuracy.',
  };
}

export function applyManualOverlayOffset(offset) {
  return { x: offset?.x || 0, y: offset?.y || 0 };
}

export function resetManualOverlayOffset() {
  return { x: 0, y: 0 };
}
