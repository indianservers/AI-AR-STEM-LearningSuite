import { azimuthToDirectionText } from './skySearch.js';

const PLAN_KEY = 'astroSkyObservationPlan';

const readPlan = () => {
  try { return JSON.parse(localStorage.getItem(PLAN_KEY) || '[]'); }
  catch { return []; }
};
const writePlan = plan => localStorage.setItem(PLAN_KEY, JSON.stringify(plan.slice(0, 40)));

export function createObservationPlan(date, observerLocation, options = {}) {
  const ranked = rankObservationTargets(options.objects || [], { date, observerLocation }).slice(0, 6);
  const plan = ranked.map(object => createPlanItem(object, date, 'Auto-suggested for tonight.'));
  writePlan(plan);
  return plan;
}

export function addObjectToObservationPlan(object, dateTime = new Date(), note = '') {
  if (!object) return null;
  const plan = readPlan();
  const item = createPlanItem(object, dateTime, note);
  writePlan([item, ...plan.filter(existing => existing.objectId !== object.id)]);
  return item;
}

export function removeObjectFromObservationPlan(planItemId) {
  const next = readPlan().filter(item => item.id !== planItemId);
  writePlan(next);
  return next;
}

export const getObservationPlan = () => readPlan();
export function clearObservationPlan() { writePlan([]); return []; }

export function rankObservationTargets(objects, context = {}) {
  return [...objects].filter(object => object.isAboveHorizon && object.type !== 'sun').sort((a, b) => scoreObject(b) - scoreObject(a));
}

export function formatObservationPlan(plan) {
  return plan.map((item, index) => `${index + 1}. ${item.objectName} - ${item.directionHint} - ${item.equipmentHint}`).join('\n');
}

export function markObservationPlanItem(planItemId, completed = true) {
  const next = readPlan().map(item => item.id === planItemId ? { ...item, completed } : item);
  writePlan(next);
  return next;
}

function createPlanItem(object, dateTime, note) {
  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    objectId: object.id,
    objectName: object.name,
    objectType: object.type || object.objectType,
    plannedDateTime: new Date(dateTime).toISOString(),
    bestTimeHint: object.altitudeDeg > 35 ? 'Good now' : 'Try when higher above the horizon',
    directionHint: object.azimuthDeg == null ? 'Use search and guide mode' : `${Math.round(object.altitudeDeg)} deg above ${azimuthToDirectionText(object.azimuthDeg)}`,
    difficulty: object.visibilityGrade || (object.bestSeenWith === 'naked-eye' ? 'easy' : 'moderate'),
    equipmentHint: object.bestSeenWith || (object.type === 'deep-sky' ? 'binoculars or dark sky' : 'naked eye'),
    visibilityGrade: object.visibilityGrade || 'estimate',
    note,
    completed: false,
  };
}

function scoreObject(object) {
  let score = Math.max(0, object.altitudeDeg || 0);
  if (object.name === 'Jupiter' || object.name === 'Moon' || object.name === 'Venus') score += 40;
  if (object.type === 'deep-sky' && ['m42', 'm45', 'm31'].includes(object.id)) score += 28;
  score -= (object.apparentMagnitude || 4) * 2;
  return score;
}
