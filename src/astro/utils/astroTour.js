export function createTour(steps = []) {
  return { steps, index: 0, active: false, paused: false };
}

export function startTour(tour) {
  tour.active = true;
  tour.paused = false;
  tour.index = 0;
  return tour.steps[0] || null;
}

export function nextTourStep(tour) {
  if (!tour.active) return null;
  tour.index = Math.min(tour.steps.length - 1, tour.index + 1);
  return tour.steps[tour.index] || null;
}

export function previousTourStep(tour) {
  if (!tour.active) return null;
  tour.index = Math.max(0, tour.index - 1);
  return tour.steps[tour.index] || null;
}

export function pauseTour(tour) {
  tour.paused = !tour.paused;
  return tour.paused;
}

export function exitTour(tour) {
  tour.active = false;
  tour.paused = false;
  return null;
}
