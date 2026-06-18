// Feature 14: Fluid Simulation — SPH-inspired 2D particle fluid
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Vector3,
  ParticleSystem, DynamicTexture, Mesh
} from '@babylonjs/core';

export class FluidSim {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._t = 0;
    this._particles = [];
    this._particleMeshes = [];
    this._paused = false;
    this._gravity = -9.8;
    this._viscosity = 0.98;
    this._BOUNDS = { x: 6, y: 5 };
    this._mat = null;
  }

  show() { this._build(); this._buildUI(); }

  hide() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._particleMeshes = [];
    this._particles = [];
    this._ui?.remove(); this._ui = null;
  }

  _build() {
    const B = this._BOUNDS;

    // Container walls
    const wallDefs = [
      { pos:[0,-B.y,0], scale:[B.x*2,0.1,0.2] }, // floor
      { pos:[-B.x,0,0], scale:[0.1,B.y*2,0.2] }, // left
      { pos:[B.x,0,0],  scale:[0.1,B.y*2,0.2] }, // right
    ];
    wallDefs.forEach((w, i) => {
      const wall = MeshBuilder.CreateBox(`fluidWall${i}`, {width:w.scale[0],height:w.scale[1],depth:w.scale[2]}, this.scene);
      wall.position.set(...w.pos);
      const mat = new StandardMaterial(`wallMat${i}`, this.scene);
      mat.emissiveColor = new Color3(0.1, 0.2, 0.4); mat.alpha = 0.4;
      wall.material = mat; wall.isPickable = false;
      this._meshes.push(wall);
    });

    // Shared particle material
    this._mat = new PBRMaterial('fluidMat', this.scene);
    this._mat.albedoColor = new Color3(0.1, 0.5, 1.0);
    this._mat.emissiveColor = new Color3(0.02, 0.15, 0.4);
    this._mat.metallic = 0.1; this._mat.roughness = 0.3;
    this._mat.alpha = 0.85;

    // Spawn particles
    this._spawnParticles(80);

    // Obstacle sphere (draggable)
    const obs = MeshBuilder.CreateSphere('fluidObs', {diameter:1.2, segments:10}, this.scene);
    obs.position.set(0, 0, 0);
    const obsMat = new PBRMaterial('obsMat', this.scene);
    obsMat.albedoColor = new Color3(1, 0.4, 0.1);
    obsMat.emissiveColor = new Color3(0.3, 0.1, 0);
    obsMat.metallic = 0.6; obsMat.roughness = 0.2;
    obs.material = obsMat;
    this.interaction.register(obs);
    this._obstacle = obs;
    this._meshes.push(obs);
  }

  _spawnParticles(count) {
    this._particles = [];
    this._particleMeshes.forEach(m => m.dispose());
    this._particleMeshes = [];

    const B = this._BOUNDS;
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * B.x * 1.6;
      const y = Math.random() * B.y * 0.8 + 1;
      this._particles.push({
        x, y, vx: (Math.random() - 0.5) * 0.5, vy: 0,
        density: 0, pressure: 0,
      });

      const sphere = MeshBuilder.CreateSphere(`fp${i}`, {diameter:0.22, segments:4}, this.scene);
      sphere.position.set(x, y, (Math.random() - 0.5) * 0.3);
      sphere.material = this._mat;
      sphere.isPickable = false;
      this._particleMeshes.push(sphere);
      this._meshes.push(sphere);
    }
  }

  _sphStep(dt) {
    const N = this._particles.length;
    const h = 0.8, restDensity = 6, stiffness = 0.5;
    const B = this._BOUNDS;

    // Compute densities
    for (let i = 0; i < N; i++) {
      let density = 0;
      const pi = this._particles[i];
      for (let j = 0; j < N; j++) {
        const pj = this._particles[j];
        const dx = pi.x - pj.x, dy = pi.y - pj.y;
        const r2 = dx*dx + dy*dy;
        if (r2 < h*h) {
          const q = 1 - Math.sqrt(r2) / h;
          density += q * q * q;
        }
      }
      pi.density = density;
      pi.pressure = stiffness * Math.max(density - restDensity, 0);
    }

    // Compute forces + integrate
    for (let i = 0; i < N; i++) {
      const pi = this._particles[i];
      let fx = 0, fy = this._gravity * 0.3;

      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const pj = this._particles[j];
        const dx = pi.x - pj.x, dy = pi.y - pj.y;
        const r = Math.sqrt(dx*dx + dy*dy) || 0.0001;
        if (r < h) {
          const q = 1 - r / h;
          const pForce = (pi.pressure + pj.pressure) / (pi.density + pj.density + 0.0001);
          fx += pForce * (dx/r) * q * q;
          fy += pForce * (dy/r) * q * q;

          // Viscosity
          fx += this._viscosity * (pj.vx - pi.vx) * q * 0.1;
          fy += this._viscosity * (pj.vy - pi.vy) * q * 0.1;
        }
      }

      // Obstacle repulsion
      if (this._obstacle) {
        const odx = pi.x - this._obstacle.position.x;
        const ody = pi.y - this._obstacle.position.y;
        const od = Math.sqrt(odx*odx + ody*ody) || 0.001;
        if (od < 0.8) {
          fx += (odx/od) * 4;
          fy += (ody/od) * 4;
        }
      }

      pi.vx = (pi.vx + fx * dt) * 0.995;
      pi.vy = (pi.vy + fy * dt) * 0.995;
      pi.x += pi.vx * dt;
      pi.y += pi.vy * dt;

      // Boundary
      if (pi.x < -B.x+0.1) { pi.x = -B.x+0.1; pi.vx *= -0.5; }
      if (pi.x >  B.x-0.1) { pi.x =  B.x-0.1; pi.vx *= -0.5; }
      if (pi.y < -B.y+0.1) { pi.y = -B.y+0.1; pi.vy *= -0.5; }
      if (pi.y >  B.y*3  ) { pi.y =  B.y*3;   pi.vy *= -0.5; }

      this._particleMeshes[i]?.position.set(pi.x, pi.y, this._particleMeshes[i].position.z);
    }
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 22px;';

    const makeSlider = (label, min, max, val, step, onInput) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;';
      const l = document.createElement('label');
      l.className = 'param-label'; l.textContent = label;
      l.style.cssText = 'font-size:0.78rem;color:#7ba3cc;white-space:nowrap;min-width:70px;';
      const sl = document.createElement('input');
      sl.type = 'range'; sl.min = min; sl.max = max; sl.value = val; sl.step = step;
      sl.style.width = '110px'; sl.style.accentColor = '#ff6b35';
      const v = document.createElement('span');
      v.style.cssText = 'font-size:0.78rem;color:#ff6b35;min-width:35px;font-family:monospace;';
      v.textContent = val;
      sl.oninput = () => { v.textContent = sl.value; onInput(+sl.value); };
      row.append(l, sl, v);
      return row;
    };

    wrap.appendChild(makeSlider('Gravity', -20, 0, this._gravity, 0.5, v => this._gravity = v));
    wrap.appendChild(makeSlider('Viscosity', 0.9, 1.0, this._viscosity, 0.01, v => this._viscosity = v));

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;';
    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'topic-btn physics-topic';
    pauseBtn.textContent = '⏸ Pause';
    pauseBtn.style.fontSize = '0.75rem';
    pauseBtn.onclick = () => {
      this._paused = !this._paused;
      pauseBtn.textContent = this._paused ? '▶ Resume' : '⏸ Pause';
    };

    const resetBtn = document.createElement('button');
    resetBtn.className = 'topic-btn physics-topic';
    resetBtn.textContent = '↺ Reset';
    resetBtn.style.fontSize = '0.75rem';
    resetBtn.onclick = () => this._spawnParticles(80);

    const splashBtn = document.createElement('button');
    splashBtn.className = 'topic-btn physics-topic';
    splashBtn.textContent = '💧 Splash';
    splashBtn.style.fontSize = '0.75rem';
    splashBtn.onclick = () => {
      this._particles.forEach(p => { p.vy += 8; });
    };

    btnRow.append(pauseBtn, resetBtn, splashBtn);
    wrap.appendChild(btnRow);
    const info = document.createElement('div');
    info.style.cssText = 'font-size:0.72rem;color:#7ba3cc;text-align:center;';
    info.textContent = '👋 Grab the orange sphere to stir the fluid';
    wrap.appendChild(info);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  update(dt) {
    this._t += dt * 0.001;
    if (this._paused) return;
    const fixedDt = 0.016;
    this._sphStep(fixedDt);
  }
}
