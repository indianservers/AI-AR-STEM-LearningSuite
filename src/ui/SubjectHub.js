export const SUBJECT_TOPICS = {
  math: [
    { id: 'function3d', label: '3D Functions',   icon: '📈' },
    { id: 'graph2d',    label: '2D Graphs',       icon: '📊' },
    { id: 'geometry',   label: 'Geometry',         icon: '📐' },
    { id: 'calculus',   label: 'Calculus',         icon: '∫' },
    { id: 'vectors',    label: 'Vectors',           icon: '➡️' },
    { id: 'trig',       label: 'Trigonometry',     icon: '〰️' },
    { id: 'complex',    label: 'Complex Plane',    icon: '🔢' },
    { id: 'linearalg',  label: 'Linear Algebra',   icon: '🔲' },
    { id: 'fractal',    label: 'Fractals',          icon: '🌀' },
  ],
  physics: [
    { id: 'newton',     label: "Newton's Laws",    icon: '🍎' },
    { id: 'gravity',    label: 'Gravity & Orbits',  icon: '🪐' },
    { id: 'projectile', label: 'Projectile',        icon: '🚀' },
    { id: 'waves',      label: 'Waves',             icon: '🌊' },
    { id: 'optics',     label: 'Optics',            icon: '🔭' },
    { id: 'pendulum',   label: 'Pendulum',          icon: '⏰' },
    { id: 'emfield',    label: 'EM Fields',         icon: '⚡' },
    { id: 'fluid',      label: 'Fluids',            icon: '💧' },
    { id: 'relativity', label: 'Relativity',        icon: '🌌' },
    { id: 'circuit',    label: 'Circuits',          icon: '💡' },
    { id: 'thermal',    label: 'Thermal',           icon: '🌡️' },
  ],
  chem: [
    { id: 'periodic',   label: 'Periodic Table',   icon: '🧪' },
    { id: 'molecules',  label: 'Molecules',         icon: '🔬' },
    { id: 'atomic',     label: 'Atomic Model',      icon: '⚛️' },
    { id: 'bonding',    label: 'Bonding',           icon: '🔗' },
    { id: 'orbitals',   label: 'Orbitals',          icon: '☁️' },
    { id: 'crystal',    label: 'Crystal Lattice',   icon: '💎' },
    { id: 'reactions',  label: 'Reactions',         icon: '🔥' },
    { id: 'rxnEnergy',  label: 'Reaction Energy',   icon: '⚡' },
    { id: 'spectro',    label: 'Spectroscopy',      icon: '🌈' },
    { id: 'protein',    label: 'Proteins',          icon: '🧬' },
    { id: 'titration',  label: 'Titration',         icon: '💧' },
  ],
  astro: [
    { id: 'solar-system',      label: 'Solar System',   icon: 'SS' },
    { id: 'ar-sky-map',        label: 'AR Sky Map',      icon: 'AR' },
    { id: 'telescope',         label: 'Telescope',       icon: 'TS' },
    { id: 'earth-moon-sun',    label: 'Earth Moon Sun',  icon: 'EMS' },
    { id: 'galaxy-deep-space', label: 'Galaxy',          icon: 'GX' },
    { id: 'astro-missions',    label: 'Missions',        icon: 'MS' },
  ],
};

export const SUBJECT_ACCENT = {
  math: '#00d4ff',
  physics: '#ff6b35',
  chem: '#7fff7f',
  astro: '#8de6ff',
};

export class SubjectHub {
  constructor() {
    this._panelEl = null;
    this._subject = null;
    this._onTopicSelect = null;
  }

  show(subjectId, onTopicSelect) {
    this._subject = subjectId;
    this._onTopicSelect = onTopicSelect;
    this._buildDOM(subjectId);

    document.getElementById('back-btn').classList.remove('hidden');
    document.getElementById('home-btn').classList.add('hidden');
  }

  hide() {
    this._panelEl?.remove();
    this._panelEl = null;
  }

  _buildDOM(subjectId) {
    this.hide();

    const topics = SUBJECT_TOPICS[subjectId] || [];
    const accent = SUBJECT_ACCENT[subjectId] || '#00d4ff';
    const typeClass = subjectId === 'physics' ? 'physics-topic' : subjectId === 'chem' ? 'chem-topic' : subjectId === 'astro' ? 'astro-topic' : '';

    const panel = document.createElement('div');
    panel.id = 'topic-panel';
    panel.style.setProperty('--accent', accent);

    topics.forEach((topic, index) => {
      const btn = document.createElement('button');
      btn.className = `topic-btn ${typeClass}`;
      btn.style.setProperty('--i', index);
      btn.innerHTML = `<span class="topic-icon">${topic.icon}</span><span class="topic-label">${topic.label}</span>`;
      btn.dataset.topicId = topic.id;
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._onTopicSelect?.(subjectId, topic.id);
      });
      panel.appendChild(btn);
    });

    document.getElementById('hud-layer').appendChild(panel);
    this._panelEl = panel;
  }
}
