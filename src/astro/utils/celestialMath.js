// Educational celestial coordinate helpers.
// RA (right ascension) is sky longitude measured in hours, 0h to 24h.
// Dec (declination) is sky latitude measured in degrees, -90 to +90.
// Altitude is height above the local horizon. Azimuth is compass direction.

export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

export function normalizeAngle(deg) {
  return ((deg % 360) + 360) % 360;
}

export function julianDate(date = new Date()) {
  return date.getTime() / 86400000 + 2440587.5;
}

export function greenwichSiderealTime(date = new Date()) {
  const jd = julianDate(date);
  const d = jd - 2451545.0;
  const t = d / 36525;
  return normalizeAngle(280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38710000);
}

export function localSiderealTime(date = new Date(), longitude = 0) {
  return normalizeAngle(greenwichSiderealTime(date) + longitude);
}

export function raDecToAltAz(rightAscensionHours, declinationDeg, date = new Date(), latitude = 0, longitude = 0) {
  const lst = localSiderealTime(date, longitude);
  const raDeg = rightAscensionHours * 15;
  const hourAngle = normalizeAngle(lst - raDeg);
  const ha = degToRad(hourAngle > 180 ? hourAngle - 360 : hourAngle);
  const dec = degToRad(declinationDeg);
  const lat = degToRad(latitude);

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAz = (Math.sin(dec) - Math.sin(altitude) * Math.sin(lat)) / (Math.cos(altitude) * Math.cos(lat));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(ha) > 0) azimuth = Math.PI * 2 - azimuth;

  return {
    altitudeDeg: radToDeg(altitude),
    azimuthDeg: normalizeAngle(radToDeg(azimuth)),
  };
}

export function altAzToCartesian(altitudeDeg, azimuthDeg, radius = 1) {
  const alt = degToRad(altitudeDeg);
  const az = degToRad(azimuthDeg);
  const r = radius * Math.cos(alt);
  return {
    x: r * Math.sin(az),
    y: radius * Math.sin(alt),
    z: r * Math.cos(az),
  };
}

export function raDecToCartesian(rightAscensionHours, declinationDeg, radius = 1) {
  const ra = degToRad(rightAscensionHours * 15);
  const dec = degToRad(declinationDeg);
  return {
    x: Math.cos(dec) * Math.cos(ra) * radius,
    y: Math.sin(dec) * radius,
    z: Math.cos(dec) * Math.sin(ra) * radius,
  };
}

export function formatRA(hours = 0) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function formatDec(degrees = 0) {
  const sign = degrees < 0 ? '-' : '+';
  const abs = Math.abs(degrees);
  const d = Math.floor(abs);
  const m = Math.round((abs - d) * 60);
  return `${sign}${d} deg ${m}'`;
}
