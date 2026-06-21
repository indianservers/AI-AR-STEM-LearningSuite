export function getBeginnerExplanation(topic) {
  const text = {
    magnitude: 'Magnitude scale is reversed: a smaller number means a brighter object.',
    sensors: 'Phone sensors help point the view, but compass alignment is approximate.',
    planets: 'Planets are wanderers because they slowly shift against the background stars.',
  };
  return text[topic] || 'Stars appear to move because Earth rotates.';
}

export function getSkyMapTutorialSteps() {
  return [
    'Enable Location.',
    'Enable Sensors on mobile.',
    'Search Jupiter or Moon.',
    'Tap Guide Me.',
    'Move phone slowly.',
    'Tap object for explanation.',
    'Use Time Travel to see sky motion.',
  ];
}

export function getARSkyTutorialSteps() {
  return [
    'Enable Location.',
    'Enable Phone Sensors.',
    'Tap Camera Overlay or Start AR Sky.',
    'Search Jupiter or Moon.',
    'Tap Guide Me.',
    'Move slowly.',
    'Calibrate if labels appear shifted.',
    'Tap labels to learn.',
    'Exit AR when finished.',
  ];
}

export function getARAlignmentExplanation() {
  return [
    'Phone compass readings can drift or jump.',
    'Nearby metal objects and electronics can affect heading.',
    'Browser sensor access varies by device.',
    'Location accuracy changes where objects appear.',
    'Manual calibration can reduce overlay shift, but it is still approximate.',
  ];
}

export function getObjectChallenge(object) {
  if (!object) return 'Search Jupiter, Moon, Sirius, or Orion.';
  if (object.name === 'Jupiter') return "Compare Jupiter's position tonight with tomorrow night.";
  if (object.type === 'moon') return "Predict tomorrow's Moon position at the same time.";
  return `Explain why ${object.name} is visible or hidden now.`;
}

export function getMisconceptionCorrection(topic) {
  const map = {
    dome: 'Stars are not fixed on a dome; they only appear projected on the sky.',
    earthRotation: 'Stars appear to move because Earth rotates.',
    moonLight: 'The Moon does not produce its own light; it reflects sunlight.',
    polaris: 'The North Star is not the brightest star.',
  };
  return map[topic] || 'This sky map is educational and approximate.';
}

export function getTeacherPrompt(topic) {
  return topic === 'guidance'
    ? 'Ask students to state altitude, direction, and evidence before moving the phone.'
    : 'Ask students what the model calculates and what the sensors only estimate.';
}
