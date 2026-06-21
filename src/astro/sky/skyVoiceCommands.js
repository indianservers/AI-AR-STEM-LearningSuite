let recognition = null;

export function isVoiceCommandSupported() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startVoiceCommands(callback, options = {}) {
  if (!isVoiceCommandSupported()) return { ok: false, status: 'unsupported', message: 'Voice commands are not supported in this browser.' };
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  stopVoiceCommands();
  recognition = new SpeechRecognition();
  recognition.lang = options.lang || 'en-US';
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.onresult = event => {
    const text = event.results[event.results.length - 1]?.[0]?.transcript || '';
    callback?.(parseSkyVoiceCommand(text), text);
  };
  recognition.onerror = event => callback?.({ action: 'status', status: event.error || 'error' }, '');
  recognition.onend = () => options.onStatus?.('stopped');
  try {
    recognition.start();
    return { ok: true, status: 'listening', message: 'Listening for sky commands.' };
  } catch {
    return { ok: false, status: 'permission-denied', message: 'Voice command permission was denied or cancelled.' };
  }
}

export function stopVoiceCommands() {
  try { recognition?.stop?.(); } catch (_) {}
  recognition = null;
  return { ok: true, status: 'stopped' };
}

export function parseSkyVoiceCommand(text) {
  const q = String(text || '').toLowerCase();
  if (q.includes('jupiter')) return { action: 'find', query: 'Jupiter' };
  if (q.includes('moon')) return { action: 'find', query: 'Moon' };
  if (q.includes('venus')) return { action: 'find', query: 'Venus' };
  if (q.includes('show planets')) return { action: 'toggle', key: 'showPlanets', value: true };
  if (q.includes('constellation')) return { action: 'toggle', key: 'showConstellations', value: true };
  if (q.includes('start tour')) return { action: 'start-tour' };
  if (q.includes('stop tour')) return { action: 'stop-tour' };
  if (q.includes('night mode')) return { action: 'toggle', key: 'nightMode', value: true };
  if (q.includes('what am i looking at')) return { action: 'pointing' };
  if (q.includes('guide me')) return { action: 'guide' };
  if (q.includes('exit ar')) return { action: 'exit-ar' };
  return { action: 'unknown', query: text };
}

export function getVoiceCommandHelp() {
  return ['Find Jupiter', 'Find the Moon', 'Find Venus', 'Show planets', 'Show constellations', 'Start tour', 'Stop tour', 'Night mode', 'What am I looking at', 'Guide me', 'Exit AR'];
}
