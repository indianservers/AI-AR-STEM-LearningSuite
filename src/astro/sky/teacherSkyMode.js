export function createTeacherSkySession(context = {}) {
  return { active: true, startedAt: Date.now(), topic: context.topic || 'sky-map', bigLabels: true };
}

export function getTeacherPrompts(topic) {
  const prompts = {
    motion: 'Ask students why stars appear to move.',
    moon: 'Ask students why the Moon changes phase.',
    jupiter: 'Ask students why Jupiter looks like a star but is a planet.',
    polaris: 'Ask students why Polaris appears almost fixed.',
    location: 'Ask students why location changes the sky.',
  };
  return prompts[topic] || prompts.motion;
}

export function getClassroomQuestions(objectOrTopic) {
  const name = objectOrTopic?.name || objectOrTopic || 'the sky';
  return [
    `Where is ${name}: altitude, direction, or both?`,
    'What is calculated by astronomy, and what is estimated by phone sensors?',
    'What would change if we moved to another city?',
  ];
}

export function getMisconceptionCards(topic) {
  return [
    'The North Star is not the brightest star.',
    'The Moon reflects sunlight; it does not make its own light.',
    'Planets usually shine steadily compared with twinkling stars.',
    'The sky is not the same everywhere on Earth.',
    'AR alignment is approximate, not exact.',
  ];
}

export function formatTeacherExplanation(topic) {
  return topic === 'altaz'
    ? 'Altitude tells how high above the horizon; azimuth tells compass direction.'
    : 'Use this mode to spotlight evidence, direction, and model limitations.';
}
