const STORAGE_KEY = 'cosmiclearn_macros';
const MAX_MACROS = 10;
const RECORD_DURATION = 5000; // ms
const DETECT_INTERVAL = 500; // ms
const MAX_HISTORY = 20;
const GESTURE_ICONS = {
  PINCH: '🤌', OPEN_PALM: '🖐', FIST: '✊', POINT: '☝', PEACE: '✌',
  THUMBS_UP: '👍', OK: '👌', NONE: '〇',
};
const ACTIONS = ['screenshot', 'dashboard', 'exam', 'back', 'home'];

export class GestureMacroRecorder {
  constructor(scene, gestureEngine) {
    this._scene = scene;
    this._ge = gestureEngine;
    this._active = false;

    this._macros = [];
    this._recording = false;
    this._recordStart = 0;
    this._recordedGestures = [];
    this._gestureHistory = [];
    this._lastGesture = null;

    this._detectTimer = 0;
    this._domEl = null;
    this._listEl = null;
    this._recordBtn = null;
    this._nameInput = null;
    this._actionSelect = null;

    this._onGestureChange = null;
    this._loadFromStorage();
  }

  activate() {
    if (this._active) return;
    this._active = true;
    this._buildDOM();

    this._onGestureChange = (e) => {
      const g = e?.detail?.gesture ?? e?.gesture ?? null;
      if (!g) return;
      this._gestureHistory.push({ gesture: g, timestamp: Date.now() });
      if (this._gestureHistory.length > MAX_HISTORY) this._gestureHistory.shift();
      if (this._recording && g !== this._lastGesture) {
        this._recordedGestures.push({ gesture: g, timestamp: Date.now() - this._recordStart });
        this._lastGesture = g;
      }
    };

    if (this._ge) {
      if (this._ge.on) {
        this._ge.on('change', this._onGestureChange);
      } else if (this._ge.onChange) {
        this._ge.onChange = this._onGestureChange;
      }
    }
  }

  deactivate() {
    if (!this._active) return;
    this._active = false;
    this._recording = false;

    if (this._ge && this._ge.off) this._ge.off('change', this._onGestureChange);
    if (this._domEl) { this._domEl.remove(); this._domEl = null; }
  }

  update(camera, canvas, dt) {
    if (!this._active) return;

    // Poll gesture from engine if no event system
    if (this._ge && this._ge.gesture) {
      const g = Array.isArray(this._ge.gesture) ? this._ge.gesture[0] : this._ge.gesture;
      if (g && g !== this._lastGesture) {
        const now = Date.now();
        this._gestureHistory.push({ gesture: g, timestamp: now });
        if (this._gestureHistory.length > MAX_HISTORY) this._gestureHistory.shift();
        if (this._recording) {
          this._recordedGestures.push({ gesture: g, timestamp: now - this._recordStart });
        }
        this._lastGesture = g;
      }
    }

    // Auto-stop recording
    if (this._recording && Date.now() - this._recordStart >= RECORD_DURATION) {
      this._stopRecording();
    }

    // Detect macros at interval
    this._detectTimer += dt;
    if (this._detectTimer >= DETECT_INTERVAL) {
      this._detectTimer = 0;
      this._detectMacros();
    }
  }

  _startRecording() {
    this._recording = true;
    this._recordStart = Date.now();
    this._recordedGestures = [];
    this._lastGesture = null;
    if (this._recordBtn) {
      this._recordBtn.textContent = 'Stop';
      this._recordBtn.style.background = 'rgba(255,50,50,0.4)';
    }
  }

  _stopRecording() {
    this._recording = false;
    if (this._recordBtn) {
      this._recordBtn.textContent = 'Record';
      this._recordBtn.style.background = 'rgba(0,200,100,0.3)';
    }

    if (this._recordedGestures.length === 0) return;

    const name = this._nameInput ? this._nameInput.value.trim() || `Macro ${this._macros.length + 1}` : `Macro ${this._macros.length + 1}`;
    const action = this._actionSelect ? this._actionSelect.value : 'home';
    const sequence = this._recordedGestures.map(r => r.gesture);

    if (this._macros.length >= MAX_MACROS) {
      this._macros.shift(); // drop oldest
    }

    this._macros.push({ name, sequence, action, id: Date.now() });
    this._saveToStorage();
    this._renderList();
    if (this._nameInput) this._nameInput.value = '';
  }

  _detectMacros() {
    if (this._gestureHistory.length < 2) return;
    const recent = this._gestureHistory.slice(-5).map(e => e.gesture);

    for (const macro of this._macros) {
      if (macro.sequence.length === 0) continue;
      const score = this._matchScore(recent, macro.sequence);
      if (score > 0.8) {
        this.fire(macro.name);
        break; // fire only first match
      }
    }
  }

  _matchScore(observed, reference) {
    if (observed.length === 0 || reference.length === 0) return 0;
    // Subsequence overlap
    let matches = 0;
    let ri = 0;
    for (const g of observed) {
      if (ri < reference.length && g === reference[ri]) {
        matches++;
        ri++;
      }
    }
    return matches / reference.length;
  }

  fire(macroName) {
    const macro = this._macros.find(m => m.name === macroName);
    if (!macro) return;
    document.dispatchEvent(new CustomEvent('cosmiclearn:macro', {
      detail: { name: macroName, action: macro.action }
    }));
  }

  _saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._macros));
    } catch (e) { /* ignore */ }
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this._macros = JSON.parse(raw);
    } catch (e) { this._macros = []; }
  }

  _deleteMacro(id) {
    this._macros = this._macros.filter(m => m.id !== id);
    this._saveToStorage();
    this._renderList();
  }

  _renderList() {
    if (!this._listEl) return;
    this._listEl.innerHTML = '';

    if (this._macros.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:rgba(200,220,255,0.4);font-size:11px;text-align:center;padding:8px';
      empty.textContent = 'No macros saved';
      this._listEl.appendChild(empty);
      return;
    }

    for (const macro of this._macros) {
      const item = document.createElement('div');
      item.style.cssText = `
        display:flex; align-items:center; gap:6px; padding:6px;
        background:rgba(255,255,255,0.05); border-radius:6px; margin-bottom:4px;
        font-size:11px;
      `;
      const icons = macro.sequence.slice(0, 6).map(g => GESTURE_ICONS[g] || g).join(' ');
      item.innerHTML = `
        <div style="flex:1;min-width:0">
          <div style="font-weight:bold;color:#00d4ff;overflow:hidden;text-overflow:ellipsis">${macro.name}</div>
          <div style="font-size:12px;margin:2px 0">${icons}</div>
          <div style="color:rgba(200,220,255,0.5)">${macro.action}</div>
        </div>
        <button data-id="${macro.id}" style="padding:3px 8px;background:rgba(255,50,50,0.3);
          border:1px solid rgba(255,100,100,0.4);border-radius:4px;color:#ffaaaa;cursor:pointer;
          font-size:10px;white-space:nowrap">
          Delete
        </button>
      `;
      item.querySelector('button').addEventListener('click', () => this._deleteMacro(macro.id));
      this._listEl.appendChild(item);
    }
  }

  _buildDOM() {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; bottom:20px; right:20px; width:280px;
      background:rgba(10,20,40,0.92); border:1px solid rgba(0,212,255,0.3);
      border-radius:12px; color:#e8f4ff; padding:14px; z-index:2000;
      font-family:monospace; font-size:13px;
      max-height:70vh; overflow-y:auto;
    `;
    el.innerHTML = `
      <div style="font-size:15px;font-weight:bold;color:#00d4ff;margin-bottom:10px">
        Gesture Macro Recorder
      </div>
      <div style="margin-bottom:8px;display:flex;gap:6px;align-items:center">
        <input id="gmrName" type="text" placeholder="Macro name" style="
          flex:1; background:rgba(255,255,255,0.1); border:1px solid rgba(0,212,255,0.3);
          border-radius:6px; color:#e8f4ff; padding:4px 8px; font-size:12px;">
        <select id="gmrAction" style="
          background:rgba(10,20,40,0.95); border:1px solid rgba(0,212,255,0.3);
          border-radius:6px; color:#e8f4ff; padding:4px;">
          ${ACTIONS.map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <button id="gmrRecord" style="flex:1;padding:6px;background:rgba(0,200,100,0.3);
          border:1px solid rgba(0,255,150,0.4);border-radius:6px;color:#e8f4ff;cursor:pointer">
          Record
        </button>
      </div>
      <div style="font-size:11px;color:rgba(200,220,255,0.5);margin-bottom:8px">
        Records for 5s • Max ${MAX_MACROS} macros • Detects every 500ms
      </div>
      <div id="gmrList"></div>
    `;
    document.body.appendChild(el);
    this._domEl = el;
    this._listEl = el.querySelector('#gmrList');
    this._nameInput = el.querySelector('#gmrName');
    this._actionSelect = el.querySelector('#gmrAction');
    this._recordBtn = el.querySelector('#gmrRecord');

    this._recordBtn.addEventListener('click', () => {
      if (this._recording) this._stopRecording();
      else this._startRecording();
    });

    this._renderList();
  }
}
