import { normalizeDegrees } from './celestialMath.js';

export function createAlignmentModel() {
  return { headingDeg: 0, pitchDeg: 45, rollDeg: 0, headingOffsetDeg: 0, manualOffsetX: 0, manualOffsetY: 0 };
}

export function updateAlignmentFromSensor(alignment, orientation) {
  if (!orientation) return alignment;
  const headingDeg = orientation.webkitCompassHeading ?? (360 - (orientation.alpha || 0));
  return {
    ...alignment,
    headingDeg: normalizeDegrees(headingDeg),
    pitchDeg: Math.max(-20, Math.min(90, 90 - Math.abs(orientation.beta || 45))),
    rollDeg: orientation.gamma || 0,
  };
}

export function updateAlignmentFromCalibration(alignment, calibration = {}) {
  return { ...alignment, headingOffsetDeg: calibration.headingOffsetDeg || 0 };
}

export function skyAltAzToScreenPosition(altDeg, azDeg, cameraState = {}, viewport = { width: innerWidth, height: innerHeight }) {
  const heading = normalizeDegrees((cameraState.headingDeg || 0) + (cameraState.headingOffsetDeg || 0));
  const azDelta = ((azDeg - heading + 540) % 360) - 180;
  const altDelta = altDeg - (cameraState.pitchDeg ?? 35);
  const fovX = 70;
  const fovY = 58;
  return {
    x: viewport.width / 2 + (azDelta / fovX) * viewport.width + (cameraState.manualOffsetX || 0),
    y: viewport.height / 2 - (altDelta / fovY) * viewport.height + (cameraState.manualOffsetY || 0),
    inView: Math.abs(azDelta) < fovX / 2 && Math.abs(altDelta) < fovY / 2,
    azDelta,
    altDelta,
  };
}

export function skyAltAzToARRotation(altDeg, azDeg, alignment) {
  return { yawDeg: normalizeDegrees(azDeg - (alignment.headingOffsetDeg || 0)), pitchDeg: altDeg };
}

export function estimateAlignmentConfidence(sensorState = {}, calibrationState = {}, locationState = {}) {
  if (locationState?.source === 'default') return 'fair';
  if (sensorState?.mode !== 'active') return 'unknown';
  if (calibrationState?.reliability === 'poor') return 'poor';
  if (calibrationState?.reliability === 'good') return 'good';
  return calibrationState?.headingOffsetDeg ? 'good' : 'fair';
}

export function getAlignmentWarning(confidence) {
  const warnings = {
    excellent: 'Alignment looks strong, but still approximate.',
    good: 'Move phone slowly for better alignment.',
    fair: 'Calibration may be needed. Try Calibrate North.',
    poor: 'Compass accuracy appears poor. Avoid metal objects and electronics.',
    unknown: 'Sensor unavailable. Drag sky manually.',
  };
  return warnings[confidence] || warnings.unknown;
}

export function findObjectNearScreenPoint(x, y, projectedObjects, thresholdPx = 44) {
  return projectedObjects
    .map(item => ({ ...item, distancePx: Math.hypot(item.x - x, item.y - y) }))
    .filter(item => item.distancePx <= thresholdPx)
    .sort((a, b) => a.distancePx - b.distancePx)[0] || null;
}
