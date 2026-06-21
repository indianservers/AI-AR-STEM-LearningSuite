import { SKY_CONFIG } from './skyConfig.js';

let lastOrientation = null;
let listener = null;
let calibration = { headingOffsetDeg: 0 };

export const isDeviceOrientationSupported = () => typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
export const requiresIOSOrientationPermission = () => isDeviceOrientationSupported() && typeof DeviceOrientationEvent.requestPermission === 'function';

export async function requestDeviceOrientationPermission() {
  if (!isDeviceOrientationSupported()) return { ok: false, state: 'unavailable', message: 'Device orientation unavailable. Use drag controls.' };
  try {
    if (requiresIOSOrientationPermission()) {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result !== 'granted') return { ok: false, state: 'denied', message: 'Sensor permission denied. Use touch drag mode.' };
    }
    return { ok: true, state: 'active', message: 'Phone sensors active.' };
  } catch {
    return { ok: false, state: 'denied', message: 'Sensor permission denied. Use touch drag mode.' };
  }
}

export function startDeviceOrientationTracking(callback, options = {}) {
  stopDeviceOrientationTracking();
  if (!isDeviceOrientationSupported()) return false;
  const factor = options.smoothingFactor ?? SKY_CONFIG.sensorSmoothingFactor;
  let lastEventAt = 0;
  listener = event => {
    const now = performance.now();
    if (now - lastEventAt < (options.throttleMs ?? SKY_CONFIG.sensorUpdateMs)) return;
    lastEventAt = now;
    const raw = {
      alpha: event.alpha ?? 0,
      beta: event.beta ?? 0,
      gamma: event.gamma ?? 0,
      absolute: Boolean(event.absolute),
      webkitCompassHeading: event.webkitCompassHeading ?? null,
      timestamp: Date.now(),
    };
    lastOrientation = smoothOrientation(raw, lastOrientation, factor);
    callback({ ok: true, orientation: lastOrientation, message: createSensorStatusMessage({ mode: 'active', orientation: lastOrientation }) });
  };
  window.addEventListener('deviceorientation', listener, true);
  return true;
}

export function stopDeviceOrientationTracking() {
  if (listener) window.removeEventListener('deviceorientation', listener, true);
  listener = null;
}

export const getLastOrientation = () => lastOrientation;

export function smoothOrientation(rawOrientation, previousOrientation, factor = SKY_CONFIG.sensorSmoothingFactor) {
  if (!previousOrientation) return rawOrientation;
  const mix = (a, b) => a + (b - a) * factor;
  return {
    ...rawOrientation,
    alpha: mix(previousOrientation.alpha, rawOrientation.alpha),
    beta: mix(previousOrientation.beta, rawOrientation.beta),
    gamma: mix(previousOrientation.gamma, rawOrientation.gamma),
  };
}

export function estimateOrientationJitter(samples = []) {
  if (samples.length < 3) return 0;
  const headings = samples.map(sample => sample.webkitCompassHeading ?? sample.alpha ?? 0);
  return Math.max(...headings) - Math.min(...headings);
}

export function orientationToSkyCameraRotation(orientation, currentCalibration = calibration) {
  const heading = orientation.webkitCompassHeading ?? (360 - orientation.alpha);
  return {
    alpha: ((heading + currentCalibration.headingOffsetDeg) * Math.PI) / 180,
    beta: Math.max(0.15, Math.min(Math.PI - 0.15, Math.PI / 2 + (orientation.beta * Math.PI) / 360)),
  };
}

export function calibrateNorth(currentOrientation) {
  const heading = currentOrientation?.webkitCompassHeading ?? (360 - (currentOrientation?.alpha || 0));
  calibration = { headingOffsetDeg: -heading };
  return calibration;
}

export function resetSensorCalibration() {
  calibration = { headingOffsetDeg: 0 };
  return calibration;
}

export function createSensorStatusMessage(sensorState) {
  if (sensorState?.mode === 'active') return 'Phone sensors active. Sensor alignment is approximate.';
  if (sensorState?.mode === 'denied') return 'Sensor permission denied. Use touch drag mode.';
  return 'Device orientation unavailable. Use drag controls.';
}
