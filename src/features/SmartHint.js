const HINTS = {
  home: [
    'Click any glowing portal to start your science adventure.',
    'Try all four learning areas to compare how each subject thinks.',
    'Point at a portal and hold briefly to enter hands-free when gestures are active.',
  ],
  math: [
    'Try 3D Functions and make equations fly through space.',
    'Vector Lab: make arrows point in different directions.',
    'Fractals zoom forever; look for the interesting boundary.',
    'Geometry Lab: build shapes and measure angles.',
  ],
  physics: [
    'Gravity Lab: nudge a planet and see what happens.',
    'Pendulum Lab: drop from high up for maximum swing.',
    'Wave Lab: find quiet spots between loud waves.',
    'Circuits: close the loop to light up.',
  ],
  chem: [
    'Pick any element tile and discover its pattern.',
    'Molecule Viewer: spin it slowly to see the shape.',
    'Orbitals are fuzzy probability clouds, not tiny racetracks.',
    'Reactions: watch atoms swap partners.',
  ],
  astro: [
    'Open Solar System Explorer and compare inner planets with gas giants.',
    'Try the telescope zoom slider and watch the field of view change.',
    'Use Earth-Moon-Sun to predict where phases and eclipses will fit later.',
    'Galaxy & Deep Space shows a placeholder spiral for cosmic scale.',
  ],
  function3d: ['Try a saddle surface and find the balancing point.', 'Change the equation and watch the surface reshape.'],
  pendulum: ['Drag the bob high; more height means more energy.', 'Energy swaps between potential and kinetic as it swings.'],
  gravity: ['Move a planet a little, then watch the orbit.', 'Add a second planet and watch gravity pull.'],
  periodic: ['Pick one element you know, then find one you have never heard of.', 'Elements in the same column share similar properties.'],
  molecules: ['Spin the molecule and look for symmetry.', 'Each stick is a chemical bond.'],
  waves: ['Move the sources until you find a quiet spot.', 'Two waves can cancel each other out.'],
  circuit: ['Close the loop first; electricity needs a complete path.', 'Add more batteries to make it brighter.'],
  fractal: ['Zoom into the boundary; that is where the interesting structure lives.', 'Fractals look similar at different zoom levels.'],
  titration: ['Drip slowly near the steep part of the pH curve.'],
  atoms: ['The number of protons tells you which element it is.'],
  orbitals: ['Brighter areas mean the electron is more likely to be found there.'],
  reactions: ['Watch energy arrows to see whether energy is released.'],
  crystal: ['Every atom is in a repeating pattern.'],
  vectors: ['Arrows show direction and size; longer means stronger.'],
  trig: ['The unit circle is the secret behind many waves.'],
  complex: ['i is the square root of -1: imaginary, but useful.'],
  linearalg: ['A matrix is a grid of numbers that can transform space.'],
  calculus: ['The slope of a curve at any point is the derivative.'],
  newton: ['Force equals mass times acceleration: push harder, move faster.'],
  projectile: ['Angle and speed decide where it lands.'],
  optics: ['Light bends when it enters glass or water.'],
  emfield: ['Opposite charges attract; same charges repel.'],
  fluid: ['Fluids flow from high pressure to low pressure.'],
  relativity: ['Nothing travels faster than light.'],
  thermal: ['Heat flows from hot to cold.'],
  quantum: ['Quantum particles can be in more than one state before measurement.'],
  blackhole: ['Light cannot escape from a black hole once it crosses the event horizon.'],
  neuron: ['Neurons send electrical signals to each other.'],
  kepler: ['Planets travel in ellipses, not perfect circles.'],
  smoke: ['Smoke follows the math of fluid dynamics.'],
  graph2d: ['Try dragging the graph to explore different regions.'],
  geometry: ['Try measuring angles by clicking connected lines.'],
  'solar-system': ['Pause the planets and compare their orbit distances.'],
  'ar-sky-map': ['Find Sirius, Vega, Polaris, and Betelgeuse on the placeholder sky dome.'],
  telescope: ['Zoom in slowly and notice how magnification narrows the view.'],
  'earth-moon-sun': ['Watch the Moon orbit Earth, then imagine sunlight coming from the Sun.'],
  'galaxy-deep-space': ['Compare the dense core with the thinner outer spiral arms.'],
  'astro-missions': ['Pick one mission card and match it to the simulator that should teach it.'],
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
    this._el.textContent = 'Hint: ' + tip;
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
    clearTimeout(this._enterTimer);
    this._enterTimer = setTimeout(() => this._showHint(), 4000);
  }
}
