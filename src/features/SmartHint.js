const HINTS = {
  home: [
    'Pinch a glowing portal to jump into a subject.',
    'Try Math, Physics, and Chemistry once each to unlock an explorer badge.',
    'Point at an orb and hold steady to select it hands-free.',
  ],
  math: [
    'Try 3D Functions when you want equations to stop sitting flat.',
    'Vector Lab is a good place to make arrows settle an argument.',
    'Fractals reward curiosity. Zoom toward the messy edge.',
  ],
  physics: [
    'Gravity Lab lets you nudge an orbit and watch the consequences.',
    'Pendulum Lab is more fun if you release from a dramatic angle.',
    'Wave Lab has quiet spots hiding between loud ones.',
  ],
  chem: [
    'Pick an element tile and look for its tiny personality.',
    'Molecule Viewer gets better when you rotate slowly.',
    'Orbitals are probability clouds, not little racetracks.',
  ],
  function3d: ['Try a saddle surface and hunt for the point that feels balanced.'],
  pendulum: ['Drag the bob higher and watch energy trade costumes.'],
  gravity: ['Move a planet a little, then see if the orbit forgives you.'],
  periodic: ['Pick an element you know, then one you have never noticed.'],
  molecules: ['Switch views and ask which one tells the shape best.'],
  waves: ['Move the sources until a still stripe appears.'],
  circuit: ['Close the loop before expecting the current to wake up.'],
  fractal: ['The boundary is where the strange stuff lives.'],
  titration: ['Drip slowly near the steep part of the pH curve.'],
};

export class SmartHint {
  constructor() {
    this._context = 'home';
    this._timer = null;
    this._idleSecs = 24;
    this._el = null;
    this._buildEl();
    this._resetTimer();
    this._listenActivity();
  }

  _buildEl() {
    const el = document.createElement('div');
    el.id = 'smart-hint';
    el.style.cssText = `
      position:fixed; bottom:220px; left:50%; transform:translateX(-50%);
      background:rgba(5,10,26,0.78); border:1px solid rgba(255,215,0,0.32);
      border-radius:16px; padding:10px 22px; font-size:0.8rem; color:#ffd700;
      backdrop-filter:blur(8px); opacity:0; transition:opacity 0.4s, transform 0.4s;
      pointer-events:none; z-index:2000; max-width:340px; text-align:center;
      box-shadow:0 0 24px rgba(255,215,0,0.12);
    `;
    document.body.appendChild(el);
    this._el = el;
  }

  _listenActivity() {
    ['pointermove', 'pointerdown', 'keydown'].forEach(ev => {
      window.addEventListener(ev, () => this._resetTimer(), { passive: true });
    });
  }

  _resetTimer() {
    clearTimeout(this._timer);
    this._hideHint();
    this._timer = setTimeout(() => this._showHint(), this._idleSecs * 1000);
  }

  _showHint() {
    const pool = HINTS[this._context] || HINTS.home;
    const tip = pool[Math.floor(Math.random() * pool.length)];
    if (!this._el) return;
    this._el.textContent = 'Idea spark: ' + tip;
    this._el.style.opacity = '1';
    this._el.style.transform = 'translateX(-50%) translateY(-4px)';
    setTimeout(() => this._hideHint(), 6500);
  }

  _hideHint() {
    if (!this._el) return;
    this._el.style.opacity = '0';
    this._el.style.transform = 'translateX(-50%) translateY(0)';
  }

  setContext(ctx) {
    this._context = ctx;
    this._resetTimer();
  }
}
