import {
  MeshBuilder, StandardMaterial, DynamicTexture, Color3, Vector3
} from '@babylonjs/core';
import { ELEMENTS, CATEGORY_COLORS } from '../../data/elements.js';

// Standard periodic table grid layout
const LAYOUT = { /* [symbol]: [col, row] */};
ELEMENTS.forEach(el => {
  let col = el.group, row = el.period;
  if (el.category === 'lanthanide') { row = 8 + (el.z - 57) * 0; col = 3 + (el.z - 57); row = 9; }
  if (el.category === 'actinide')   { col = 3 + (el.z - 89); row = 10; }
  LAYOUT[el.sym] = [col, row];
});

function hexToColor3(hex) {
  if (!hex || hex.length < 7) return new Color3(0.5, 0.5, 0.5);
  return new Color3(
    parseInt(hex.slice(1,3),16)/255,
    parseInt(hex.slice(3,5),16)/255,
    parseInt(hex.slice(5,7),16)/255
  );
}

export class PeriodicTable3D {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._tiles = [];
    this._ui = null;
    this._t = 0;
    this._infoCard = null;
    this._colorBy = 'category'; // 'category' | 'electronegativity' | 'atomic_radius'
  }

  show() {
    this._buildTable();
    this._buildUI();
  }

  hide() {
    this._clearMeshes();
    this._ui?.remove();
    this._ui = null;
    this._infoCard?.remove();
    this._infoCard = null;
  }

  _clearMeshes() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._tiles = [];
  }

  _buildTable() {
    const SPACING = 1.2;
    const offsetX = -10, offsetY = 4;

    ELEMENTS.forEach(el => {
      let [col, row] = LAYOUT[el.sym];
      const x = (col - 1) * SPACING + offsetX;
      const y = -(row - 1) * SPACING + offsetY;

      const tile = MeshBuilder.CreateBox(`tile_${el.sym}`, {
        width: 1.0, height: 1.0, depth: 0.12,
      }, this.scene);
      tile.position = new Vector3(x, y, 0);

      const color = this._getTileColor(el);
      const mat = new StandardMaterial(`tileMat_${el.sym}`, this.scene);
      mat.emissiveColor = color;
      mat.alpha = 0.88;
      tile.material = mat;

      // Texture label
      const tex = new DynamicTexture(`tileTex_${el.sym}`, { width: 64, height: 64 }, this.scene);
      const ctx = tex.getContext();
      ctx.fillStyle = `rgba(0,0,0,0.6)`;
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(el.sym, 32, 36);
      ctx.font = '10px Arial';
      ctx.fillText(el.z.toString(), 32, 14);
      tex.update();

      // Apply texture to front face via dedicated mesh
      const face = MeshBuilder.CreatePlane(`tileLabel_${el.sym}`, { width: 0.96, height: 0.96 }, this.scene);
      face.position = new Vector3(x, y, 0.065);
      face.isPickable = false;
      const faceMat = new StandardMaterial(`faceM_${el.sym}`, this.scene);
      faceMat.emissiveTexture = tex;
      faceMat.disableLighting = true;
      face.material = faceMat;
      this._meshes.push(face);

      this.interaction.register(tile, () => this._showInfo(el));
      this._tiles.push({ tile, el });
      this._meshes.push(tile);
    });
  }

  _getTileColor(el) {
    if (this._colorBy === 'category') {
      const hex = CATEGORY_COLORS[el.category] || '#666666';
      return hexToColor3(hex).scale(0.6);
    }
    if (this._colorBy === 'electronegativity') {
      const en = el.en || 1;
      const t = (en - 0.7) / (4.0 - 0.7);
      return new Color3(t, 0.3, 1 - t).scale(0.6);
    }
    if (this._colorBy === 'atomic_radius') {
      const r = el.r || 100;
      const t = (r - 30) / (350 - 30);
      return new Color3(0.3, t, 1 - t * 0.5).scale(0.6);
    }
    return new Color3(0.3, 0.3, 0.5);
  }

  _showInfo(el) {
    this._infoCard?.remove();
    const card = document.createElement('div');
    card.style.cssText = `
      position:absolute;top:70px;right:20px;
      background:rgba(5,15,35,0.92);
      border:1px solid rgba(127,255,127,0.4);
      border-radius:16px;padding:20px 24px;
      min-width:200px;font-size:0.82rem;
      color:#e8f4ff;line-height:1.8;
      backdrop-filter:blur(12px);
      pointer-events:all;
    `;
    const catHex = CATEGORY_COLORS[el.category] || '#7fff7f';
    card.innerHTML = `
      <div style="font-size:2rem;font-weight:bold;color:${catHex};text-align:center;margin-bottom:8px">${el.sym}</div>
      <div style="text-align:center;color:#7ba3cc;margin-bottom:12px">${el.name}</div>
      <div><b>Z:</b> ${el.z}</div>
      <div><b>Mass:</b> ${el.mass} u</div>
      <div><b>Period:</b> ${el.period} | <b>Group:</b> ${el.group}</div>
      <div><b>Category:</b> ${el.category.replace('_',' ')}</div>
      ${el.en ? `<div><b>Electronegativity:</b> ${el.en}</div>` : ''}
      ${el.melt ? `<div><b>Melting Pt:</b> ${el.melt}°C</div>` : ''}
      ${el.boil ? `<div><b>Boiling Pt:</b> ${el.boil}°C</div>` : ''}
      <button style="margin-top:10px;background:transparent;border:1px solid #7fff7f;color:#7fff7f;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:0.75rem;width:100%"
        onclick="this.parentElement.remove()">Close</button>
    `;
    document.getElementById('hud-layer').appendChild(card);
    this._infoCard = card;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 20px';

    const colorRow = document.createElement('div');
    colorRow.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap';
    ['category', 'electronegativity', 'atomic_radius'].forEach(mode => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn chem-topic' + (mode === this._colorBy ? ' active' : '');
      btn.textContent = { category: 'By Category', electronegativity: 'By Electronegativity', atomic_radius: 'By Atomic Radius' }[mode];
      btn.style.fontSize = '0.76rem';
      btn.addEventListener('click', () => {
        colorRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._colorBy = mode;
        this._tiles.forEach(({ tile, el }) => {
          tile.material.emissiveColor = this._getTileColor(el);
        });
      });
      colorRow.appendChild(btn);
    });

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:0.72rem;color:#4d7099;text-align:center';
    hint.textContent = 'Click or pinch any element tile to see details';

    wrap.append(colorRow, hint);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
  }

  update(deltaTime) {
    this._t += deltaTime * 0.001;
    // Gentle wave animation on tiles
    this._tiles.forEach(({ tile, el }, i) => {
      tile.position.z = Math.sin(this._t * 0.8 + i * 0.15) * 0.04;
    });
  }
}
