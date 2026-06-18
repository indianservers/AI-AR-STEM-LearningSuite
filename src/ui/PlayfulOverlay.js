const SUBJECT_COPY = {
  math: {
    name: 'Math',
    icon: 'Math',
    accent: '#00d4ff',
    entry: 'Math portal unlocked',
    missions: [
      'Bend a graph until its pattern reveals itself.',
      'Find a shape, spin it, and name one hidden symmetry.',
      'Make an equation feel less flat than paper.',
    ],
  },
  physics: {
    name: 'Physics',
    icon: 'Physics',
    accent: '#ff6b35',
    entry: 'Physics portal charged',
    missions: [
      'Give something a push and watch the rules answer back.',
      'Catch a motion trail before it escapes the lab.',
      'Change one variable and spot what the universe negotiates.',
    ],
  },
  chem: {
    name: 'Chemistry',
    icon: 'Chem',
    accent: '#7fff7f',
    entry: 'Chemistry portal bubbling',
    missions: [
      'Inspect a tiny structure like it has secrets.',
      'Find the bond that makes the molecule hold together.',
      'Make matter rearrange itself into a better story.',
    ],
  },
};

const TOPIC_MISSIONS = {
  function3d: 'Mission: sculpt a surface and find its highest ridge.',
  graph2d: 'Mission: trace a curve and predict where it crosses zero.',
  geometry: 'Mission: rotate a shape until a hidden angle appears.',
  calculus: 'Mission: make tiny slices explain a big area.',
  vectors: 'Mission: combine two arrows and chase the result.',
  trig: 'Mission: spin the circle and catch sine in motion.',
  complex: 'Mission: move a point and watch the plane respond.',
  linearalg: 'Mission: transform space without losing your bearings.',
  fractal: 'Mission: zoom into the edge and find repeating chaos.',
  newton: 'Mission: push, pull, and prove inertia has opinions.',
  gravity: 'Mission: nudge an orbit and keep the planet dancing.',
  projectile: 'Mission: launch once, adjust twice, land on target.',
  waves: 'Mission: move two waves until a quiet node appears.',
  optics: 'Mission: bend light and predict where it lands.',
  pendulum: 'Mission: lift the bob and trade height for speed.',
  emfield: 'Mission: place a charge and map its invisible reach.',
  fluid: 'Mission: stir the flow and follow one swirl.',
  relativity: 'Mission: stretch time enough to notice.',
  circuit: 'Mission: close a loop and wake up the current.',
  thermal: 'Mission: move heat from hot chaos to cool order.',
  periodic: 'Mission: pick an element and uncover its personality.',
  molecules: 'Mission: rotate a molecule until its shape clicks.',
  atomic: 'Mission: orbit the atom and spot the energy levels.',
  bonding: 'Mission: connect atoms and explain why they stay.',
  orbitals: 'Mission: find the cloud where an electron may be hiding.',
  crystal: 'Mission: repeat one cell until a lattice appears.',
  reactions: 'Mission: start a reaction and track the rearrangement.',
  rxnEnergy: 'Mission: climb the energy hill and find the drop.',
  spectro: 'Mission: read the colored lines like a fingerprint.',
  protein: 'Mission: fold the chain and find the structure.',
  titration: 'Mission: drip carefully and catch the color shift.',
};

export class PlayfulOverlay {
  constructor() {
    this._toast = this._buildToast();
    this._mission = this._buildMission();
    this._home = this._buildHomePrompt();
  }

  showHomePrompt() {
    this._home.classList.remove('hidden');
  }

  hideHomePrompt() {
    this._home.classList.add('hidden');
  }

  showSubject(subjectId) {
    const copy = SUBJECT_COPY[subjectId] || SUBJECT_COPY.math;
    this.hideHomePrompt();
    this._toast.style.setProperty('--accent', copy.accent);
    this._toast.textContent = `${copy.icon}: ${copy.entry}`;
    this._pulse(this._toast, 'play-toast-visible');
    this.showMission(copy.missions[Math.floor(Math.random() * copy.missions.length)], copy.accent);
  }

  showTopic(subjectId, topicId) {
    const copy = SUBJECT_COPY[subjectId] || SUBJECT_COPY.math;
    this.showMission(TOPIC_MISSIONS[topicId] || 'Mission: poke the lab and see what pushes back.', copy.accent);
    this.sparkle(copy.accent);
  }

  showMessage(text, accent = '#ffd700') {
    this._toast.style.setProperty('--accent', accent);
    this._toast.textContent = text;
    this._pulse(this._toast, 'play-toast-visible');
  }

  showMission(text, accent = '#00d4ff') {
    this._mission.style.setProperty('--accent', accent);
    this._mission.textContent = text;
    this._mission.classList.add('mission-visible');
  }

  sparkle(accent = '#ffd700') {
    const layer = document.createElement('div');
    layer.className = 'sparkle-layer';
    for (let i = 0; i < 22; i++) {
      const dot = document.createElement('span');
      dot.style.setProperty('--x', `${(Math.random() - 0.5) * 360}px`);
      dot.style.setProperty('--y', `${(Math.random() - 0.5) * 180}px`);
      dot.style.setProperty('--delay', `${Math.random() * 0.18}s`);
      dot.style.setProperty('--accent', accent);
      layer.appendChild(dot);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 950);
  }

  _buildToast() {
    const el = document.createElement('div');
    el.id = 'play-toast';
    document.body.appendChild(el);
    return el;
  }

  _buildMission() {
    const el = document.createElement('div');
    el.id = 'mission-banner';
    document.body.appendChild(el);
    return el;
  }

  _buildHomePrompt() {
    const el = document.createElement('div');
    el.id = 'home-prompt';
    el.innerHTML = '<strong>Pick a portal</strong><span>Pinch or click an orb to start a science mission.</span>';
    document.body.appendChild(el);
    return el;
  }

  _pulse(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), 2600);
  }
}
