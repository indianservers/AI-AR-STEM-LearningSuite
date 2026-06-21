// Feature 1: AI Tutor - Web Speech Synthesis + optional hosted backend
export class AITutor {
  constructor(config = {}) {
    this._apiKey = config.apiKey || null;
    this._apiUrl = config.apiUrl || 'https://api.anthropic.com/v1/messages';
    this._voice = null;
    this._context = 'home';
    this._learningState = {
      subject: null,
      topic: null,
      mode: 'learn',
      object: null,
      lastGesture: null,
      lastIntent: null,
      observations: [],
      gestureCounts: {},
    };
    this._el = null;
    this._coachEl = null;
    this._quietUntil = 0;
    this._initVoice();
    this._buildUI();
    this._buildCoachUI();
  }

  _initVoice() {
    if (!window.speechSynthesis) return;
    const setVoice = () => {
      const voices = speechSynthesis.getVoices();
      this._voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Female'))
        || voices.find(v => v.lang === 'en-US')
        || voices[0];
    };
    setVoice();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = setVoice;
    }
  }

  _buildUI() {
    const btn = document.createElement('button');
    btn.id = 'tutor-btn';
    btn.textContent = '🤖';
    btn.title = 'Chat with Lab Buddy';
    btn.style.cssText = `
      position:fixed; bottom:86px; left:18px; width:52px; height:52px;
      border-radius:50%; background:rgba(8,18,46,0.94); border:2px solid rgba(0,212,255,0.5);
      color:#00d4ff; font-size:1.4rem; font-weight:800; cursor:pointer; z-index:2200;
      backdrop-filter:blur(10px); transition:all 0.25s;
      display:flex; align-items:center; justify-content:center;
      pointer-events:all; box-shadow:0 0 28px rgba(0,212,255,0.22),0 4px 16px rgba(0,0,0,0.4);
    `;
    btn.onclick = () => this._openChat();
    document.body.appendChild(btn);
    this._btn = btn;
  }

  _openChat() {
    if (this._el) { this._el.remove(); this._el = null; return; }

    const panel = document.createElement('div');
    panel.style.cssText = `
      position:fixed; bottom:70px; left:16px; width:320px;
      background:rgba(10,20,40,0.96); border:1px solid rgba(0,212,255,0.3);
      border-radius:16px; padding:16px; z-index:2000; pointer-events:all;
      backdrop-filter:blur(12px); display:flex; flex-direction:column; gap:10px;
      box-shadow:0 0 32px rgba(0,212,255,0.12);
    `;

    const title = document.createElement('div');
    title.style.cssText = 'color:#00d4ff;font-size:0.85rem;font-weight:700;';
    title.textContent = '🤖 Lab Buddy Chat';

    const messages = document.createElement('div');
    messages.style.cssText = 'max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;';

    const addMsg = (text, isUser = false) => {
      const m = document.createElement('div');
      m.style.cssText = `
        padding:8px 12px; border-radius:10px; font-size:0.8rem; line-height:1.5;
        ${isUser
          ? 'background:rgba(0,212,255,0.1);color:#e8f4ff;align-self:flex-end;max-width:85%;'
          : 'background:rgba(255,255,255,0.05);color:#c0d8f0;align-self:flex-start;max-width:90%;'}
      `;
      m.textContent = text;
      messages.appendChild(m);
      messages.scrollTop = messages.scrollHeight;
    };

    addMsg(this._introLine());

    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;gap:8px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ask me anything...';
    input.style.cssText = `
      flex:1; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15);
      border-radius:8px; padding:8px 12px; color:#e8f4ff; font-size:0.8rem; outline:none;
    `;

    const sendBtn = document.createElement('button');
    sendBtn.textContent = '→';
    sendBtn.style.cssText = `
      background:rgba(0,212,255,0.15); border:1px solid rgba(0,212,255,0.3);
      border-radius:8px; padding:8px 12px; color:#00d4ff; cursor:pointer;
    `;

    const send = async () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      addMsg(text, true);
      const reply = await this._getReply(text);
      addMsg(reply);
      this.speak(reply);
    };

    sendBtn.onclick = send;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

    const suggestRow = document.createElement('div');
    suggestRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
    this._suggestions().forEach(s => {
      const chip = document.createElement('button');
      chip.textContent = s;
      chip.style.cssText = `
        background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);
        border-radius:20px;padding:4px 10px;font-size:0.72rem;color:#00d4ff;cursor:pointer;
      `;
      chip.onclick = () => { input.value = s; send(); };
      suggestRow.appendChild(chip);
    });

    inputRow.append(input, sendBtn);
    panel.append(title, messages, suggestRow, inputRow);
    document.body.appendChild(panel);
    this._el = panel;
  }

  async _getReply(question) {
    const ctx = this._context;
    const state = this.getContextSnapshot();
    const fallbacks = {
      home: 'Choose a portal, then try to answer one question with your hands before you read any text.',
      math: 'Math is pattern-play with rules. Try a graph lab and look for something that changes smoothly.',
      physics: 'Physics is the lab asking what happens next. Try changing one variable and predicting the motion.',
      chem: 'Chemistry is matter changing costumes. Pick a molecule or element and look for what makes it stable.',
      periodic: 'The periodic table is arranged by atomic number. Pick one element and compare it with its neighbors.',
      pendulum: 'A pendulum trades potential and kinetic energy. Lift it higher, release it, and watch the trade.',
      waves: 'When waves overlap, their heights add. Move sources until you find a quiet node.',
      fractal: 'Fractals repeat complexity at many scales. Zoom into the boundary where order and chaos meet.',
      molecules: 'Molecular shape comes from atoms and electron pairs pushing into stable arrangements.',
    };

    if (this._apiKey) {
      try {
        const resp = await fetch(this._apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this._apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 150,
            messages: [{
              role: 'user',
              content: `You are a playful, precise science tutor for a 3D interactive learning platform. Current topic: ${ctx}. Current state: ${JSON.stringify(state)}. Student says: "${question}". Reply in 2-3 sentences, clearly and without markdown.`,
            }],
          }),
        });
        const data = await resp.json();
        return data.content?.[0]?.text || fallbacks[ctx] || fallbacks.home;
      } catch { /* fall through to local fallback */ }
    }

    const q = question.toLowerCase();
    if (q.includes('explain')) return this.explainCurrentFocus();
    if (q.includes('hint')) return this.suggestNextMove('hint');
    if (q.includes('try') || q.includes('next')) return this.suggestNextMove('try');
    if (q.includes('quiz') || q.includes('challenge')) return this.suggestNextMove('challenge');
    if (q.includes('why')) return this.suggestNextMove('why');
    return fallbacks[ctx] || 'Good question. Try one small experiment, then ask again with what you noticed.';
  }

  speak(text) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = this._voice;
    utter.rate = 1.0;
    utter.pitch = 1.08;
    utter.volume = 0.85;
    speechSynthesis.speak(utter);
  }

  setContext(ctx) {
    this._context = ctx;
    this.setLearningState({ topic: ctx && !['home', 'math', 'physics', 'chem'].includes(ctx) ? ctx : null });
    // Auto-show a welcome tip when entering a new area
    clearTimeout(this._autoCoachTimer);
    this._autoCoachTimer = setTimeout(() => {
      if (Date.now() >= this._quietUntil) this._renderCoach();
    }, 1200);
  }

  setLearningState(partial = {}) {
    this._learningState = { ...this._learningState, ...partial };
    this._renderCoach();
  }

  observeGesture(action) {
    if (!action?.name) return;
    const gestureCounts = { ...this._learningState.gestureCounts };
    gestureCounts[action.name] = (gestureCounts[action.name] || 0) + 1;
    this.setLearningState({
      lastGesture: action.name,
      lastIntent: this._intentFor(action.name),
      gestureCounts,
    });
  }

  observeObjectAction(event = {}) {
    const metadata = event.metadata || {};
    const object = metadata.title || metadata.name || event.mesh?.name || 'object';
    this.setLearningState({
      object,
      lastIntent: event.actionName || 'inspect',
    });
  }

  remember(observation) {
    if (!observation) return;
    const observations = [...this._learningState.observations, observation].slice(-8);
    this.setLearningState({ observations });
  }

  coach(text, options = {}) {
    if (!text || Date.now() < this._quietUntil) return;
    this._coachText = text;
    this._coachKind = options.kind || 'hint';
    this._renderCoach();
    if (options.speak) this.speak(text);
  }

  suggestNextMove(kind = 'try') {
    const state = this._learningState;
    const object = state.object || 'the selected object';
    const topic = state.topic || this._context;

    if (kind === 'challenge') {
      if (topic === 'waves') return 'Challenge: make one loud region and one quiet region, then explain why both exist.';
      if (topic === 'pendulum') return 'Challenge: change the release height, then predict which energy value grows first.';
      if (topic === 'titration') return 'Challenge: add just enough drops to find the steep part of the pH curve.';
      return `Challenge: change ${object} once, then say what stayed the same and what changed.`;
    }
    if (kind === 'why') return `Why it matters: ${object} is a clue. The useful question is which property controls the visible change.`;
    if (kind === 'hint') return `Hint: use one gesture on ${object}, pause, and look for the first value or shape that changes.`;
    return `Try this next: inspect ${object}, then rotate or scale it once and compare before versus after.`;
  }

  explainCurrentFocus() {
    const state = this._learningState;
    const object = state.object || 'this scene';
    const ctx = state.topic || this._context;
    const intent = state.lastIntent || 'explore';
    return `You are using ${intent} in ${ctx}. Focus on ${object}: change one variable at a time, then name the visible effect.`;
  }

  getContextSnapshot() {
    return {
      context: this._context,
      ...this._learningState,
      observations: this._learningState.observations.slice(-4),
    };
  }

  _buildCoachUI() {
    const panel = document.createElement('section');
    panel.id = 'tutor-coach';
    panel.className = 'hidden';
    panel.innerHTML = `
      <header>
        <strong>Lab Buddy</strong>
        <button type="button" data-action="quiet" aria-label="Dismiss">✕</button>
      </header>
      <p></p>
      <div>
        <button type="button" data-action="hint">💡 Hint</button>
        <button type="button" data-action="why">🤔 Why?</button>
        <button type="button" data-action="challenge">🎯 Challenge</button>
      </div>
    `;
    panel.addEventListener('click', (event) => {
      const action = event.target?.dataset?.action;
      if (!action) return;
      if (action === 'quiet') {
        this._quietUntil = Date.now() + 90000;
        panel.classList.add('hidden');
        return;
      }
      this.coach(this.suggestNextMove(action), { kind: action });
    });
    document.body.appendChild(panel);
    this._coachEl = panel;
  }

  _renderCoach() {
    if (!this._coachEl) return;
    const text = this._coachText || this._introLine();
    this._coachEl.querySelector('p').textContent = text;
    this._coachEl.classList.toggle('hidden', !text || Date.now() < this._quietUntil);
  }

  _introLine() {
    const state = this._learningState;
    if (state.object) return `I spotted ${state.object}! Want a hint, the "why", or a challenge?`;
    const areaNames = { home: 'the Start Screen', math: 'Math World', physics: 'Physics World', chem: 'Chemistry World' };
    const area = areaNames[this._context] || this._context;
    return `Hi! I'm your Lab Buddy in ${area}. Ask me anything — hints, explanations, or challenges!`;
  }

  _suggestions() {
    const state = this._learningState;
    if (state.object) return ['💡 Give me a hint', '🤔 Why does it work?', '🎯 Challenge me!'];
    if (state.mode === 'explore') return ['👀 What should I notice?', '🎯 Give a challenge', '📖 Explain this', '🗺️ Guide me'];
    return ['💡 What should I do?', '🎯 Give a challenge', '📖 Explain this', '🗺️ What\'s next?'];
  }

  _intentFor(actionName) {
    const map = {
      grab: 'manipulate',
      move: 'move',
      rotate: 'rotate',
      scale: 'compare scale',
      inspect: 'inspect',
      pause: 'observe',
      reset: 'restart',
      swipe_up: 'increase parameter',
      swipe_down: 'decrease parameter',
      swipe_left: 'previous',
      swipe_right: 'next',
      explore_mode: 'explore',
      advanced_controls: 'advanced controls',
    };
    return map[actionName] || actionName;
  }

  dispose() {
    this._el?.remove();
    this._btn?.remove();
    this._coachEl?.remove();
    speechSynthesis.cancel();
  }
}
