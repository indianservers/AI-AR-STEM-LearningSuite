// Feature 13: Fractal Explorer — Mandelbrot set via Babylon.js ShaderMaterial
import { MeshBuilder, ShaderMaterial, Effect, Vector2 } from '@babylonjs/core';

Effect.ShadersStore['mandelbrotVertexShader'] = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main() {
    gl_Position = worldViewProjection * vec4(position, 1.0);
    vUV = uv;
  }
`;

Effect.ShadersStore['mandelbrotFragmentShader'] = `
  precision highp float;
  varying vec2 vUV;
  uniform float zoom;
  uniform vec2 center;
  uniform float maxIter;
  uniform float colorShift;

  vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0 + colorShift, 0.1 + colorShift, 0.2 + colorShift);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 c = (vUV - 0.5) * zoom + center;
    vec2 z = vec2(0.0);
    float i = 0.0;
    for (float j = 0.0; j < 512.0; j++) {
      if (j >= maxIter) break;
      if (dot(z, z) > 4.0) { i = j; break; }
      z = vec2(z.x*z.x - z.y*z.y + c.x, 2.0*z.x*z.y + c.y);
      i = j;
    }
    if (dot(z, z) <= 4.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
      float t = i / maxIter;
      gl_FragColor = vec4(palette(t), 1.0);
    }
  }
`;

Effect.ShadersStore['juliaFragmentShader'] = `
  precision highp float;
  varying vec2 vUV;
  uniform float zoom;
  uniform vec2 center;
  uniform float maxIter;
  uniform float colorShift;
  uniform vec2 juliaC;

  vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c2 = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0 + colorShift, 0.33 + colorShift, 0.67 + colorShift);
    return a + b * cos(6.28318 * (c2 * t + d));
  }

  void main() {
    vec2 z = (vUV - 0.5) * zoom + center;
    float i = 0.0;
    for (float j = 0.0; j < 512.0; j++) {
      if (j >= maxIter) break;
      if (dot(z, z) > 4.0) { i = j; break; }
      z = vec2(z.x*z.x - z.y*z.y + juliaC.x, 2.0*z.x*z.y + juliaC.y);
      i = j;
    }
    if (dot(z, z) <= 4.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
      float t = i / maxIter;
      gl_FragColor = vec4(palette(t), 1.0);
    }
  }
`;

export class FractalExplorer {
  constructor(scene, interaction, environment) {
    this.scene = scene;
    this.interaction = interaction;
    this.env = environment;
    this._meshes = [];
    this._ui = null;
    this._t = 0;
    this._zoom = 3.5;
    this._center = { x: -0.5, y: 0.0 };
    this._maxIter = 128;
    this._colorShift = 0;
    this._mode = 'mandelbrot'; // 'mandelbrot' | 'julia'
    this._juliaC = { x: -0.7, y: 0.27 };
    this._mat = null;
    this._dragging = false;
    this._lastX = 0; this._lastY = 0;
  }

  show() { this._build(); this._buildUI(); }

  hide() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];
    this._mat = null;
    this._ui?.remove(); this._ui = null;
    this._removeMouseHandlers?.();
  }

  _build() {
    this._meshes.forEach(m => m.dispose());
    this._meshes = [];

    const plane = MeshBuilder.CreatePlane('fractalPlane', {width:14, height:14}, this.scene);
    plane.position.z = 2;
    plane.rotation.y = 0;
    plane.isPickable = false;

    const shaderName = this._mode === 'mandelbrot' ? 'mandelbrot' : 'julia';
    const mat = new ShaderMaterial('fractalMat', this.scene, { vertex: 'mandelbrot', fragment: shaderName }, {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'zoom', 'center', 'maxIter', 'colorShift', 'juliaC'],
    });
    mat.setFloat('zoom', this._zoom);
    mat.setVector2('center', new Vector2(this._center.x, this._center.y));
    mat.setFloat('maxIter', this._maxIter);
    mat.setFloat('colorShift', this._colorShift);
    mat.setVector2('juliaC', new Vector2(this._juliaC.x, this._juliaC.y));
    plane.material = mat;
    this._mat = mat;
    this._plane = plane;
    this._meshes.push(plane);

    // Mouse/pointer handlers for pan + zoom
    const canvas = this.scene.getEngine().getRenderingCanvas();

    const onDown = (e) => {
      this._dragging = true;
      this._lastX = e.clientX; this._lastY = e.clientY;
    };
    const onMove = (e) => {
      if (!this._dragging) return;
      const dx = (e.clientX - this._lastX) / canvas.clientWidth;
      const dy = (e.clientY - this._lastY) / canvas.clientHeight;
      this._center.x -= dx * this._zoom;
      this._center.y += dy * this._zoom;
      this._lastX = e.clientX; this._lastY = e.clientY;
      this._mat?.setVector2('center', new Vector2(this._center.x, this._center.y));
    };
    const onUp = () => { this._dragging = false; };
    const onWheel = (e) => {
      this._zoom *= e.deltaY > 0 ? 1.12 : 0.9;
      this._zoom = Math.max(0.00001, Math.min(8, this._zoom));
      this._mat?.setFloat('zoom', this._zoom);
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: true });

    this._removeMouseHandlers = () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }

  _buildUI() {
    this._ui?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'param-slider-wrap';
    wrap.style.cssText = 'bottom:110px;flex-direction:column;gap:10px;padding:14px 22px;';

    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:8px;';
    ['mandelbrot', 'julia'].forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn' + (m === this._mode ? ' active' : '');
      btn.textContent = m === 'mandelbrot' ? '🌌 Mandelbrot' : '🌀 Julia';
      btn.style.fontSize = '0.78rem';
      btn.onclick = () => {
        this._mode = m;
        modeRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._zoom = 3.5; this._center = {x:-0.5,y:0};
        this._meshes.forEach(me => me.dispose()); this._meshes = [];
        this._removeMouseHandlers?.();
        this._build();
      };
      modeRow.appendChild(btn);
    });

    const iterRow = document.createElement('div');
    iterRow.style.cssText = 'display:flex;align-items:center;gap:10px;';
    const iterLabel = document.createElement('label');
    iterLabel.style.cssText = 'font-size:0.78rem;color:#7ba3cc;white-space:nowrap;';
    iterLabel.textContent = 'Max Iter';
    const iterSlider = document.createElement('input');
    iterSlider.type = 'range'; iterSlider.min = 32; iterSlider.max = 512; iterSlider.value = this._maxIter;
    iterSlider.style.width = '120px'; iterSlider.style.accentColor = '#00d4ff';
    const iterVal = document.createElement('span');
    iterVal.style.cssText = 'font-size:0.78rem;color:#00d4ff;min-width:35px;font-family:monospace;';
    iterVal.textContent = this._maxIter;
    iterSlider.oninput = () => {
      this._maxIter = +iterSlider.value;
      iterVal.textContent = this._maxIter;
      this._mat?.setFloat('maxIter', this._maxIter);
    };
    iterRow.append(iterLabel, iterSlider, iterVal);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'topic-btn';
    resetBtn.textContent = '↺ Reset View';
    resetBtn.style.fontSize = '0.75rem';
    resetBtn.onclick = () => {
      this._zoom = 3.5; this._center = {x:-0.5,y:0};
      this._mat?.setFloat('zoom', this._zoom);
      this._mat?.setVector2('center', new Vector2(this._center.x, this._center.y));
    };

    const infoEl = document.createElement('div');
    infoEl.style.cssText = 'font-size:0.72rem;color:#7ba3cc;text-align:center;';
    infoEl.textContent = '🖱 Drag to pan • Scroll to zoom';

    wrap.append(modeRow, iterRow, resetBtn, infoEl);
    document.getElementById('hud-layer')?.appendChild(wrap);
    this._ui = wrap;
  }

  update(dt) {
    this._t += dt * 0.001;
    // Slowly cycle colors
    this._colorShift = (this._t * 0.05) % 1.0;
    this._mat?.setFloat('colorShift', this._colorShift);
    // Animate Julia C parameter slowly
    if (this._mode === 'julia') {
      this._juliaC.x = -0.7 + Math.sin(this._t * 0.2) * 0.1;
      this._juliaC.y = 0.27 + Math.cos(this._t * 0.15) * 0.05;
      this._mat?.setVector2('juliaC', new Vector2(this._juliaC.x, this._juliaC.y));
    }
  }
}
