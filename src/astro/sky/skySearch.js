const RECENT_KEY = 'astroSkyRecentSearches';

export function buildSkySearchIndex(solarSystemObjects, stars, constellations = [], extras = {}) {
  const constellationObjects = constellations.map(group => ({
    id: `constellation-${group.id}`,
    name: group.name,
    type: 'constellation',
    source: 'constellation-catalog',
    constellation: group.name,
    isAboveHorizon: group.majorStars?.some(Boolean),
    apparentMagnitude: 2,
    visibilityExplanation: group.visibilityNote,
    learningFact: group.learningFact,
    ...group,
  }));
  const deepSkyObjects = (extras.deepSkyObjects || []).map(object => ({
    ...object,
    type: 'deep-sky',
    source: 'deep-sky-catalog',
    visibilityExplanation: object.visibilityExplanation || object.visibilityNote,
  }));
  const meteorShowers = (extras.meteorShowers || []).map(object => ({
    ...object,
    source: 'meteor-shower-catalog',
    isAboveHorizon: true,
    apparentMagnitude: 2,
    visibilityExplanation: object.visibilityNote,
  }));
  const events = (extras.events || []).map(event => ({
    ...event,
    name: event.title,
    type: 'sky-event',
    source: 'sky-calendar',
    isAboveHorizon: true,
    apparentMagnitude: 1,
    visibilityExplanation: event.learningNote,
  }));
  return [...solarSystemObjects, ...stars, ...constellationObjects, ...deepSkyObjects, ...meteorShowers, ...events].map(object => ({
    ...object,
    aliases: [object.name, object.title, object.id, object.bayerName, object.constellation, object.radiantConstellation, ...(object.majorStars || []), ...(object.catalogNames || [])].filter(Boolean).map(value => String(value).toLowerCase()),
  }));
}

export function searchSkyObjects(query, index, options = {}) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index
    .filter(object => object.aliases.some(alias => alias.includes(q)))
    .sort((a, b) => rankSkySearchResult(b, q) - rankSkySearchResult(a, q))
    .slice(0, options.limit ?? 8)
    .map(({ aliases, ...object }) => object);
}

export const findSkyObjectById = (id, index) => index.find(object => object.id === id);

export function rankSkySearchResult(object, query) {
  let score = 0;
  if (object.name.toLowerCase() === query) score += 100;
  if (object.name.toLowerCase().startsWith(query)) score += 50;
  if (object.isAboveHorizon) score += 20;
  if (object.name === 'Jupiter') score += 8;
  score -= object.apparentMagnitude ?? 4;
  return score;
}

export function saveRecentSkySearch(query) {
  if (!query?.trim()) return;
  const recent = getRecentSkySearches().filter(item => item.toLowerCase() !== query.toLowerCase());
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 8)));
}

export function getRecentSkySearches() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}

export function groupSkySearchResults(results) {
  return results.reduce((groups, item) => {
    const key = item.isAboveHorizon ? 'Visible Now'
      : item.type === 'planet' ? 'Planets'
      : item.type === 'star' ? 'Stars'
      : item.type === 'constellation' ? 'Constellations'
      : item.type === 'deep-sky' ? 'Deep Sky'
      : item.type === 'meteor-shower' || item.type === 'sky-event' ? 'Events'
      : 'Moon/Sun';
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

export function azimuthToDirectionText(azimuthDeg) {
  const dirs = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  return dirs[Math.round((((azimuthDeg % 360) + 360) % 360) / 45) % 8];
}
