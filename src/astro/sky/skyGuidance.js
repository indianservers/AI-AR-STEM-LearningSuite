import { Vector3 } from '@babylonjs/core';
import { angularSeparation, normalizeDegrees, radToDeg } from './celestialMath.js';

export function azimuthToCompassDirection(azimuthDeg) {
  const dirs = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  return dirs[Math.round(normalizeDegrees(azimuthDeg) / 45) % 8];
}

export function azimuthToCompassDirectionDetailed(azimuthDeg) {
  const dirs = ['North', 'North-North-East', 'North-East', 'East-North-East', 'East', 'East-South-East', 'South-East', 'South-South-East', 'South', 'South-South-West', 'South-West', 'West-South-West', 'West', 'West-North-West', 'North-West', 'North-North-West'];
  return dirs[Math.round(normalizeDegrees(azimuthDeg) / 22.5) % 16];
}

export function formatLookDirection(altDeg, azDeg) {
  if (altDeg < 0) return 'Below the horizon.';
  const direction = azimuthToCompassDirection(azDeg).toLowerCase();
  if (altDeg > 65) return `Look high in the ${direction} sky.`;
  if (altDeg < 15) return `Look low toward the ${direction} horizon.`;
  return `Look ${Math.round(altDeg)} deg above the ${direction} horizon.`;
}

export function getPointedSkyDirection(camera, sensorState = {}, manualViewState = {}) {
  if (sensorState.orientation) {
    const altDeg = Math.max(-10, Math.min(90, 90 - Math.abs(sensorState.orientation.beta || 45)));
    const azDeg = normalizeDegrees(sensorState.orientation.webkitCompassHeading ?? (360 - (sensorState.orientation.alpha || 0)));
    return { altitudeDeg: altDeg, azimuthDeg: azDeg, source: 'sensor' };
  }
  if (manualViewState.altitudeDeg != null && manualViewState.azimuthDeg != null) return { ...manualViewState, source: 'manual' };
  if (!camera) return { altitudeDeg: 45, azimuthDeg: 180, source: 'fallback' };
  return {
    altitudeDeg: Math.max(-5, Math.min(90, 90 - radToDeg(camera.beta || Math.PI / 2))),
    azimuthDeg: normalizeDegrees(radToDeg(camera.alpha || 0)),
    source: 'camera',
  };
}

export function findNearestVisibleObject(pointingAltDeg, pointingAzDeg, skyObjects, options = {}) {
  const radiusDeg = options.radiusDeg ?? 12;
  const candidates = skyObjects
    .filter(object => object.isAboveHorizon && object.type !== 'sun')
    .map(object => ({
      object,
      distanceDeg: angularSeparation(pointingAltDeg, pointingAzDeg, object.altitudeDeg, object.azimuthDeg),
    }))
    .sort((a, b) => a.distanceDeg - b.distanceDeg);
  const nearest = candidates[0];
  if (!nearest) return null;
  if (nearest.distanceDeg <= radiusDeg) return nearest;
  const bright = candidates.find(item => (item.object.apparentMagnitude ?? 6) <= 1.5);
  return bright ? { ...bright, outsideRadius: true } : null;
}

export function getPointingSummary(nearestObject, pointingDirection) {
  if (!nearestObject) return 'No bright object near this direction.';
  return `You are looking near: ${nearestObject.object.name} (${Math.round(nearestObject.distanceDeg)} deg away, ${azimuthToCompassDirection(pointingDirection.azimuthDeg)}).`;
}

export function formatPointingInstruction(object) {
  if (!object) return 'Move slowly and scan the sky.';
  return formatLookDirection(object.altitudeDeg, object.azimuthDeg);
}

export function formatPointingAccuracyNote(sensorState) {
  if (sensorState?.mode === 'active') return 'Phone compass accuracy varies. Move slowly and calibrate if needed.';
  return 'Enable sensors for phone-pointing guidance, or drag the sky manually.';
}

export function createGuidanceToObject(selectedObject, currentPointing) {
  if (!selectedObject) return null;
  if (!selectedObject.isAboveHorizon) return { target: selectedObject, visible: false, text: `${selectedObject.name} is below the horizon from your current location.` };
  const offset = calculateAngularOffsetToTarget(currentPointing, selectedObject);
  return { target: selectedObject, visible: true, offset, arrow: formatGuidanceArrow(offset), text: formatGuidanceText(offset, selectedObject), centered: isTargetCentered(offset) };
}

export function calculateAngularOffsetToTarget(currentAltAz, targetAltAz) {
  const azDelta = ((targetAltAz.azimuthDeg - currentAltAz.azimuthDeg + 540) % 360) - 180;
  const altDelta = targetAltAz.altitudeDeg - currentAltAz.altitudeDeg;
  return { azDelta, altDelta, distanceDeg: Math.hypot(azDelta, altDelta) };
}

export function formatGuidanceArrow(offset) {
  if (isTargetCentered(offset)) return 'center';
  const horizontal = Math.abs(offset.azDelta) < 4 ? '' : offset.azDelta > 0 ? 'right' : 'left';
  const vertical = Math.abs(offset.altDelta) < 4 ? '' : offset.altDelta > 0 ? 'up' : 'down';
  return [horizontal, vertical].filter(Boolean).join('-') || 'near';
}

export function formatGuidanceText(offset, target) {
  if (isTargetCentered(offset)) return `${target.name} is centered.`;
  const parts = [];
  if (Math.abs(offset.azDelta) >= 4) parts.push(`move ${offset.azDelta > 0 ? 'right' : 'left'}`);
  if (Math.abs(offset.altDelta) >= 4) parts.push(`tilt ${offset.altDelta > 0 ? 'up' : 'down'}`);
  return `${target.name}: ${parts.join(' and ')}.`;
}

export const isTargetCentered = (offset, thresholdDeg = 5) => Math.abs(offset.azDelta) <= thresholdDeg && Math.abs(offset.altDelta) <= thresholdDeg;

export function altAzToUnitVector(altDeg, azDeg) {
  const alt = (altDeg * Math.PI) / 180;
  const az = (azDeg * Math.PI) / 180;
  return new Vector3(Math.cos(alt) * Math.sin(az), Math.sin(alt), -Math.cos(alt) * Math.cos(az));
}
