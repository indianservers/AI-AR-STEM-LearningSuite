import { Color3, Vector3 } from '@babylonjs/core';

export const ASTRO_CONFIG = {
  simulationSpeed: 0.18,
  labels: {
    width: 2.2,
    height: 0.42,
    font: 'bold 42px Segoe UI, Arial, sans-serif',
    background: 'rgba(4, 10, 26, 0.72)',
    color: '#eef7ff',
  },
  cameraPresets: {
    hub: { alpha: -Math.PI / 2.1, beta: Math.PI / 2.7, radius: 22, target: new Vector3(0, 0, 0) },
    solarSystem: { alpha: -Math.PI / 2.25, beta: Math.PI / 2.55, radius: 32, target: new Vector3(0, 0, 0) },
    skyMap: { alpha: -Math.PI / 2, beta: Math.PI / 2.2, radius: 18, target: new Vector3(0, 0, 0) },
    telescope: { alpha: -Math.PI / 2, beta: Math.PI / 2.05, radius: 13, target: new Vector3(0, 0, 0) },
    earthMoonSun: { alpha: -Math.PI / 2.35, beta: Math.PI / 2.45, radius: 24, target: new Vector3(0, 0, 0) },
    galaxy: { alpha: -Math.PI / 2.4, beta: Math.PI / 2.35, radius: 34, target: new Vector3(0, 0, 0) },
  },
  xr: {
    arReady: false,
    vrReady: false,
    mixedRealityReady: false,
  },
  planets: [
    { id: 'sun', name: 'Sun', radius: 1.7, distance: 0, color: new Color3(1, 0.72, 0.18), speed: 0 },
    { id: 'mercury', name: 'Mercury', radius: 0.18, distance: 3.0, color: new Color3(0.62, 0.58, 0.52), speed: 1.25 },
    { id: 'venus', name: 'Venus', radius: 0.32, distance: 4.1, color: new Color3(0.95, 0.72, 0.42), speed: 0.95 },
    { id: 'earth', name: 'Earth', radius: 0.36, distance: 5.4, color: new Color3(0.18, 0.48, 1), speed: 0.72 },
    { id: 'moon', name: 'Moon', radius: 0.1, distance: 5.9, color: new Color3(0.78, 0.78, 0.72), speed: 1.5 },
    { id: 'mars', name: 'Mars', radius: 0.27, distance: 6.9, color: new Color3(0.9, 0.28, 0.16), speed: 0.56 },
    { id: 'jupiter', name: 'Jupiter', radius: 0.82, distance: 9.0, color: new Color3(0.88, 0.62, 0.42), speed: 0.32 },
    { id: 'saturn', name: 'Saturn', radius: 0.7, distance: 11.5, color: new Color3(0.94, 0.78, 0.48), speed: 0.24 },
    { id: 'uranus', name: 'Uranus', radius: 0.52, distance: 13.8, color: new Color3(0.48, 0.9, 0.95), speed: 0.17 },
    { id: 'neptune', name: 'Neptune', radius: 0.5, distance: 15.8, color: new Color3(0.24, 0.42, 1), speed: 0.13 },
  ],
};

export const ASTRO_MISSIONS = [
  'Identify planets',
  'Build a solar system',
  'Track Moon phases',
  'Use a telescope',
  'Explore constellations',
  'Understand gravity wells',
  'Escape velocity challenge',
];
