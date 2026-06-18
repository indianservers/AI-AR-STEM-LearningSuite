// BlackHoleLensing.js — Gravitational Schwarzschild lensing post-process
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Vector3,
  Effect, PostProcess, GlowLayer, Animation
} from '@babylonjs/core';

// Register shaders once (guard against double-registration)
if (!Effect.ShadersStore['blackholeLensVertexShader']) {
  Effect.ShadersStore['blackholeLensVertexShader'] = `
    attribute vec2 position;
    varying vec2 vUV;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
      vUV = position * 0.5 + 0.5;
    }
  `;
}

if (!Effect.ShadersStore['blackholeLensFragmentShader']) {
  Effect.ShadersStore['blackholeLensFragmentShader'] = `
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform vec2 bhCenter;
    uniform float bhMass;
    uniform float time;

    void main() {
      vec2 uv = vUV;
      vec2 delta = uv - bhCenter;
      float dist = length(delta) + 0.001;
      float lensRadius = 0.15 * bhMass;

      // Inside event horizon: pure black
      if (dist < lensRadius * 0.3) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      // Photon sphere: extreme blue/white glow ring
      if (dist < lensRadius * 0.35) {
        float glow = 1.0 - (dist - lensRadius * 0.3) / (lensRadius * 0.05);
        gl_FragColor = vec4(glow * 0.8, glow * 0.9, glow, 1.0);
        return;
      }

      // Lensing distortion
      float strength = bhMass * 0.08 / (dist * dist);
      uv -= normalize(delta) * strength;
      uv = clamp(uv, 0.0, 1.0);

      // Redshift: shift color toward red near black hole
      vec4 col = texture2D(textureSampler, uv);
      float redshift = smoothstep(0.5, 0.1, dist) * bhMass;
      col.r = min(1.0, col.r + redshift * 0.3);
      col.b = max(0.0, col.b - redshift * 0.2);

      // Subtle time-based shimmer in lensing zone
      if (dist < lensRadius * 2.0) {
        float shimmer = sin(time * 3.0 + dist * 20.0) * 0.03
                        * (1.0 - dist / (lensRadius * 2.0));
        col.rgb += shimmer;
      }

      gl_FragColor = col;
    }
  `;
}

export class BlackHoleLensing {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._active = false;
    this._postProcess = null;
    this._torus = null;
    this._coreSphere = null;
    this._glowLayer = null;
    this._ui = null;
    this._infoEl = null;
    this._t = 0;
    this._mass = 0.5;
    this._meshes = [];
  }

  show() {
    this._active = true;
    this._buildScene();
    this._buildPostProcess();
    this._buildUI();
    this._buildInfoPanel();
  }

  hide() {
    this._active = false;
    this._postProcess?.dispose();
    this._postProcess = null;
    this._glowLayer?.dispose();
    this._glowLayer = null;
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._torus = null;
    this._coreSphere = null;
    this._ui?.remove();
    this._ui = null;
    this._infoEl?.remove();
    this._infoEl = null;
  }

  _buildScene() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];

    this._glowLayer = new GlowLayer('bhGlow', this.scene);
    this._glowLayer.intensity = 1.2;

    // Schwarzschild radius indicator — small glowing black sphere
    this._coreSphere = MeshBuilder.CreateSphere('bhCore', { diameter: 0.3, segments: 16 }, this.scene);
    this._coreSphere.position.set(0, 0, 0);
    const coreMat = new PBRMaterial('bhCoreMat', this.scene);
    coreMat.albedoColor = new Color3(0.0, 0.0, 0.0);
    coreMat.emissiveColor = new Color3(0.05, 0.05, 0.15);
    coreMat.metallic = 1; coreMat.roughness = 0;
    this._coreSphere.material = coreMat;
    this._coreSphere.isPickable = false;
    this._meshes.push(this._coreSphere);
    this._glowLayer.addIncludedOnlyMesh(this._coreSphere);

    // Photon ring: thin bright torus
    const photonRing = MeshBuilder.CreateTorus('bhPhotonRing', {
      diameter: 0.7, thickness: 0.04, tessellation: 64
    }, this.scene);
    photonRing.position.set(0, 0, 0);
    photonRing.scaling.y = 0.08;
    const ringMat = new PBRMaterial('bhRingMat', this.scene);
    ringMat.albedoColor = new Color3(0.8, 0.95, 1.0);
    ringMat.emissiveColor = new Color3(0.6, 0.8, 1.0);
    ringMat.metallic = 0; ringMat.roughness = 0.1;
    photonRing.material = ringMat;
    photonRing.isPickable = false;
    this._meshes.push(photonRing);
    this._glowLayer.addIncludedOnlyMesh(photonRing);

    // Accretion disk: flattened torus with orange/yellow gradient
    this._torus = MeshBuilder.CreateTorus('bhTorus', {
      diameter: 1.5, thickness: 0.3, tessellation: 64
    }, this.scene);
    this._torus.position.set(0, 0, 0);
    this._torus.scaling.y = 0.1;
    const torusMat = new PBRMaterial('bhTorusMat', this.scene);
    torusMat.albedoColor = new Color3(1.0, 0.55, 0.05);
    torusMat.emissiveColor = new Color3(0.9, 0.4, 0.0);
    torusMat.metallic = 0.0; torusMat.roughness = 0.3;
    this._torus.material = torusMat;
    this._torus.isPickable = false;
    this._meshes.push(this._torus);
    this._glowLayer.addIncludedOnlyMesh(this._torus);

    // Outer hot gas ring (second torus, larger and cooler)
    const outerRing = MeshBuilder.CreateTorus('bhOuterRing', {
      diameter: 2.4, thickness: 0.12, tessellation: 64
    }, this.scene);
    outerRing.position.set(0, 0, 0);
    outerRing.scaling.y = 0.08;
    const outerMat = new PBRMaterial('bhOuterMat', this.scene);
    outerMat.albedoColor = new Color3(0.8, 0.3, 0.05);
    outerMat.emissiveColor = new Color3(0.5, 0.15, 0.0);
    outerMat.metallic = 0; outerMat.roughness = 0.5;
    outerMat.alpha = 0.5;
    outerRing.material = outerMat;
    outerRing.isPickable = false;
    this._meshes.push(outerRing);

    // Background star field (just instanced boxes as points)
    for (let i = 0; i < 80; i++) {
      const star = MeshBuilder.CreateSphere(`bhStar${i}`, { diameter: 0.04 + Math.random() * 0.06 }, this.scene);
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 8;
      const h = (Math.random() - 0.5) * 6;
      star.position.set(Math.cos(angle) * dist, h, Math.sin(angle) * dist);
      const starMat = new StandardMaterial(`bhStarMat${i}`, this.scene);
      const brightness = 0.5 + Math.random() * 0.5;
      starMat.emissiveColor = new Color3(brightness, brightness, brightness * 0.8);
      starMat.disableLighting = true;
      star.material = starMat;
      star.isPickable = false;
      this._meshes.push(star);
    }
  }

  _buildPostProcess() {
    if (!this.scene.activeCamera) return;

    this._postProcess = new PostProcess(
      'bhLens',
      'blackholeLens',
      ['bhCenter', 'bhMass', 'time'],
      ['textureSampler'],
      1.0,
      this.scene.activeCamera
    );

    this._postProcess.onApply = (effect) => {
      effect.setFloat2('bhCenter', 0.5, 0.5);
      effect.setFloat('bhMass', this._mass);
      effect.setFloat('time', this._t);
    };
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 22px;min-width:300px;';

    // Mass slider
    const massRow = document.createElement('div');
    massRow.style.cssText = 'display:flex;align-items:center;gap:10px;';
    const ml = document.createElement('label');
    ml.style.cssText = 'font-size:0.78rem;color:#7ba3cc;white-space:nowrap;min-width:80px;';
    ml.textContent = 'BH Mass';
    const ms = document.createElement('input');
    ms.type = 'range'; ms.min = 0; ms.max = 1; ms.step = 0.01; ms.value = this._mass;
    ms.style.cssText = 'width:130px;accent-color:#ff6b35;';
    const mv = document.createElement('span');
    mv.style.cssText = 'font-size:0.78rem;color:#ff6b35;min-width:90px;font-family:monospace;';
    mv.textContent = this._getMassLabel();
    ms.oninput = () => {
      this._mass = +ms.value;
      mv.textContent = this._getMassLabel();
      // Scale accretion disk with mass
      if (this._torus) this._torus.scaling.set(
        0.5 + this._mass, 0.1, 0.5 + this._mass
      );
    };
    massRow.append(ml, ms, mv);

    const info = document.createElement('div');
    info.style.cssText = 'font-size:0.7rem;color:#7ba3cc;text-align:center;';
    info.textContent = 'Schwarzschild gravitational lensing & accretion disk';

    wrap.append(massRow, info);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  _getMassLabel() {
    if (this._mass < 0.2) return 'Stellar Mass';
    if (this._mass < 0.5) return 'Intermediate';
    if (this._mass < 0.8) return 'Massive';
    return 'Supermassive';
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
      'font-family:monospace;min-width:210px;'
    ].join('');
    this._infoEl = el;
    document.body.appendChild(el);
    this._updateInfoPanel();
  }

  _updateInfoPanel() {
    if (!this._infoEl) return;
    const rs = (this._mass * 2.0).toFixed(2); // Schwarzschild radius (scaled)
    this._infoEl.innerHTML = `
      <div style="color:#ff8844;font-weight:700;margin-bottom:8px;">Black Hole Lensing</div>
      <div>Mass: ${this._getMassLabel()}</div>
      <div style="color:#7ba3cc;margin-top:6px;">Schwarzschild radius</div>
      <div style="color:#ffcc44;">r<sub>s</sub> = ${rs} units</div>
      <div style="margin-top:8px;color:#7ba3cc;">Lensing Strength</div>
      <div style="color:#ff8844;">${(this._mass * 100).toFixed(0)}%</div>
      <div style="margin-top:8px;color:#7ba3cc;font-size:0.68rem;">
        r<sub>s</sub> = 2GM/c²<br>
        Photon deflection: δ = 4GM/rc²
      </div>
    `;
  }

  update(dt) {
    if (!this._active) return;
    this._t += dt * 0.001;

    // Rotate accretion disk
    if (this._torus) {
      this._torus.rotation.y += dt * 0.0008 * (1 + this._mass);
    }

    // Update post-process uniforms
    if (this._postProcess) {
      this._postProcess.onApply = (effect) => {
        effect.setFloat2('bhCenter', 0.5, 0.5);
        effect.setFloat('bhMass', this._mass);
        effect.setFloat('time', this._t);
      };
    }

    // Pulse photon ring glow with time
    this._updateInfoPanel();
  }
}
