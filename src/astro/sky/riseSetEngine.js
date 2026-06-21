import { raDecToAltAz } from './celestialMath.js';

export function getRiseSetTransit(objectId, date, observerLocation, object = null) {
  if (!object?.rightAscensionHours && object?.rightAscensionHours !== 0) return { objectId, note: 'Rise/set unavailable for this object.' };
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const samples = [];
  for (let hour = 0; hour <= 24; hour += 1) {
    const t = new Date(dayStart.getTime() + hour * 3600000);
    const altAz = raDecToAltAz(object.rightAscensionHours, object.declinationDeg, t, observerLocation.latitude, observerLocation.longitude);
    samples.push({ time: t, altitudeDeg: altAz.altitudeDeg });
  }
  const above = samples.filter(sample => sample.altitudeDeg >= 0);
  if (above.length === 0) return { objectId, status: 'below horizon', note: `${object.name} stays below the horizon in this rough daily estimate.` };
  if (above.length === samples.length) return { objectId, status: 'circumpolar', note: `${object.name} may be circumpolar from this latitude.` };
  const rise = samples.find((sample, index) => index > 0 && samples[index - 1].altitudeDeg < 0 && sample.altitudeDeg >= 0)?.time;
  const set = samples.find((sample, index) => index > 0 && samples[index - 1].altitudeDeg >= 0 && sample.altitudeDeg < 0)?.time;
  const transit = samples.reduce((best, sample) => sample.altitudeDeg > best.altitudeDeg ? sample : best, samples[0]).time;
  return { objectId, status: object.isAboveHorizon ? 'above horizon' : 'below horizon', rise, set, transit, note: 'Educational one-hour sampled approximation.' };
}

export function getTodayRiseSetSummary(objects, date, observerLocation) {
  return objects.map(object => ({ object, ...getRiseSetTransit(object.id, date, observerLocation, object) }));
}

export function formatRiseSetTime(date) {
  if (!date) return 'not today';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function formatRiseSetSummary(summary) {
  if (!summary) return 'Rise/set unavailable.';
  if (summary.status === 'circumpolar') return summary.note;
  return `Rises ${formatRiseSetTime(summary.rise)}, highest ${formatRiseSetTime(summary.transit)}, sets ${formatRiseSetTime(summary.set)}.`;
}
