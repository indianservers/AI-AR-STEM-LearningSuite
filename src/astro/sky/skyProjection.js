import { Color3 } from '@babylonjs/core';
import { altAzToCartesian } from './celestialMath.js';
import { SKY_CONFIG } from './skyConfig.js';

export const projectAltAzToSky = (altDeg, azDeg, radius = SKY_CONFIG.skyRadius) => altAzToCartesian(altDeg, azDeg, radius);
export const projectObjectToDome = (object, radius = SKY_CONFIG.skyRadius) => projectAltAzToSky(object.altitudeDeg, object.azimuthDeg, radius);
export const isWithinVisibleSky = (altDeg, showBelowHorizon = false) => showBelowHorizon || altDeg >= 0;
export const magnitudeToStarSize = magnitude => Math.max(0.6, Math.min(5.2, 4.9 - magnitude * 0.58));
export const magnitudeToOpacity = magnitude => Math.max(0.24, Math.min(1, 1.05 - magnitude * 0.105));
export const altitudeToHorizonFade = altDeg => altDeg < 0 ? 0.16 : Math.max(0.35, Math.min(1, altDeg / 18));

export function spectralTypeToColor(spectralType = '') {
  const key = spectralType.trim()[0]?.toUpperCase();
  if (key === 'O' || key === 'B') return new Color3(0.72, 0.84, 1);
  if (key === 'A') return new Color3(0.9, 0.94, 1);
  if (key === 'F') return new Color3(1, 0.96, 0.82);
  if (key === 'G') return new Color3(1, 0.9, 0.62);
  if (key === 'K') return new Color3(1, 0.62, 0.32);
  if (key === 'M') return new Color3(1, 0.34, 0.2);
  return new Color3(0.86, 0.92, 1);
}

export function planetTypeToColor(name = '') {
  const colors = {
    mercury: new Color3(0.68, 0.63, 0.54),
    venus: new Color3(1, 0.86, 0.56),
    mars: new Color3(1, 0.34, 0.18),
    jupiter: new Color3(1, 0.72, 0.42),
    saturn: new Color3(1, 0.82, 0.52),
    uranus: new Color3(0.48, 0.9, 0.95),
    neptune: new Color3(0.25, 0.45, 1),
  };
  return colors[name.toLowerCase()] || new Color3(0.8, 0.88, 1);
}

export function objectTypeToRenderStyle(object) {
  if (object.type === 'sun') return { diameter: 34, color: object.color, emissive: 1, label: true };
  if (object.type === 'moon') return { diameter: 24, color: object.color, emissive: 0.42, label: true };
  if (object.name === 'Jupiter') return { diameter: 13, color: object.color, emissive: 0.9, label: true };
  if (object.type === 'planet') return { diameter: 9, color: object.color, emissive: 0.82, label: true };
  return {
    diameter: magnitudeToStarSize(object.apparentMagnitude),
    color: object.color || spectralTypeToColor(object.spectralType),
    emissive: magnitudeToOpacity(object.apparentMagnitude),
    label: object.apparentMagnitude <= SKY_CONFIG.starLabelMagnitudeLimit,
  };
}
