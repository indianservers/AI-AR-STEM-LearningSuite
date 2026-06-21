// Educational constellation line art. These simplified patterns are for learning,
// not official constellation boundaries or scientific charting.
export const CONSTELLATION_CATALOG = [
  {
    id: 'orion', name: 'Orion', hemisphere: 'Equatorial', seasonHint: 'Northern winter / southern summer',
    visibilityNote: 'Look for the three belt stars in a row.', learningFact: 'Orion is one of the easiest constellations for beginners.',
    majorStars: ['Betelgeuse', 'Bellatrix', 'Alnitak', 'Alnilam', 'Mintaka', 'Rigel', 'Saiph'],
    lines: [['Betelgeuse', 'Bellatrix'], ['Betelgeuse', 'Alnitak'], ['Bellatrix', 'Mintaka'], ['Alnitak', 'Alnilam'], ['Alnilam', 'Mintaka'], ['Alnitak', 'Saiph'], ['Mintaka', 'Rigel'], ['Saiph', 'Rigel']],
    mythologyNote: 'Often pictured as a hunter.', studentChallenge: 'Find Orion Belt first, then identify Rigel and Betelgeuse.',
  },
  {
    id: 'ursa-major', name: 'Ursa Major', hemisphere: 'Northern', seasonHint: 'Best in northern spring',
    visibilityNote: 'The Big Dipper is the best-known part.', learningFact: 'Dubhe and Merak point toward Polaris.',
    majorStars: ['Dubhe', 'Merak', 'Phecda', 'Megrez', 'Alioth', 'Mizar', 'Alkaid'],
    lines: [['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'], ['Megrez', 'Dubhe'], ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid']],
    mythologyNote: 'Known as the Great Bear in many traditions.', studentChallenge: 'Use Merak and Dubhe to point to Polaris.',
  },
  {
    id: 'ursa-minor', name: 'Ursa Minor', hemisphere: 'Northern', seasonHint: 'Visible year-round for many northern observers',
    visibilityNote: 'Polaris marks the end of the Little Dipper handle.', learningFact: 'Polaris is useful for direction, but not the brightest star.',
    majorStars: ['Polaris', 'Kochab', 'Pherkad'], lines: [['Polaris', 'Kochab'], ['Kochab', 'Pherkad']],
    mythologyNote: 'Often pictured as the Little Bear.', studentChallenge: 'Compare Polaris brightness with Sirius.',
  },
  {
    id: 'cassiopeia', name: 'Cassiopeia', hemisphere: 'Northern', seasonHint: 'Northern autumn and winter',
    visibilityNote: 'Look for a W or M shape.', learningFact: 'Cassiopeia is opposite the Big Dipper around Polaris.',
    majorStars: ['Caph', 'Schedar', 'Ruchbah', 'Segin'], lines: [['Caph', 'Schedar'], ['Schedar', 'Ruchbah'], ['Ruchbah', 'Segin']],
    mythologyNote: 'Named for a queen in Greek mythology.', studentChallenge: 'Find the W shape and describe its orientation.',
  },
  {
    id: 'scorpius', name: 'Scorpius', hemisphere: 'Southern', seasonHint: 'Northern summer / southern winter',
    visibilityNote: 'Antares marks the heart of the scorpion.', learningFact: 'Antares looks reddish and is often compared with Mars.',
    majorStars: ['Antares', 'Shaula', 'Sargas'], lines: [['Antares', 'Shaula'], ['Shaula', 'Sargas']],
    mythologyNote: 'Often pictured as a scorpion.', studentChallenge: 'Find red Antares and compare its color with nearby stars.',
  },
  {
    id: 'taurus', name: 'Taurus', hemisphere: 'Northern', seasonHint: 'Northern winter',
    visibilityNote: 'Aldebaran marks the eye of the bull.', learningFact: 'Taurus lies near Orion in the sky.',
    majorStars: ['Aldebaran', 'Elnath'], lines: [['Aldebaran', 'Elnath']],
    mythologyNote: 'Often pictured as a bull.', studentChallenge: 'Find Taurus after locating Orion.',
  },
  {
    id: 'gemini', name: 'Gemini', hemisphere: 'Northern', seasonHint: 'Northern winter and spring',
    visibilityNote: 'Castor and Pollux are the twin stars.', learningFact: 'Pollux is an orange giant; Castor is a multiple-star system.',
    majorStars: ['Castor', 'Pollux'], lines: [['Castor', 'Pollux']],
    mythologyNote: 'The twins Castor and Pollux.', studentChallenge: 'Compare Castor and Pollux color and brightness.',
  },
  {
    id: 'leo', name: 'Leo', hemisphere: 'Northern', seasonHint: 'Northern spring',
    visibilityNote: 'Regulus marks the heart of Leo.', learningFact: 'Leo is a useful spring anchor constellation.',
    majorStars: ['Regulus', 'Denebola', 'Algieba'], lines: [['Regulus', 'Algieba'], ['Algieba', 'Denebola']],
    mythologyNote: 'Often pictured as a lion.', studentChallenge: 'Find Regulus and trace the lion shape.',
  },
  {
    id: 'cygnus', name: 'Cygnus', hemisphere: 'Northern', seasonHint: 'Northern summer',
    visibilityNote: 'Deneb, Sadr, and Albireo form a cross-like pattern.', learningFact: 'Deneb is part of the Summer Triangle.',
    majorStars: ['Deneb', 'Sadr', 'Albireo', 'Gienah'], lines: [['Deneb', 'Sadr'], ['Sadr', 'Albireo'], ['Sadr', 'Gienah']],
    mythologyNote: 'Often pictured as a swan.', studentChallenge: 'Trace the Northern Cross.',
  },
  {
    id: 'lyra', name: 'Lyra', hemisphere: 'Northern', seasonHint: 'Northern summer',
    visibilityNote: 'Vega is the bright anchor.', learningFact: 'Vega is one of the brightest stars in the northern sky.',
    majorStars: ['Vega'], lines: [], mythologyNote: 'Named for a lyre.', studentChallenge: 'Use Vega to start the Summer Triangle.',
  },
  {
    id: 'canis-major', name: 'Canis Major', hemisphere: 'Southern/Equatorial', seasonHint: 'Northern winter',
    visibilityNote: 'Sirius is the brightest night star.', learningFact: 'Sirius is close and intrinsically bright.',
    majorStars: ['Sirius', 'Mirzam', 'Wezen', 'Adhara', 'Aludra'], lines: [['Sirius', 'Mirzam'], ['Sirius', 'Wezen'], ['Wezen', 'Adhara'], ['Adhara', 'Aludra']],
    mythologyNote: "Orion's larger dog.", studentChallenge: 'Find Sirius, then compare it with Jupiter or Venus.',
  },
  {
    id: 'crux', name: 'Crux', hemisphere: 'Southern', seasonHint: 'Southern autumn',
    visibilityNote: 'The Southern Cross is compact and bright.', learningFact: 'Crux is important for southern-sky navigation traditions.',
    majorStars: ['Acrux', 'Mimosa', 'Gacrux'], lines: [['Acrux', 'Gacrux'], ['Mimosa', 'Gacrux']],
    mythologyNote: 'Known as the Southern Cross.', studentChallenge: 'Find the cross shape if visible from your latitude.',
  },
  {
    id: 'pegasus', name: 'Pegasus', hemisphere: 'Northern', seasonHint: 'Northern autumn',
    visibilityNote: 'Look for the Great Square.', learningFact: 'Pegasus helps find Andromeda.',
    majorStars: ['Markab', 'Scheat', 'Alpheratz'], lines: [['Markab', 'Scheat'], ['Scheat', 'Alpheratz']],
    mythologyNote: 'The winged horse.', studentChallenge: 'Use Pegasus to locate Andromeda.',
  },
  {
    id: 'andromeda', name: 'Andromeda', hemisphere: 'Northern', seasonHint: 'Northern autumn',
    visibilityNote: 'Mirach and Almach help trace the chain.', learningFact: 'The Andromeda Galaxy lies in this constellation.',
    majorStars: ['Alpheratz', 'Mirach', 'Almach'], lines: [['Alpheratz', 'Mirach'], ['Mirach', 'Almach']],
    mythologyNote: 'A princess in Greek mythology.', studentChallenge: 'Trace from Alpheratz to Mirach and Almach.',
  },
  {
    id: 'sagittarius', name: 'Sagittarius', hemisphere: 'Southern/Equatorial', seasonHint: 'Northern summer',
    visibilityNote: 'The Teapot asterism points toward the Milky Way center.', learningFact: 'The center of our galaxy lies in the direction of Sagittarius.',
    majorStars: ['Kaus Australis', 'Nunki'], lines: [['Kaus Australis', 'Nunki']],
    mythologyNote: 'Often pictured as an archer.', studentChallenge: 'Find Sagittarius in a dark summer sky.',
  },
];

export const findConstellationById = id => CONSTELLATION_CATALOG.find(item => item.id === id);
export const findConstellationByName = name => CONSTELLATION_CATALOG.find(item => item.name.toLowerCase() === name.toLowerCase());
