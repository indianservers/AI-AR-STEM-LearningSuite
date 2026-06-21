export const isSpeechSupported = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';

export function buildVoiceGuideText(event, context = {}) {
  if (typeof event === 'string') return buildShortInstruction(event);
  if (event?.title) return buildShortInstruction(`${event.title}. ${event.explanation || ''}`);
  if (context.selectedObject) return `${context.selectedObject.name}. ${context.selectedObject.visibilityExplanation}`;
  return 'Sky guide ready.';
}

export function buildShortInstruction(text) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, 150);
}

export function buildTourNarration(step, context = {}) {
  if (!step) return 'Tour stopped.';
  return buildShortInstruction(`${step.title}. Step ${step.index + 1}. ${step.text}`);
}

export function speakTextIfEnabled(text, options = {}) {
  if (!options.enabled || !isSpeechSupported()) return false;
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(buildShortInstruction(text));
  utterance.rate = options.rate || 1;
  speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (isSpeechSupported()) speechSynthesis.cancel();
}
