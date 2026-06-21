import { angularSeparation } from './celestialMath.js';

export function getSkyHighlights(date, observerLocation, objects) {
  return [
    ...detectBrightPlanetHighlights(objects),
    ...detectMoonPlanetNearness(objects),
    ...detectCloseObjects(objects, 5),
  ].sort((a, b) => b.priority - a.priority).slice(0, 8);
}

export function detectCloseObjects(objects, thresholdDeg = 5) {
  const visible = objects.filter(object => object.isAboveHorizon && object.type !== 'sun');
  const events = [];
  visible.forEach((a, i) => {
    visible.slice(i + 1).forEach(b => {
      const sep = angularSeparation(a.altitudeDeg, a.azimuthDeg, b.altitudeDeg, b.azimuthDeg);
      if (sep <= thresholdDeg) {
        events.push({
          id: `close-${a.id}-${b.id}`,
          title: `${a.name} is near ${b.name}`,
          type: 'close-objects',
          objectIds: [a.id, b.id],
          priority: 4,
          explanation: `They are about ${sep.toFixed(1)} deg apart in the sky.`,
          studentPrompt: 'Can you tell which one is brighter?',
        });
      }
    });
  });
  return events;
}

export function detectBrightPlanetHighlights(objects) {
  return objects
    .filter(object => object.type === 'planet' && object.isAboveHorizon && (object.apparentMagnitude ?? 9) <= 1.5)
    .map(object => ({
      id: `bright-${object.id}`,
      title: `${object.name} is visible now`,
      type: 'bright-planet',
      objectIds: [object.id],
      priority: object.name === 'Jupiter' ? 9 : 7,
      explanation: `${object.name} is a strong target right now under good sky conditions.`,
      studentPrompt: `Find ${object.name} and compare its steady light with nearby stars.`,
    }));
}

export function detectMoonPlanetNearness(objects) {
  const moon = objects.find(object => object.type === 'moon' && object.isAboveHorizon);
  if (!moon) return [];
  return objects
    .filter(object => object.type === 'planet' && object.isAboveHorizon)
    .map(planet => ({ planet, sep: angularSeparation(moon.altitudeDeg, moon.azimuthDeg, planet.altitudeDeg, planet.azimuthDeg) }))
    .filter(item => item.sep < 12)
    .map(item => ({
      id: `moon-near-${item.planet.id}`,
      title: `Moon is near ${item.planet.name}`,
      type: 'moon-planet',
      objectIds: ['moon', item.planet.id],
      priority: 8,
      explanation: `The Moon is about ${item.sep.toFixed(1)} deg from ${item.planet.name}.`,
      studentPrompt: 'How does the Moon move compared with the planet tomorrow?',
    }));
}

export function formatSkyEvent(event) {
  return `${event.title}. ${event.explanation}`;
}
