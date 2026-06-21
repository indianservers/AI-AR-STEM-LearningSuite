let activeTour = null;
let activeStepIndex = 0;

const TOURS = [
  { id: 'find-jupiter', title: 'Find Jupiter', target: 'Jupiter', steps: ['Check whether Jupiter is above the horizon.', 'Show where to look.', 'Guide phone movement.', 'Jupiter looks like a bright steady point.', "Challenge: observe Jupiter tomorrow and compare its position."] },
  { id: 'moon-tonight', title: 'Moon Tonight', target: 'Moon', steps: ['Locate the Moon.', 'Show phase and illumination.', 'The Moon reflects sunlight.', 'Check rise and set if available.', 'Challenge: check the Moon again tomorrow.'] },
  { id: 'bright-planets', title: 'Bright Planets', target: 'Jupiter', steps: ['Identify visible planets.', 'Compare Venus, Mars, Jupiter, and Saturn.', 'Planets shift against background stars.', 'Challenge: find the brightest planet.'] },
  { id: 'orion-guide', title: 'Orion Guide', target: 'Orion', steps: ['Check Orion visibility.', 'Highlight Betelgeuse, Rigel, and Belt stars.', 'Trace the constellation pattern.', 'Compare star colors.', "Challenge: find Orion's Belt."] },
  { id: 'polaris', title: 'North Star / Polaris', target: 'Polaris', steps: ['Locate Polaris if visible.', 'Show north direction.', 'Polaris appears nearly fixed because it is near the north celestial pole.', 'Challenge: compare with other stars over time.'] },
  { id: 'beginner-sky', title: 'Beginner Sky Tour', target: 'Moon', steps: ['Enable location.', 'Enable sensors.', 'Find Moon or Jupiter.', 'Learn horizon and zenith.', 'Use time travel to see sky motion.'] },
];

export function getAvailableSkyTours() {
  return TOURS;
}

export function startSkyTour(tourId, context = {}) {
  activeTour = TOURS.find(tour => tour.id === tourId) || TOURS[0];
  activeStepIndex = 0;
  return getCurrentTourStep();
}

export function stopSkyTour() {
  const stopped = activeTour;
  activeTour = null;
  activeStepIndex = 0;
  return stopped;
}

export function nextTourStep() {
  if (!activeTour) return null;
  activeStepIndex = Math.min(activeTour.steps.length - 1, activeStepIndex + 1);
  return getCurrentTourStep();
}

export function previousTourStep() {
  if (!activeTour) return null;
  activeStepIndex = Math.max(0, activeStepIndex - 1);
  return getCurrentTourStep();
}

export function getCurrentTourStep() {
  if (!activeTour) return null;
  return {
    tourId: activeTour.id,
    title: activeTour.title,
    target: activeTour.target,
    index: activeStepIndex,
    total: activeTour.steps.length,
    text: activeTour.steps[activeStepIndex],
  };
}

export function buildTourStepGuidance(step, skyObjects, context = {}) {
  if (!step) return null;
  const target = skyObjects.find(object => object.name === step.target || object.constellation === step.target);
  if (target && !target.isAboveHorizon) return { ...step, target, guidance: `${target.name} is below the horizon. Try a visible highlight instead.` };
  return { ...step, target, guidance: target ? `Guide to ${target.name}: ${target.visibilityExplanation}` : step.text };
}
