import {
  MeshBuilder,
  Vector3,
  Color3,
  Color4,
  StandardMaterial,
  HemisphericLight,
  GlowLayer
} from '@babylonjs/core';

// ─── Fourier coefficient for harmonic k ──────────────────────────────────────
function fourierCoeff(k, waveType) {
  if (waveType === 'square') {
    return (k % 2 === 1) ? 4 / (k * Math.PI) : 0;
  } else if (waveType === 'sawtooth') {
    return 2 * Math.pow(-1, k + 1) / (k * Math.PI);
  } else if (waveType === 'triangle') {
    if (k % 2 === 0) return 0;
    const idx = (k - 1) / 2;
    return (8 / (k * k * Math.PI * Math.PI)) * (idx % 2 === 0 ? 1 : -1);
  }
  return 0;
}

export class FourierSeriesViz {
  constructor(scene, interaction, environment) {
    this._scene = scene;
    this._interaction = interaction;
    this._environment = environment;
    this._active = false;
    this._N = 1;
    this._maxN = 15;
    this._waveType = 'square';
    this._t = 0;

    // Wave trace (200 points of the tip path)
    this._traceBuffer = [];
    this._maxTrace = 200;

    // Babylon meshes
    this._circleMeshes = [];   // one ring per harmonic
    this._armMeshes = [];      // one line (spoke) per harmonic
    this._traceMesh = null;
    this._sumCurveMesh = null;
    this._axisLineMesh = null;
    this._connectLineMesh = null;

    this._light = null;
    this._glowLayer = null;
    this._domEl = null;

    // Layout constants
    this._circlesOrigin = new Vector3(-3, 0, 0); // circles drawn on left-center
    this._waveOriginX = 1.5;                      // wave drawn starting here
    this._waveWidth = 6;
  }

  show() {
    if (this._active) return;
    this._active = true;

    this._light = new HemisphericLight('fourierLight', new Vector3(0, 1, 0), this._scene);
    this._light.intensity = 0.7;
    this._glowLayer = new GlowLayer('fourierGlow', this._scene);
    this._glowLayer.intensity = 0.5;

    this._buildStaticElements();
    this._rebuildCircles();
    this._buildDOM();
  }

  _buildStaticElements() {
    // Horizontal axis for the wave
    this._axisLineMesh = MeshBuilder.CreateLines('fourierAxis', {
      points: [
        new Vector3(this._waveOriginX, 0, 0),
        new Vector3(this._waveOriginX + this._waveWidth, 0, 0)
      ],
      updatable: false
    }, this._scene);
    this._axisLineMesh.color = new Color3(0.3, 0.4, 0.5);

    // Connector from last circle tip to wave
    this._connectLineMesh = MeshBuilder.CreateLines('fourierConnect', {
      points: [new Vector3(0, 0, 0), new Vector3(0.01, 0, 0)],
      updatable: true
    }, this._scene);
    this._connectLineMesh.color = new Color3(0.5, 0.5, 0.5);

    // Trace of the tip
    this._traceMesh = MeshBuilder.CreateLines('fourierTrace', {
      points: [new Vector3(0, 0, 0), new Vector3(0.01, 0, 0)],
      updatable: true
    }, this._scene);
    this._traceMesh.color = new Color3(0, 0.9, 1);

    // Sum curve
    this._sumCurveMesh = MeshBuilder.CreateLines('fourierSum', {
      points: [new Vector3(0, 0, 0), new Vector3(0.01, 0, 0)],
      updatable: true
    }, this._scene);
    this._sumCurveMesh.color = new Color3(1, 0.7, 0);
  }

  _rebuildCircles() {
    // Dispose old circle/arm meshes
    for (const m of this._circleMeshes) if (m) m.dispose();
    for (const m of this._armMeshes) if (m) m.dispose();
    this._circleMeshes = [];
    this._armMeshes = [];

    // Color gradient: cyan to orange
    for (let i = 0; i < this._N; i++) {
      const t = this._N > 1 ? i / (this._N - 1) : 0;
      const col = new Color3(t * 0.8 + 0.1, 0.6 - t * 0.3, 1 - t * 0.8);

      // Circle loop (50 points)
      const circPts = [];
      for (let a = 0; a <= 50; a++) {
        circPts.push(new Vector3(Math.cos(a / 50 * 2 * Math.PI), Math.sin(a / 50 * 2 * Math.PI), 0));
      }
      const circ = MeshBuilder.CreateLines('fourierCirc' + i, {
        points: circPts,
        updatable: true
      }, this._scene);
      circ.color = col;
      this._circleMeshes.push(circ);

      // Arm (spoke from center to edge)
      const arm = MeshBuilder.CreateLines('fourierArm' + i, {
        points: [new Vector3(0, 0, 0), new Vector3(1, 0, 0)],
        updatable: true
      }, this._scene);
      arm.color = new Color3(1, 1, 1);
      this._armMeshes.push(arm);
    }
  }

  _computeFourierState(t) {
    // Returns: array of {cx, cy, r} centers and radii for each circle,
    // and the final tip position
    const centers = [];
    let cx = this._circlesOrigin.x;
    let cy = this._circlesOrigin.y;

    for (let i = 0; i < this._N; i++) {
      const k = i + 1;
      const a = fourierCoeff(k, this._waveType);
      const r = Math.abs(a);
      const phase = (a < 0) ? Math.PI : 0;
      const angle = k * t + phase;
      centers.push({ cx, cy, r, angle, k });
      cx += r * Math.cos(angle);
      cy += r * Math.sin(angle);
    }
    return { centers, tipX: cx, tipY: cy };
  }

  _updateFrame() {
    const { centers, tipX, tipY } = this._computeFourierState(this._t);

    // Update circle and arm meshes
    for (let i = 0; i < this._N; i++) {
      const { cx, cy, r, angle } = centers[i];

      // Reposition circle (scale by radius, translate to center)
      if (r > 0.001) {
        const circPts = [];
        for (let a = 0; a <= 50; a++) {
          const theta = (a / 50) * 2 * Math.PI;
          circPts.push(new Vector3(cx + r * Math.cos(theta), cy + r * Math.sin(theta), 0));
        }
        this._circleMeshes[i] = MeshBuilder.CreateLines('fourierCirc' + i, {
          points: circPts,
          instance: this._circleMeshes[i]
        });
      }

      // Arm from this circle center to next center
      const nx = cx + r * Math.cos(angle);
      const ny = cy + r * Math.sin(angle);
      this._armMeshes[i] = MeshBuilder.CreateLines('fourierArm' + i, {
        points: [new Vector3(cx, cy, 0), new Vector3(nx, ny, 0)],
        instance: this._armMeshes[i]
      });
    }

    // Add to trace buffer
    const traceZ = 0.01;
    const tNorm = ((this._t % (2 * Math.PI)) / (2 * Math.PI));
    const waveX = this._waveOriginX + tNorm * this._waveWidth;

    this._traceBuffer.push(new Vector3(waveX, tipY, traceZ));
    if (this._traceBuffer.length > this._maxTrace) {
      this._traceBuffer.shift();
    }

    // Connector line from tip to wave trace start
    if (this._traceBuffer.length >= 1) {
      const latestTrace = this._traceBuffer[this._traceBuffer.length - 1];
      this._connectLineMesh = MeshBuilder.CreateLines('fourierConnect', {
        points: [new Vector3(tipX, tipY, 0), latestTrace],
        instance: this._connectLineMesh
      });
    }

    // Trace
    if (this._traceBuffer.length >= 2) {
      this._traceMesh = MeshBuilder.CreateLines('fourierTrace', {
        points: this._traceBuffer.slice(),
        instance: this._traceMesh
      });
    }

    // Sum curve: compute Fourier sum at 200 horizontal points
    const sumPts = [];
    const numSumPts = 200;
    for (let j = 0; j <= numSumPts; j++) {
      const xFrac = j / numSumPts;
      const xPos = this._waveOriginX + xFrac * this._waveWidth;
      const tAtX = xFrac * 2 * Math.PI;
      let ySum = 0;
      for (let i = 0; i < this._N; i++) {
        const k = i + 1;
        const a = fourierCoeff(k, this._waveType);
        const phase = (a < 0) ? Math.PI : 0;
        ySum += Math.abs(a) * Math.cos(k * tAtX + phase);
      }
      sumPts.push(new Vector3(xPos, ySum, 0));
    }
    if (sumPts.length >= 2) {
      this._sumCurveMesh = MeshBuilder.CreateLines('fourierSum', {
        points: sumPts,
        instance: this._sumCurveMesh
      });
    }
  }

  _updateNLabel() {
    if (!this._domEl) return;
    const lbl = this._domEl.querySelector('#fourier-n-label');
    if (lbl) lbl.textContent = 'N = ' + this._N + ' harmonic' + (this._N > 1 ? 's' : '');
  }

  _buildDOM() {
    const el = document.createElement('div');
    el.id = 'fourier-panel';
    el.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10,20,40,0.92);
      border: 1px solid rgba(0,212,255,0.3);
      border-radius: 12px;
      color: #e8f4ff;
      padding: 14px 28px;
      z-index: 2000;
      font-family: 'Segoe UI', Arial, sans-serif;
      text-align: center;
      box-shadow: 0 0 24px rgba(0,212,255,0.12);
    `;
    el.innerHTML = `
      <div style="font-size:17px;font-weight:700;color:#00d4ff;letter-spacing:2px;margin-bottom:12px;">
        FOURIER SERIES
      </div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:12px;">
        <button id="fourier-minus" style="padding:7px 16px;border-radius:20px;
          border:1px solid rgba(0,212,255,0.4);background:rgba(0,60,90,0.5);
          color:#00d4ff;cursor:pointer;font-size:16px;font-family:inherit;font-weight:700;">−Harmonic</button>
        <span id="fourier-n-label" style="
          display:inline-flex;align-items:center;font-size:13px;
          color:#e8f4ff;background:rgba(0,30,60,0.6);border-radius:16px;
          padding:0 14px;border:1px solid rgba(0,212,255,0.2);">N = 1 harmonic</span>
        <button id="fourier-plus" style="padding:7px 16px;border-radius:20px;
          border:1px solid rgba(0,212,255,0.4);background:rgba(0,60,90,0.5);
          color:#00d4ff;cursor:pointer;font-size:16px;font-family:inherit;font-weight:700;">+Harmonic</button>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;">
        <button data-wave="square" style="padding:6px 14px;border-radius:20px;
          border:1px solid rgba(0,212,255,0.5);background:rgba(0,212,255,0.18);
          color:#00d4ff;cursor:pointer;font-size:12px;font-family:inherit;">Square</button>
        <button data-wave="sawtooth" style="padding:6px 14px;border-radius:20px;
          border:1px solid rgba(255,160,0,0.4);background:rgba(180,80,0,0.15);
          color:#ffaa33;cursor:pointer;font-size:12px;font-family:inherit;">Sawtooth</button>
        <button data-wave="triangle" style="padding:6px 14px;border-radius:20px;
          border:1px solid rgba(100,255,100,0.4);background:rgba(0,120,40,0.15);
          color:#88ff88;cursor:pointer;font-size:12px;font-family:inherit;">Triangle</button>
      </div>
      <div style="margin-top:10px;font-size:11px;color:#5577aa;">
        <span style="color:#0cf;">─</span> Tip trace &nbsp;
        <span style="color:#fa0;">─</span> Fourier sum curve &nbsp;
        <span style="color:#aaa;">─</span> Connector
      </div>
    `;
    document.body.appendChild(el);
    this._domEl = el;

    el.querySelector('#fourier-plus').addEventListener('click', () => {
      if (this._N < this._maxN) {
        this._N++;
        this._traceBuffer = [];
        this._rebuildCircles();
        this._updateNLabel();
      }
    });

    el.querySelector('#fourier-minus').addEventListener('click', () => {
      if (this._N > 1) {
        this._N--;
        this._traceBuffer = [];
        this._rebuildCircles();
        this._updateNLabel();
      }
    });

    el.querySelectorAll('button[data-wave]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._waveType = btn.dataset.wave;
        this._traceBuffer = [];
      });
    });
  }

  hide() {
    this._active = false;
    for (const m of this._circleMeshes) if (m) m.dispose();
    for (const m of this._armMeshes) if (m) m.dispose();
    this._circleMeshes = [];
    this._armMeshes = [];
    if (this._traceMesh) { this._traceMesh.dispose(); this._traceMesh = null; }
    if (this._sumCurveMesh) { this._sumCurveMesh.dispose(); this._sumCurveMesh = null; }
    if (this._axisLineMesh) { this._axisLineMesh.dispose(); this._axisLineMesh = null; }
    if (this._connectLineMesh) { this._connectLineMesh.dispose(); this._connectLineMesh = null; }
    if (this._light) { this._light.dispose(); this._light = null; }
    if (this._glowLayer) { this._glowLayer.dispose(); this._glowLayer = null; }
    if (this._domEl) { this._domEl.remove(); this._domEl = null; }
    this._traceBuffer = [];
  }

  update(dt) {
    if (!this._active) return;
    this._t += dt * 0.001;
    this._updateFrame();
  }
}
