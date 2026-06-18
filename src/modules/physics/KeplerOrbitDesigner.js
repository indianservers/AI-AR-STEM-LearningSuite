// KeplerOrbitDesigner.js — Kepler orbit designer with live orbital mechanics
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Vector3,
  DynamicTexture, Mesh, GlowLayer
} from '@babylonjs/core';

const GM = 10;
const MAX_PLANETS = 5;
const TRAIL_LENGTH = 80;

const PRESET_COLORS = [
  { name: 'Cyan',   c3: new Color3(0.0, 0.9, 1.0) },
  { name: 'Orange', c3: new Color3(1.0, 0.5, 0.1) },
  { name: 'Green',  c3: new Color3(0.2, 1.0, 0.3) },
  { name: 'Pink',   c3: new Color3(1.0, 0.3, 0.8) },
  { name: 'Yellow', c3: new Color3(1.0, 0.95, 0.2) },
];

const DEFAULT_PLANETS = [
  { a: 4, e: 0.2, colorIdx: 0 },
  { a: 6, e: 0.4, colorIdx: 1 },
  { a: 8, e: 0.1, colorIdx: 2 },
];

export class KeplerOrbitDesigner {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._active = false;
    this._ui = null;
    this._infoEl = null;
    this._glowLayer = null;
    this._meshes = [];
    this._star = null;
    this._planets = [];      // { a, e, colorIdx, angle, mesh, orbitMesh, trailMesh, trailPoints, velArrow, period }
    this._panelEls = [];     // DOM panel refs per planet
    this._t = 0;
  }

  show() {
    this._active = true;
    this._buildScene();
    this._initPlanets(DEFAULT_PLANETS);
    this._buildUI();
    this._buildInfoPanel();
  }

  hide() {
    this._active = false;
    this._glowLayer?.dispose();
    this._glowLayer = null;
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._star = null;
    this._planets.forEach(p => {
      p.trailMesh?.dispose();
      p.orbitMesh?.dispose();
      p.velArrow?.dispose();
    });
    this._planets = [];
    this._ui?.remove();
    this._ui = null;
    this._infoEl?.remove();
    this._infoEl = null;
    this._panelEls = [];
  }

  _buildScene() {
    this._glowLayer?.dispose();
    this._glowLayer = new GlowLayer('keplerGlow', this.scene);
    this._glowLayer.intensity = 1.0;

    // Central star
    this._star = MeshBuilder.CreateSphere('kepStar', { diameter: 1.2, segments: 20 }, this.scene);
    this._star.position.set(0, 0, 0);
    const starMat = new PBRMaterial('kepStarMat', this.scene);
    starMat.albedoColor = new Color3(1.0, 0.95, 0.3);
    starMat.emissiveColor = new Color3(1.0, 0.8, 0.1);
    starMat.metallic = 0; starMat.roughness = 0.2;
    this._star.material = starMat;
    this._star.isPickable = false;
    this._meshes.push(this._star);
    this._glowLayer.addIncludedOnlyMesh(this._star);
  }

  _initPlanets(configs) {
    // Dispose existing planet meshes
    this._planets.forEach(p => {
      p.mesh?.dispose();
      p.orbitMesh?.dispose();
      p.trailMesh?.dispose();
      p.velArrow?.dispose();
    });
    this._planets = [];

    configs.forEach((cfg, i) => {
      this._addPlanet(cfg.a, cfg.e, cfg.colorIdx ?? i % PRESET_COLORS.length);
    });
  }

  _addPlanet(a, e, colorIdx) {
    if (this._planets.length >= MAX_PLANETS) return;
    const color = PRESET_COLORS[colorIdx % PRESET_COLORS.length].c3;

    // Planet mesh
    const planet = MeshBuilder.CreateSphere(`kepPlanet${this._planets.length}`, {
      diameter: 0.35, segments: 10
    }, this.scene);
    const mat = new PBRMaterial(`kepPlanetMat${this._planets.length}`, this.scene);
    mat.albedoColor = color.clone();
    mat.emissiveColor = color.scale(0.4);
    mat.metallic = 0.1; mat.roughness = 0.4;
    planet.material = mat;
    planet.isPickable = false;

    // Compute initial position
    const c = a * e;
    const b = a * Math.sqrt(1 - e * e);
    const angle = 0;
    const x = a * Math.cos(angle) - c;
    const z = b * Math.sin(angle);
    planet.position.set(x, 0, z);

    const period = 2 * Math.PI * Math.sqrt(a * a * a / GM);

    // Orbit ellipse (static outline)
    const orbitPts = [];
    for (let i = 0; i <= 100; i++) {
      const th = (i / 100) * 2 * Math.PI;
      orbitPts.push(new Vector3(
        a * Math.cos(th) - c,
        0,
        b * Math.sin(th)
      ));
    }
    const orbitMesh = MeshBuilder.CreateLines(`kepOrbit${this._planets.length}`, {
      points: orbitPts
    }, this.scene);
    orbitMesh.color = color.scale(0.4);
    orbitMesh.isPickable = false;

    // Velocity arrow placeholder
    const velArrow = MeshBuilder.CreateCylinder(`kepVel${this._planets.length}`, {
      height: 0.6, diameter: 0.06, tessellation: 6
    }, this.scene);
    const velMat = new StandardMaterial(`kepVelMat${this._planets.length}`, this.scene);
    velMat.emissiveColor = color.scale(0.9);
    velMat.disableLighting = true;
    velArrow.material = velMat;
    velArrow.isPickable = false;

    const planetData = {
      a, e, colorIdx,
      angle,
      mesh: planet,
      mat,
      orbitMesh,
      trailMesh: null,
      trailPoints: [],
      velArrow,
      period,
      color,
    };
    this._planets.push(planetData);
    this._meshes.push(planet);
    this._glowLayer.addIncludedOnlyMesh(planet);

    return planetData;
  }

  _orbitPosition(a, e, theta) {
    const b = a * Math.sqrt(1 - e * e);
    const c = a * e;
    return {
      x: a * Math.cos(theta) - c,
      z: b * Math.sin(theta),
    };
  }

  _orbitVelocity(a, e, theta) {
    // Orbital velocity components from vis-viva and angular momentum
    const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
    const h = Math.sqrt(GM * a * (1 - e * e));
    const vr = (GM / h) * e * Math.sin(theta);
    const vt = h / r;
    // Convert to cartesian (in x-z plane)
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    return {
      vx: vr * cosT - vt * sinT,
      vz: vr * sinT + vt * cosT,
      speed: Math.sqrt(vr * vr + vt * vt),
    };
  }

  _rebuildOrbitMesh(p) {
    p.orbitMesh?.dispose();
    const a = p.a, e = p.e;
    const b = a * Math.sqrt(1 - e * e);
    const c = a * e;
    const pts = [];
    for (let i = 0; i <= 100; i++) {
      const th = (i / 100) * 2 * Math.PI;
      pts.push(new Vector3(a * Math.cos(th) - c, 0, b * Math.sin(th)));
    }
    p.orbitMesh = MeshBuilder.CreateLines(`kepOrbit${this._planets.indexOf(p)}_r`, {
      points: pts
    }, this.scene);
    p.orbitMesh.color = p.color.scale(0.4);
    p.orbitMesh.isPickable = false;
    p.period = 2 * Math.PI * Math.sqrt(a * a * a / GM);
    p.trailPoints = [];
    p.trailMesh?.dispose();
    p.trailMesh = null;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = [
      'bottom:110px;flex-direction:column;gap:10px;',
      'padding:14px 20px;min-width:360px;max-height:60vh;overflow-y:auto;'
    ].join('');

    this._panelEls = [];
    this._planets.forEach((p, i) => {
      wrap.appendChild(this._buildPlanetPanel(p, i));
    });

    // Add planet button
    const addBtn = document.createElement('button');
    addBtn.className = 'topic-btn';
    addBtn.textContent = '+ Add Planet';
    addBtn.style.cssText = 'font-size:0.78rem;width:100%;margin-top:4px;';
    addBtn.addEventListener('click', () => {
      if (this._planets.length >= MAX_PLANETS) return;
      const newA = 3 + this._planets.length * 1.5;
      this._addPlanet(newA, 0.3, this._planets.length);
      // Rebuild UI
      this._buildUI();
      this._buildInfoPanel();
    });
    wrap.appendChild(addBtn);

    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  _buildPlanetPanel(p, i) {
    const color = PRESET_COLORS[p.colorIdx % PRESET_COLORS.length];
    const panel = document.createElement('div');
    panel.style.cssText = [
      `border-left:3px solid ${color.c3.toHexString()};`,
      'padding:8px 12px;background:rgba(0,0,20,0.4);border-radius:4px;'
    ].join('');

    const title = document.createElement('div');
    title.style.cssText = `font-size:0.78rem;font-weight:700;color:${color.c3.toHexString()};margin-bottom:6px;`;
    title.textContent = `Planet ${i + 1}`;
    panel.appendChild(title);

    const makeSlider = (label, min, max, val, step, onInput) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;';
      const l = document.createElement('label');
      l.style.cssText = 'font-size:0.72rem;color:#7ba3cc;white-space:nowrap;min-width:60px;';
      l.textContent = label;
      const sl = document.createElement('input');
      sl.type = 'range'; sl.min = min; sl.max = max; sl.step = step; sl.value = val;
      sl.style.cssText = 'width:100px;accent-color:' + color.c3.toHexString() + ';';
      const v = document.createElement('span');
      v.style.cssText = 'font-size:0.72rem;color:#ffcc44;min-width:35px;font-family:monospace;';
      v.textContent = val;
      sl.oninput = () => { v.textContent = (+sl.value).toFixed(2); onInput(+sl.value); };
      row.append(l, sl, v);
      return row;
    };

    panel.appendChild(makeSlider('Semi-major a', 2, 10, p.a, 0.1, v => {
      p.a = v; this._rebuildOrbitMesh(p); this._updateInfoPanel();
    }));
    panel.appendChild(makeSlider('Eccentricity e', 0, 0.9, p.e, 0.01, v => {
      p.e = v; this._rebuildOrbitMesh(p); this._updateInfoPanel();
    }));

    // Color picker buttons
    const colorRow = document.createElement('div');
    colorRow.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-top:4px;';
    const cLabel = document.createElement('span');
    cLabel.style.cssText = 'font-size:0.7rem;color:#7ba3cc;margin-right:4px;';
    cLabel.textContent = 'Color:';
    colorRow.appendChild(cLabel);
    PRESET_COLORS.forEach((pc, ci) => {
      const btn = document.createElement('button');
      btn.style.cssText = [
        `background:${pc.c3.toHexString()};`,
        'width:16px;height:16px;border-radius:50%;border:2px solid transparent;',
        'cursor:pointer;padding:0;',
        ci === p.colorIdx ? 'border-color:#fff;' : ''
      ].join('');
      btn.title = pc.name;
      btn.addEventListener('click', () => {
        p.colorIdx = ci;
        p.color = pc.c3.clone();
        p.mat.albedoColor = pc.c3.clone();
        p.mat.emissiveColor = pc.c3.scale(0.4);
        p.orbitMesh.color = pc.c3.scale(0.4);
        colorRow.querySelectorAll('button').forEach((b, bi) => {
          b.style.borderColor = bi === ci ? '#fff' : 'transparent';
        });
      });
      colorRow.appendChild(btn);
    });
    panel.appendChild(colorRow);

    this._panelEls.push(panel);
    return panel;
  }

  _buildInfoPanel() {
    this._infoEl?.remove();
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed;top:80px;right:20px;',
      'background:rgba(10,20,40,0.92);',
      'border:1px solid rgba(0,212,255,0.3);border-radius:12px;',
      'padding:14px 18px;z-index:2100;pointer-events:none;',
      'font-size:0.72rem;color:#e8f4ff;backdrop-filter:blur(8px);',
      'font-family:monospace;min-width:210px;'
    ].join('');
    this._infoEl = el;
    document.body.appendChild(el);
    this._updateInfoPanel();
  }

  _updateInfoPanel() {
    if (!this._infoEl) return;
    let rows = '<div style="color:#ffcc44;font-weight:700;margin-bottom:8px;">Kepler Orbit Designer</div>';
    rows += '<div style="color:#7ba3cc;margin-bottom:6px;">T = 2π √(a³/GM)</div>';
    this._planets.forEach((p, i) => {
      const color = PRESET_COLORS[p.colorIdx % PRESET_COLORS.length];
      const pos = this._orbitPosition(p.a, p.e, p.angle);
      const r = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      const vel = this._orbitVelocity(p.a, p.e, p.angle);
      rows += `<div style="color:${color.c3.toHexString()};margin-top:4px;">
        Planet ${i + 1}
      </div>
      <div>a=${p.a.toFixed(1)}  e=${p.e.toFixed(2)}</div>
      <div>T=${p.period.toFixed(2)} yr  r=${r.toFixed(2)}</div>
      <div>v=${vel.speed.toFixed(2)} AU/yr</div>`;
    });
    this._infoEl.innerHTML = rows;
  }

  update(dt) {
    if (!this._active) return;
    this._t += dt * 0.001;
    const dtSec = dt * 0.001 * 2; // time-warp factor

    this._planets.forEach(p => {
      const a = p.a, e = p.e;
      const r = a * (1 - e * e) / (1 + e * Math.cos(p.angle));
      const h = Math.sqrt(GM * a * (1 - e * e));
      const dTheta = (h / (r * r)) * dtSec;
      p.angle += dTheta;
      if (p.angle > 2 * Math.PI) p.angle -= 2 * Math.PI;

      const pos = this._orbitPosition(a, e, p.angle);
      p.mesh.position.set(pos.x, 0, pos.z);

      // Trail
      p.trailPoints.push(new Vector3(pos.x, 0, pos.z));
      if (p.trailPoints.length > TRAIL_LENGTH) p.trailPoints.shift();
      if (p.trailPoints.length >= 2) {
        p.trailMesh?.dispose();
        p.trailMesh = MeshBuilder.CreateLines(`kepTrail${this._planets.indexOf(p)}_${this._t | 0}`, {
          points: p.trailPoints
        }, this.scene);
        const colorFade = p.color.scale(0.6);
        p.trailMesh.color = colorFade;
        p.trailMesh.isPickable = false;
      }

      // Velocity arrow
      const vel = this._orbitVelocity(a, e, p.angle);
      if (p.velArrow) {
        // Position arrow at planet
        const arrowLen = Math.min(vel.speed * 0.2, 1.5);
        p.velArrow.scaling.y = arrowLen;
        p.velArrow.position.set(
          pos.x + vel.vx * arrowLen * 0.5,
          0,
          pos.z + vel.vz * arrowLen * 0.5
        );
        // Orient along velocity
        p.velArrow.lookAt(new Vector3(
          pos.x + vel.vx,
          0,
          pos.z + vel.vz
        ));
        p.velArrow.rotation.x += Math.PI / 2;
      }
    });

    // Update info panel periodically
    if (Math.floor(this._t * 10) % 10 === 0) {
      this._updateInfoPanel();
    }
  }
}
