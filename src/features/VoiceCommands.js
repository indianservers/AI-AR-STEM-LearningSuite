// Feature 5: Voice Commands via Web Speech API
export class VoiceCommands {
  constructor(onCommand) {
    this._onCommand = onCommand;
    this._recognition = null;
    this._active = false;
    this._badge = null;
    this._init();
    this._buildBadge();
  }

  _init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    this._recognition = new SR();
    this._recognition.continuous = true;
    this._recognition.interimResults = false;
    this._recognition.lang = 'en-US';
    this._recognition.onresult = (event) => {
      const text = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      this._showBadge(text);
      this._dispatch(text);
    };
    this._recognition.onerror = (event) => {
      if (event.error !== 'no-speech') console.warn('[Voice]', event.error);
    };
    this._recognition.onend = () => {
      if (this._active) {
        try { this._recognition.start(); } catch (_) {}
      }
    };
  }

  _buildBadge() {
    const el = document.createElement('div');
    el.id = 'voice-badge';
    el.style.cssText = `
      position:fixed; bottom:160px; left:50%; transform:translateX(-50%);
      background:rgba(0,0,0,0.7); border:1px solid rgba(0,212,255,0.4);
      border-radius:20px; padding:6px 20px; font-size:0.78rem; color:#00d4ff;
      backdrop-filter:blur(8px); opacity:0; transition:opacity 0.3s;
      pointer-events:none; z-index:2000; white-space:nowrap;
    `;
    document.body.appendChild(el);
    this._badge = el;
  }

  _showBadge(text) {
    if (!this._badge) return;
    this._badge.textContent = 'Voice: "' + text + '"';
    this._badge.style.opacity = '1';
    clearTimeout(this._badgeTimer);
    this._badgeTimer = setTimeout(() => { this._badge.style.opacity = '0'; }, 2400);
  }

  _dispatch(text) {
    const map = [
      ['go home|show home|main menu', 'home'],
      ['go back|back', 'back'],
      ['reset|restart', 'reset'],
      ['take screenshot|screenshot|capture', 'screenshot'],
      ['open math|show math|math', 'nav:math'],
      ['open physics|show physics|physics', 'nav:physics'],
      ['open chemistry|show chemistry|chem', 'nav:chem'],
      ['periodic table', 'topic:periodic'],
      ['molecules|molecule viewer', 'topic:molecules'],
      ['atomic model|atom', 'topic:atomic'],
      ['wave lab|waves', 'topic:waves'],
      ['gravity|orbital', 'topic:gravity'],
      ['pendulum', 'topic:pendulum'],
      ['fractal', 'topic:fractal'],
      ['circuit', 'topic:circuit'],
      ['fluid', 'topic:fluid'],
      ['titration', 'topic:titration'],
      ['spectroscopy|spectrum', 'topic:spectro'],
      ['slow down|slower', 'speed:0.5'],
      ['speed up|faster', 'speed:2'],
      ['pause|stop', 'pause'],
      ['play|resume', 'play'],
      ['progress|dashboard', 'dashboard'],
      ['learning path|personal path|recommend|recommendation|next path', 'path'],
      ['loadout|tools|equipment|inventory', 'loadout'],
      ['avatar|cosmetic|cosmetics|profile', 'avatar'],
      ['wow|power|power surge|activate power|stem power', 'wow'],
      ['mixed reality|mr mode|mr spectacle|spectacle mode|room mode', 'mr'],
      ['campaign|director|story mode|chapter', 'campaign'],
      ['leaderboard|scoreboard|ladder|rank|ranking', 'ladder'],
      ['exam|quiz|test me', 'exam'],
      ['help|show hints|hint', 'hint'],
      ['concept map|prerequisites', 'conceptgraph'],
      ['draw|air draw', 'airdraw'],
    ];
    for (const [pattern, cmd] of map) {
      if (new RegExp(pattern).test(text)) {
        this._onCommand(cmd, text);
        return;
      }
    }
    this._onCommand('raw:' + text, text);
  }

  start() {
    if (!this._recognition) return;
    this._active = true;
    try { this._recognition.start(); } catch (_) {}
  }

  stop() {
    this._active = false;
    try { this._recognition.stop(); } catch (_) {}
  }

  get isSupported() {
    return Boolean(this._recognition);
  }
}
