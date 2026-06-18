// Feature 9: Multiplayer Classroom — WebSocket client framework
// Server: set WS_URL in config. For local dev, use ws://localhost:8080
export class Multiplayer {
  constructor(config = {}) {
    this._wsUrl = config.wsUrl || null;
    this._ws = null;
    this._peers = new Map(); // peerId → { name, position, gesture }
    this._myId = 'user_' + Math.random().toString(36).slice(2, 8);
    this._myName = config.name || 'Student';
    this._room = config.room || 'classroom-1';
    this._onPeerUpdate = config.onPeerUpdate || (() => {});
    this._onTeacherCmd = config.onTeacherCmd || (() => {});
    this._el = null;
    this._connected = false;
    this._buildUI();
  }

  connect() {
    if (!this._wsUrl) {
      this._setStatus('offline', 'No server configured');
      return;
    }
    try {
      this._ws = new WebSocket(this._wsUrl);
      this._ws.onopen = () => {
        this._connected = true;
        this._setStatus('online', 'Connected — Room: ' + this._room);
        this._send({ type: 'join', room: this._room, id: this._myId, name: this._myName });
      };
      this._ws.onmessage = (e) => this._handle(JSON.parse(e.data));
      this._ws.onclose = () => {
        this._connected = false;
        this._setStatus('offline', 'Disconnected');
        setTimeout(() => this.connect(), 3000);
      };
      this._ws.onerror = () => {
        this._setStatus('offline', 'Connection failed');
      };
    } catch (err) {
      this._setStatus('offline', 'WS unavailable');
    }
  }

  _handle(msg) {
    switch (msg.type) {
      case 'peer_update':
        this._peers.set(msg.id, msg);
        this._onPeerUpdate(this._peers);
        this._updateRoster();
        break;
      case 'peer_leave':
        this._peers.delete(msg.id);
        this._updateRoster();
        break;
      case 'teacher_cmd':
        this._onTeacherCmd(msg.cmd, msg.data);
        break;
      case 'room_state':
        msg.peers?.forEach(p => this._peers.set(p.id, p));
        this._updateRoster();
        break;
    }
  }

  /** Send current position + gesture to all peers */
  broadcast(position, gesture, currentLab) {
    if (!this._connected) return;
    this._send({
      type: 'peer_update',
      id: this._myId,
      name: this._myName,
      position,
      gesture,
      lab: currentLab,
    });
  }

  _send(obj) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(obj));
    }
  }

  _buildUI() {
    const panel = document.createElement('div');
    panel.id = 'multiplayer-panel';
    panel.style.cssText = `
      position:fixed; top:16px; right:80px; background:rgba(10,20,40,0.9);
      border:1px solid rgba(0,212,255,0.2); border-radius:12px; padding:8px 14px;
      z-index:1500; pointer-events:all; backdrop-filter:blur(8px); min-width:150px;
    `;

    this._statusDot = document.createElement('div');
    this._statusDot.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:0.72rem;';
    this._statusDot.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#555;display:inline-block;"></span><span style="color:#7ba3cc;">Multiplayer offline</span>';

    this._rosterEl = document.createElement('div');
    this._rosterEl.style.cssText = 'margin-top:6px;display:none;';

    const joinBtn = document.createElement('button');
    joinBtn.textContent = 'Join Classroom';
    joinBtn.style.cssText = `
      background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);
      border-radius:8px;padding:4px 10px;font-size:0.72rem;color:#00d4ff;
      cursor:pointer;margin-top:6px;width:100%;
    `;
    joinBtn.onclick = () => this.connect();

    panel.append(this._statusDot, this._rosterEl, joinBtn);
    document.body.appendChild(panel);
    this._el = panel;
  }

  _setStatus(state, text) {
    const colors = { online: '#00ff64', offline: '#555', connecting: '#ffd700' };
    const dot = this._statusDot?.querySelector('span');
    const label = this._statusDot?.querySelectorAll('span')[1];
    if (dot) dot.style.background = colors[state] || '#555';
    if (label) label.textContent = text;
  }

  _updateRoster() {
    if (!this._rosterEl) return;
    const count = this._peers.size;
    this._rosterEl.style.display = count > 0 ? 'block' : 'none';
    this._rosterEl.innerHTML = `<div style="font-size:0.7rem;color:#7ba3cc;">${count} peer${count!==1?'s':''} in room:</div>`;
    this._peers.forEach(p => {
      const item = document.createElement('div');
      item.style.cssText = 'font-size:0.72rem;color:#e8f4ff;padding:2px 0;';
      item.textContent = '• ' + p.name + (p.lab ? ' → ' + p.lab : '');
      this._rosterEl.appendChild(item);
    });
  }

  disconnect() {
    this._ws?.close();
    this._connected = false;
  }
}
