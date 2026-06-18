// NeuronSimulator.js — Action potential propagation through neuron network
import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Vector3,
  DynamicTexture, Mesh, GlowLayer
} from '@babylonjs/core';

const LAYER_CONFIG = [4, 5, 6, 5]; // neurons per layer
const LAYER_X = [-6, -2, 2, 6];

const STATE_COLORS = {
  rest:       new Color3(0.1, 0.2, 0.8),
  firing:     new Color3(1.0, 0.95, 0.4),
  refractory: new Color3(0.5, 0.1, 0.1),
};

export class NeuronSimulator {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._active = false;
    this._ui = null;
    this._infoEl = null;
    this._tooltipEl = null;
    this._glowLayer = null;
    this._meshes = [];
    this._neurons = [];         // { mesh, mat, state, voltage, stateTimer, layer, index, connections }
    this._synapses = [];        // { mesh, from, to }
    this._flashMeshes = [];     // synapse flash animations
    this._graphCanvas = null;
    this._graphCtx = null;
    this._voltageHistory = [];
    this._autoFireTimer = 0;
    this._autoFireInterval = 3000;
    this._t = 0;
  }

  show() {
    this._active = true;
    this._buildNetwork();
    this._buildUI();
    this._buildInfoPanel();
    this._startAutoFire();
  }

  hide() {
    this._active = false;
    if (this._autoFireHandle) {
      clearInterval(this._autoFireHandle);
      this._autoFireHandle = null;
    }
    this._glowLayer?.dispose();
    this._glowLayer = null;
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._neurons = [];
    this._synapses = [];
    this._flashMeshes = [];
    this._ui?.remove();
    this._ui = null;
    this._infoEl?.remove();
    this._infoEl = null;
    this._tooltipEl?.remove();
    this._tooltipEl = null;
  }

  _buildNetwork() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._neurons = [];
    this._synapses = [];

    this._glowLayer?.dispose();
    this._glowLayer = new GlowLayer('neuronGlow', this.scene);
    this._glowLayer.intensity = 0.8;

    let globalIndex = 0;
    // Create neurons
    LAYER_CONFIG.forEach((count, layerIdx) => {
      const x = LAYER_X[layerIdx];
      const totalH = (count - 1) * 1.5;
      for (let j = 0; j < count; j++) {
        const y = -totalH / 2 + j * 1.5;
        const sphere = MeshBuilder.CreateSphere(`neuron_${globalIndex}`, {
          diameter: 0.5, segments: 12
        }, this.scene);
        sphere.position.set(x, y, 0);
        const mat = new PBRMaterial(`neuronMat_${globalIndex}`, this.scene);
        mat.albedoColor = STATE_COLORS.rest.clone();
        mat.emissiveColor = STATE_COLORS.rest.scale(0.3);
        mat.metallic = 0.1; mat.roughness = 0.5;
        sphere.material = mat;
        sphere.isPickable = true;

        // Hover tooltip
        const ni = globalIndex;
        sphere.actionManager = null;
        sphere.onPointerOverObservable = sphere.onPointerOverObservable || null;

        const neuron = {
          mesh: sphere,
          mat,
          state: 'rest',
          voltage: -70,
          stateTimer: 0,
          layer: layerIdx,
          layerIndex: j,
          globalIndex: ni,
          connections: [],  // downstream neuron global indices
          pendingSignals: [], // { timer, fromNeuron }
        };
        this._neurons.push(neuron);
        this._meshes.push(sphere);
        globalIndex++;
      }
    });

    // Create synapses (forward connections between adjacent layers)
    let layerStart = [0, 4, 9, 15]; // cumulative starts
    for (let l = 0; l < LAYER_CONFIG.length - 1; l++) {
      const fromCount = LAYER_CONFIG[l];
      const toCount = LAYER_CONFIG[l + 1];
      const fStart = layerStart[l];
      const tStart = layerStart[l + 1];

      for (let f = 0; f < fromCount; f++) {
        const fromNeuron = this._neurons[fStart + f];
        // Connect to ~2 neurons in next layer
        const connCount = 2;
        for (let c = 0; c < connCount; c++) {
          const toIdx = tStart + Math.floor(
            (f / fromCount + c * 0.5) * toCount
          ) % toCount;
          const toNeuron = this._neurons[toIdx];
          fromNeuron.connections.push(toIdx);

          // Draw synapse cylinder
          const fromPos = fromNeuron.mesh.position;
          const toPos = toNeuron.mesh.position;
          const diff = toPos.subtract(fromPos);
          const len = diff.length();
          const mid = fromPos.add(diff.scale(0.5));

          const cyl = MeshBuilder.CreateCylinder(`syn_${fStart + f}_${toIdx}`, {
            height: len, diameter: 0.06, tessellation: 6
          }, this.scene);
          cyl.position.copyFrom(mid);

          // Orient cylinder along the direction
          const dir = diff.normalize();
          const up = new Vector3(0, 1, 0);
          const axis = Vector3.Cross(up, dir).normalize();
          const angle = Math.acos(Vector3.Dot(up, dir));
          if (axis.length() > 0.001) {
            cyl.rotationQuaternion = null;
            cyl.rotation = Vector3.Zero();
            const quaternion = Vector3.Cross(up, dir);
            cyl.rotationQuaternion = null;
            // Use rotation manually
            cyl.lookAt(toPos);
            cyl.rotation.x += Math.PI / 2;
          }

          const synMat = new StandardMaterial(`synMat_${this._synapses.length}`, this.scene);
          synMat.emissiveColor = new Color3(0.1, 0.15, 0.4);
          synMat.alpha = 0.5;
          cyl.material = synMat;
          cyl.isPickable = false;
          this._meshes.push(cyl);
          this._synapses.push({ mesh: cyl, mat: synMat, from: fStart + f, to: toIdx });
        }
      }
    }

    // Add hover interaction for tooltips
    this._neurons.forEach((n) => {
      n.mesh.actionManager = null;
      n.mesh._onPointerOver = () => this._showTooltip(n);
      n.mesh._onPointerOut = () => this._hideTooltip();
    });

    // Register pointer move for tooltip positioning
    this.scene.onPointerObservable?.add((evt) => {
      if (evt.type === 4) { // POINTERMOVE
        const pick = this.scene.pick(
          this.scene.pointerX, this.scene.pointerY,
          m => m.name && m.name.startsWith('neuron_')
        );
        if (pick?.hit && pick.pickedMesh) {
          const idx = parseInt(pick.pickedMesh.name.split('_')[1]);
          if (!isNaN(idx) && this._neurons[idx]) {
            this._showTooltip(this._neurons[idx]);
          } else {
            this._hideTooltip();
          }
        } else {
          this._hideTooltip();
        }
      }
    });
  }

  _fireNeuron(neuron) {
    if (neuron.state !== 'rest') return;
    neuron.state = 'firing';
    neuron.voltage = 40;
    neuron.stateTimer = 0;
    neuron.mat.albedoColor = STATE_COLORS.firing.clone();
    neuron.mat.emissiveColor = STATE_COLORS.firing.scale(0.8);
    this._glowLayer.addIncludedOnlyMesh(neuron.mesh);
    this._voltageHistory.push({ v: 40, ni: neuron.globalIndex });

    // Schedule propagation to downstream neurons
    neuron.connections.forEach(toIdx => {
      if (Math.random() < 0.5) return; // 50% synaptic transmission
      const target = this._neurons[toIdx];
      target.pendingSignals.push({ timer: 0, delay: 80 + Math.random() * 20 });
      // Flash the synapse
      this._flashSynapse(neuron.globalIndex, toIdx);
    });
  }

  _flashSynapse(fromIdx, toIdx) {
    const syn = this._synapses.find(s => s.from === fromIdx && s.to === toIdx);
    if (!syn) return;
    // Briefly brighten the synapse
    syn.mat.emissiveColor = new Color3(0.9, 0.8, 0.2);
    syn.mat.alpha = 1.0;
    setTimeout(() => {
      if (syn.mat) {
        syn.mat.emissiveColor = new Color3(0.1, 0.15, 0.4);
        syn.mat.alpha = 0.5;
      }
    }, 150);
  }

  _startAutoFire() {
    this._autoFireHandle = setInterval(() => {
      if (!this._active) return;
      const layer0 = this._neurons.filter(n => n.layer === 0 && n.state === 'rest');
      if (layer0.length > 0) {
        this._fireNeuron(layer0[Math.floor(Math.random() * layer0.length)]);
      }
    }, this._autoFireInterval);
  }

  _showTooltip(neuron) {
    if (!this._tooltipEl) {
      this._tooltipEl = document.createElement('div');
      this._tooltipEl.style.cssText = [
        'position:fixed;background:rgba(10,20,40,0.92);',
        'border:1px solid rgba(0,212,255,0.3);border-radius:8px;',
        'padding:8px 12px;z-index:3000;pointer-events:none;',
        'font-size:0.72rem;color:#e8f4ff;font-family:monospace;'
      ].join('');
      document.body.appendChild(this._tooltipEl);
    }
    this._tooltipEl.style.left = (this.scene.pointerX + 14) + 'px';
    this._tooltipEl.style.top = (this.scene.pointerY - 10) + 'px';
    this._tooltipEl.style.display = 'block';
    this._tooltipEl.innerHTML = `
      <div style="color:#00d4ff;">Neuron #${neuron.globalIndex}</div>
      <div>Layer: ${neuron.layer + 1} / Node: ${neuron.layerIndex + 1}</div>
      <div style="color:${neuron.state === 'firing' ? '#ffd700' : neuron.state === 'refractory' ? '#ff8888' : '#88aaff'};">
        State: ${neuron.state}
      </div>
      <div>V<sub>m</sub>: ${neuron.voltage.toFixed(0)} mV</div>
    `;
  }

  _hideTooltip() {
    if (this._tooltipEl) this._tooltipEl.style.display = 'none';
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 22px;min-width:340px;';

    // Membrane potential mini-graph
    const graphWrap = document.createElement('div');
    graphWrap.style.cssText = 'display:flex;align-items:center;gap:8px;';
    const graphLabel = document.createElement('span');
    graphLabel.style.cssText = 'font-size:0.7rem;color:#7ba3cc;white-space:nowrap;';
    graphLabel.textContent = 'Neuron 0 Vm:';
    const canvas = document.createElement('canvas');
    canvas.width = 120; canvas.height = 40;
    canvas.style.cssText = 'border:1px solid rgba(0,212,255,0.3);border-radius:4px;background:rgba(0,0,20,0.8);';
    this._graphCanvas = canvas;
    this._graphCtx = canvas.getContext('2d');
    graphWrap.append(graphLabel, canvas);

    // Buttons row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;';

    const stimBtn = document.createElement('button');
    stimBtn.className = 'topic-btn';
    stimBtn.textContent = 'Stimulate';
    stimBtn.style.cssText = 'font-size:0.78rem;border-color:rgba(255,200,50,0.6);color:#ffcc44;';
    stimBtn.addEventListener('click', () => {
      const layer0 = this._neurons.filter(n => n.layer === 0);
      if (layer0.length > 0) {
        this._fireNeuron(layer0[Math.floor(Math.random() * layer0.length)]);
      }
    });

    const resetBtn = document.createElement('button');
    resetBtn.className = 'topic-btn';
    resetBtn.textContent = 'Reset';
    resetBtn.style.cssText = 'font-size:0.78rem;';
    resetBtn.addEventListener('click', () => {
      this._neurons.forEach(n => {
        n.state = 'rest';
        n.voltage = -70;
        n.stateTimer = 0;
        n.pendingSignals = [];
        n.mat.albedoColor = STATE_COLORS.rest.clone();
        n.mat.emissiveColor = STATE_COLORS.rest.scale(0.3);
        this._glowLayer.removeIncludedOnlyMesh(n.mesh);
      });
      this._voltageHistory = [];
    });

    btnRow.append(stimBtn, resetBtn);

    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;gap:12px;justify-content:center;font-size:0.68rem;';
    [
      { color: '#2244cc', label: 'Rest (-70mV)' },
      { color: '#ffd700', label: 'Firing (+40mV)' },
      { color: '#aa2222', label: 'Refractory (-90mV)' },
    ].forEach(({ color, label }) => {
      const item = document.createElement('span');
      item.style.cssText = `color:${color};`;
      item.textContent = label;
      legend.appendChild(item);
    });

    wrap.append(graphWrap, btnRow, legend);
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
      'font-family:monospace;min-width:200px;'
    ].join('');
    this._infoEl = el;
    document.body.appendChild(el);
    this._updateInfoPanel();
  }

  _updateInfoPanel() {
    if (!this._infoEl) return;
    const firing = this._neurons.filter(n => n.state === 'firing').length;
    const refractory = this._neurons.filter(n => n.state === 'refractory').length;
    this._infoEl.innerHTML = `
      <div style="color:#00d4ff;font-weight:700;margin-bottom:8px;">Neuron Network</div>
      <div>Neurons: 20 (4 layers)</div>
      <div style="color:#ffd700;">Firing: ${firing}</div>
      <div style="color:#ff8888;">Refractory: ${refractory}</div>
      <div style="color:#6688ff;">At rest: ${20 - firing - refractory}</div>
      <div style="margin-top:8px;color:#7ba3cc;font-size:0.7rem;">
        Propagation delay: ~80ms<br>
        Refractory period: 200ms<br>
        Synaptic success: 50%
      </div>
    `;
  }

  _drawGraph() {
    if (!this._graphCtx || !this._graphCanvas) return;
    const ctx = this._graphCtx;
    const w = this._graphCanvas.width;
    const h = this._graphCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Plot voltage history for neuron 0
    const neuron0 = this._neurons[0];
    if (!neuron0) return;

    // Keep rolling history
    if (this._voltageHistory.length > 60) {
      this._voltageHistory.shift();
    }

    const history = this._voltageHistory.slice(-60);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const x = (i / 60) * w;
      const vNorm = (history[i].v + 90) / 130; // -90 to +40 range
      const y = h - vNorm * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Zero line (-70mV)
    ctx.strokeStyle = 'rgba(100,100,200,0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    const zeroY = h - ((-70 + 90) / 130) * h;
    ctx.moveTo(0, zeroY);
    ctx.lineTo(w, zeroY);
    ctx.stroke();
  }

  update(dt) {
    if (!this._active) return;
    this._t += dt;

    // Update neurons
    this._neurons.forEach(n => {
      if (n.state === 'firing') {
        n.stateTimer += dt;
        n.voltage = 40 - (n.stateTimer / 80) * 130; // fast downstroke
        if (n.stateTimer >= 80) {
          n.state = 'refractory';
          n.stateTimer = 0;
          n.voltage = -90;
          n.mat.albedoColor = STATE_COLORS.refractory.clone();
          n.mat.emissiveColor = STATE_COLORS.refractory.scale(0.3);
          this._glowLayer.removeIncludedOnlyMesh(n.mesh);
        }
      } else if (n.state === 'refractory') {
        n.stateTimer += dt;
        n.voltage = -90 + (n.stateTimer / 200) * 20; // repolarize to -70
        if (n.stateTimer >= 200) {
          n.state = 'rest';
          n.voltage = -70;
          n.stateTimer = 0;
          n.mat.albedoColor = STATE_COLORS.rest.clone();
          n.mat.emissiveColor = STATE_COLORS.rest.scale(0.3);
        }
      }

      // Check pending signals
      n.pendingSignals = n.pendingSignals.filter(sig => {
        sig.timer += dt;
        if (sig.timer >= sig.delay) {
          this._fireNeuron(n);
          return false;
        }
        return true;
      });
    });

    // Track neuron 0 voltage
    this._voltageHistory.push({ v: this._neurons[0]?.voltage ?? -70 });

    // Update graph and info every ~4 frames
    if (Math.floor(this._t / 60) !== Math.floor((this._t - dt) / 60)) {
      this._drawGraph();
      this._updateInfoPanel();
    }
  }
}
