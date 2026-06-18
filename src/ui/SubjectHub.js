export const SUBJECT_TOPICS = {
  math: [
    { id: 'function3d', label: '3D Functions', icon: 'F3D' },
    { id: 'graph2d',    label: '2D Graphs', icon: 'G2D' },
    { id: 'geometry',   label: 'Geometry Lab', icon: 'GEO' },
    { id: 'calculus',   label: 'Calculus', icon: 'CAL' },
    { id: 'vectors',    label: 'Vector Lab', icon: 'VEC' },
    { id: 'trig',       label: 'Trigonometry', icon: 'TRI' },
    { id: 'complex',    label: 'Complex Plane', icon: 'CPL' },
    { id: 'linearalg',  label: 'Linear Algebra', icon: 'LIN' },
    { id: 'fractal',    label: 'Fractal Explorer', icon: 'FRA' },
  ],
  physics: [
    { id: 'newton',     label: "Newton's Laws", icon: 'NEW' },
    { id: 'gravity',    label: 'Gravity & Orbits', icon: 'ORB' },
    { id: 'projectile', label: 'Projectile Motion', icon: 'PRJ' },
    { id: 'waves',      label: 'Wave Lab', icon: 'WAV' },
    { id: 'optics',     label: 'Optics Lab', icon: 'OPT' },
    { id: 'pendulum',   label: 'Pendulum Lab', icon: 'PEN' },
    { id: 'emfield',    label: 'EM Fields', icon: 'EMF' },
    { id: 'fluid',      label: 'Fluid Simulation', icon: 'FLU' },
    { id: 'relativity', label: 'Relativity', icon: 'REL' },
    { id: 'circuit',    label: 'Circuit Builder', icon: 'CIR' },
    { id: 'thermal',    label: 'Thermal Diffusion', icon: 'THM' },
  ],
  chem: [
    { id: 'periodic',   label: 'Periodic Table', icon: 'PER' },
    { id: 'molecules',  label: 'Molecule Viewer', icon: 'MOL' },
    { id: 'atomic',     label: 'Atomic Model', icon: 'ATM' },
    { id: 'bonding',    label: 'Chemical Bonding', icon: 'BND' },
    { id: 'orbitals',   label: 'Orbital Viewer', icon: 'ORB' },
    { id: 'crystal',    label: 'Crystal Lattice', icon: 'LAT' },
    { id: 'reactions',  label: 'Reactions', icon: 'RXN' },
    { id: 'rxnEnergy',  label: 'Reaction Energy', icon: 'NRG' },
    { id: 'spectro',    label: 'Spectroscopy', icon: 'SPC' },
    { id: 'protein',    label: 'Protein Viewer', icon: 'PRO' },
    { id: 'titration',  label: 'Titration Sim', icon: 'TIT' },
  ],
};

export const SUBJECT_ACCENT = {
  math: '#00d4ff',
  physics: '#ff6b35',
  chem: '#7fff7f',
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
    const typeClass = subjectId === 'physics' ? 'physics-topic' : subjectId === 'chem' ? 'chem-topic' : '';

    const panel = document.createElement('div');
    panel.id = 'topic-panel';
    panel.style.setProperty('--accent', accent);

    topics.forEach(topic => {
      const btn = document.createElement('button');
      btn.className = `topic-btn ${typeClass}`;
      btn.textContent = topic.label;
      btn.dataset.icon = topic.icon;
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
