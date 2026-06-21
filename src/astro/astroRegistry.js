// Lazy-loading boundary: keep the Astro hub metadata light, and load each heavy
// Babylon/AR submodule only when a learner launches it.
export const ASTRO_SUBMODULES = [
  {
    id: 'solar-system',
    title: 'Solar System Explorer',
    description: 'Compare planets, orbits, labels, and the scale of our local star system.',
    difficulty: 'Beginner',
    concepts: ['Solar system', 'Orbits', 'Planet order', 'Scale'],
    status: 'Interactive',
    load: () => import('./submodules/SolarSystemExplorer.js').then(module => module.SolarSystemExplorer),
  },
  {
    id: 'ar-sky-map',
    title: 'AR Sky Map',
    description: 'Preview a star dome and prepare for real sky alignment in AR.',
    difficulty: 'Beginner',
    concepts: ['Stars', 'Constellations', 'AR Sky', 'Orientation'],
    status: 'AR Ready',
    load: () => import('./submodules/ARSkyMap.js').then(module => module.ARSkyMap),
  },
  {
    id: 'telescope',
    title: 'Telescope Simulator',
    description: 'Explore targets through a simulated viewport with focus and zoom controls.',
    difficulty: 'Beginner',
    concepts: ['Telescopes', 'Magnification', 'Field of view', 'Deep sky'],
    status: 'Interactive',
    load: () => import('./submodules/TelescopeSimulator.js').then(module => module.TelescopeSimulator),
  },
  {
    id: 'earth-moon-sun',
    title: 'Earth-Moon-Sun System',
    description: 'Observe rotation, orbit, tilt, and the relationships behind phases and eclipses.',
    difficulty: 'Intermediate',
    concepts: ['Moon phases', 'Eclipses', 'Seasons', 'Axial tilt'],
    status: 'Interactive',
    load: () => import('./submodules/EarthMoonSunSystem.js').then(module => module.EarthMoonSunSystem),
  },
  {
    id: 'galaxy-deep-space',
    title: 'Galaxy & Deep Space',
    description: 'Preview a rotating galaxy field and the ideas behind cosmic scale.',
    difficulty: 'Intermediate',
    concepts: ['Galaxies', 'Nebulae', 'Redshift', 'Cosmic scale'],
    status: 'Interactive',
    load: () => import('./submodules/GalaxyDeepSpace.js').then(module => module.GalaxyDeepSpace),
  },
  {
    id: 'astro-missions',
    title: 'Astro Missions',
    description: 'Start a mission board for guided astronomy challenges and future achievements.',
    difficulty: 'All levels',
    concepts: ['Observation', 'Mission learning', 'Gravity', 'Constellations'],
    status: 'Mission',
    load: () => import('./submodules/AstroMissions.js').then(module => module.AstroMissions),
  },
];

export function getAstroSubmodule(id) {
  return ASTRO_SUBMODULES.find(module => module.id === id) || null;
}
