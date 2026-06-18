export class PressurePinch {
  constructor(scene, gestureEngine) {
    this._scene = scene;
    this._ge = gestureEngine;
    this._active = false;

    this._depth = [0, 0]; // left, right
    this._activeSlider = null;

    this._domEl = null;
    this._canvas2d = null;
    this._ctx = null;
    this._depthLabel = null;
  }

  activate(targetElement) {
    if (this._active) return;
    this._active = true;
    if (targetElement) this._activeSlider = targetElement;
    this._buildDOM();
  }

  deactivate() {
    if (!this._active) return;
    this._active = false;
    if (this._domEl) { this._domEl.remove(); this._domEl = null; }
    this._canvas2d = null;
    this._ctx = null;
  }

  setActiveSlider(inputEl) {
    this._activeSlider = inputEl;
  }

  getDepth(hand = 0) {
    return this._depth[hand] || 0;
  }

  update(camera, canvas, dt) {
    if (!this._active) return;

    // Read pinch strengths from gesture engine
    if (this._ge) {
      if (this._ge.pinchStrength) {
        this._depth[0] = Math.max(0, Math.min(1, this._ge.pinchStrength[0] || 0));
        this._depth[1] = Math.max(0, Math.min(1, this._ge.pinchStrength[1] || 0));
      } else if (this._ge.gesture) {
        // Fallback: binary pinch detection
        const g0 = Array.isArray(this._ge.gesture) ? this._ge.gesture[0] : this._ge.gesture;
        const g1 = Array.isArray(this._ge.gesture) ? this._ge.gesture[1] : null;
        this._depth[0] = g0 === 'PINCH' ? 1.0 : 0.0;
        this._depth[1] = g1 === 'PINCH' ? 1.0 : 0.0;
      }
    }

    // Update active slider
    if (this._activeSlider && this._depth[0] > 0.05) {
      const val = this._depth[0] * 100;
      const min = parseFloat(this._activeSlider.min) || 0;
      const max = parseFloat(this._activeSlider.max) || 100;
      this._activeSlider.value = min + (val / 100) * (max - min);
      this._activeSlider.dispatchEvent(new Event('input', { bubbles: true }));
    }

    this._drawMeter();
    this._updateLabel();
  }

  _drawMeter() {
    if (!this._ctx || !this._canvas2d) return;
    const ctx = this._ctx;
    const W = this._canvas2d.width;
    const H = this._canvas2d.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = 25;

    ctx.clearRect(0, 0, W, H);

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI * 1.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Fill arc based on depth[0]
    const pct0 = this._depth[0];
    const endAngle = -Math.PI / 2 + pct0 * Math.PI * 2;

    if (pct0 > 0.01) {
      const grad = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
      grad.addColorStop(0, 'rgba(0,212,255,0.9)');
      grad.addColorStop(1, 'rgba(255,140,0,0.9)');
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI / 2, endAngle);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Right hand inner arc (smaller)
    const pct1 = this._depth[1];
    if (pct1 > 0.01) {
      const endAngle1 = -Math.PI / 2 + pct1 * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R - 8, -Math.PI / 2, endAngle1);
      ctx.strokeStyle = 'rgba(180,100,255,0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Center text
    ctx.fillStyle = '#e8f4ff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(pct0 * 100)}%`, cx, cy);
  }

  _updateLabel() {
    if (!this._depthLabel) return;
    this._depthLabel.textContent = `Pinch Depth: ${Math.round(this._depth[0] * 100)}%`;
  }

  _buildDOM() {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; bottom:20px; left:20px;
      background:rgba(10,20,40,0.92); border:1px solid rgba(0,212,255,0.3);
      border-radius:12px; color:#e8f4ff; padding:10px; z-index:2000;
      font-family:monospace; font-size:12px; display:flex;
      flex-direction:column; align-items:center; gap:6px; width:100px;
    `;
    el.innerHTML = `
      <div style="font-size:11px;font-weight:bold;color:#00d4ff">Pinch Depth</div>
      <canvas id="ppCanvas" width="60" height="60"></canvas>
      <div id="ppDepthLabel" style="font-size:10px;color:#aaccff;text-align:center">
        Pinch Depth: 0%
      </div>
    `;
    document.body.appendChild(el);
    this._domEl = el;
    this._canvas2d = el.querySelector('#ppCanvas');
    this._ctx = this._canvas2d.getContext('2d');
    this._depthLabel = el.querySelector('#ppDepthLabel');
  }
}
