// Feature 3: Concept Graph - prerequisite map showing topic relationships
export const CONCEPT_NODES = [
  { id: 'trig',       label: 'Trigonometry',    x: 100, y: 80,  color: '#00d4ff', subject: 'math' },
  { id: 'function3d', label: '3D Functions',    x: 280, y: 80,  color: '#00d4ff', subject: 'math' },
  { id: 'graph2d',    label: '2D Graphs',       x: 100, y: 200, color: '#00d4ff', subject: 'math' },
  { id: 'calculus',   label: 'Calculus',        x: 280, y: 200, color: '#00d4ff', subject: 'math' },
  { id: 'vectors',    label: 'Vectors',         x: 190, y: 320, color: '#00d4ff', subject: 'math' },
  { id: 'linearalg',  label: 'Linear Algebra',  x: 380, y: 320, color: '#00d4ff', subject: 'math' },
  { id: 'complex',    label: 'Complex Plane',   x: 380, y: 200, color: '#00d4ff', subject: 'math' },
  { id: 'fractal',    label: 'Fractals',        x: 500, y: 200, color: '#00d4ff', subject: 'math' },

  { id: 'newton',     label: "Newton's Laws",   x: 700, y: 80,  color: '#ff6b35', subject: 'physics' },
  { id: 'projectile', label: 'Projectile',      x: 860, y: 80,  color: '#ff6b35', subject: 'physics' },
  { id: 'waves',      label: 'Waves',           x: 700, y: 200, color: '#ff6b35', subject: 'physics' },
  { id: 'optics',     label: 'Optics',          x: 860, y: 200, color: '#ff6b35', subject: 'physics' },
  { id: 'pendulum',   label: 'Pendulum',        x: 700, y: 320, color: '#ff6b35', subject: 'physics' },
  { id: 'gravity',    label: 'Gravity',         x: 860, y: 320, color: '#ff6b35', subject: 'physics' },
  { id: 'emfield',    label: 'EM Fields',       x: 780, y: 440, color: '#ff6b35', subject: 'physics' },
  { id: 'fluid',      label: 'Fluid Sim',       x: 620, y: 440, color: '#ff6b35', subject: 'physics' },
  { id: 'circuit',    label: 'Circuits',        x: 940, y: 440, color: '#ff6b35', subject: 'physics' },
  { id: 'relativity', label: 'Relativity',      x: 780, y: 560, color: '#ff6b35', subject: 'physics' },
  { id: 'thermal',    label: 'Thermal',         x: 620, y: 560, color: '#ff6b35', subject: 'physics' },

  { id: 'atomic',     label: 'Atomic Model',    x: 1100, y: 80,  color: '#7fff7f', subject: 'chem' },
  { id: 'periodic',   label: 'Periodic Table',  x: 1260, y: 80,  color: '#7fff7f', subject: 'chem' },
  { id: 'bonding',    label: 'Bonding',         x: 1100, y: 200, color: '#7fff7f', subject: 'chem' },
  { id: 'molecules',  label: 'Molecules',       x: 1260, y: 200, color: '#7fff7f', subject: 'chem' },
  { id: 'orbitals',   label: 'Orbitals',        x: 1100, y: 320, color: '#7fff7f', subject: 'chem' },
  { id: 'crystal',    label: 'Crystal Lattice', x: 1260, y: 320, color: '#7fff7f', subject: 'chem' },
  { id: 'reactions',  label: 'Reactions',       x: 1180, y: 440, color: '#7fff7f', subject: 'chem' },
  { id: 'spectro',    label: 'Spectroscopy',    x: 1020, y: 440, color: '#7fff7f', subject: 'chem' },
  { id: 'protein',    label: 'Protein Viewer',  x: 1340, y: 440, color: '#7fff7f', subject: 'chem' },
  { id: 'rxnEnergy',  label: 'Reaction Energy', x: 1180, y: 560, color: '#7fff7f', subject: 'chem' },
  { id: 'titration',  label: 'Titration',       x: 1020, y: 560, color: '#7fff7f', subject: 'chem' },
];

export const CONCEPT_EDGES = [
  ['trig', 'function3d'], ['trig', 'waves'], ['trig', 'graph2d'],
  ['graph2d', 'calculus'], ['calculus', 'function3d'],
  ['vectors', 'linearalg'], ['vectors', 'function3d'],
  ['complex', 'fractal'], ['trig', 'complex'],
  ['newton', 'projectile'], ['newton', 'pendulum'], ['newton', 'fluid'],
  ['waves', 'optics'], ['waves', 'emfield'], ['waves', 'thermal'],
  ['gravity', 'relativity'], ['emfield', 'circuit'],
  ['atomic', 'bonding'], ['atomic', 'orbitals'], ['atomic', 'spectro'],
  ['periodic', 'atomic'], ['periodic', 'crystal'],
  ['bonding', 'molecules'], ['bonding', 'reactions'],
  ['orbitals', 'bonding'], ['reactions', 'rxnEnergy'],
  ['reactions', 'titration'], ['molecules', 'protein'],
];

export class ConceptGraph {
  constructor(onNavigate) {
    this._onNavigate = onNavigate;
    this._el = null;
  }

  show() {
    if (this._el) { this._el.remove(); this._el = null; }

    const overlay = document.createElement('div');
    overlay.className = 'concept-map-overlay';

    const header = document.createElement('div');
    header.className = 'concept-map-header';
    header.innerHTML = `
      <span>Concept Map</span>
      <small>Click any topic to jump there</small>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => this.hide();
    header.appendChild(closeBtn);

    const svgW = 1440;
    const svgH = 660;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.classList.add('concept-map-svg');

    CONCEPT_EDGES.forEach(([a, b]) => {
      const na = CONCEPT_NODES.find(n => n.id === a);
      const nb = CONCEPT_NODES.find(n => n.id === b);
      if (!na || !nb) return;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', na.x);
      line.setAttribute('y1', na.y);
      line.setAttribute('x2', nb.x);
      line.setAttribute('y2', nb.y);
      line.setAttribute('stroke', 'rgba(255,255,255,0.1)');
      line.setAttribute('stroke-width', '1.5');
      svg.appendChild(line);
    });

    CONCEPT_NODES.forEach(node => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('concept-map-node');

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', 22);
      circle.setAttribute('fill', node.color + '18');
      circle.setAttribute('stroke', node.color);
      circle.setAttribute('stroke-width', '1.5');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x);
      text.setAttribute('y', node.y + 38);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', node.color);
      text.setAttribute('font-size', '9');
      text.setAttribute('font-family', 'Segoe UI, sans-serif');
      text.textContent = node.label;

      g.addEventListener('click', () => {
        this.hide();
        this._onNavigate?.(node.subject, node.id);
      });
      g.addEventListener('mouseenter', () => circle.setAttribute('fill', node.color + '35'));
      g.addEventListener('mouseleave', () => circle.setAttribute('fill', node.color + '18'));

      g.append(circle, text);
      svg.appendChild(g);
    });

    overlay.append(header, svg);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) this.hide();
    });
    document.body.appendChild(overlay);
    this._el = overlay;
  }

  hide() {
    this._el?.remove();
    this._el = null;
  }
}
