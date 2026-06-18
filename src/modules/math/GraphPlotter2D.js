import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';

const FUNCTIONS = [
  { name: 'sin(ax)',       fn: (x, a) => Math.sin(a * x),            param: 'a', min: 0.2, max: 4, step: 0.1, def: 1 },
  { name: 'cos(ax)',       fn: (x, a) => Math.cos(a * x),            param: 'a', min: 0.2, max: 4, step: 0.1, def: 1 },
  { name: 'tan(x)',        fn: (x, a) => Math.max(-4, Math.min(4, Math.tan(x))), param: null },
  { name: 'ax²',          fn: (x, a) => a * x * x,                   param: 'a', min: -2, max: 2, step: 0.1, def: 0.3 },
  { name: 'aˣ',           fn: (x, a) => Math.pow(Math.max(0.01, a), x), param: 'a', min: 0.5, max: 3, step: 0.05, def: 2 },
  { name: 'ln(x)',         fn: (x, a) => x > 0 ? Math.log(x) : null, param: null },
  { name: 'sin(x)/x',     fn: (x, a) => x !== 0 ? Math.sin(x)/x : 1, param: null },
  { name: '√x',           fn: (x, a) => x >= 0 ? Math.sqrt(x) : null, param: null },
];

export class GraphPlotter2D {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._lines = [];
    this._axisMeshes = [];
    this._ui = null;
    this._currentFn = 0;
    this._paramVal = FUNCTIONS[0].def ?? 1;
  }

  show() {
    this._buildAxes2D();
    this._plotFunction(this._currentFn, this._paramVal);
    this._buildUI();
  }

  hide() {
    this._clearLines();
    this._axisMeshes.forEach(m => m.dispose());
    this._axisMeshes = [];
    this._ui?.remove();
    this._ui = null;
  }

  _clearLines() {
    this._lines.forEach(l => l.dispose());
    this._lines = [];
  }

  _buildAxes2D() {
    const xAxis = MeshBuilder.CreateLines('x2d', {
      points: [new Vector3(-7, 0, 0), new Vector3(7, 0, 0)],
    }, this.scene);
    xAxis.color = new Color3(0.8, 0.2, 0.2);
    xAxis.isPickable = false;

    const yAxis = MeshBuilder.CreateLines('y2d', {
      points: [new Vector3(0, -4, 0), new Vector3(0, 4, 0)],
    }, this.scene);
    yAxis.color = new Color3(0.2, 0.8, 0.2);
    yAxis.isPickable = false;

    // Grid lines
    for (let i = -6; i <= 6; i++) {
      if (i === 0) continue;
      const vg = MeshBuilder.CreateLines(`vg${i}`, {
        points: [new Vector3(i, -4, 0), new Vector3(i, 4, 0)],
      }, this.scene);
      vg.color = new Color3(0.1, 0.15, 0.25);
      vg.alpha = 0.4;
      vg.isPickable = false;

      const hg = MeshBuilder.CreateLines(`hg${i}`, {
        points: [new Vector3(-7, i * 0.6, 0), new Vector3(7, i * 0.6, 0)],
      }, this.scene);
      hg.color = new Color3(0.1, 0.15, 0.25);
      hg.alpha = 0.4;
      hg.isPickable = false;

      this._axisMeshes.push(vg, hg);
    }
    this._axisMeshes.push(xAxis, yAxis);
  }

  _plotFunction(fnIdx, paramVal) {
    this._clearLines();
    const fnDef = FUNCTIONS[fnIdx];
    const points = [];
    const segments = [];
    const SAMPLES = 200;
    const xRange = 6.5;
    let prev = null;

    for (let i = 0; i <= SAMPLES; i++) {
      const x = -xRange + (i / SAMPLES) * xRange * 2;
      const y = fnDef.fn(x, paramVal);
      if (y === null || !isFinite(y) || Math.abs(y) > 4.5) {
        if (points.length > 1) segments.push([...points]);
        points.length = 0;
        prev = null;
        continue;
      }
      const sy = Math.max(-4.2, Math.min(4.2, y));
      // Break on discontinuities (tan jump)
      if (prev !== null && Math.abs(sy - prev) > 3) {
        if (points.length > 1) segments.push([...points]);
        points.length = 0;
      }
      points.push(new Vector3(x, sy, 0));
      prev = sy;
    }
    if (points.length > 1) segments.push([...points]);

    segments.forEach((seg, i) => {
      if (seg.length < 2) return;
      const line = MeshBuilder.CreateLines(`fn_${i}`, { points: seg, updatable: false }, this.scene);
      line.color = new Color3(0, 0.85, 1);
      line.isPickable = false;
      this._lines.push(line);
    });
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom: 110px; display: flex; flex-direction: column; gap: 10px; padding: 16px 24px;';

    const fnGrid = document.createElement('div');
    fnGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center';
    FUNCTIONS.forEach((f, i) => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn' + (i === this._currentFn ? ' active' : '');
      btn.textContent = f.name;
      btn.style.fontSize = '0.78rem';
      btn.addEventListener('click', () => {
        this._currentFn = i;
        this._paramVal = FUNCTIONS[i].def ?? 1;
        fnGrid.querySelectorAll('button').forEach((b, j) => b.classList.toggle('active', j === i));
        this._plotFunction(i, this._paramVal);
        updateSlider(i);
      });
      fnGrid.appendChild(btn);
    });

    const sliderWrap = document.createElement('div');
    sliderWrap.style.cssText = 'display:flex;align-items:center;gap:10px;justify-content:center';

    const updateSlider = (fnIdx) => {
      const f = FUNCTIONS[fnIdx];
      sliderWrap.style.display = f.param ? 'flex' : 'none';
      if (f.param) {
        slider.min = f.min;
        slider.max = f.max;
        slider.step = f.step;
        slider.value = this._paramVal;
        paramLabel.textContent = `${f.param} =`;
        valLabel.textContent = this._paramVal.toFixed(2);
      }
    };

    const paramLabel = document.createElement('label');
    paramLabel.style.cssText = 'font-size:0.8rem;color:#7ba3cc';
    const slider = document.createElement('input');
    slider.type = 'range';
    const valLabel = document.createElement('span');
    valLabel.className = 'param-value';

    slider.addEventListener('input', () => {
      this._paramVal = parseFloat(slider.value);
      valLabel.textContent = this._paramVal.toFixed(2);
      this._plotFunction(this._currentFn, this._paramVal);
    });

    sliderWrap.appendChild(paramLabel);
    sliderWrap.appendChild(slider);
    sliderWrap.appendChild(valLabel);

    wrap.appendChild(fnGrid);
    wrap.appendChild(sliderWrap);
    document.getElementById('hud-layer').appendChild(wrap);
    this._ui = wrap;
    updateSlider(this._currentFn);
  }

  update(deltaTime) {}
}
