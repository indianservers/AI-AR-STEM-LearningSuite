// NavierStokesSmoke.js — Navier-Stokes smoke simulation using particle velocity field
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Vector3,
  DynamicTexture, Mesh, SolidParticleSystem
} from '@babylonjs/core';

const GRID_SIZE = 32;
const N_PARTICLES = 400;
const GRID_SCALE = 10 / GRID_SIZE; // world units per cell (10 units wide)
const BOUNDS_XZ = 5;
const BOUNDS_Y_MIN = 0;
const BOUNDS_Y_MAX = 8;
const EMIT_PER_FRAME = 8;
const DIFFUSION = 0.1;

export class NavierStokesSmoke {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._active = false;
    this._ui = null;
    this._infoEl = null;
    this._sps = null;
    this._meshes = [];
    this._gridVx = null;   // Float32Array [GRID_SIZE*GRID_SIZE]
    this._gridVy = null;
    this._gridDensity = null;
    this._particles = [];  // { x, y, z, vx, vy, vz, density, size }
    this._nextSlot = 0;    // circular emission index
    this._t = 0;
    this._showGrid = false;
    this._gridLineMeshes = [];
    this._emitting = true;
    this._frameCount = 0;
  }

  show() {
    this._active = true;
    this._initGrid();
    this._initParticles();
    this._buildSPS();
    this._buildUI();
    this._buildInfoPanel();
  }

  hide() {
    this._active = false;
    this._sps?.dispose();
    this._sps = null;
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._gridLineMeshes.forEach(m => m.dispose());
    this._gridLineMeshes = [];
    this._ui?.remove();
    this._ui = null;
    this._infoEl?.remove();
    this._infoEl = null;
    this._particles = [];
  }

  _initGrid() {
    const n = GRID_SIZE * GRID_SIZE;
    this._gridVx = new Float32Array(n);
    this._gridVy = new Float32Array(n);
    this._gridDensity = new Float32Array(n);
  }

  _gridIdx(gx, gy) {
    const cx = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(gx)));
    const cy = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(gy)));
    return cy * GRID_SIZE + cx;
  }

  _worldToGrid(wx, wz) {
    // World X from -5 to 5 -> grid 0 to GRID_SIZE
    return {
      gx: (wx + BOUNDS_XZ) / (BOUNDS_XZ * 2) * GRID_SIZE,
      gy: (wz + BOUNDS_XZ) / (BOUNDS_XZ * 2) * GRID_SIZE,
    };
  }

  _initParticles() {
    this._particles = [];
    for (let i = 0; i < N_PARTICLES; i++) {
      this._particles.push({
        x: 0, y: 0.2, z: 0,
        vx: 0, vy: 0, vz: 0,
        density: 0,
        size: 0.08 + Math.random() * 0.07,
        active: false,
      });
    }
    this._nextSlot = 0;
  }

  _buildSPS() {
    this._sps?.dispose();
    this._sps = new SolidParticleSystem('smokeSPS', this.scene, { updatable: true });
    const model = MeshBuilder.CreateSphere('smokeModel', { diameter: 1.0, segments: 3 }, this.scene);
    this._sps.addShape(model, N_PARTICLES);
    model.dispose();

    const mesh = this._sps.buildMesh();
    mesh.isPickable = false;

    const mat = new StandardMaterial('smokeMat', this.scene);
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mesh.material = mat;

    this._sps.initParticles = () => {
      for (let i = 0; i < this._sps.nbParticles; i++) {
        const sp = this._sps.particles[i];
        sp.position.set(0, -100, 0); // hide initially
        sp.scaling.setAll(0.001);
        sp.color = new Color4(1, 0.5, 0.2, 0);
      }
    };
    this._sps.initParticles();
    this._sps.setParticles();
  }

  _emitParticles(count) {
    for (let i = 0; i < count; i++) {
      const slot = this._nextSlot % N_PARTICLES;
      this._nextSlot++;
      const p = this._particles[slot];
      p.active = true;
      p.x = (Math.random() - 0.5) * 0.5;
      p.y = 0.2;
      p.z = (Math.random() - 0.5) * 0.5;
      p.vx = (Math.random() - 0.5) * 0.8;
      p.vy = 1.5 + Math.random() * 1.0;
      p.vz = (Math.random() - 0.5) * 0.8;
      p.density = 1.0;
      p.size = 0.08 + Math.random() * 0.07;
    }
  }

  _diffuseGrid() {
    const n = GRID_SIZE;
    const newVx = new Float32Array(n * n);
    const newVy = new Float32Array(n * n);
    for (let y = 1; y < n - 1; y++) {
      for (let x = 1; x < n - 1; x++) {
        const idx = y * n + x;
        const avg = (
          this._gridVx[idx - 1] + this._gridVx[idx + 1] +
          this._gridVx[idx - n] + this._gridVx[idx + n]
        ) / 4;
        newVx[idx] = this._gridVx[idx] * (1 - DIFFUSION) + avg * DIFFUSION;
        const avgY = (
          this._gridVy[idx - 1] + this._gridVy[idx + 1] +
          this._gridVy[idx - n] + this._gridVy[idx + n]
        ) / 4;
        newVy[idx] = this._gridVy[idx] * (1 - DIFFUSION) + avgY * DIFFUSION;
      }
    }
    // Dampen over time
    for (let i = 0; i < n * n; i++) {
      this._gridVx[i] = newVx[i] * 0.97;
      this._gridVy[i] = newVy[i] * 0.97;
    }
  }

  _addBuoyancy() {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const idx = y * GRID_SIZE + x;
        if (this._gridDensity[idx] > 0.05) {
          this._gridVy[idx] += this._gridDensity[idx] * 0.01;
        }
        this._gridDensity[idx] *= 0.995; // density decay in grid
      }
    }
  }

  _applyVortex() {
    const cx = GRID_SIZE / 2, cy = GRID_SIZE / 2;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const dx = x - cx, dy = y - cy;
        const r = Math.sqrt(dx * dx + dy * dy) + 0.5;
        const str = 0.5 / r;
        const idx = y * GRID_SIZE + x;
        this._gridVx[idx] += -dy / r * str;
        this._gridVy[idx] += dx / r * str;
      }
    }
  }

  _applyWind() {
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      this._gridVx[i] += 1.5;
    }
  }

  _clearField() {
    this._gridVx.fill(0);
    this._gridVy.fill(0);
    this._gridDensity.fill(0);
    this._particles.forEach(p => { p.density = 0; p.active = false; });
    if (this._sps) {
      this._sps.particles.forEach(sp => {
        sp.position.set(0, -100, 0);
        sp.scaling.setAll(0.001);
        sp.color = new Color4(0, 0, 0, 0);
      });
      this._sps.setParticles();
    }
  }

  _advectParticles(dt) {
    const dtS = dt * 0.003;
    this._particles.forEach((p, i) => {
      if (!p.active) return;

      // Get grid cell
      const { gx, gy } = this._worldToGrid(p.x, p.z);
      const idx = this._gridIdx(gx, gy);

      // Get velocity from grid (bilinear interpolation simplified)
      const vfx = this._gridVx[idx];
      const vfy = this._gridVy[idx];

      // Add buoyancy based on particle density
      const buoy = p.density * 0.6;

      p.vx += vfx * 0.5;
      p.vy += buoy * dtS * 100 - 0.01; // buoyancy minus gravity
      p.vz += vfy * 0.5;

      // Dampen velocity
      p.vx *= 0.98;
      p.vy *= 0.99;
      p.vz *= 0.98;

      p.x += p.vx * dtS;
      p.y += p.vy * dtS;
      p.z += p.vz * dtS;

      // Boundary: wrap X and Z, bounce top
      if (p.x < -BOUNDS_XZ) p.x = BOUNDS_XZ - 0.1;
      if (p.x >  BOUNDS_XZ) p.x = -BOUNDS_XZ + 0.1;
      if (p.z < -BOUNDS_XZ) p.z = BOUNDS_XZ - 0.1;
      if (p.z >  BOUNDS_XZ) p.z = -BOUNDS_XZ + 0.1;
      if (p.y > BOUNDS_Y_MAX) { p.y = BOUNDS_Y_MAX; p.vy *= -0.3; p.density *= 0.5; }
      if (p.y < BOUNDS_Y_MIN) { p.y = BOUNDS_Y_MIN; p.vy = Math.abs(p.vy) * 0.5; }

      // Density decay
      p.density *= 0.98;
      if (p.density < 0.01) p.active = false;

      // Write density back to grid
      this._gridDensity[idx] = Math.min(1, this._gridDensity[idx] + p.density * 0.02);

      // Update SPS particle
      if (this._sps && i < this._sps.nbParticles) {
        const sp = this._sps.particles[i];
        if (p.active) {
          sp.position.set(p.x, p.y, p.z);
          sp.scaling.setAll(p.size * (0.5 + p.density * 0.5));
          // Dense = orange/white, dispersed = blue
          const d = p.density;
          sp.color = new Color4(
            d * 1.0 + (1 - d) * 0.1,
            d * 0.6 + (1 - d) * 0.2,
            d * 0.1 + (1 - d) * 0.5,
            d * 0.85
          );
        } else {
          sp.position.set(0, -100, 0);
          sp.scaling.setAll(0.001);
          sp.color = new Color4(0, 0, 0, 0);
        }
      }
    });
  }

  _applyHandInteraction() {
    if (!this.interaction?.gestureEngine) return;
    const ge = this.interaction.gestureEngine;
    const handPos = ge.palmPosition ?? ge.cursorPosition;
    if (!handPos) return;

    const { gx, gy } = this._worldToGrid(handPos.x, handPos.z);
    const radius = 3;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = Math.round(gx) + dx;
        const ny = Math.round(gy) + dy;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const str = (1 - dist / radius) * 2.0;
        const idx = ny * GRID_SIZE + nx;
        this._gridVx[idx] += dx * str * 0.1;
        this._gridVy[idx] += dy * str * 0.1;
      }
    }
  }

  _toggleGridViz() {
    this._showGrid = !this._showGrid;
    this._gridLineMeshes.forEach(m => m.dispose());
    this._gridLineMeshes = [];
    if (!this._showGrid) return;

    // Draw velocity vectors every 4th cell
    for (let y = 2; y < GRID_SIZE; y += 4) {
      for (let x = 2; x < GRID_SIZE; x += 4) {
        const wx = (x / GRID_SIZE) * BOUNDS_XZ * 2 - BOUNDS_XZ;
        const wz = (y / GRID_SIZE) * BOUNDS_XZ * 2 - BOUNDS_XZ;
        const idx = y * GRID_SIZE + x;
        const vx = this._gridVx[idx];
        const vy = this._gridVy[idx];
        const len = Math.sqrt(vx * vx + vy * vy);
        if (len < 0.01) continue;
        const scale = 0.3;
        const line = MeshBuilder.CreateLines(`gv_${x}_${y}`, {
          points: [
            new Vector3(wx, 0.1, wz),
            new Vector3(wx + vx * scale, 0.1, wz + vy * scale)
          ]
        }, this.scene);
        line.color = new Color3(0.3, 0.7, 0.3);
        line.isPickable = false;
        this._gridLineMeshes.push(line);
      }
    }
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 20px;min-width:320px;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;';

    const makeBtn = (label, color, onClick) => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn';
      btn.textContent = label;
      btn.style.cssText = `font-size:0.75rem;border-color:${color};color:${color};`;
      btn.addEventListener('click', onClick);
      return btn;
    };

    const emitBtn = makeBtn('Emit', '#ff8844', () => {
      this._emitting = !this._emitting;
      emitBtn.textContent = this._emitting ? 'Stop Emit' : 'Emit';
    });

    const windBtn = makeBtn('Wind', '#44aaff', () => this._applyWind());
    const vortexBtn = makeBtn('Vortex', '#cc44ff', () => this._applyVortex());
    const clearBtn = makeBtn('Clear', '#888888', () => this._clearField());

    const gridBtn = makeBtn('Grid', '#44ff88', () => {
      this._toggleGridViz();
      gridBtn.style.borderColor = this._showGrid ? '#44ff88' : 'rgba(0,212,255,0.3)';
    });

    btnRow.append(emitBtn, windBtn, vortexBtn, clearBtn, gridBtn);

    const info = document.createElement('div');
    info.style.cssText = 'font-size:0.7rem;color:#7ba3cc;text-align:center;';
    info.textContent = 'Navier-Stokes 32x32 velocity field  |  400 smoke particles';

    wrap.append(btnRow, info);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  _buildInfoPanel() {
    this._infoEl?.remove();
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed;top:80px;right:20px;',
      'background:rgba(10,20,40,0.92);',
      'border:1px solid rgba(0,212,255,0.3);border-radius:12px;',
      'padding:14px 18px;z-index:2100;pointer-events:none;',
      'font-size:0.78rem;color:#e8f4ff;backdrop-filter:blur(8px);',
      'font-family:monospace;min-width:190px;'
    ].join('');
    this._infoEl = el;
    document.body.appendChild(el);
    this._updateInfoPanel();
  }

  _updateInfoPanel() {
    if (!this._infoEl) return;
    const active = this._particles.filter(p => p.active).length;
    const maxVx = this._gridVx.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    const maxVy = this._gridVy.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    this._infoEl.innerHTML = `
      <div style="color:#ff8844;font-weight:700;margin-bottom:8px;">Navier-Stokes Smoke</div>
      <div>Active particles: ${active}</div>
      <div>Grid: ${GRID_SIZE}x${GRID_SIZE}</div>
      <div style="margin-top:6px;color:#7ba3cc;">Max velocity</div>
      <div>vx: ${maxVx.toFixed(2)}</div>
      <div>vy: ${maxVy.toFixed(2)}</div>
      <div style="margin-top:6px;color:#7ba3cc;font-size:0.7rem;">
        ∂u/∂t + (u·∇)u = -∇p + ν∇²u<br>
        ∇·u = 0
      </div>
    `;
  }

  update(dt) {
    if (!this._active) return;
    this._t += dt * 0.001;
    this._frameCount++;

    // Emit particles
    if (this._emitting) {
      this._emitParticles(EMIT_PER_FRAME);
    }

    // NS steps
    this._addBuoyancy();
    this._diffuseGrid();
    this._applyHandInteraction();

    // Advect particles and update SPS
    this._advectParticles(dt);

    if (this._sps) {
      this._sps.setParticles();
    }

    // Rebuild grid viz if shown (every 30 frames)
    if (this._showGrid && this._frameCount % 30 === 0) {
      this._toggleGridViz();
      this._showGrid = true; // toggle turns it off then on
    }

    // Update info panel every ~60 frames
    if (this._frameCount % 60 === 0) {
      this._updateInfoPanel();
    }
  }
}
