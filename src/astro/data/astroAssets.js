import { Color3 } from '@babylonjs/core';

const fallback = (id, name, color) => ({
  id,
  name,
  localPath: null,
  fallbackColor: color,
  source: 'Procedural Babylon.js material',
  license: 'Generated locally; no external asset',
  status: 'procedural-fallback',
});

export const ASTRO_ASSETS = [
  fallback('sun', 'Sun', new Color3(1, 0.72, 0.18)),
  fallback('mercury', 'Mercury', new Color3(0.62, 0.58, 0.52)),
  fallback('venus', 'Venus', new Color3(0.95, 0.72, 0.42)),
  fallback('earth', 'Earth', new Color3(0.18, 0.48, 1)),
  fallback('moon', 'Moon', new Color3(0.78, 0.78, 0.72)),
  fallback('mars', 'Mars', new Color3(0.9, 0.28, 0.16)),
  fallback('jupiter', 'Jupiter', new Color3(0.88, 0.62, 0.42)),
  fallback('saturn', 'Saturn', new Color3(0.94, 0.78, 0.48)),
  fallback('uranus', 'Uranus', new Color3(0.48, 0.9, 0.95)),
  fallback('neptune', 'Neptune', new Color3(0.24, 0.42, 1)),
  fallback('galaxy-sprite', 'Galaxy sprite', new Color3(0.48, 0.7, 1)),
  fallback('nebula-sprite', 'Nebula sprite', new Color3(0.7, 0.35, 1)),
];

export function getAstroAsset(id) {
  return ASTRO_ASSETS.find(asset => asset.id === id) || null;
}
