// Feature 6: Draw in Air — fist-open gesture activates 3D freehand line drawing
import { MeshBuilder, Color3, StandardMaterial, Vector3 } from '@babylonjs/core';
import { Gestures } from '../core/GestureEngine.js';

export class AirDrawing {
  constructor(scene, gestureEngine) {
    this.scene = scene;
    this.gestureEngine = gestureEngine;
    this._active = false;
    this._drawing = false;
    this._points = [];
    this._strokes = [];
    this._currentColor = new Color3(0, 0.85, 1);
    this._prevGesture = 'none';
    this._ui = null;
  }

  activate() {
    this._active = true;
    this._buildUI();
  }

  deactivate() {
    this._active = false;
    this._ui?.remove();
    this._ui = null;
    this._drawing = false;
  }

  clearAll() {
    this._strokes.forEach(s => s.dispose());
    this._strokes = [];
    this._points = [];
  }

  update(camera, canvas) {
    if (!this._active) return;
    const gesture = this.gestureEngine.currentGestures[0];
    const palmPos = this.gestureEngine.palmPositions[0];

    // FIST = start drawing, open palm = stop stroke
    if (gesture === Gestures.FIST && palmPos) {
      const worldPos = this.gestureEngine.toWorldPosition(palmPos, camera, canvas, 5);
      if (worldPos) {
        this._drawing = true;
        this._points.push(worldPos.clone());
        if (this._points.length > 2) this._buildStroke();
      }
    } else if (this._drawing && gesture !== Gestures.FIST) {
      this._finalizeStroke();
    }

    this._prevGesture = gesture;
  }

  _buildStroke() {
    // Dispose previous preview stroke
    if (this._previewStroke) { this._previewStroke.dispose(); this._previewStroke = null; }
    if (this._points.length < 2) return;
    const lines = MeshBuilder.CreateLines('airDraw_preview', {
      points: this._points,
      updatable: false,
    }, this.scene);
    lines.color = this._currentColor.clone();
    lines.isPickable = false;
    this._previewStroke = lines;
  }

  _finalizeStroke() {
    if (this._previewStroke) {
      this._strokes.push(this._previewStroke);
      this._previewStroke = null;
    }
    this._points = [];
    this._drawing = false;
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      position:fixed; bottom:160px; right:20px; background:rgba(10,20,40,0.9);
      border:1px solid rgba(0,212,255,0.3); border-radius:14px; padding:14px 16px;
      z-index:2000; pointer-events:all; display:flex; flex-direction:column; gap:10px;
    `;
    wrap.innerHTML = `<div style="color:#00d4ff;font-size:0.78rem;font-weight:700;letter-spacing:0.05em">✏ AIR DRAW</div>
      <div style="color:#7ba3cc;font-size:0.72rem">✊ Fist = draw<br>✋ Palm = stop stroke</div>`;

    const colors = [
      { c: new Color3(0, 0.85, 1),    hex: '#00d4ff' },
      { c: new Color3(1, 0.4, 0.1),   hex: '#ff6621' },
      { c: new Color3(0.5, 1, 0.5),   hex: '#80ff80' },
      { c: new Color3(1, 0.85, 0),    hex: '#ffd900' },
      { c: new Color3(1, 1, 1),       hex: '#ffffff' },
    ];
    const colorRow = document.createElement('div');
    colorRow.style.cssText = 'display:flex;gap:6px;';
    colors.forEach(col => {
      const dot = document.createElement('button');
      dot.style.cssText = `width:18px;height:18px;border-radius:50%;background:${col.hex};border:2px solid transparent;cursor:pointer;`;
      dot.onclick = () => {
        this._currentColor = col.c.clone();
        colorRow.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
        dot.style.borderColor = '#fff';
      };
      colorRow.appendChild(dot);
    });
    colorRow.children[0].style.borderColor = '#fff';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑 Clear All';
    clearBtn.style.cssText = `
      background:rgba(255,50,50,0.15);border:1px solid rgba(255,100,100,0.3);
      border-radius:8px;padding:6px 10px;font-size:0.72rem;color:#ff8888;cursor:pointer;
    `;
    clearBtn.onclick = () => this.clearAll();

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Done';
    closeBtn.style.cssText = `
      background:transparent;border:1px solid rgba(0,212,255,0.3);
      border-radius:8px;padding:6px 10px;font-size:0.72rem;color:#00d4ff;cursor:pointer;
    `;
    closeBtn.onclick = () => this.deactivate();

    wrap.append(colorRow, clearBtn, closeBtn);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }
}
