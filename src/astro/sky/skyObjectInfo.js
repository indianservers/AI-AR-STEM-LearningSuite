import { formatAltAz, formatDec, formatRA } from './celestialMath.js';
import { formatLookDirection } from './skyGuidance.js';
import { formatRiseSetSummary } from './riseSetEngine.js';

export function buildObjectInfoCard(object, context = {}) {
  if (!object) return null;
  if (object.type === 'planet') return buildPlanetInfo(object, context);
  if (object.type === 'moon') return buildMoonInfo(object, context);
  if (object.type === 'sun') return buildSunInfo(object, context);
  if (object.type === 'constellation') return buildConstellationInfo(object, context);
  if (object.type === 'deep-sky') return buildDeepSkyInfo(object, context);
  if (object.type === 'meteor-shower') return buildMeteorShowerInfo(object, context);
  if (object.type === 'sky-event') return buildSkyEventInfo(object, context);
  if (object.type === 'observation-plan') return buildPlanInfo(object, context);
  return buildStarInfo(object, context);
}

export function buildPlanetInfo(object, context = {}) {
  const jupiter = object.name === 'Jupiter' ? 'Jupiter is the largest planet and often appears as a bright steady point.' : object.learningFact;
  return baseInfo(object, context, jupiter, `Can you compare ${object.name}'s position tonight with tomorrow night?`);
}

export function buildMoonInfo(object, context = {}) {
  return baseInfo(object, context, `The Moon is ${object.illuminationPercent ?? '?'}% illuminated${object.phaseName ? ` (${object.phaseName})` : ''}.`, 'How does the Moon position change at the same time tomorrow?');
}

export function buildSunInfo(object, context = {}) {
  return baseInfo(object, context, object.safetyNote || 'Do not directly observe the Sun.', 'Why is Sun safety different from Moon safety?');
}

export function buildStarInfo(object, context = {}) {
  return baseInfo(object, context, `${object.name} is in ${object.constellation || 'the sky'} and has spectral type ${object.spectralType || 'unknown'}.`, 'Why does lower magnitude mean brighter?');
}

export function buildConstellationInfo(constellation) {
  return {
    title: constellation.name,
    rows: [
      ['Pattern', constellation.visibilityNote],
      ['Major stars', constellation.majorStars.join(', ')],
      ['Best season', constellation.seasonHint],
      ['Learning fact', constellation.learningFact],
    ],
    studentPrompt: constellation.studentChallenge,
    teacherNote: constellation.mythologyNote,
  };
}

export function buildDeepSkyInfo(object) {
  return {
    title: object.name,
    rows: [
      ['Type', `${object.objectType}, ${object.constellation}`],
      ['Can I see it now?', object.visibilityExplanation || object.visibilityNote],
      ['Where to look', object.altitudeDeg == null ? 'Use the sky map estimate.' : formatLookDirection(object.altitudeDeg, object.azimuthDeg)],
      ['Coordinates', `RA ${formatRA(object.rightAscensionHours)}. Dec ${formatDec(object.declinationDeg)}.`],
      ['Brightness', object.apparentMagnitude ?? 'n/a'],
      ['Angular size', object.angularSize || 'n/a'],
      ['Distance', object.distanceLightYears ? `${object.distanceLightYears.toLocaleString()} ly` : 'n/a'],
      ['Best seen with', object.bestSeenWith],
      ['Learning fact', object.learningFact],
    ],
    studentPrompt: object.studentChallenge,
    teacherNote: object.teacherNote,
    safetyNote: 'Deep-sky visibility is an educational estimate and depends on darkness, Moonlight, optics, weather, and eyesight.',
  };
}

export function buildMeteorShowerInfo(object) {
  return {
    title: object.name,
    rows: [
      ['Type', 'Meteor shower'],
      ['Active dates', `${object.activeRange?.start || '?'} to ${object.activeRange?.end || '?'}`],
      ['Peak', object.peakDateApprox],
      ['Radiant', object.radiantConstellation],
      ['Rate estimate', `${object.zenithalHourlyRate || '?'} meteors/hour under ideal skies`],
      ['Speed', object.speedKmPerSec ? `${object.speedKmPerSec} km/s` : 'n/a'],
      ['Parent body', object.parentBody || 'n/a'],
      ['Learning fact', object.learningFact],
    ],
    studentPrompt: object.studentChallenge,
    teacherNote: 'Meteor showers are best observed with eyes from a dark open location after midnight.',
    safetyNote: 'Use eyes, not telescopes, for meteor showers.',
  };
}

export function buildSkyEventInfo(object) {
  return {
    title: object.title || object.name,
    rows: [
      ['Type', object.type],
      ['Time', object.time || 'Tonight'],
      ['Where to look', object.whereToLook || 'Use Guide Me if an object is linked.'],
      ['Difficulty', object.difficulty || 'educational estimate'],
      ['Learning note', object.learningNote || object.visibilityExplanation],
    ],
    studentPrompt: 'What observation evidence would confirm this event?',
    teacherNote: 'Calendar events are local educational estimates unless explicitly calculated from object positions.',
  };
}

export function buildPlanInfo(object) {
  return {
    title: object.objectName,
    rows: [
      ['Type', object.objectType],
      ['Planned time', object.plannedDateTime],
      ['Direction', object.directionHint],
      ['Equipment', object.equipmentHint],
      ['Difficulty', object.difficulty],
      ['Note', object.note || 'No note'],
    ],
    studentPrompt: 'After observing, mark this plan item complete and compare with the prediction.',
    teacherNote: 'Observation planning helps students connect predictions with evidence.',
  };
}

export const buildVisibilityInfo = (object, context = {}) => context.visibilityExplanation || object.visibilityExplanation;
export const buildStudentPrompt = object => object.name === 'Jupiter' ? "Can you compare Jupiter's position tonight with tomorrow night?" : `What evidence tells you this is ${object.name}?`;
export const buildTeacherNote = object => object.safetyNote || object.learningFact || 'Ask students to cite altitude, direction, and brightness.';

function baseInfo(object, context, learning, challenge) {
  return {
    title: object.name,
    rows: [
      ['Type', object.type + (object.constellation ? `, ${object.constellation}` : '')],
      ['Can I see it now?', context.visibilityExplanation || object.visibilityExplanation],
      ['Where to look', formatLookDirection(object.altitudeDeg, object.azimuthDeg)],
      ['Coordinates', `${formatAltAz(object.altitudeDeg, object.azimuthDeg)}. RA ${formatRA(object.rightAscensionHours)}. Dec ${formatDec(object.declinationDeg)}.`],
      ['Brightness', object.apparentMagnitude ?? 'n/a'],
      ['Distance', object.distanceText || (object.distanceLightYears ? `${object.distanceLightYears} ly` : 'n/a')],
      ['Rise/set', formatRiseSetSummary(context.riseSet)],
      ['Learning fact', learning],
    ],
    studentPrompt: challenge,
    teacherNote: buildTeacherNote(object),
    safetyNote: object.safetyNote,
  };
}
