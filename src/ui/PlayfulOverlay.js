const SUBJECT_COPY = {
  math: {
    name: 'Math',
    icon: '📐',
    accent: '#00d4ff',
    entry: '📐 Math world unlocked!',
    missions: [
      '🌊 Bend a graph until its pattern reveals itself!',
      '🔺 Find a shape, spin it, and name one hidden symmetry!',
      '📈 Make an equation feel less flat than paper!',
    ],
  },
  physics: {
    name: 'Physics',
    icon: '⚡',
    accent: '#ff6b35',
    entry: '⚡ Physics lab charged up!',
    missions: [
      '🍎 Give something a push and watch the rules answer back!',
      '🌊 Catch a motion trail before it escapes the lab!',
      '🔬 Change one variable and spot what the universe does!',
    ],
  },
  chem: {
    name: 'Chemistry',
    icon: '⚗️',
    accent: '#7fff7f',
    entry: '⚗️ Chemistry lab bubbling!',
    missions: [
      '🔍 Inspect a tiny structure like it has secrets!',
      '🔗 Find the bond that makes the molecule hold together!',
      '💥 Make matter rearrange itself into something new!',
    ],
  },
};

const TOPIC_MISSIONS = {
  function3d: '🏔️ Mission: sculpt a surface and find its highest ridge!',
  graph2d:    '📈 Mission: trace a curve and predict where it crosses zero!',
  geometry:   '📐 Mission: rotate a shape until a hidden angle appears!',
  calculus:   '∫ Mission: make tiny slices explain a big area!',
  vectors:    '➡️ Mission: combine two arrows and chase the result!',
  trig:       '〽️ Mission: spin the circle and catch sine in motion!',
  complex:    '🔢 Mission: move a point and watch the plane respond!',
  linearalg:  '🔲 Mission: transform space without losing your bearings!',
  fractal:    '🌀 Mission: zoom into the edge and find repeating chaos!',
  newton:     '🍎 Mission: push, pull, and prove inertia has opinions!',
  gravity:    '🪐 Mission: nudge an orbit and keep the planet dancing!',
  projectile: '🚀 Mission: launch once, adjust twice, land on target!',
  waves:      '🌊 Mission: move two waves until a quiet node appears!',
  optics:     '🔭 Mission: bend light and predict where it lands!',
  pendulum:   '⏰ Mission: lift the bob and trade height for speed!',
  emfield:    '⚡ Mission: place a charge and map its invisible reach!',
  fluid:      '💧 Mission: stir the flow and follow one swirl!',
  relativity: '🌌 Mission: stretch time enough to notice!',
  circuit:    '💡 Mission: close a loop and wake up the current!',
  thermal:    '🌡️ Mission: move heat from hot chaos to cool order!',
  periodic:   '🧪 Mission: pick an element and uncover its personality!',
  molecules:  '🔬 Mission: rotate a molecule until its shape clicks!',
  atomic:     '⚛️ Mission: orbit the atom and spot the energy levels!',
  bonding:    '🔗 Mission: connect atoms and explain why they stay!',
  orbitals:   '☁️ Mission: find the cloud where an electron may be hiding!',
  crystal:    '💎 Mission: repeat one cell until a lattice appears!',
  reactions:  '🔥 Mission: start a reaction and track the rearrangement!',
  rxnEnergy:  '⚡ Mission: climb the energy hill and find the drop!',
  spectro:    '🌈 Mission: read the colored lines like a fingerprint!',
  protein:    '🧬 Mission: fold the chain and find the structure!',
  titration:  '💧 Mission: drip carefully and catch the color shift!',
};

const CONFETTI_EMOJIS = ['⭐', '🌟', '✨', '💫', '🎉', '🎊', '🎈', '💥', '🔥', '🌈', '🏆', '🎯'];
const CELEBRATE_EMOJIS = ['🎉', '⭐', '🌟', '✨', '💫', '🎊'];

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
    this._toast.textContent = copy.entry;
    this._pulse(this._toast, 'play-toast-visible');
    this.showMission(copy.missions[Math.floor(Math.random() * copy.missions.length)], copy.accent);
    this.sparkle(copy.accent);
  }

  showTopic(subjectId, topicId) {
    const copy = SUBJECT_COPY[subjectId] || SUBJECT_COPY.math;
    this.showMission(TOPIC_MISSIONS[topicId] || '🔬 Mission: poke the lab and see what pushes back!', copy.accent);
    this.confetti();
  }

  showMessage(text, accent = '#ffd700') {
    this._toast.style.setProperty('--accent', accent);
    this._toast.textContent = text;
    this._pulse(this._toast, 'play-toast-visible');
  }

  showMission(text, accent = '#00d4ff') {
    this._mission.style.setProperty('--accent', accent);
    this._mission.textContent = text;
    this._mission.classList.remove('mission-visible');
    void this._mission.offsetWidth;
    this._mission.classList.add('mission-visible');
  }

  // Burst of emoji confetti from center (or given position)
  confetti(x = window.innerWidth / 2, y = window.innerHeight * 0.45) {
    for (let i = 0; i < 20; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.textContent = CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)];
      const spread = 280;
      el.style.left = `${x + (Math.random() - 0.5) * spread}px`;
      el.style.top = `${y + (Math.random() - 0.5) * 120}px`;
      el.style.setProperty('--tx', `${(Math.random() - 0.5) * 160}px`);
      el.style.setProperty('--ty', `${-(40 + Math.random() * 120)}px`);
      el.style.animationDelay = `${Math.random() * 0.25}s`;
      el.style.animationDuration = `${0.9 + Math.random() * 0.55}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1600);
    }
  }

  // A single emoji floats up from a position
  floatUp(emoji = '⭐', x = window.innerWidth / 2, y = window.innerHeight * 0.6) {
    const el = document.createElement('div');
    el.className = 'float-emoji';
    el.textContent = emoji;
    el.style.left = `${x + (Math.random() - 0.5) * 60}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  // Sparkle dot burst (dots, not emoji)
  sparkle(accent = '#ffd700') {
    const layer = document.createElement('div');
    layer.className = 'sparkle-layer';
    for (let i = 0; i < 26; i++) {
      const dot = document.createElement('span');
      dot.style.setProperty('--x', `${(Math.random() - 0.5) * 400}px`);
      dot.style.setProperty('--y', `${(Math.random() - 0.5) * 220}px`);
      dot.style.setProperty('--delay', `${Math.random() * 0.22}s`);
      dot.style.setProperty('--accent', accent);
      layer.appendChild(dot);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 1100);
  }

  // Big celebration: confetti + floating emojis
  celebrate(x, y) {
    this.confetti(x, y);
    CELEBRATE_EMOJIS.forEach((emoji, i) => {
      setTimeout(() => {
        this.floatUp(emoji, x + (Math.random() - 0.5) * 200, y);
      }, i * 120);
    });
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
    el.innerHTML = '<strong>🌟 Pick a portal!</strong><span>Touch or click a glowing orb to start your science adventure!</span>';
    document.body.appendChild(el);
    return el;
  }

  _pulse(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), 2800);
  }
}
