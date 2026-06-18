/**
 * ARPeriodicTableWall.js
 * AR Periodic Table Wall — 118 element tiles on a vertical surface.
 * FEATURE CLASS INTERFACE: activate(), deactivate(), update(camera, canvas, dt)
 */

import {
  MeshBuilder,
  Vector3,
  Color3,
  Color4,
  StandardMaterial,
  DynamicTexture,
  GlowLayer,
  Mesh
} from '@babylonjs/core';

// ── Element data ──────────────────────────────────────────────────────────────
// Full 20 named + 98 generic placeholders
const ELEMENTS_NAMED = [
  { symbol:'H',  name:'Hydrogen',   number:1,   group:1,  period:1, category:'nonmetal',        mass:1.008,   econf:'1s¹',     eneg:2.20 },
  { symbol:'He', name:'Helium',     number:2,   group:18, period:1, category:'nobleGas',         mass:4.003,   econf:'1s²',     eneg:null },
  { symbol:'Li', name:'Lithium',    number:3,   group:1,  period:2, category:'alkali',           mass:6.941,   econf:'[He]2s¹', eneg:0.98 },
  { symbol:'Be', name:'Beryllium',  number:4,   group:2,  period:2, category:'alkalineEarth',    mass:9.012,   econf:'[He]2s²', eneg:1.57 },
  { symbol:'B',  name:'Boron',      number:5,   group:13, period:2, category:'metalloid',        mass:10.81,   econf:'[He]2s²2p¹', eneg:2.04 },
  { symbol:'C',  name:'Carbon',     number:6,   group:14, period:2, category:'nonmetal',         mass:12.011,  econf:'[He]2s²2p²', eneg:2.55 },
  { symbol:'N',  name:'Nitrogen',   number:7,   group:15, period:2, category:'nonmetal',         mass:14.007,  econf:'[He]2s²2p³', eneg:3.04 },
  { symbol:'O',  name:'Oxygen',     number:8,   group:16, period:2, category:'nonmetal',         mass:15.999,  econf:'[He]2s²2p⁴', eneg:3.44 },
  { symbol:'F',  name:'Fluorine',   number:9,   group:17, period:2, category:'halogen',          mass:18.998,  econf:'[He]2s²2p⁵', eneg:3.98 },
  { symbol:'Ne', name:'Neon',       number:10,  group:18, period:2, category:'nobleGas',         mass:20.180,  econf:'[He]2s²2p⁶', eneg:null },
  { symbol:'Na', name:'Sodium',     number:11,  group:1,  period:3, category:'alkali',           mass:22.990,  econf:'[Ne]3s¹', eneg:0.93 },
  { symbol:'Mg', name:'Magnesium',  number:12,  group:2,  period:3, category:'alkalineEarth',    mass:24.305,  econf:'[Ne]3s²', eneg:1.31 },
  { symbol:'Al', name:'Aluminium',  number:13,  group:13, period:3, category:'transitionMetal',  mass:26.982,  econf:'[Ne]3s²3p¹', eneg:1.61 },
  { symbol:'Si', name:'Silicon',    number:14,  group:14, period:3, category:'metalloid',        mass:28.086,  econf:'[Ne]3s²3p²', eneg:1.90 },
  { symbol:'P',  name:'Phosphorus', number:15,  group:15, period:3, category:'nonmetal',         mass:30.974,  econf:'[Ne]3s²3p³', eneg:2.19 },
  { symbol:'S',  name:'Sulfur',     number:16,  group:16, period:3, category:'nonmetal',         mass:32.06,   econf:'[Ne]3s²3p⁴', eneg:2.58 },
  { symbol:'Cl', name:'Chlorine',   number:17,  group:17, period:3, category:'halogen',          mass:35.45,   econf:'[Ne]3s²3p⁵', eneg:3.16 },
  { symbol:'Ar', name:'Argon',      number:18,  group:18, period:3, category:'nobleGas',         mass:39.948,  econf:'[Ne]3s²3p⁶', eneg:null },
  { symbol:'K',  name:'Potassium',  number:19,  group:1,  period:4, category:'alkali',           mass:39.098,  econf:'[Ar]4s¹', eneg:0.82 },
  { symbol:'Ca', name:'Calcium',    number:20,  group:2,  period:4, category:'alkalineEarth',    mass:40.078,  econf:'[Ar]4s²', eneg:1.00 }
];

// Generic placeholders for elements 21-118
function buildGenericElements() {
  const generics = [];
  const symbols = [
    'Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn',
    'Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr',
    'Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn',
    'Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd',
    'Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb',
    'Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg',
    'Tl','Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th',
    'Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm',
    'Md','No','Lr','Rf','Db','Sg','Bh','Hs','Mt','Ds',
    'Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og'
  ];
  const names = [
    'Scandium','Titanium','Vanadium','Chromium','Manganese','Iron','Cobalt','Nickel','Copper','Zinc',
    'Gallium','Germanium','Arsenic','Selenium','Bromine','Krypton','Rubidium','Strontium','Yttrium','Zirconium',
    'Niobium','Molybdenum','Technetium','Ruthenium','Rhodium','Palladium','Silver','Cadmium','Indium','Tin',
    'Antimony','Tellurium','Iodine','Xenon','Caesium','Barium','Lanthanum','Cerium','Praseodymium','Neodymium',
    'Promethium','Samarium','Europium','Gadolinium','Terbium','Dysprosium','Holmium','Erbium','Thulium','Ytterbium',
    'Lutetium','Hafnium','Tantalum','Tungsten','Rhenium','Osmium','Iridium','Platinum','Gold','Mercury',
    'Thallium','Lead','Bismuth','Polonium','Astatine','Radon','Francium','Radium','Actinium','Thorium',
    'Protactinium','Uranium','Neptunium','Plutonium','Americium','Curium','Berkelium','Californium','Einsteinium','Fermium',
    'Mendelevium','Nobelium','Lawrencium','Rutherfordium','Dubnium','Seaborgium','Bohrium','Hassium','Meitnerium','Darmstadtium',
    'Roentgenium','Copernicium','Nihonium','Flerovium','Moscovium','Livermorium','Tennessine','Oganesson'
  ];
  // Approximate group/period for elements 21-118
  const groupPeriod = [
    [3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],
    [13,4],[14,4],[15,4],[16,4],[17,4],[18,4],
    [1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],[13,5],[14,5],[15,5],[16,5],[17,5],[18,5],
    [1,6],[2,6],[3,6],[4,6],[5,6],[6,6],[7,6],[8,6],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[15,6],[16,6],[17,6],[18,6],
    [3,8],[4,8],[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[15,8],[16,8],
    [1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[11,7],[12,7],
    [3,9],[4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[12,9],[13,9],[14,9],[15,9],[16,9],[17,9],[18,9]
  ];
  const categories = [
    'transitionMetal','transitionMetal','transitionMetal','transitionMetal','transitionMetal',
    'transitionMetal','transitionMetal','transitionMetal','transitionMetal','transitionMetal',
    'transitionMetal','metalloid','metalloid','nonmetal','halogen','nobleGas',
    'alkali','alkalineEarth','transitionMetal','transitionMetal','transitionMetal','transitionMetal',
    'transitionMetal','transitionMetal','transitionMetal','transitionMetal','transitionMetal',
    'transitionMetal','transitionMetal','transitionMetal','metalloid','nonmetal','halogen','nobleGas',
    'alkali','alkalineEarth','transitionMetal','lanthanide','lanthanide','lanthanide',
    'lanthanide','lanthanide','lanthanide','lanthanide','lanthanide','lanthanide','lanthanide',
    'lanthanide','lanthanide','lanthanide','lanthanide','transitionMetal','transitionMetal',
    'transitionMetal','transitionMetal','transitionMetal','transitionMetal','transitionMetal',
    'transitionMetal','transitionMetal','transitionMetal','transitionMetal','transitionMetal',
    'metalloid','halogen','nobleGas',
    'alkali','alkalineEarth','actinide','actinide','actinide','actinide','actinide','actinide',
    'actinide','actinide','actinide','actinide','actinide','actinide','actinide','actinide',
    'actinide','actinide','transitionMetal','transitionMetal','transitionMetal','transitionMetal',
    'transitionMetal','transitionMetal','transitionMetal','transitionMetal','transitionMetal',
    'transitionMetal','transitionMetal','metalloid','metalloid','metalloid','halogen','nobleGas'
  ];
  for (let i = 0; i < 98; i++) {
    const n = 21 + i;
    const [group, period] = groupPeriod[i] || [1, 7];
    generics.push({
      symbol:   symbols[i]  || 'El',
      name:     names[i]    || `Element ${n}`,
      number:   n,
      group,
      period,
      category: categories[i] || 'transitionMetal',
      mass:     parseFloat(n.toFixed(3)),
      econf:    '—',
      eneg:     null
    });
  }
  return generics;
}

const ALL_ELEMENTS = [...ELEMENTS_NAMED, ...buildGenericElements()];

// ── Category colours ──────────────────────────────────────────────────────────
const CAT_COLORS = {
  alkali:           { bg: '#c0392b', text: '#fff' },
  alkalineEarth:    { bg: '#e67e22', text: '#fff' },
  transitionMetal:  { bg: '#b8860b', text: '#fff' },
  lanthanide:       { bg: '#16a085', text: '#fff' },
  actinide:         { bg: '#8e44ad', text: '#fff' },
  metalloid:        { bg: '#1abc9c', text: '#fff' },
  nonmetal:         { bg: '#27ae60', text: '#fff' },
  halogen:          { bg: '#2980b9', text: '#fff' },
  nobleGas:         { bg: '#6c3483', text: '#fff' },
  unknown:          { bg: '#555',    text: '#fff' }
};

export class ARPeriodicTableWall {
  constructor(scene) {
    this._scene       = scene;
    this._active      = false;
    this._tiles       = [];
    this._panel       = null;
    this._infoCard    = null;
    this._glowLayer   = null;
    this._observer    = null;
    this._filter      = 'All';
    this._searchQuery = '';
  }

  // ── activate ───────────────────────────────────────────────────────────────
  activate() {
    if (this._active) return;
    this._active = true;

    this._glowLayer = new GlowLayer('pt_glow', this._scene);
    this._glowLayer.intensity = 0;

    this._buildWall();
    this._buildPanel();

    this._observer = this._scene.onBeforeRenderObservable.add(() => {
      this.update(
        this._scene.activeCamera,
        this._scene.getEngine().getRenderingCanvas(),
        this._scene.getEngine().getDeltaTime()
      );
    });
  }

  // ── deactivate ─────────────────────────────────────────────────────────────
  deactivate() {
    if (!this._active) return;
    this._active = false;

    if (this._observer) {
      this._scene.onBeforeRenderObservable.remove(this._observer);
      this._observer = null;
    }

    for (const tile of this._tiles) {
      if (tile.mesh) tile.mesh.dispose();
    }
    this._tiles = [];

    if (this._glowLayer) { this._glowLayer.dispose(); this._glowLayer = null; }

    if (this._panel && this._panel.parentNode) {
      this._panel.parentNode.removeChild(this._panel);
    }
    this._panel = null;

    this._closeInfoCard();
  }

  // ── update ─────────────────────────────────────────────────────────────────
  update(camera, canvas, dt) {
    if (!this._active) return;
    // Highlight glow on search hits
    if (this._glowLayer) {
      this._glowLayer.intensity = this._searchQuery ? 0.8 : 0;
    }
  }

  // ── private: build wall ────────────────────────────────────────────────────
  _buildWall() {
    const STEP = 0.55;
    const WALL_Z = 4.0;

    for (const el of ALL_ELEMENTS) {
      const col = el.group - 1;  // 0-17
      const row = el.period - 1; // 0-6 (main table), 7-8 (lanthanides/actinides)

      const x = (col - 8.5) * STEP;
      const y = (3.5 - row) * STEP;
      const z = WALL_Z;

      const tex = this._buildTileTex(el);

      const plane = MeshBuilder.CreatePlane(
        `tile_${el.number}`,
        { width: 0.5, height: 0.5 },
        this._scene
      );
      plane.position.set(x, y, z);
      plane.isPickable = true;

      const mat = new StandardMaterial(`tile_mat_${el.number}`, this._scene);
      mat.diffuseTexture   = tex;
      mat.emissiveTexture  = tex;
      mat.disableLighting  = true;
      mat.backFaceCulling  = false;
      plane.material = mat;

      // Click → info card
      plane.actionManager = null;
      plane.enablePointerMoveEvents = true;

      const tileData = { mesh: plane, el, mat };
      this._tiles.push(tileData);

      plane.metadata = { elNumber: el.number };
    }

    // Global pointer-up handler
    this._pointerHandler = (evt) => {
      if (!this._active) return;
      const pick = this._scene.pick(this._scene.pointerX, this._scene.pointerY);
      if (pick.hit && pick.pickedMesh?.metadata?.elNumber != null) {
        const n = pick.pickedMesh.metadata.elNumber;
        const el = ALL_ELEMENTS.find(e => e.number === n);
        if (el) this._showInfoCard(el);
      }
    };
    this._scene.getEngine().getRenderingCanvas()
      .addEventListener('pointerup', this._pointerHandler);
  }

  // ── private: tile texture ──────────────────────────────────────────────────
  _buildTileTex(el) {
    const W = 64, H = 64;
    const tex = new DynamicTexture(`tex_${el.number}`, { width: W, height: H }, this._scene);
    tex.hasAlpha = true;
    const ctx = tex.getContext();

    const { bg, text } = CAT_COLORS[el.category] || CAT_COLORS.unknown;

    // Background
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(1, 1, W - 2, H - 2, 5);
    ctx.fill();

    // Atomic number
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(el.number), 4, 12);

    // Symbol
    ctx.fillStyle = text;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(el.symbol, W / 2, 40);

    // Mass
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '8px sans-serif';
    ctx.fillText(parseFloat(el.mass).toFixed(2), W / 2, 56);

    tex.update();
    return tex;
  }

  // ── private: panel ─────────────────────────────────────────────────────────
  _buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'ar-pt-panel';
    Object.assign(panel.style, {
      position:     'fixed',
      top:          '80px',
      left:         '20px',
      background:   'rgba(10,20,40,0.92)',
      border:       '1px solid rgba(0,212,255,0.3)',
      borderRadius: '12px',
      color:        '#e8f4ff',
      padding:      '14px 18px',
      zIndex:       '2000',
      minWidth:     '220px',
      fontFamily:   'sans-serif',
      fontSize:     '14px',
      userSelect:   'none'
    });

    const title = document.createElement('div');
    title.textContent = 'Periodic Table AR';
    Object.assign(title.style, { fontWeight: 'bold', marginBottom: '10px', color: '#00d4ff' });
    panel.appendChild(title);

    // Search
    const searchInput = document.createElement('input');
    searchInput.type        = 'text';
    searchInput.placeholder = 'Search element...';
    Object.assign(searchInput.style, {
      width: '100%', boxSizing: 'border-box', marginBottom: '10px',
      background: 'rgba(0,20,40,0.9)', color: '#e8f4ff',
      border: '1px solid rgba(0,212,255,0.3)', borderRadius: '6px', padding: '5px'
    });
    searchInput.addEventListener('input', () => {
      this._searchQuery = searchInput.value.trim().toLowerCase();
      this._applySearchHighlight();
    });
    panel.appendChild(searchInput);

    // Filter buttons
    const filters = ['All', 'Metals', 'Nonmetals', 'Noble Gas'];
    const filterRow = document.createElement('div');
    filterRow.style.display = 'flex';
    filterRow.style.flexWrap = 'wrap';
    filterRow.style.gap = '4px';
    filters.forEach(f => {
      const btn = document.createElement('button');
      btn.textContent = f;
      Object.assign(btn.style, {
        padding: '4px 8px', cursor: 'pointer', borderRadius: '6px',
        background: f === this._filter ? 'rgba(0,150,255,0.7)' : 'rgba(0,40,80,0.7)',
        color: '#e8f4ff', border: '1px solid rgba(0,212,255,0.3)', fontSize: '12px'
      });
      btn.addEventListener('click', () => {
        this._filter = f;
        filterRow.querySelectorAll('button').forEach(b => {
          b.style.background = b.textContent === f
            ? 'rgba(0,150,255,0.7)' : 'rgba(0,40,80,0.7)';
        });
        this._applyFilter();
      });
      filterRow.appendChild(btn);
    });
    panel.appendChild(filterRow);

    document.body.appendChild(panel);
    this._panel = panel;
  }

  // ── private: filter visibility ─────────────────────────────────────────────
  _applyFilter() {
    const metalCats    = ['alkali','alkalineEarth','transitionMetal','lanthanide','actinide','metalloid'];
    const nonmetalCats = ['nonmetal','halogen'];
    const nobleCats    = ['nobleGas'];

    for (const tile of this._tiles) {
      const cat = tile.el.category;
      let visible = true;
      if (this._filter === 'Metals')    visible = metalCats.includes(cat);
      if (this._filter === 'Nonmetals') visible = nonmetalCats.includes(cat);
      if (this._filter === 'Noble Gas') visible = nobleCats.includes(cat);
      tile.mesh.setEnabled(visible);
    }
  }

  // ── private: search highlight ──────────────────────────────────────────────
  _applySearchHighlight() {
    if (!this._glowLayer) return;
    this._glowLayer.removeAllMeshes();

    if (!this._searchQuery) return;

    for (const tile of this._tiles) {
      const el = tile.el;
      const q  = this._searchQuery;
      const match =
        el.symbol.toLowerCase().includes(q) ||
        el.name.toLowerCase().includes(q)   ||
        String(el.number).includes(q);

      if (match) {
        this._glowLayer.addIncludedOnlyMesh(tile.mesh);
      }
    }
  }

  // ── private: info card ─────────────────────────────────────────────────────
  _showInfoCard(el) {
    this._closeInfoCard();

    const card = document.createElement('div');
    Object.assign(card.style, {
      position:     'fixed',
      top:          '50%',
      left:         '50%',
      transform:    'translate(-50%,-50%)',
      background:   'rgba(10,20,40,0.95)',
      border:       '1px solid rgba(0,212,255,0.5)',
      borderRadius: '14px',
      color:        '#e8f4ff',
      padding:      '20px 24px',
      zIndex:       '3000',
      minWidth:     '260px',
      maxWidth:     '340px',
      fontFamily:   'sans-serif',
      boxShadow:    '0 0 40px rgba(0,212,255,0.25)'
    });

    const { bg } = CAT_COLORS[el.category] || CAT_COLORS.unknown;

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="background:${bg};width:52px;height:52px;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="font-size:10px;opacity:0.8">${el.number}</div>
          <div style="font-size:22px;font-weight:bold">${el.symbol}</div>
        </div>
        <div>
          <div style="font-size:20px;font-weight:bold;color:#00d4ff">${el.name}</div>
          <div style="font-size:12px;opacity:0.7;text-transform:capitalize">${el.category.replace(/([A-Z])/g,' $1')}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;margin-bottom:12px;">
        <div><span style="opacity:0.6">Atomic Mass:</span><br/><strong>${el.mass}</strong></div>
        <div><span style="opacity:0.6">Period / Group:</span><br/><strong>${el.period} / ${el.group}</strong></div>
        <div><span style="opacity:0.6">e⁻ Config:</span><br/><strong>${el.econf || '—'}</strong></div>
        <div><span style="opacity:0.6">Electronegativity:</span><br/><strong>${el.eneg != null ? el.eneg : '—'}</strong></div>
      </div>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    Object.assign(closeBtn.style, {
      width: '100%', padding: '8px', cursor: 'pointer',
      background: 'rgba(0,80,160,0.7)', color: '#e8f4ff',
      border: '1px solid rgba(0,212,255,0.4)', borderRadius: '8px', fontSize: '14px'
    });
    closeBtn.addEventListener('click', () => this._closeInfoCard());
    card.appendChild(closeBtn);

    document.body.appendChild(card);
    this._infoCard = card;
  }

  _closeInfoCard() {
    if (this._infoCard && this._infoCard.parentNode) {
      this._infoCard.parentNode.removeChild(this._infoCard);
    }
    this._infoCard = null;
  }
}
