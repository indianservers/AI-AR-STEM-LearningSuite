import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3
} from '@babylonjs/core';
import { CPK_COLORS } from '../../data/molecules.js';

function hexToColor3(hex) {
  return new Color3(parseInt(hex.slice(1,3),16)/255, parseInt(hex.slice(3,5),16)/255, parseInt(hex.slice(5,7),16)/255);
}

const REACTIONS = [
  {
    id: 'water_formation',
    label: '2H₂ + O₂ → 2H₂O',
    desc: 'Hydrogen combustion — exothermic reaction',
    reactants: [
      { sym: 'H', pos: [-5, 1, 0] }, { sym: 'H', pos: [-5, -1, 0] },
      { sym: 'O', pos: [-2, 1, 0] }, { sym: 'O', pos: [-2, -1, 0] },
      { sym: 'H', pos: [1, 1, 0] },  { sym: 'H', pos: [1, -1, 0] },
    ],
    products: [
      { sym: 'O', pos: [4, 1.5, 0] }, { sym: 'H', pos: [3, 0.5, 0] }, { sym: 'H', pos: [5, 0.5, 0] },
      { sym: 'O', pos: [4, -0.5, 0] }, { sym: 'H', pos: [3, -1.5, 0] }, { sym: 'H', pos: [5, -1.5, 0] },
    ],
    duration: 3,
  },
  {
    id: 'nacl',
    label: 'Na + Cl → NaCl',
    desc: 'Ionic bond formation — Na donates electron to Cl',
    reactants: [
      { sym: 'Na', pos: [-4, 0, 0] },
      { sym: 'Cl', pos: [4, 0, 0] },
    ],
    products: [
      { sym: 'Na', pos: [-0.9, 0, 0] },
      { sym: 'Cl', pos: [0.9, 0, 0] },
    ],
    duration: 2,
  },
  {
    id: 'hcl_form',
    label: 'H₂ + Cl₂ → 2HCl',
    desc: 'Covalent bond breaking and forming',
    reactants: [
      { sym: 'H', pos: [-5, 0.4, 0] }, { sym: 'H', pos: [-3.5, 0.4, 0] },
      { sym: 'Cl', pos: [-1, -0.4, 0] }, { sym: 'Cl', pos: [1, -0.4, 0] },
    ],
    products: [
      { sym: 'H', pos: [3, 0.6, 0] }, { sym: 'Cl', pos: [4, 0.6, 0] },
      { sym: 'H', pos: [3, -0.6, 0] }, { sym: 'Cl', pos: [4, -0.6, 0] },
    ],
    duration: 2.5,
  },
];

export class ReactionAnimator {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._atomData = [];
    this._ui = null;
    this._reaction = REACTIONS[0];
    this._phase = 'idle'; // 'idle' | 'animating' | 'done'
    this._t = 0;
    this._animT = 0;
  }

  show() {
    this._buildReaction(this._reaction);
    this._buildUI();
  }

  hide() {
    this._clearMeshes();
    this._ui?.remove();
    this._ui = null;
  }

  _clearMeshes() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._atomData = [];
    this._phase = 'idle';
  }

  _buildReaction(reaction) {
    this._clearMeshes();
    this._reaction = reaction;
    this._phase = 'idle';

    reaction.reactants.forEach((atom, i) => {
      const color = hexToColor3(CPK_COLORS[atom.sym] || CPK_COLORS.default);
      const r = atom.sym === 'H' ? 0.2 : atom.sym === 'O' ? 0.3 : atom.sym === 'Cl' ? 0.35 : 0.32;
      const sphere = MeshBuilder.CreateSphere(`ratom_${i}`, { diameter: r * 2.5, segments: 10 }, this.scene);
      sphere.position = new Vector3(...atom.pos);
      const mat = new PBRMaterial(`ratomMat_${i}`, this.scene);
      mat.albedoColor = color;
      mat.emissiveColor = color.scale(0.2);
      mat.metallic = 0.1; mat.roughness = 0.5;
      sphere.material = mat;
      sphere.isPickable = false;
      this._meshes.push(sphere);
      this._atomData.push({
        mesh: sphere,
        startPos: new Vector3(...atom.pos),
        endPos: new Vector3(...(reaction.products[i]?.pos || atom.pos)),
      });
    });

    // Bond lines (reactant bonds shown as faint lines)
    if (reaction.id === 'water_formation') {
      [[0,1],[2,3],[4,5]].forEach(([a,b]) => {
        const la = this._atomData[a].startPos, lb = this._atomData[b].startPos;
        const l = MeshBuilder.CreateLines(`rbond_${a}_${b}`, { points: [la, lb] }, this.scene);
        l.color = new Color3(0.5, 0.5, 0.5); l.alpha = 0.5; l.isPickable = false;
        this._meshes.push(l);
      });
    }

    // Arrow
    const arrow = MeshBuilder.CreateLines('reactionArrow', {
      points: [new Vector3(-0.5, -2.5, 0), new Vector3(0.5, -2.5, 0), new Vector3(0.3, -2.7, 0),
               new Vector3(0.5, -2.5, 0), new Vector3(0.3, -2.3, 0)],
    }, this.scene);
    arrow.color = new Color3(1, 1, 0); arrow.isPickable = false;
    this._meshes.push(arrow);
  }

  _startAnimation() {
    this._phase = 'animating';
    this._animT = 0;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:16px 24px;min-width:380px';

    const rxnGrid = document.createElement('div');
    rxnGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center';
    REACTIONS.forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn chem-topic' + (r.id === this._reaction.id ? ' active' : '');
      btn.textContent = r.label;
      btn.style.fontSize = '0.75rem';
      btn.addEventListener('click', () => {
        rxnGrid.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._buildReaction(r);
        this._startAnimation();
      });
      rxnGrid.appendChild(btn);
    });

    const playBtn = document.createElement('button');
    playBtn.className = 'topic-btn chem-topic';
    playBtn.textContent = '▶ Play Reaction';
    playBtn.addEventListener('click', () => {
      this._buildReaction(this._reaction);
      setTimeout(() => this._startAnimation(), 300);
    });

    this._descEl = document.createElement('div');
    this._descEl.style.cssText = 'font-size:0.78rem;color:#7ba3cc;text-align:center';
    this._descEl.textContent = this._reaction.desc;

    wrap.append(rxnGrid, playBtn, this._descEl);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  update(deltaTime) {
    this._t += deltaTime * 0.001;
    if (this._phase === 'animating') {
      this._animT += deltaTime * 0.001;
      const progress = Math.min(1, this._animT / this._reaction.duration);
      const eased = 0.5 - Math.cos(progress * Math.PI) * 0.5;

      this._atomData.forEach(ad => {
        ad.mesh.position = Vector3.Lerp(ad.startPos, ad.endPos, eased);
      });

      if (progress >= 1) this._phase = 'done';
    }

    // Pulse atoms
    this._meshes.filter(m => m.name.startsWith('ratom')).forEach((m, i) => {
      m.scaling.setAll(1 + Math.sin(this._t * 3 + i) * 0.04);
    });
  }
}
