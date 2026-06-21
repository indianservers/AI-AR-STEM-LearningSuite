export const TELESCOPE_TARGETS = [
  {
    id: 'moon', name: 'Moon', objectType: 'Natural satellite', bestSeenWith: 'Binoculars or any telescope',
    apparentVisualDescription: 'Bright grey disc with craters and darker maria.', learningFact: 'The Moon shines by reflected sunlight.',
    recommendedMagnification: 80, fieldOfViewNote: 'Low to medium power shows the full Moon best.', difficulty: 'Easy',
  },
  {
    id: 'jupiter', name: 'Jupiter', objectType: 'Gas giant', bestSeenWith: 'Small telescope',
    apparentVisualDescription: 'Striped pale disc; moons may appear as points nearby.', learningFact: 'Jupiter is the largest planet.',
    recommendedMagnification: 120, fieldOfViewNote: 'Medium power balances detail and brightness.', difficulty: 'Easy',
  },
  {
    id: 'saturn', name: 'Saturn', objectType: 'Gas giant', bestSeenWith: 'Small telescope',
    apparentVisualDescription: 'Small golden disc with a ring system.', learningFact: "Saturn's rings are made of many icy pieces.",
    recommendedMagnification: 140, fieldOfViewNote: 'Higher power helps separate rings from the planet.', difficulty: 'Medium',
  },
  {
    id: 'mars', name: 'Mars', objectType: 'Rocky planet', bestSeenWith: 'Telescope during opposition',
    apparentVisualDescription: 'Small reddish disc, sometimes with dark markings.', learningFact: 'Mars looks red because of iron-rich dust.',
    recommendedMagnification: 150, fieldOfViewNote: 'Mars needs steady air and careful focus.', difficulty: 'Medium',
  },
  {
    id: 'orion-nebula', name: 'Orion Nebula', objectType: 'Nebula', bestSeenWith: 'Binoculars or low-power telescope',
    apparentVisualDescription: 'Soft glowing cloud in Orion.', learningFact: 'A stellar nursery where new stars form.',
    recommendedMagnification: 50, fieldOfViewNote: 'Low power preserves the wide glowing shape.', difficulty: 'Easy',
  },
  {
    id: 'andromeda', name: 'Andromeda Galaxy', objectType: 'Galaxy', bestSeenWith: 'Binoculars under dark skies',
    apparentVisualDescription: 'Large faint oval glow.', learningFact: 'The nearest large spiral galaxy to the Milky Way.',
    recommendedMagnification: 35, fieldOfViewNote: 'A wide field is better because Andromeda is large.', difficulty: 'Medium',
  },
  {
    id: 'pleiades', name: 'Pleiades Star Cluster', objectType: 'Star cluster', bestSeenWith: 'Binoculars',
    apparentVisualDescription: 'Tight group of blue-white stars.', learningFact: 'An open cluster of young hot stars.',
    recommendedMagnification: 25, fieldOfViewNote: 'Very low power keeps the cluster together in view.', difficulty: 'Easy',
  },
];
