// Feature 19: Spectroscopy Lab — emission spectra visualization
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Vector3,
  DynamicTexture, ParticleSystem, Mesh
} from '@babylonjs/core';

// Balmer series + other notable lines (wavelength in nm, element, color)
const SPECTRA = {
  hydrogen: {
    name: 'Hydrogen (H)', color: new Color3(0.8, 0.8, 1),
    emission: [
      { nm:656.3, label:'Hα', color:[1,0.1,0.1], intensity:1.0 },   // red
      { nm:486.1, label:'Hβ', color:[0.2,0.5,1], intensity:0.7 },   // blue
      { nm:434.0, label:'Hγ', color:[0.5,0.2,1], intensity:0.4 },   // violet
      { nm:410.2, label:'Hδ', color:[0.6,0.1,1], intensity:0.25 },  // deep violet
    ],
  },
  sodium: {
    name: 'Sodium (Na)', color: new Color3(1, 0.9, 0.2),
    emission: [
      { nm:589.0, label:'D1', color:[1,0.85,0.1], intensity:1.0 },
      { nm:589.6, label:'D2', color:[1,0.87,0.15], intensity:0.95 },
      { nm:568.8, label:'Na', color:[0.9,0.9,0.1], intensity:0.3 },
      { nm:615.4, label:'Na', color:[1,0.4,0.1], intensity:0.2 },
    ],
  },
  helium: {
    name: 'Helium (He)', color: new Color3(0.9, 0.9, 0.9),
    emission: [
      { nm:587.6, label:'D3', color:[1,0.8,0.1], intensity:0.9 },
      { nm:501.6, label:'He', color:[0.2,1,0.5], intensity:0.8 },
      { nm:667.8, label:'He', color:[1,0.2,0.1], intensity:0.6 },
      { nm:447.1, label:'He', color:[0.3,0.2,1], intensity:0.5 },
      { nm:388.9, label:'He', color:[0.5,0.1,1], intensity:0.3 },
    ],
  },
  neon: {
    name: 'Neon (Ne)', color: new Color3(1, 0.4, 0.1),
    emission: [
      { nm:640.2, label:'Ne', color:[1,0.1,0.1], intensity:1.0 },
      { nm:614.3, label:'Ne', color:[1,0.35,0.1], intensity:0.9 },
      { nm:621.7, label:'Ne', color:[1,0.2,0.1], intensity:0.8 },
      { nm:585.2, label:'Ne', color:[1,0.8,0.1], intensity:0.6 },
      { nm:671.7, label:'Ne', color:[1,0.05,0.05], intensity:0.5 },
    ],
  },
  mercury: {
    name: 'Mercury (Hg)', color: new Color3(0.7, 0.9, 1),
    emission: [
      { nm:404.7, label:'Hg', color:[0.7,0.1,1], intensity:0.8 },
      { nm:435.8, label:'Hg', color:[0.4,0.2,1], intensity:1.0 },
      { nm:546.1, label:'Hg', color:[0.1,1,0.2], intensity:0.9 },
      { nm:579.0, label:'Hg', color:[1,0.9,0.1], intensity:0.7 },
    ],
  },
};

function nmToRGB(nm) {
  // Approximate visible spectrum nm→RGB
  let r = 0, g = 0, b = 0;
  if      (nm < 380)              { r=0.5; g=0; b=0.5; }
  else if (nm < 440)              { r=(440-nm)/60; g=0; b=1; }
  else if (nm < 490)              { r=0; g=(nm-440)/50; b=1; }
  else if (nm < 510)              { r=0; g=1; b=(510-nm)/20; }
  else if (nm < 580)              { r=(nm-510)/70; g=1; b=0; }
  else if (nm < 645)              { r=1; g=(645-nm)/65; b=0; }
  else if (nm <= 700)             { r=1; g=0; b=0; }
  else                            { r=0.5; g=0; b=0; }
  return [r, g, b];
}

export class Spectroscopy {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._t = 0;
    this._activeEl = 'hydrogen';
    this._beamPS = null;
    this._lightSourceMesh = null;
  }

  show() { this._build(); this._buildUI(); }

  hide() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._beamPS = null;
    this._ui?.remove(); this._ui = null;
  }

  _build() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];

    const spectrum = SPECTRA[this._activeEl];
    const W = 12, H = 3;

    // Dark background plate for spectrum
    const bg = MeshBuilder.CreatePlane('spectrBg', {width:W, height:H}, this.scene);
    bg.position.set(0, 0, -0.1);
    const bgMat = new StandardMaterial('spectrBgMat', this.scene);
    bgMat.emissiveColor = new Color3(0.01, 0.01, 0.02);
    bg.material = bgMat; bg.isPickable = false;
    this._meshes.push(bg);

    // Visible spectrum rainbow background (400-700nm mapped to x)
    const rainbowSteps = 60;
    for (let i = 0; i < rainbowSteps; i++) {
      const nm = 400 + (300 / rainbowSteps) * i;
      const x = ((nm - 400) / 300) * W - W/2;
      const [r,g,b] = nmToRGB(nm);
      const band = MeshBuilder.CreatePlane(`rainbowBand${i}`, {width:W/rainbowSteps+0.01, height:H}, this.scene);
      band.position.set(x + W/(rainbowSteps*2), 0, 0);
      const bmat = new StandardMaterial(`rainbowMat${i}`, this.scene);
      bmat.emissiveColor = new Color3(r*0.15, g*0.15, b*0.15);
      bmat.alpha = 0.8;
      band.material = bmat; band.isPickable = false;
      this._meshes.push(band);
    }

    // Emission lines as bright vertical bars
    spectrum.emission.forEach((line, i) => {
      const x = ((line.nm - 400) / 300) * W - W/2;
      if (x < -W/2 || x > W/2) return;

      const bar = MeshBuilder.CreatePlane(`specLine${i}`, {width:0.06, height:H * line.intensity}, this.scene);
      bar.position.set(x, 0, 0.05);
      const barMat = new StandardMaterial(`specLineMat${i}`, this.scene);
      barMat.emissiveColor = new Color3(...line.color);
      barMat.alpha = 0.95;
      bar.material = barMat; bar.isPickable = false;
      this._meshes.push(bar);

      // Glow effect via additional wider transparent bar
      const glow = MeshBuilder.CreatePlane(`specGlow${i}`, {width:0.18, height:H * line.intensity * 0.7}, this.scene);
      glow.position.set(x, 0, 0.04);
      const glowMat = new StandardMaterial(`specGlowMat${i}`, this.scene);
      glowMat.emissiveColor = new Color3(...line.color);
      glowMat.alpha = 0.3;
      glow.material = glowMat; glow.isPickable = false;
      this._meshes.push(glow);

      // Wavelength label
      this._addLabel(line.nm.toFixed(1) + 'nm\n' + line.label, x, -2.0);
    });

    // nm scale labels
    [400, 450, 500, 550, 600, 650, 700].forEach(nm => {
      const x = ((nm - 400) / 300) * W - W/2;
      this._addLabel(nm + '', x, -1.5);
    });

    // Light source (discharge tube)
    this._lightSourceMesh = MeshBuilder.CreateCylinder('specSource', {height:3, diameter:0.3, tessellation:8}, this.scene);
    this._lightSourceMesh.rotation.z = Math.PI / 2;
    this._lightSourceMesh.position.set(0, 3, 0);
    const srcMat = new PBRMaterial('specSrcMat', this.scene);
    srcMat.albedoColor = spectrum.color;
    srcMat.emissiveColor = spectrum.color.scale(0.5);
    srcMat.metallic = 0.1; srcMat.roughness = 0.6;
    this._lightSourceMesh.material = srcMat;
    this._lightSourceMesh.isPickable = false;
    this._meshes.push(this._lightSourceMesh);

    // Beam from source to plate
    const beam = MeshBuilder.CreateLines('specBeam', {
      points:[new Vector3(0, 3, 0), new Vector3(0, 0.2, 0)]
    }, this.scene);
    beam.color = spectrum.color; beam.isPickable = false;
    this._meshes.push(beam);

    // Prism
    const prism = MeshBuilder.CreatePolyhedron('specPrism', {type:1, size:0.5}, this.scene);
    prism.position.set(0, 1.5, 0);
    const prismMat = new StandardMaterial('prismMat', this.scene);
    prismMat.emissiveColor = new Color3(0.3, 0.5, 0.7);
    prismMat.alpha = 0.7;
    prism.material = prismMat; prism.isPickable = false;
    this._meshes.push(prism);

    this._buildInfoPanel();
  }

  _addLabel(text, x, y) {
    const plane = MeshBuilder.CreatePlane('specLbl' + this._meshes.length, {width:1.2, height:0.5}, this.scene);
    plane.position.set(x, y, 0.2);
    const tex = new DynamicTexture('specTex' + this._meshes.length, {width:96, height:40}, this.scene);
    const ctx = tex.getContext();
    ctx.fillStyle = '#aaaacc'; ctx.font = '13px Arial'; ctx.textAlign = 'center';
    text.split('\n').forEach((line, i) => ctx.fillText(line, 48, 16 + i*14));
    tex.update();
    const mat = new StandardMaterial('specLblMat' + this._meshes.length, this.scene);
    mat.emissiveTexture = tex; mat.disableLighting = true; mat.alpha = 0.8;
    plane.material = mat; plane.isPickable = false;
    this._meshes.push(plane);
  }

  _buildInfoPanel() {
    const spec = SPECTRA[this._activeEl];
    const infoEl = document.createElement('div');
    infoEl.style.cssText = `
      position:fixed;top:80px;right:20px;background:rgba(10,20,40,0.88);
      border:1px solid rgba(127,255,127,0.3);border-radius:12px;padding:14px 18px;
      z-index:1500;pointer-events:none;font-size:0.78rem;color:#e8f4ff;
      backdrop-filter:blur(8px);min-width:200px;
    `;
    infoEl.innerHTML = `
      <div style="color:#7fff7f;font-weight:700;margin-bottom:8px;">🔬 ${spec.name}</div>
      ${spec.emission.map(l => `<div>${l.label} — ${l.nm.toFixed(1)} nm</div>`).join('')}
      <div style="margin-top:8px;font-size:0.72rem;color:#7ba3cc;">Each line = electron dropping to lower shell<br>E = hf = hc/λ</div>
    `;
    document.body.appendChild(infoEl);
    this._meshes.push({ dispose: () => infoEl.remove() });
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 22px;';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;';
    Object.entries(SPECTRA).forEach(([key, spec]) => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn chem-topic' + (key===this._activeEl?' active':'');
      btn.textContent = spec.name; btn.style.fontSize = '0.72rem';
      btn.onclick = () => {
        this._activeEl = key;
        row.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        this._build();
      };
      row.appendChild(btn);
    });
    wrap.appendChild(row);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  update(dt) {
    this._t += dt * 0.001;
    // Pulse the light source
    if (this._lightSourceMesh?.material) {
      const spec = SPECTRA[this._activeEl];
      const pulse = 0.4 + 0.1 * Math.sin(this._t * 6);
      this._lightSourceMesh.material.emissiveColor = spec.color.scale(pulse);
    }
  }
}
