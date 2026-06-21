import { raDecToAltAz } from './celestialMath.js';

export const METEOR_SHOWER_CATALOG = [
  ['quadrantids', 'Quadrantids', '12-28', '01-12', 'Jan 3-4', 'Boötes', 15.3, 49.5, 120, 41, '2003 EH1'],
  ['lyrids', 'Lyrids', '04-16', '04-25', 'Apr 22', 'Lyra', 18.1, 33.0, 18, 49, 'C/1861 G1 Thatcher'],
  ['eta-aquariids', 'Eta Aquariids', '04-19', '05-28', 'May 5-6', 'Aquarius', 22.5, -1.0, 50, 66, '1P/Halley'],
  ['delta-aquariids', 'Delta Aquariids', '07-12', '08-23', 'Jul 30', 'Aquarius', 22.7, -16.0, 25, 41, '96P/Machholz complex'],
  ['perseids', 'Perseids', '07-17', '08-24', 'Aug 12-13', 'Perseus', 3.1, 58.0, 100, 59, '109P/Swift-Tuttle'],
  ['orionids', 'Orionids', '10-02', '11-07', 'Oct 21-22', 'Orion', 6.3, 16.0, 20, 66, '1P/Halley'],
  ['leonids', 'Leonids', '11-06', '11-30', 'Nov 17-18', 'Leo', 10.1, 22.0, 15, 71, '55P/Tempel-Tuttle'],
  ['geminids', 'Geminids', '12-04', '12-17', 'Dec 13-14', 'Gemini', 7.5, 32.0, 120, 35, '3200 Phaethon'],
  ['ursids', 'Ursids', '12-17', '12-26', 'Dec 22', 'Ursa Minor', 14.5, 76.0, 10, 33, '8P/Tuttle'],
].map(([id, name, start, end, peakDateApprox, radiantConstellation, radiantRAHours, radiantDecDeg, zenithalHourlyRate, speedKmPerSec, parentBody]) => ({
  id,
  name,
  activeRange: { start, end },
  peakDateApprox,
  radiantConstellation,
  radiantRAHours,
  radiantDecDeg,
  zenithalHourlyRate,
  speedKmPerSec,
  parentBody,
  type: 'meteor-shower',
  visibilityNote: 'Best after midnight under dark, open skies. Use your eyes, not a telescope.',
  learningFact: 'Meteor showers appear to radiate from one part of the sky, but meteors can appear across the sky.',
  studentChallenge: 'Trace a meteor path backward and see whether it points toward the radiant.',
}));

const md = date => `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
const inRange = (value, start, end) => start <= end ? value >= start && value <= end : value >= start || value <= end;

export function getActiveMeteorShowers(date) {
  const current = md(date);
  return METEOR_SHOWER_CATALOG.filter(shower => inRange(current, shower.activeRange.start, shower.activeRange.end));
}

export function getMeteorShowerRadiantPosition(shower, date, observerLocation) {
  const altAz = raDecToAltAz(shower.radiantRAHours, shower.radiantDecDeg, date, observerLocation.latitude, observerLocation.longitude);
  return { ...shower, ...altAz, isAboveHorizon: altAz.altitudeDeg > 0 };
}

export function estimateMeteorShowerVisibility(shower, date, observerLocation, moonState = {}) {
  const radiant = getMeteorShowerRadiantPosition(shower, date, observerLocation);
  const moonPenalty = (moonState.illuminationPercent || 0) > 70 ? 0.45 : 0;
  const altitudeFactor = Math.max(0, Math.min(1, (radiant.altitudeDeg + 5) / 65));
  const activityFactor = shower.zenithalHourlyRate >= 80 ? 1 : shower.zenithalHourlyRate >= 25 ? 0.65 : 0.35;
  const score = Math.max(0, altitudeFactor * activityFactor - moonPenalty);
  const grade = score > 0.65 ? 'excellent' : score > 0.35 ? 'fair' : radiant.isAboveHorizon ? 'low' : 'hidden';
  return { ...radiant, score, grade };
}

export function formatMeteorShowerInfo(shower, context = {}) {
  const visibility = context.visibility?.grade ? ` Visibility estimate: ${context.visibility.grade}.` : '';
  return `${shower.name} peaks around ${shower.peakDateApprox}. Radiant: ${shower.radiantConstellation}. ${shower.visibilityNote}${visibility}`;
}
