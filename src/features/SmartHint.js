const HINTS = {
  home: [
    '🌟 Pinch a glowing portal to jump in!',
    '🔭 Try all three subjects to unlock a secret explorer badge!',
    '☝️ Point at a portal and hold for 1 second to enter hands-free!',
    '💡 Click any glowing orb to start your science adventure!',
  ],
  math: [
    '📐 Try 3D Functions — make equations fly through space!',
    '➕ Vector Lab: make arrows point in different directions!',
    '🌀 Fractals zoom forever — look for the weird edge!',
    '📊 Geometry Lab: build shapes and measure angles!',
  ],
  physics: [
    '🪐 Gravity Lab: nudge a planet and see what happens!',
    '⏰ Pendulum Lab: drop from way up high for maximum swing!',
    '🌊 Wave Lab: find the quiet spots between loud waves!',
    '⚡ Circuits: close the loop to light up!',
  ],
  chem: [
    '⚗️ Pick any element tile and discover its secrets!',
    '🔬 Molecule Viewer: spin it slowly to see the shape!',
    '☁️ Orbitals are fuzzy probability clouds — not tiny racetrack!',
    '🧪 Reactions: watch atoms swap partners!',
  ],
  function3d: ['🏄 Try a saddle surface and find the balancing point!', '📈 Change the equation and watch the surface reshape!'],
  pendulum: ['⚡ Drag the bob super high — more height = more energy!', '🔁 Energy swaps between potential and kinetic as it swings!'],
  gravity: ['🌌 Move a planet a little, then hold your breath to see the orbit!', '🚀 Add a second planet and watch them pull each other!'],
  periodic: ['🧪 Pick one element you know, then find one you\'ve never heard of!', '⬆️ Elements in the same column share similar properties!'],
  molecules: ['🔄 Spin the molecule — can you spot the symmetry?', '🔗 Each stick is a chemical bond!'],
  waves: ['🤫 Move the sources until you find a perfectly quiet spot!', '📡 Two waves can cancel each other out!'],
  circuit: ['💡 Close the loop first — electricity needs a complete path!', '🔋 Add more batteries to make it brighter!'],
  fractal: ['🔍 Zoom into the boundary — that\'s where the wild stuff lives!', '♾️ Fractals look similar at every zoom level!'],
  titration: ['💧 Drip super slowly near the steep part of the pH curve!'],
  atoms: ['⚛️ The number of protons tells you which element it is!'],
  orbitals: ['☁️ Brighter areas = more likely to find an electron!'],
  reactions: ['🔥 Watch for energy arrows — they show if energy is released!'],
  crystal: ['💎 Every atom is in a perfect repeating pattern!'],
  vectors: ['➡️ Arrows show direction AND size — longer = stronger!'],
  trig: ['📐 The unit circle is the secret behind all waves!'],
  complex: ['🔢 i is the square root of -1 — imaginary but super useful!'],
  linearalg: ['📦 A matrix is just a grid of numbers that transforms space!'],
  calculus: ['📉 The slope of a curve at any point is the derivative!'],
  newton: ['🏃 Force = mass × acceleration — push harder, move faster!'],
  projectile: ['🎯 Angle + speed decide where it lands!'],
  optics: ['🌈 Light bends when it enters glass or water!'],
  emfield: ['🧲 Opposite charges attract, same charges repel!'],
  fluid: ['🌊 Fluids always flow from high pressure to low pressure!'],
  relativity: ['⚡ Nothing travels faster than light!'],
  thermal: ['🌡️ Heat always flows from hot to cold!'],
  quantum: ['🎲 Quantum particles can be in two states at once!'],
  blackhole: ['🕳️ Light can\'t escape from a black hole!'],
  neuron: ['🧠 Neurons fire electrical signals to each other!'],
  kepler: ['🪐 Planets travel in ellipses, not circles!'],
  smoke: ['💨 Smoke follows the math of fluid dynamics!'],
  graph2d: ['📈 Try dragging the graph to explore different regions!'],
  geometry: ['📐 Try measuring angles by clicking two connected lines!'],
};

export class SmartHint {
  constructor() {
    this._context = 'home';
    this._timer = null;
    this._enterTimer = null;
    this._idleSecs = 10;
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
    this._el.textContent = '💡 ' + tip;
    this._el.style.opacity = '1';
    this._el.style.transform = 'translateX(-50%) translateY(-4px)';
    setTimeout(() => this._hideHint(), 7000);
  }

  _hideHint() {
    if (!this._el) return;
    this._el.style.opacity = '0';
    this._el.style.transform = 'translateX(-50%) translateY(0)';
  }

  setContext(ctx) {
    this._context = ctx;
    this._resetTimer();
    // Show a welcoming tip shortly after entering a new area
    clearTimeout(this._enterTimer);
    this._enterTimer = setTimeout(() => this._showHint(), 4000);
  }
}
