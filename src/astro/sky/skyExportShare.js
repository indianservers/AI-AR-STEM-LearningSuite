import { formatObservationPlan } from './observationPlanner.js';
import { azimuthToDirectionText } from './skySearch.js';

export function createSkySnapshotSummary(state, selectedObject, context = {}) {
  if (!selectedObject) return 'No sky object selected.';
  const direction = selectedObject.azimuthDeg == null ? 'the selected direction' : `${Math.round(selectedObject.altitudeDeg)} degrees altitude toward ${azimuthToDirectionText(selectedObject.azimuthDeg)}`;
  const date = state.currentDateTime ? new Date(state.currentDateTime).toLocaleString() : new Date().toLocaleString();
  const location = formatRoundedLocation(state.observerLocation);
  const safety = selectedObject.type === 'sun'
    ? 'Safety: never look directly at the Sun, especially through binoculars or telescopes without certified solar filters.'
    : selectedObject.type === 'meteor-shower'
      ? 'Safety: meteor showers are best viewed with eyes, not telescopes.'
      : 'Safety: visibility depends on weather, light pollution, horizon obstruction, twilight, and eyesight.';
  return [
    `${selectedObject.name} is ${selectedObject.isAboveHorizon ? 'visible' : 'not above the horizon'} at ${direction}.`,
    `Date/time: ${date}.`,
    `Approximate location: ${location}.`,
    selectedObject.visibilityExplanation || selectedObject.visibilityNote || selectedObject.learningFact || '',
    safety,
    'Student reflection: What evidence did you use to identify this object?',
  ].filter(Boolean).join('\n');
}

export async function copySkySummaryToClipboard(summary) {
  await navigator.clipboard?.writeText(summary);
  return summary;
}

export function downloadObservationPlan(plan, context = {}) {
  const header = [
    'CosmicLearn Observation Plan',
    `Created: ${new Date().toLocaleString()}`,
    `Approximate location: ${formatRoundedLocation(context.observerLocation)}`,
    'Safety: never look directly at the Sun; meteor showers are best viewed with eyes, not telescopes.',
    'Reflection: After observing, note what matched or differed from the prediction.',
    '',
  ].join('\n');
  return downloadText('cosmiclearn-observation-plan.txt', `${header}${formatObservationPlan(plan)}`);
}

export function downloadLearningSessionSummary(summary) {
  const safeSummary = {
    ...summary,
    exportedAt: new Date().toISOString(),
    note: 'Local text-only learning session export. No camera frames, audio, or video are included.',
  };
  return downloadText('cosmiclearn-sky-session.json', JSON.stringify(safeSummary || {}, null, 2));
}

export async function shareSkyObject(object, context = {}) {
  const text = createSkySnapshotSummary(context.state || {}, object, context);
  if (navigator.share) {
    await navigator.share({ title: object?.name || 'CosmicLearn Sky Object', text });
    return { shared: true };
  }
  await copySkySummaryToClipboard(text);
  return { shared: false, copied: true };
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { filename };
}

function formatRoundedLocation(location = {}) {
  if (location.latitude == null || location.longitude == null) return 'not available';
  return `${Number(location.latitude).toFixed(2)}, ${Number(location.longitude).toFixed(2)} (${location.source || 'local'})`;
}
