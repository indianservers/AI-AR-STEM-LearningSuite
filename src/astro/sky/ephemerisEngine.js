import * as Astronomy from 'astronomy-engine';
import { SKY_BODIES, SKY_CONFIG } from './skyConfig.js';
import { julianDate } from './celestialMath.js';
import { projectObjectToDome } from './skyProjection.js';

const BODY_MAP = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
};

export function getSolarSystemObjects(date, observerLocation) {
  return SKY_BODIES.map(body => {
    try {
      return getObjectEphemeris(body.name, date, observerLocation);
    } catch (error) {
      console.warn(`Sky ephemeris failed for ${body.name}`, error);
      return null;
    }
  }).filter(Boolean);
}

export function getObjectEphemeris(bodyName, date, observerLocation) {
  if (bodyName === 'Sun') return getSunEphemeris(date, observerLocation);
  if (bodyName === 'Moon') return getMoonEphemeris(date, observerLocation);
  return getPlanetEphemeris(bodyName, date, observerLocation);
}

export const getSunEphemeris = (date, observerLocation) => buildBodyEphemeris('Sun', date, observerLocation);
export const getMoonEphemeris = (date, observerLocation) => buildBodyEphemeris('Moon', date, observerLocation);
export const getPlanetEphemeris = (planetName, date, observerLocation) => buildBodyEphemeris(planetName, date, observerLocation);

function buildBodyEphemeris(bodyName, date, observerLocation) {
  const config = SKY_BODIES.find(body => body.name === bodyName);
  const body = BODY_MAP[bodyName];
  const observer = new Astronomy.Observer(observerLocation.latitude, observerLocation.longitude, observerLocation.altitude || 0);
  const time = Astronomy.MakeTime(julianDate(date));
  const eq = Astronomy.Equator(body, time, observer, true, true);
  const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal');
  const illum = Astronomy.Illumination(body, time);
  const distanceAu = eq.dist ?? illum.geo_dist ?? null;
  const object = {
    id: config.id,
    name: config.name,
    type: config.type,
    subtype: config.type,
    source: 'ephemeris',
    altitudeDeg: hor.altitude,
    azimuthDeg: hor.azimuth,
    rightAscensionHours: eq.ra,
    declinationDeg: eq.dec,
    distanceAu,
    distanceKm: distanceAu ? distanceAu * Astronomy.KM_PER_AU : null,
    apparentMagnitude: estimateVisualMagnitude(bodyName, illum),
    phaseAngle: illum.phase_angle ?? null,
    illuminationPercent: bodyName === 'Moon' ? estimateMoonIllumination(time) : Math.round((illum.phase_fraction ?? 1) * 100),
    phaseName: bodyName === 'Moon' ? moonPhaseName(time) : null,
    isAboveHorizon: hor.altitude > 0,
    color: config.displayColor,
    label: config.name,
    labelPriority: config.labelPriority,
    learningFact: config.learningFact,
    safetyNote: config.safetyNote,
    nakedEyeNote: config.nakedEyeNote,
  };
  object.isNakedEyeVisible = isLikelyVisibleToNakedEye(object, {});
  object.visibilityExplanation = explainVisibility(object);
  object.cartesianPosition = projectObjectToDome(object, SKY_CONFIG.skyRadius);
  object.distanceText = object.distanceKm ? `${Math.round(object.distanceKm).toLocaleString()} km` : '';
  return object;
}

export function estimateVisualMagnitude(bodyName, ephemeris) {
  if (typeof ephemeris?.mag === 'number') return Number(ephemeris.mag.toFixed(2));
  const fallback = { Sun: -26.7, Moon: -12, Mercury: -0.4, Venus: -4.2, Mars: -1.2, Jupiter: -2.2, Saturn: 0.5, Uranus: 5.7, Neptune: 7.8 };
  return fallback[bodyName] ?? 6;
}

export function estimateMoonIllumination(date) {
  const phase = Astronomy.MoonPhase(date);
  const fraction = (1 - Math.cos((phase * Math.PI) / 180)) / 2;
  return Math.round(fraction * 100);
}

function moonPhaseName(date) {
  const phase = Astronomy.MoonPhase(date);
  if (phase < 22.5 || phase >= 337.5) return 'New Moon';
  if (phase < 67.5) return 'Waxing Crescent';
  if (phase < 112.5) return 'First Quarter';
  if (phase < 157.5) return 'Waxing Gibbous';
  if (phase < 202.5) return 'Full Moon';
  if (phase < 247.5) return 'Waning Gibbous';
  if (phase < 292.5) return 'Last Quarter';
  return 'Waning Crescent';
}

export const isObjectAboveHorizon = object => object.altitudeDeg > 0;

export function isLikelyVisibleToNakedEye(object, skyOptions = {}) {
  if (!object.isAboveHorizon) return false;
  if (object.type === 'sun' || object.type === 'moon') return true;
  if (object.name === 'Uranus' || object.name === 'Neptune') return false;
  const limit = skyOptions.planetMagnitudeLimit ?? SKY_CONFIG.planetLabelMagnitudeLimit;
  return object.altitudeDeg > 5 && object.apparentMagnitude <= limit;
}

function explainVisibility(object) {
  if (!object.isAboveHorizon) return 'Below the horizon from your current location.';
  if (object.altitudeDeg < 8) return 'Very close to the horizon; buildings or haze may block it.';
  if (object.name === 'Uranus' || object.name === 'Neptune') return 'Usually requires optical aid.';
  if (object.type === 'sun') return 'Above horizon. Never look directly at the real Sun.';
  return 'Above horizon and bright enough for naked-eye viewing under good sky conditions.';
}

export function formatEphemerisForInfoPanel(object) {
  return `${object.name}: altitude ${object.altitudeDeg.toFixed(1)} deg, azimuth ${object.azimuthDeg.toFixed(1)} deg, magnitude ${object.apparentMagnitude}. ${object.visibilityExplanation}`;
}
