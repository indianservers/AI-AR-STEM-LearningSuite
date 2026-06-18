import { Vector3 } from '@babylonjs/core';
import { GestureActions } from '../core/GestureActionRegistry.js';

function fmt(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '0.00';
}

function titleCase(text = '') {
  return text
    .replace(/^orb_/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function contextHint(context) {
  if (context === 'home') return 'This is a portal object. Select it to enter a subject space.';
  if (context === 'math') return 'Look for shape, coordinate, scale, and transformation behavior.';
  if (context === 'physics') return 'Look for motion, force, energy, velocity, or field behavior.';
  if (context === 'chem') return 'Look for structure, stability, bonds, orbitals, or reaction behavior.';
  return `Current lab context: ${titleCase(context)}. Inspect values, then try changing one thing.`;
}

export class InspectPanel {
  constructor(interaction, gestureEngine, aiTutor = null) {
    this.interaction = interaction;
    this.gestureEngine = gestureEngine;
    this.aiTutor = aiTutor;
    this._panel = null;
    this._mesh = null;
    this._metadata = {};
    this._capabilities = {};
    this._pinned = [];
    this._compare = null;
    this._raf = null;

    this.interaction.onObjectAction((event) => {
      if (event.actionName === GestureActions.INSPECT) {
        this.show(event.mesh, event.metadata, event.capabilities, event.detail);
      }
    });
  }

  show(mesh, metadata = {}, capabilities = {}, detail = {}) {
    if (!mesh || mesh.isDisposed?.()) return;
    this._mesh = mesh;
    this._metadata = metadata || {};
    this._capabilities = capabilities || {};

    if (!this._panel) this._build();
    this._panel.classList.remove('hidden');
    this._render(detail);
    this._startLiveUpdates();
  }

  hide() {
    this._panel?.classList.add('hidden');
    this._mesh = null;
    this._stopLiveUpdates();
  }

  _build() {
    const panel = document.createElement('aside');
    panel.id = 'inspect-panel';
    panel.innerHTML = `
      <header>
        <div>
          <p class="inspect-kicker">Smart Inspect</p>
          <h2></h2>
        </div>
        <button class="inspect-close" type="button">Close</button>
      </header>
      <div class="inspect-summary"></div>
      <div class="inspect-live"></div>
      <div class="inspect-caps"></div>
      <div class="inspect-actions">
        <button type="button" data-action="explain">Explain</button>
        <button type="button" data-action="pin">Pin Label</button>
        <button type="button" data-action="compare">Compare</button>
      </div>
      <div class="inspect-question"></div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('.inspect-close').addEventListener('click', () => this.hide());
    panel.querySelector('[data-action="explain"]').addEventListener('click', () => this._explain());
    panel.querySelector('[data-action="pin"]').addEventListener('click', () => this._pin());
    panel.querySelector('[data-action="compare"]').addEventListener('click', () => this._compareWithCurrent());
    this._panel = panel;
  }

  _render(detail = {}) {
    if (!this._panel || !this._mesh) return;
    const title = this._metadata.title || this._metadata.name || titleCase(this._mesh.name || 'Object');
    const type = this._metadata.type || this._mesh.getClassName?.() || 'Mesh';
    const context = this.gestureEngine?.actions?.context || 'global';
    const summary = this._metadata.summary || contextHint(context);

    this._panel.querySelector('h2').textContent = title;
    this._panel.querySelector('.inspect-summary').innerHTML = `
      <div class="inspect-type">${type}</div>
      <p>${summary}</p>
      ${detail?.confidence ? `<span class="inspect-confidence">Gesture confidence ${fmt(detail.confidence * 100, 0)}%</span>` : ''}
    `;
    this._renderLive();
    this._renderCapabilities();
    this._renderQuestion();
  }

  _renderLive() {
    if (!this._panel || !this._mesh) return;
    const p = this._mesh.position || { x: 0, y: 0, z: 0 };
    const r = this._mesh.rotation || { x: 0, y: 0, z: 0 };
    const s = this._mesh.scaling || { x: 1, y: 1, z: 1 };
    const vertices = this._mesh.getTotalVertices?.() || 0;

    this._panel.querySelector('.inspect-live').innerHTML = `
      <div><strong>Position</strong><span>${fmt(p.x)}, ${fmt(p.y)}, ${fmt(p.z)}</span></div>
      <div><strong>Rotation</strong><span>${fmt(r.x)}, ${fmt(r.y)}, ${fmt(r.z)}</span></div>
      <div><strong>Scale</strong><span>${fmt(s.x)}, ${fmt(s.y)}, ${fmt(s.z)}</span></div>
      <div><strong>Vertices</strong><span>${vertices}</span></div>
    `;
  }

  _renderCapabilities() {
    if (!this._panel) return;
    const labels = [
      ['canGrab', 'Grab'],
      ['canMove', 'Move'],
      ['canRotate', 'Rotate'],
      ['canScale', 'Scale'],
      ['canThrow', 'Throw'],
      ['canInspect', 'Inspect'],
      ['canShake', 'Shake'],
    ];
    this._panel.querySelector('.inspect-caps').innerHTML = labels
      .map(([key, label]) => `<span class="${this._capabilities[key] ? 'on' : 'off'}">${label}</span>`)
      .join('');
  }

  _renderQuestion() {
    if (!this._panel) return;
    const context = this.gestureEngine?.actions?.context || 'global';
    const prompts = {
      home: 'Try: point-hold this portal, then pinch it to enter.',
      math: 'Question: what changes if you scale or rotate this object?',
      physics: 'Question: does this object store motion, force, or energy?',
      chem: 'Question: what structure or relationship keeps this stable?',
    };
    this._panel.querySelector('.inspect-question').textContent =
      this._metadata.question || prompts[context] || 'Question: what did you notice after changing it?';
  }

  _explain() {
    if (!this._mesh) return;
    const title = this._metadata.title || this._metadata.name || titleCase(this._mesh.name || 'object');
    const context = this.gestureEngine?.actions?.context || 'this lab';
    const text = `Inspecting ${title}. In ${context}, notice its position, rotation, scale, and what gestures it accepts. Try one change, then compare the result.`;
    this.aiTutor?.speak?.(text);
    this._flash(text);
  }

  _pin() {
    if (!this._mesh) return;
    const title = this._metadata.title || this._metadata.name || titleCase(this._mesh.name || 'Object');
    const pin = document.createElement('div');
    pin.className = 'inspect-pin';
    pin.textContent = title;
    document.body.appendChild(pin);
    this._pinned.push({ mesh: this._mesh, el: pin });
    this._flash('Pinned label');
  }

  _compareWithCurrent() {
    if (!this._mesh) return;
    const snapshot = {
      name: this._metadata.title || titleCase(this._mesh.name || 'Object'),
      position: this._mesh.position.clone(),
      scaling: this._mesh.scaling.clone(),
    };
    if (!this._compare) {
      this._compare = snapshot;
      this._flash('Comparison anchor saved. Inspect another object next.');
      return;
    }

    const distance = this._compare.position.subtract(snapshot.position).length();
    const scaleDelta = snapshot.scaling.x - this._compare.scaling.x;
    this._flash(`${snapshot.name} is ${fmt(distance)} units from ${this._compare.name}; scale delta ${fmt(scaleDelta)}.`);
    this._compare = snapshot;
  }

  _flash(text) {
    if (!this._panel) return;
    const q = this._panel.querySelector('.inspect-question');
    q.textContent = text;
    q.classList.add('pulse');
    setTimeout(() => q.classList.remove('pulse'), 650);
  }

  _startLiveUpdates() {
    this._stopLiveUpdates();
    const tick = () => {
      if (!this._mesh || this._mesh.isDisposed?.()) {
        this.hide();
        return;
      }
      this._renderLive();
      this._updatePins();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _stopLiveUpdates() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _updatePins() {
    const camera = this._mesh?.getScene?.().activeCamera;
    const engine = this._mesh?.getScene?.().getEngine?.();
    if (!camera || !engine) return;
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    this._pinned = this._pinned.filter(pin => {
      if (!pin.mesh || pin.mesh.isDisposed?.()) {
        pin.el.remove();
        return false;
      }
      const projected = Vector3.Project(
        pin.mesh.getAbsolutePosition(),
        pin.mesh.getWorldMatrix(),
        pin.mesh.getScene().getTransformMatrix(),
        viewport
      );
      pin.el.style.left = `${projected.x}px`;
      pin.el.style.top = `${projected.y}px`;
      return true;
    });
  }
}
