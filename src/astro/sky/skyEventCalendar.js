import { angularSeparation } from './celestialMath.js';
import { getVisibleDeepSkyObjects } from './deepSkyCatalog.js';
import { getActiveMeteorShowers } from './meteorShowers.js';
import { formatLookDirection } from './skyGuidance.js';

const dayMs = 86400000;

export function getSkyEventsForDate(date, observerLocation, skyObjects = [], options = {}) {
  return [
    ...detectPlanetVisibilityWindows(date, observerLocation, skyObjects),
    ...detectMoonPhaseEvents(date),
    ...detectPlanetMoonNearness(skyObjects, 10),
    ...detectBrightObjectHighlights(skyObjects),
    ...getActiveMeteorShowers(date).map(shower => ({
      id: `meteor-${shower.id}`,
      type: 'meteor-shower',
      title: `${shower.name} meteor shower active`,
      time: 'After midnight',
      objectIds: [shower.id],
      whereToLook: `${shower.radiantConstellation} radiant; meteors can appear anywhere.`,
      difficulty: 'dark sky',
      learningNote: shower.learningFact,
      priority: shower.zenithalHourlyRate,
    })),
    ...getVisibleDeepSkyObjects(date, observerLocation, { magnitudeLimit: options.magnitudeLimit ?? 7 }).slice(0, 2).map(object => ({
      id: `deep-${object.id}`,
      type: 'deep-sky',
      title: `Try ${object.name}`,
      time: 'Tonight',
      objectIds: [object.id],
      whereToLook: formatLookDirection(object.altitudeDeg, object.azimuthDeg),
      difficulty: object.bestSeenWith,
      learningNote: object.visibilityNote,
      priority: 4,
    })),
  ].sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, options.limit ?? 10);
}

export function getSkyEventsForRange(startDate, endDate, observerLocation, options = {}) {
  const events = [];
  for (let time = startDate.getTime(); time <= endDate.getTime(); time += dayMs) {
    const date = new Date(time);
    events.push(...getSkyEventsForDate(date, observerLocation, options.objects || [], options).map(event => ({ ...event, date })));
  }
  return events;
}

export function detectPlanetVisibilityWindows(date, observerLocation, objects) {
  return objects.filter(object => object.type === 'planet' && object.isAboveHorizon).map(object => ({
    id: `planet-visible-${object.id}`,
    type: 'planet-visible',
    title: `${object.name} visible tonight`,
    time: 'Now',
    objectIds: [object.id],
    whereToLook: formatLookDirection(object.altitudeDeg, object.azimuthDeg),
    difficulty: 'naked-eye',
    learningNote: `${object.name} changes position against background stars over days and weeks.`,
    priority: object.name === 'Jupiter' ? 10 : 7,
  }));
}

export function detectMoonPhaseEvents(date) {
  const synodic = 29.53058867;
  const knownNew = Date.UTC(2000, 0, 6, 18, 14);
  const age = (((date.getTime() - knownNew) / dayMs) % synodic + synodic) % synodic;
  const phase = age < 1.5 ? 'New Moon estimate' : Math.abs(age - 7.4) < 1.5 ? 'First Quarter estimate' : Math.abs(age - 14.8) < 1.5 ? 'Full Moon estimate' : Math.abs(age - 22.1) < 1.5 ? 'Last Quarter estimate' : 'Moon phase changing';
  return [{ id: `moon-phase-${date.toISOString().slice(0, 10)}`, type: 'moon-phase', title: phase, time: 'All night', objectIds: ['moon'], whereToLook: 'Check Moon object for current direction.', difficulty: 'naked-eye', learningNote: 'Moon phase is an educational estimate from the lunar cycle.', priority: phase.includes('Full') ? 8 : 3 }];
}

export function detectPlanetMoonNearness(objects, thresholdDeg = 8) {
  const moon = objects.find(object => object.type === 'moon');
  if (!moon) return [];
  return objects.filter(object => object.type === 'planet').map(planet => ({ planet, sep: angularSeparation(moon.altitudeDeg, moon.azimuthDeg, planet.altitudeDeg, planet.azimuthDeg) })).filter(item => item.sep <= thresholdDeg).map(item => ({
    id: `event-moon-near-${item.planet.id}`,
    type: 'moon-near-planet',
    title: `Moon near ${item.planet.name}`,
    time: 'Tonight',
    objectIds: ['moon', item.planet.id],
    whereToLook: formatLookDirection(item.planet.altitudeDeg, item.planet.azimuthDeg),
    difficulty: 'naked-eye',
    learningNote: `Educational estimate: about ${item.sep.toFixed(1)} deg apart.`,
    priority: 8,
  }));
}

export function detectBrightObjectHighlights(objects) {
  return objects.filter(object => object.isAboveHorizon && object.type !== 'sun' && (object.apparentMagnitude ?? 9) <= 0.8).slice(0, 4).map(object => ({
    id: `bright-object-${object.id}`,
    type: 'bright-object',
    title: `${object.name} is a bright target`,
    time: 'Now',
    objectIds: [object.id],
    whereToLook: formatLookDirection(object.altitudeDeg, object.azimuthDeg),
    difficulty: 'naked-eye',
    learningNote: object.learningFact || 'Bright targets are good first observations.',
    priority: 6,
  }));
}

export function formatCalendarEvent(event) {
  return `${event.title} - ${event.time}. ${event.whereToLook}. ${event.learningNote}`;
}
