import { STAR_CATALOG } from '../data/starCatalog.js';
import { SKY_CONFIG } from './skyConfig.js';
import { raDecToAltAz } from './celestialMath.js';
import { projectObjectToDome, spectralTypeToColor } from './skyProjection.js';

// Educational naked-eye star catalogue.
// Coordinates and magnitudes are approximate and intended for visualization.
// This data is not for navigation, telescope pointing, or scientific astrometry.
const EXTRA_STARS = [
  ['Denebola', 'Beta Leonis', 'Leo', 11.82, 14.6, 2.14, 36, 'A3V'],
  ['Hamal', 'Alpha Arietis', 'Aries', 2.12, 23.5, 2.0, 66, 'K2III'],
  ['Algol', 'Beta Persei', 'Perseus', 3.14, 41.0, 2.1, 90, 'B8V'],
  ['Peacock', 'Alpha Pavonis', 'Pavo', 20.43, -56.7, 1.94, 179, 'B2IV'],
  ['Nunki', 'Sigma Sagittarii', 'Sagittarius', 18.92, -26.3, 2.05, 228, 'B2.5V'],
  ['Enif', 'Epsilon Pegasi', 'Pegasus', 21.74, 9.9, 2.39, 690, 'K2Ib'],
  ['Markab', 'Alpha Pegasi', 'Pegasus', 23.08, 15.2, 2.49, 133, 'B9V'],
  ['Scheat', 'Beta Pegasi', 'Pegasus', 23.06, 28.1, 2.42, 196, 'M2II'],
  ['Alpheratz', 'Alpha Andromedae', 'Andromeda', 0.14, 29.1, 2.07, 97, 'B9p'],
  ['Mirach', 'Beta Andromedae', 'Andromeda', 1.16, 35.6, 2.05, 200, 'M0III'],
  ['Almach', 'Gamma Andromedae', 'Andromeda', 2.06, 42.3, 2.1, 350, 'K3II'],
  ['Ras Alhague', 'Alpha Ophiuchi', 'Ophiuchus', 17.58, 12.6, 2.08, 47, 'A5III'],
  ['Sabik', 'Eta Ophiuchi', 'Ophiuchus', 17.17, -15.7, 2.43, 88, 'A2V'],
  ['Rasalgethi', 'Alpha Herculis', 'Hercules', 17.24, 14.4, 3.1, 360, 'M5Ib'],
  ['Gienah', 'Epsilon Cygni', 'Cygnus', 20.77, 34.0, 2.48, 73, 'K0III'],
  ['Alphecca', 'Alpha Coronae Borealis', 'Corona Borealis', 15.58, 26.7, 2.22, 75, 'A0V'],
  ['Izar', 'Epsilon Bootis', 'Bootes', 14.75, 27.1, 2.35, 203, 'K0II'],
  ['Diphda', 'Beta Ceti', 'Cetus', 0.73, -18.0, 2.04, 96, 'K0III'],
  ['Menkar', 'Alpha Ceti', 'Cetus', 3.04, 4.1, 2.54, 250, 'M2III'],
  ['Zubenelgenubi', 'Alpha Librae', 'Libra', 14.85, -16.0, 2.75, 77, 'A3IV'],
  ['Zubeneschamali', 'Beta Librae', 'Libra', 15.28, -9.4, 2.61, 185, 'B8V'],
  ['Unukalhai', 'Alpha Serpentis', 'Serpens', 15.74, 6.4, 2.63, 74, 'K2III'],
  ['Mirzam', 'Beta Canis Majoris', 'Canis Major', 6.38, -18.0, 1.98, 500, 'B1II'],
  ['Porrima', 'Gamma Virginis', 'Virgo', 12.69, -1.4, 2.74, 38, 'F0V'],
  ['Vindemiatrix', 'Epsilon Virginis', 'Virgo', 13.04, 10.9, 2.83, 110, 'G8III'],
  ['Alphard', 'Alpha Hydrae', 'Hydra', 9.46, -8.7, 1.99, 177, 'K3II'],
  ['Suhail', 'Lambda Velorum', 'Vela', 9.13, -43.4, 2.21, 570, 'K4Ib'],
  ['Naos', 'Zeta Puppis', 'Puppis', 8.06, -40.0, 2.21, 1080, 'O4I'],
  ['Aludra', 'Eta Canis Majoris', 'Canis Major', 7.4, -29.3, 2.45, 2000, 'B5Ia'],
  ['Rigil Kentaurus', 'Alpha Centauri A', 'Centaurus', 14.66, -60.8, -0.01, 4.37, 'G2V'],
].map(([name, bayerName, constellation, rightAscensionHours, declinationDeg, apparentMagnitude, distanceLightYears, spectralType]) => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  bayerName,
  constellation,
  rightAscensionHours,
  declinationDeg,
  apparentMagnitude,
  distanceLightYears,
  spectralType,
  colorHint: '#eef4ff',
  learningFact: `${name} is a bright naked-eye reference star in ${constellation}.`,
}));

export const NAKED_EYE_STAR_CATALOG = [...STAR_CATALOG, ...EXTRA_STARS].map((star, index) => ({
  id: star.id || star.name.toLowerCase().replace(/\s+/g, '-'),
  ...star,
  labelPriority: index,
}));

export function getVisibleStars(date, observerLocation, options = {}) {
  const magnitudeLimit = options.magnitudeLimit ?? SKY_CONFIG.defaultMagnitudeLimit;
  const showBelowHorizon = options.showBelowHorizon ?? SKY_CONFIG.showBelowHorizonDefault;
  return NAKED_EYE_STAR_CATALOG
    .filter(star => star.apparentMagnitude <= magnitudeLimit)
    .map(star => {
      const altAz = raDecToAltAz(star.rightAscensionHours, star.declinationDeg, date, observerLocation.latitude, observerLocation.longitude);
      const isAboveHorizon = altAz.altitudeDeg > 0;
      return {
        id: `star-${star.id}`,
        name: star.name,
        type: 'star',
        subtype: 'naked-eye star',
        source: 'star-catalog',
        constellation: star.constellation,
        rightAscensionHours: star.rightAscensionHours,
        declinationDeg: star.declinationDeg,
        altitudeDeg: altAz.altitudeDeg,
        azimuthDeg: altAz.azimuthDeg,
        apparentMagnitude: star.apparentMagnitude,
        distanceLightYears: star.distanceLightYears,
        distanceText: `${star.distanceLightYears} ly`,
        spectralType: star.spectralType,
        color: spectralTypeToColor(star.spectralType),
        labelPriority: star.labelPriority,
        learningFact: star.learningFact,
        isAboveHorizon,
        isNakedEyeVisible: isAboveHorizon && star.apparentMagnitude <= magnitudeLimit,
        visibilityExplanation: isAboveHorizon ? 'Above horizon under good dark-sky conditions.' : 'Below the horizon from your current location.',
        cartesianPosition: projectObjectToDome({ altitudeDeg: altAz.altitudeDeg, azimuthDeg: altAz.azimuthDeg }, SKY_CONFIG.skyRadius),
      };
    })
    .filter(star => showBelowHorizon || star.isAboveHorizon);
}

export const findStarById = id => NAKED_EYE_STAR_CATALOG.find(star => star.id === id || `star-${star.id}` === id);
export const findStarByName = name => NAKED_EYE_STAR_CATALOG.find(star => star.name.toLowerCase() === name.toLowerCase());
