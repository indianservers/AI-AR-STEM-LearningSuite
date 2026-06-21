let active = null;

const SEQUENCES = [
  ['tonights-sky', "Tonight's Sky", ['Orient with the horizon and cardinal directions.', 'Find the Moon or brightest visible planet.', 'Compare bright stars with planets.']],
  ['find-jupiter', 'Find Jupiter', ['Search Jupiter.', 'Guide toward its direction.', 'Notice its steady planet-like light.']],
  ['stars-constellations', 'Stars and Constellations', ['Show a seasonal constellation.', 'Trace major stars.', 'Explain patterns are line-of-sight stories.']],
  ['deep-sky-journey', 'Deep Sky Journey', ['Try Pleiades, Orion Nebula, or Andromeda.', 'Discuss binoculars and dark skies.', 'Compare nearby stars with distant systems.']],
  ['time-machine', 'Time Machine Sky', ['Advance time several hours.', 'Watch stars drift westward.', 'Connect the motion to Earth rotation.']],
  ['moon-planets', 'Moon and Planets', ['Show the Moon phase.', 'Compare planet positions.', 'Explain planets move against background stars.']],
];

export function startPlanetariumMode(sequenceId = 'tonights-sky', context = {}) {
  const sequence = getPlanetariumSequences(context).find(item => item.id === sequenceId) || getPlanetariumSequences(context)[0];
  active = { ...sequence, index: 0, caption: sequence.scenes[0] };
  context.onCaption?.(active.caption);
  return active;
}

export function stopPlanetariumMode() { const stopped = active; active = null; return stopped; }
export function nextPlanetariumScene() { if (!active) return null; active.index = Math.min(active.scenes.length - 1, active.index + 1); active.caption = active.scenes[active.index]; return active; }
export function previousPlanetariumScene() { if (!active) return null; active.index = Math.max(0, active.index - 1); active.caption = active.scenes[active.index]; return active; }
export const getPlanetariumSequences = () => SEQUENCES.map(([id, title, scenes]) => ({ id, title, scenes }));
export function setPlanetariumCaption(text) { if (active) active.caption = text; return active; }
