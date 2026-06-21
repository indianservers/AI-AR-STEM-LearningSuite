export function meanAnomaly(timeDays, orbitalPeriodDays, phaseOffset = 0) {
  return ((timeDays / orbitalPeriodDays) * 360 + phaseOffset) % 360;
}

export function circularOrbitPosition(radius, angleDeg) {
  const angle = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}

export function ellipticalOrbitPosition(semiMajorAxis, eccentricity, angleDeg) {
  const angle = (angleDeg * Math.PI) / 180;
  const b = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
  return {
    x: Math.cos(angle) * semiMajorAxis - semiMajorAxis * eccentricity,
    z: Math.sin(angle) * b,
  };
}

export function orbitalSpeedFactor(orbitalPeriodDays) {
  return 365.25 / orbitalPeriodDays;
}

export function degreesPerDay(orbitalPeriodDays) {
  return 360 / orbitalPeriodDays;
}
