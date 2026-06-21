import { Vector3 } from '@babylonjs/core';

export const degToRad = deg => (deg * Math.PI) / 180;
export const radToDeg = rad => (rad * 180) / Math.PI;
export const normalizeDegrees = deg => ((deg % 360) + 360) % 360;
export const normalizeHours = hours => ((hours % 24) + 24) % 24;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

export function greenwichSiderealTime(date) {
  const jd = julianDate(date);
  const t = (jd - 2451545.0) / 36525;
  const degrees = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t - (t * t * t) / 38710000;
  return normalizeHours(normalizeDegrees(degrees) / 15);
}

export function localSiderealTime(date, longitudeDeg) {
  return normalizeHours(greenwichSiderealTime(date) + longitudeDeg / 15);
}

// RA is sky longitude in hours. Declination is sky latitude in degrees.
// Altitude is degrees above the horizon. Azimuth is degrees from North toward East.
export function raDecToAltAz(raHours, decDeg, date, latitudeDeg, longitudeDeg) {
  const lst = localSiderealTime(date, longitudeDeg);
  const hourAngleDeg = normalizeDegrees((lst - raHours) * 15);
  const ha = degToRad(hourAngleDeg > 180 ? hourAngleDeg - 360 : hourAngleDeg);
  const dec = degToRad(decDeg);
  const lat = degToRad(latitudeDeg);
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(ha));
  return { altitudeDeg: radToDeg(alt), azimuthDeg: normalizeDegrees(radToDeg(az)) };
}

// Babylon convention used by this sky map: Y is up, North is negative Z, East is positive X.
// Azimuth 0 = North, 90 = East, 180 = South, 270 = West.
export function altAzToCartesian(altDeg, azDeg, radius) {
  const alt = degToRad(altDeg);
  const az = degToRad(azDeg);
  const horizontal = radius * Math.cos(alt);
  return new Vector3(
    horizontal * Math.sin(az),
    radius * Math.sin(alt),
    -horizontal * Math.cos(az),
  );
}

export function raDecToCartesian(raHours, decDeg, radius) {
  const ra = degToRad(raHours * 15);
  const dec = degToRad(decDeg);
  return new Vector3(
    radius * Math.cos(dec) * Math.sin(ra),
    radius * Math.sin(dec),
    -radius * Math.cos(dec) * Math.cos(ra),
  );
}

export function angularSeparation(aAltDeg, aAzDeg, bAltDeg, bAzDeg) {
  const aAlt = degToRad(aAltDeg);
  const bAlt = degToRad(bAltDeg);
  const deltaAz = degToRad(aAzDeg - bAzDeg);
  return radToDeg(Math.acos(clamp(Math.sin(aAlt) * Math.sin(bAlt) + Math.cos(aAlt) * Math.cos(bAlt) * Math.cos(deltaAz), -1, 1)));
}

export function formatRA(raHours) {
  const h = Math.floor(normalizeHours(raHours));
  const m = Math.round((normalizeHours(raHours) - h) * 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function formatDec(decDeg) {
  return `${decDeg >= 0 ? '+' : '-'}${Math.abs(decDeg).toFixed(1)} deg`;
}

export function formatDegrees(value, suffix = 'deg') {
  return `${value.toFixed(1)} ${suffix}`;
}

export function formatAltAz(altDeg, azDeg) {
  return `Alt ${formatDegrees(altDeg)}, Az ${formatDegrees(normalizeDegrees(azDeg))}`;
}
