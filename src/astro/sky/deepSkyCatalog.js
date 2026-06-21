import { raDecToAltAz } from './celestialMath.js';

// Educational deep-sky catalogue. Approximate coordinates and visibility notes. Not for scientific pointing.
export const DEEP_SKY_CATALOG = [
  ['m42', 'Orion Nebula', ['M42', 'NGC 1976'], 'nebula', 'Orion', 5.59, -5.4, 4.0, '65 x 60 arcmin', 1344, 'binoculars', 'Winter evenings', 'both', 'Bright nebula visible from dark suburban skies.'],
  ['m31', 'Andromeda Galaxy', ['M31', 'NGC 224'], 'galaxy', 'Andromeda', 0.71, 41.3, 3.4, '3 deg x 1 deg', 2537000, 'naked-eye', 'Autumn evenings', 'north', 'Large faint glow under dark skies.'],
  ['m45', 'Pleiades', ['M45', 'Seven Sisters'], 'open-cluster', 'Taurus', 3.79, 24.1, 1.6, '110 arcmin', 444, 'naked-eye', 'Winter evenings', 'both', 'Compact blue star cluster visible to the eye.'],
  ['hyades', 'Hyades', ['Caldwell 41'], 'open-cluster', 'Taurus', 4.45, 15.9, 0.5, '330 arcmin', 153, 'naked-eye', 'Winter evenings', 'both', 'Large V-shaped cluster around Aldebaran line of sight.'],
  ['m44', 'Beehive Cluster', ['M44', 'Praesepe'], 'open-cluster', 'Cancer', 8.67, 19.7, 3.7, '95 arcmin', 610, 'binoculars', 'Spring evenings', 'both', 'Looks like a misty patch in dark skies.'],
  ['m8', 'Lagoon Nebula', ['M8'], 'nebula', 'Sagittarius', 18.06, -24.4, 6.0, '90 x 40 arcmin', 4100, 'dark-sky', 'Northern summer / southern winter', 'south', 'Bright Milky Way nebula best from dark skies.'],
  ['m20', 'Trifid Nebula', ['M20'], 'nebula', 'Sagittarius', 18.04, -23.0, 6.3, '29 arcmin', 5200, 'small-telescope', 'Northern summer / southern winter', 'south', 'Nebula with dark lanes in telescope photos.'],
  ['m16', 'Eagle Nebula', ['M16'], 'nebula', 'Serpens', 18.31, -13.8, 6.4, '35 arcmin', 5700, 'small-telescope', 'Northern summer', 'both', 'Home of the Pillars of Creation region.'],
  ['m17', 'Omega Nebula', ['M17', 'Swan Nebula'], 'nebula', 'Sagittarius', 18.35, -16.2, 6.0, '20 arcmin', 5000, 'small-telescope', 'Northern summer', 'both', 'Bright emission nebula near the Milky Way core.'],
  ['m57', 'Ring Nebula', ['M57'], 'nebula', 'Lyra', 18.89, 33.0, 8.8, '1.4 arcmin', 2567, 'small-telescope', 'Summer evenings', 'north', 'Planetary nebula from a dying Sun-like star.'],
  ['m27', 'Dumbbell Nebula', ['M27'], 'nebula', 'Vulpecula', 19.99, 22.7, 7.5, '8 x 6 arcmin', 1360, 'small-telescope', 'Summer evenings', 'north', 'Large planetary nebula visible in binoculars under dark skies.'],
  ['m13', 'Hercules Globular Cluster', ['M13'], 'globular-cluster', 'Hercules', 16.69, 36.5, 5.8, '20 arcmin', 25100, 'binoculars', 'Summer evenings', 'north', 'Dense ancient swarm of stars.'],
  ['omega-centauri', 'Omega Centauri', ['NGC 5139'], 'globular-cluster', 'Centaurus', 13.45, -47.5, 3.9, '36 arcmin', 15800, 'naked-eye', 'Southern autumn', 'south', 'Largest bright globular cluster.'],
  ['carina-nebula', 'Carina Nebula', ['NGC 3372'], 'nebula', 'Carina', 10.75, -59.9, 1.0, '120 arcmin', 8500, 'dark-sky', 'Southern summer', 'south', 'Huge star-forming nebula of the southern sky.'],
  ['lmc', 'Large Magellanic Cloud', ['LMC'], 'galaxy', 'Dorado/Mensa', 5.39, -69.8, 0.9, '10 deg', 163000, 'naked-eye', 'Southern summer', 'south', 'Satellite galaxy of the Milky Way.'],
  ['smc', 'Small Magellanic Cloud', ['SMC'], 'galaxy', 'Tucana', 0.87, -72.8, 2.7, '5 deg', 200000, 'naked-eye', 'Southern spring', 'south', 'Small satellite galaxy near Tucana.'],
  ['m104', 'Sombrero Galaxy', ['M104'], 'galaxy', 'Virgo', 12.67, -11.6, 8.0, '9 x 4 arcmin', 29300000, 'small-telescope', 'Spring evenings', 'both', 'Edge-on galaxy with a dark dust lane.'],
  ['m51', 'Whirlpool Galaxy', ['M51'], 'galaxy', 'Canes Venatici', 13.50, 47.2, 8.4, '11 x 7 arcmin', 31000000, 'small-telescope', 'Spring evenings', 'north', 'Interacting spiral galaxy pair.'],
  ['m33', 'Triangulum Galaxy', ['M33'], 'galaxy', 'Triangulum', 1.56, 30.7, 5.7, '70 x 40 arcmin', 2730000, 'dark-sky', 'Autumn evenings', 'north', 'Large low-surface-brightness galaxy.'],
  ['double-cluster', 'Double Cluster', ['NGC 869', 'NGC 884'], 'open-cluster', 'Perseus', 2.35, 57.1, 4.3, '60 arcmin', 7500, 'binoculars', 'Autumn evenings', 'north', 'Two bright clusters in the Milky Way.'],
  ['north-america-nebula', 'North America Nebula', ['NGC 7000'], 'nebula', 'Cygnus', 20.99, 44.3, 4.0, '120 x 100 arcmin', 2590, 'dark-sky', 'Summer evenings', 'north', 'Huge faint nebula near Deneb.'],
  ['rosette-nebula', 'Rosette Nebula', ['NGC 2237'], 'nebula', 'Monoceros', 6.53, 5.0, 9.0, '80 arcmin', 5200, 'large-telescope', 'Winter evenings', 'both', 'Flower-shaped star-forming region.'],
  ['m1', 'Crab Nebula', ['M1'], 'nebula', 'Taurus', 5.58, 22.0, 8.4, '6 x 4 arcmin', 6500, 'small-telescope', 'Winter evenings', 'north', 'Supernova remnant observed in 1054.'],
  ['horsehead-nebula', 'Horsehead Nebula', ['Barnard 33'], 'nebula', 'Orion', 5.68, -2.5, 10.0, '8 x 6 arcmin', 1375, 'large-telescope', 'Winter evenings', 'both', 'Famous dark nebula; difficult visually.'],
  ['milky-way-core', 'Milky Way Core Region', ['Galactic Center region'], 'milky-way-region', 'Sagittarius', 17.75, -29.0, 4.0, '20 deg', 27000, 'dark-sky', 'Northern summer / southern winter', 'south', 'Dense star clouds toward the center of our galaxy.'],
].map(([id, name, catalogNames, objectType, constellation, rightAscensionHours, declinationDeg, apparentMagnitude, angularSize, distanceLightYears, bestSeenWith, seasonHint, hemisphere, visibilityNote]) => ({
  id,
  name,
  catalogNames,
  objectType,
  type: 'deep-sky',
  constellation,
  rightAscensionHours,
  declinationDeg,
  apparentMagnitude,
  angularSize,
  distanceLightYears,
  bestSeenWith,
  seasonHint,
  hemisphere,
  visibilityNote,
  learningFact: `${name} helps show that the night sky contains objects far beyond individual nearby stars.`,
  studentChallenge: `Find ${name}'s direction, then decide what equipment would make it easier to observe.`,
  teacherNote: 'Emphasize that deep-sky visibility depends strongly on darkness, Moonlight, optics, and patience.',
}));

const equipmentRank = { 'naked-eye': 1, binoculars: 2, 'small-telescope': 3, 'large-telescope': 4, 'dark-sky': 4 };

export function getVisibleDeepSkyObjects(date, observerLocation, options = {}) {
  const magnitudeLimit = options.magnitudeLimit ?? 9;
  const lightPollution = options.lightPollution ?? 'suburban';
  const moonIllumination = options.moonIlluminationPercent ?? 35;
  const allowedEquipment = options.bestSeenWith || null;
  return DEEP_SKY_CATALOG.map(object => {
    const altAz = raDecToAltAz(object.rightAscensionHours, object.declinationDeg, date, observerLocation.latitude, observerLocation.longitude);
    const moonPenalty = moonIllumination > 70 && ['nebula', 'galaxy'].includes(object.objectType) ? 1.2 : 0;
    const lightPenalty = lightPollution === 'urban' ? 1.5 : lightPollution === 'dark' ? -0.6 : 0.4;
    const effectiveMagnitude = object.apparentMagnitude + moonPenalty + lightPenalty;
    const isAboveHorizon = altAz.altitudeDeg > 0;
    const visibilityGrade = !isAboveHorizon ? 'hidden' : effectiveMagnitude <= 4 ? 'easy' : effectiveMagnitude <= magnitudeLimit ? 'challenging' : 'difficult';
    return { ...object, ...altAz, isAboveHorizon, effectiveMagnitude, visibilityGrade };
  }).filter(object => {
    if (options.showBelowHorizon !== true && !object.isAboveHorizon) return false;
    if (object.effectiveMagnitude > magnitudeLimit + 1.5) return false;
    if (allowedEquipment && equipmentRank[object.bestSeenWith] > equipmentRank[allowedEquipment]) return false;
    return true;
  });
}

export const findDeepSkyObjectById = id => DEEP_SKY_CATALOG.find(object => object.id === id);

export function findDeepSkyObjectByName(name) {
  const q = String(name || '').toLowerCase();
  return DEEP_SKY_CATALOG.find(object => [object.name, object.id, ...object.catalogNames].some(value => String(value).toLowerCase() === q));
}

export function filterDeepSkyObjects(filters = {}) {
  return DEEP_SKY_CATALOG.filter(object => {
    if (filters.objectType && object.objectType !== filters.objectType) return false;
    if (filters.bestSeenWith && object.bestSeenWith !== filters.bestSeenWith) return false;
    if (filters.hemisphere && object.hemisphere !== 'both' && object.hemisphere !== filters.hemisphere) return false;
    return true;
  });
}
