// Feature 25: Teacher Remote Control - QR code pairing + broadcast.
// Generates a pairing code. Teacher opens the shared room on a second device.
export class TeacherControl {
  constructor(multiplayer) {
    this._mp = multiplayer;
    this._el = null;
    this._buildUI();
  }

  _buildUI() {
    const btn = document.createElement('button');
    btn.id = 'teacher-btn';
    btn.title = 'Teacher Mode';
    btn.style.cssText = `
      position:fixed; bottom:20px; left:70px; background:rgba(10,20,40,0.9);
      border:1px solid rgba(255,215,0,0.3); border-radius:10px; padding:8px 14px;
      color:gold; font-size:0.75rem; cursor:pointer; z-index:2000;
      backdrop-filter:blur(8px); pointer-events:all; font-weight:700;
    `;
    btn.textContent = 'Teacher';
    btn.onclick = () => this._showPanel();
    document.body.appendChild(btn);
  }

  _showPanel() {
    if (this._el) {
      this._el.remove();
      this._el = null;
      return;
    }

    const panel = document.createElement('div');
    panel.style.cssText = `
      position:fixed; bottom:70px; left:70px; width:280px;
      background:rgba(10,20,40,0.96); border:1px solid rgba(255,215,0,0.3);
      border-radius:16px; padding:20px; z-index:2000; pointer-events:all;
      backdrop-filter:blur(12px);
    `;

    const roomCode = 'CL-' + Math.random().toString(36).slice(2, 7).toUpperCase();

    panel.innerHTML = `
      <div style="color:gold;font-size:0.9rem;font-weight:700;margin-bottom:12px;">Teacher Controls</div>
      <div style="color:#7ba3cc;font-size:0.75rem;margin-bottom:8px;">Room Code</div>
      <div style="background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:8px;padding:10px;text-align:center;margin-bottom:14px;">
        <div style="color:gold;font-size:1.4rem;font-weight:700;letter-spacing:0.15em;">${roomCode}</div>
        <div style="color:#7ba3cc;font-size:0.7rem;margin-top:4px;">Share this with students</div>
      </div>
    `;

    const qrPlaceholder = document.createElement('div');
    qrPlaceholder.style.cssText = `
      background:#fff; width:80px; height:80px; margin:0 auto 14px;
      border-radius:8px; display:flex; align-items:center; justify-content:center;
      font-size:0.6rem; color:#000; text-align:center; padding:6px;
    `;
    qrPlaceholder.textContent = roomCode;
    panel.appendChild(qrPlaceholder);

    const cmds = [
      { label: 'Open Math', cmd: 'nav:math' },
      { label: 'Open Physics', cmd: 'nav:physics' },
      { label: 'Open Chemistry', cmd: 'nav:chem' },
      { label: 'Open Astro', cmd: 'nav:astro' },
      { label: 'Show Progress', cmd: 'dashboard' },
      { label: 'Start Exam', cmd: 'exam' },
      { label: 'Reset All', cmd: 'reset' },
    ];

    const btnGrid = document.createElement('div');
    btnGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;';
    cmds.forEach(c => {
      const b = document.createElement('button');
      b.textContent = c.label;
      b.style.cssText = `
        background:rgba(255,215,0,0.07);border:1px solid rgba(255,215,0,0.2);
        border-radius:8px;padding:8px 6px;font-size:0.72rem;color:gold;cursor:pointer;
      `;
      b.onclick = () => this._broadcast(c.cmd);
      btnGrid.appendChild(b);
    });
    panel.appendChild(btnGrid);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      margin-top:14px;background:transparent;border:1px solid rgba(255,255,255,0.15);
      border-radius:8px;padding:8px;font-size:0.78rem;color:#7ba3cc;cursor:pointer;width:100%;
    `;
    closeBtn.onclick = () => {
      panel.remove();
      this._el = null;
    };
    panel.appendChild(closeBtn);

    document.body.appendChild(panel);
    this._el = panel;
  }

  _broadcast(cmd) {
    if (this._mp) {
      this._mp._send({ type: 'teacher_cmd', cmd, room: this._mp._room });
    }
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;bottom:280px;left:70px;background:rgba(255,215,0,0.15);
      border:1px solid gold;border-radius:8px;padding:6px 14px;font-size:0.78rem;
      color:gold;z-index:9999;pointer-events:none;
    `;
    toast.textContent = 'Sent: ' + cmd;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
  }
}
