// Feature 16: Circuit Builder — drag components, Ohm's law live readout
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Vector3, DynamicTexture, Mesh
} from '@babylonjs/core';

const COMPONENTS = [
  { id:'battery',   label:'Battery',    symbol:'⚡', voltage:9,  resistance:0 },
  { id:'resistor',  label:'Resistor',   symbol:'Ω',  voltage:0,  resistance:100 },
  { id:'resistor2', label:'Resistor 2k',symbol:'Ω',  voltage:0,  resistance:2000 },
  { id:'led',       label:'LED',        symbol:'💡', voltage:0,  resistance:50, color: new Color3(1,1,0) },
  { id:'capacitor', label:'Capacitor',  symbol:'=',  voltage:0,  resistance:Infinity },
  { id:'switch',    label:'Switch',     symbol:'/',  voltage:0,  resistance:0, toggle:true },
];

export class CircuitBuilder {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._t = 0;
    this._placed = []; // { type, mesh, x, y }
    this._wires = [];  // { from, to, line }
    this._voltage = 0;
    this._current = 0;
    this._power = 0;
    this._switchOpen = false;
    this._infoEl = null;
  }

  show() { this._build(); this._buildUI(); }

  hide() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._placed = [];
    this._wires = [];
    this._ui?.remove(); this._ui = null;
    this._infoEl?.remove(); this._infoEl = null;
  }

  _build() {
    // Circuit board background
    const board = MeshBuilder.CreatePlane('circuitBoard', {width:14, height:10}, this.scene);
    board.position.set(0, 0, 0.5);
    const boardMat = new StandardMaterial('boardMat', this.scene);
    boardMat.emissiveColor = new Color3(0.02, 0.1, 0.06);
    boardMat.alpha = 0.7;
    board.material = boardMat;
    board.isPickable = false;
    this._meshes.push(board);

    // Grid lines
    for (let x = -6; x <= 6; x++) {
      const line = MeshBuilder.CreateLines(`cgridX${x}`, {
        points:[new Vector3(x,-5,0.4), new Vector3(x,5,0.4)]
      }, this.scene);
      line.color = new Color3(0.05, 0.15, 0.1); line.isPickable = false;
      this._meshes.push(line);
    }
    for (let y = -5; y <= 5; y++) {
      const line = MeshBuilder.CreateLines(`cgridY${y}`, {
        points:[new Vector3(-6,y,0.4), new Vector3(6,y,0.4)]
      }, this.scene);
      line.color = new Color3(0.05, 0.15, 0.1); line.isPickable = false;
      this._meshes.push(line);
    }

    // Place default circuit: Battery → R1 → LED → back
    this._placeComponent('battery', -3, 1);
    this._placeComponent('resistor', 0, 1);
    this._placeComponent('led', 3, 1);
    this._drawDefaultWires();
    this._buildInfoPanel();
    this._calculate();
  }

  _placeComponent(typeId, x, y) {
    const comp = COMPONENTS.find(c => c.id === typeId);
    if (!comp) return;

    const box = MeshBuilder.CreateBox('circ_' + typeId + '_' + this._placed.length, {width:1.2, height:0.8, depth:0.3}, this.scene);
    box.position.set(x, y, 0);

    const mat = new PBRMaterial('circMat_' + this._placed.length, this.scene);
    const colors = {battery:new Color3(0.8,0.5,0.1), resistor:new Color3(0.5,0.3,0.1), resistor2:new Color3(0.5,0.3,0.1), led:new Color3(0.9,0.9,0.1), capacitor:new Color3(0.2,0.5,0.8), switch:new Color3(0.5,0.5,0.5)};
    mat.albedoColor = colors[typeId] || new Color3(0.5,0.5,0.5);
    mat.emissiveColor = (colors[typeId] || new Color3(0.3,0.3,0.3)).scale(0.2);
    mat.metallic = 0.4; mat.roughness = 0.6;
    box.material = mat;

    // Label
    const tex = new DynamicTexture('circTex_' + this._placed.length, {width:80, height:56}, this.scene);
    const ctx = tex.getContext();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    ctx.fillText(comp.symbol, 40, 36); tex.update();
    const overlay = MeshBuilder.CreatePlane('circLabel_' + this._placed.length, {width:1.1, height:0.7}, this.scene);
    overlay.position.set(x, y, 0.17);
    const ovMat = new StandardMaterial('circOvMat_' + this._placed.length, this.scene);
    ovMat.emissiveTexture = tex; ovMat.disableLighting = true; ovMat.alpha = 0.9;
    overlay.material = ovMat; overlay.isPickable = false;

    this.interaction.register(box, () => {
      if (typeId === 'switch') {
        this._switchOpen = !this._switchOpen;
        mat.albedoColor = this._switchOpen ? new Color3(0.2,0.2,0.2) : new Color3(0.5,0.5,0.5);
        this._calculate();
      }
    });

    this._placed.push({ type: typeId, mesh: box, x, y, comp });
    this._meshes.push(box, overlay);
    return box;
  }

  _drawDefaultWires() {
    const connections = [[-3,1, 0,1], [0,1, 3,1], [3,1, 3,-1], [3,-1, -3,-1], [-3,-1, -3,1]];
    connections.forEach(([x1,y1,x2,y2], i) => {
      const line = MeshBuilder.CreateLines(`wire${i}`, {
        points:[new Vector3(x1+(x2>x1?0.6:-0.6),y1,0), new Vector3(x2+(x1>x2?0.6:-0.6),y2,0)]
      }, this.scene);
      line.color = new Color3(0.7, 0.3, 0.1);
      line.isPickable = false;
      this._meshes.push(line);
    });
  }

  _calculate() {
    let totalR = 0;
    let totalV = 0;
    let open = false;
    this._placed.forEach(p => {
      if (p.type === 'switch' && this._switchOpen) { open = true; return; }
      totalV += p.comp.voltage;
      totalR += p.comp.resistance;
    });
    if (open || totalR === Infinity || totalR === 0) {
      this._voltage = totalV; this._current = 0; this._power = 0;
    } else {
      this._voltage = totalV;
      this._current = totalV / totalR;
      this._power = totalV * this._current;
    }
    this._updateInfo();

    // Light up LEDs
    this._placed.forEach(p => {
      if (p.type === 'led') {
        const mat = p.mesh.material;
        if (mat) {
          const brightness = Math.min(this._current * 50, 1);
          mat.emissiveColor = new Color3(brightness * 0.9, brightness * 0.9, brightness * 0.1);
        }
      }
    });
  }

  _buildInfoPanel() {
    this._infoEl?.remove();
    const el = document.createElement('div');
    el.id = 'circuit-info';
    el.style.cssText = `
      position:fixed;top:80px;right:20px;background:rgba(10,20,40,0.88);
      border:1px solid rgba(255,107,53,0.3);border-radius:12px;padding:14px 18px;
      z-index:1500;pointer-events:none;font-size:0.82rem;color:#e8f4ff;
      backdrop-filter:blur(8px);font-family:monospace;min-width:200px;
    `;
    this._infoEl = el;
    document.body.appendChild(el);
    this._meshes.push({ dispose: () => el.remove() });
  }

  _updateInfo() {
    if (!this._infoEl) return;
    this._infoEl.innerHTML = `
      <div style="color:#ff6b35;font-weight:700;margin-bottom:8px;">⚡ Ohm's Law</div>
      <div>V = ${this._voltage.toFixed(2)} V</div>
      <div>I = ${this._current.toFixed(4)} A = ${(this._current*1000).toFixed(2)} mA</div>
      <div>R = ${this._placed.reduce((s,p)=>s+p.comp.resistance,0).toFixed(1)} Ω</div>
      <div>P = ${this._power.toFixed(4)} W</div>
      <div style="margin-top:8px;color:#7ba3cc;font-size:0.72rem;">V = I × R</div>
    `;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 22px;';

    const title = document.createElement('div');
    title.style.cssText = 'color:#ff6b35;font-size:0.78rem;font-weight:700;';
    title.textContent = 'Circuit Components';
    wrap.appendChild(title);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;';
    COMPONENTS.forEach(comp => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn physics-topic';
      btn.textContent = comp.symbol + ' ' + comp.label;
      btn.style.fontSize = '0.72rem';
      btn.onclick = () => {
        const x = (Math.random() - 0.5) * 8;
        const y = (Math.random() - 0.5) * 4;
        this._placeComponent(comp.id, Math.round(x), Math.round(y));
        this._calculate();
      };
      btnRow.appendChild(btn);
    });
    wrap.appendChild(btnRow);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'topic-btn physics-topic';
    clearBtn.textContent = '🗑 Clear & Reset';
    clearBtn.style.fontSize = '0.75rem';
    clearBtn.onclick = () => {
      this._meshes.forEach(m => m.dispose()); this._meshes = [];
      this._placed = []; this._wires = [];
      this._build();
    };
    wrap.appendChild(clearBtn);

    const info = document.createElement('div');
    info.style.cssText = 'font-size:0.72rem;color:#7ba3cc;text-align:center;';
    info.textContent = '👆 Click Switch to open/close • Click button to add components';
    wrap.appendChild(info);

    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  update(dt) {
    this._t += dt * 0.001;
    // Pulse LEDs
    this._placed.forEach(p => {
      if (p.type === 'led' && this._current > 0) {
        const brightness = 0.5 + 0.5 * Math.sin(this._t * 8);
        const mat = p.mesh.material;
        if (mat) mat.emissiveColor = new Color3(brightness * 0.9, brightness * 0.9, 0);
      }
    });
  }
}
