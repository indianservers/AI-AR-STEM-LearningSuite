const RECORD_INTERVAL = 30; // ms
const DTW_THRESHOLD = 0.3;
const EXPERT_KEY = 'cosmiclearn_expert';

// --- Reference shape generators ---
function circlePoints(n = 16) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: Math.cos(a), y: Math.sin(a) };
  });
}

function starPoints() {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 1.0 : 0.4;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}

function lightningPoints() {
  // Z-shape
  return [
    { x: -1, y:  1 }, { x:  1, y:  1 },
    { x: -1, y: -1 }, { x:  1, y: -1 },
  ];
}

function infinityPoints(n = 24) {
  // Lemniscate: x = cos(t)/(1+sin²(t)), y = sin(t)cos(t)/(1+sin²(t))
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const d = 1 + Math.sin(t) ** 2;
    return { x: Math.cos(t) / d, y: (Math.sin(t) * Math.cos(t)) / d };
  });
}

const REFERENCE_SHAPES = {
  circle:    circlePoints(),
  star:      starPoints(),
  lightning: lightningPoints(),
  infinity:  infinityPoints(),
};

// --- Path normalization ---
function normalizePath(pts) {
  if (pts.length < 2) return pts;
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p.x; cy += p.y; }
  cx /= pts.length; cy /= pts.length;
  const centered = pts.map(p => ({ x: p.x - cx, y: p.y - cy }));
  let maxD = 0;
  for (const p of centered) maxD = Math.max(maxD, Math.sqrt(p.x ** 2 + p.y ** 2));
  if (maxD < 1e-6) return centered;
  return centered.map(p => ({ x: p.x / maxD, y: p.y / maxD }));
}

function resamplePath(pts, n) {
  if (pts.length < 2) return pts;
  const totalLen = pts.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const dx = p.x - pts[i-1].x, dy = p.y - pts[i-1].y;
    return acc + Math.sqrt(dx*dx + dy*dy);
  }, 0);
  const segLen = totalLen / (n - 1);
  const result = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length && result.length < n; i++) {
    const dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y;
    const d = Math.sqrt(dx*dx + dy*dy);
    while (acc + d >= segLen * result.length && result.length < n) {
      const t = (segLen * result.length - acc) / d;
      result.push({ x: pts[i-1].x + t*dx, y: pts[i-1].y + t*dy });
    }
    acc += d;
  }
  while (result.length < n) result.push(pts[pts.length - 1]);
  return result;
}

// --- DTW distance ---
function dtwDist(a, b) {
  const n = a.length, m = b.length;
  const dtw = Array.from({ length: n }, () => new Float32Array(m).fill(Infinity));
  dtw[0][0] = Math.sqrt((a[0].x - b[0].x)**2 + (a[0].y - b[0].y)**2);
  for (let i = 1; i < n; i++) {
    dtw[i][0] = dtw[i-1][0] + Math.sqrt((a[i].x - b[0].x)**2 + (a[i].y - b[0].y)**2);
  }
  for (let j = 1; j < m; j++) {
    dtw[0][j] = dtw[0][j-1] + Math.sqrt((a[0].x - b[j].x)**2 + (a[0].y - b[j].y)**2);
  }
  for (let i = 1; i < n; i++) {
    for (let j = 1; j < m; j++) {
      const cost = Math.sqrt((a[i].x - b[j].x)**2 + (a[i].y - b[j].y)**2);
      dtw[i][j] = cost + Math.min(dtw[i-1][j], dtw[i][j-1], dtw[i-1][j-1]);
    }
  }
  return dtw[n-1][m-1] / (n + m);
}

export class TwoFingerSignature {
  constructor(scene, gestureEngine) {
    this._scene = scene;
    this._ge = gestureEngine;
    this._active = false;

    this._recording = false;
    this._path = [];
    this._lastRecordTime = 0;

    this._overlayCanvas = null;
    this._overlayCtx = null;
    this._hintEl = null;
    this._domEl = null;

    this._matchTimeout = null;
  }

  activate() {
    if (this._active) return;
    this._active = true;
    this._buildOverlay();
    this._buildHint();
  }

  deactivate() {
    if (!this._active) return;
    this._active = false;
    this._recording = false;
    this._path = [];
    if (this._overlayCanvas) { this._overlayCanvas.remove(); this._overlayCanvas = null; }
    if (this._hintEl) { this._hintEl.remove(); this._hintEl = null; }
    if (this._domEl) { this._domEl.remove(); this._domEl = null; }
    if (this._matchTimeout) { clearTimeout(this._matchTimeout); this._matchTimeout = null; }
  }

  update(camera, canvas, dt) {
    if (!this._active) return;

    const now = Date.now();

    let indexFinger = null;
    let middleFinger = null;
    let gesture = null;
    let lm = null;

    if (this._ge) {
      gesture = this._ge.gesture ? (Array.isArray(this._ge.gesture) ? this._ge.gesture[0] : this._ge.gesture) : null;
      lm = this._ge.landmarks ? (Array.isArray(this._ge.landmarks[0]) ? this._ge.landmarks[0] : this._ge.landmarks) : null;
    }

    const twoFingerActive = gesture === 'POINT' || gesture === 'PEACE' || gesture === 'NONE';

    if (lm && lm[8] && lm[12]) {
      indexFinger  = { x: lm[8].x,  y: lm[8].y  };
      middleFinger = { x: lm[12].x, y: lm[12].y };
    }

    if (twoFingerActive && indexFinger && middleFinger) {
      const midX = (indexFinger.x + middleFinger.x) / 2;
      const midY = (indexFinger.y + middleFinger.y) / 2;

      if (!this._recording) {
        this._recording = true;
        this._path = [];
        this._lastRecordTime = now;
      }

      if (now - this._lastRecordTime >= RECORD_INTERVAL) {
        this._path.push({ x: midX, y: midY });
        this._lastRecordTime = now;
      }

      this._drawPath();
    } else {
      if (this._recording && this._path.length > 5) {
        this._tryMatch();
      }
      this._recording = false;
      if (!this._recording && this._path.length > 0) {
        this._path = [];
        this._clearCanvas();
      }
    }
  }

  _tryMatch() {
    if (this._path.length < 5) return;

    const normalized = normalizePath(this._path);
    const resampled = resamplePath(normalized, 32);

    let bestShape = null;
    let bestDist = Infinity;

    for (const [shapeName, ref] of Object.entries(REFERENCE_SHAPES)) {
      const refNorm = normalizePath(ref);
      const refResampled = resamplePath(refNorm, 32);
      const dist = dtwDist(resampled, refResampled);
      if (dist < bestDist) {
        bestDist = dist;
        bestShape = shapeName;
      }
    }

    if (bestDist < DTW_THRESHOLD) {
      this._onMatch(bestShape);
    }
  }

  _onMatch(shapeName) {
    document.dispatchEvent(new CustomEvent('cosmiclearn:signature', {
      detail: { shape: shapeName }
    }));

    try {
      localStorage.setItem(EXPERT_KEY, shapeName);
    } catch (e) { /* ignore */ }

    this._showUnlockOverlay(shapeName);
  }

  _showUnlockOverlay(shapeName) {
    const existing = document.getElementById('tfsUnlockOverlay');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'tfsUnlockOverlay';
    el.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      background:rgba(10,20,40,0.95); border:2px solid rgba(0,255,150,0.6);
      border-radius:16px; color:#e8f4ff; padding:30px 40px; z-index:3000;
      font-family:monospace; text-align:center;
      box-shadow: 0 0 40px rgba(0,255,150,0.3);
    `;
    el.innerHTML = `
      <div style="font-size:32px;margin-bottom:10px">
        ${shapeName === 'circle' ? '⭕' : shapeName === 'star' ? '⭐' : shapeName === 'lightning' ? '⚡' : '∞'}
      </div>
      <div style="font-size:20px;font-weight:bold;color:#00ffaa;margin-bottom:8px">
        Expert Mode Unlocked!
      </div>
      <div style="font-size:14px;color:#aaddff;text-transform:capitalize">
        Shape: ${shapeName}
      </div>
    `;
    document.body.appendChild(el);

    setTimeout(() => { if (el.parentNode) el.remove(); }, 4000);
  }

  _drawPath() {
    if (!this._overlayCtx || !this._overlayCanvas || this._path.length < 2) return;
    const ctx = this._overlayCtx;
    const W = this._overlayCanvas.width;
    const H = this._overlayCanvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    ctx.moveTo(this._path[0].x * W, this._path[0].y * H);
    for (let i = 1; i < this._path.length; i++) {
      ctx.lineTo(this._path[i].x * W, this._path[i].y * H);
    }

    const grad = ctx.createLinearGradient(
      this._path[0].x * W, this._path[0].y * H,
      this._path[this._path.length-1].x * W, this._path[this._path.length-1].y * H
    );
    grad.addColorStop(0, 'rgba(0,212,255,0.8)');
    grad.addColorStop(1, 'rgba(255,100,255,0.8)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  _clearCanvas() {
    if (!this._overlayCtx || !this._overlayCanvas) return;
    this._overlayCtx.clearRect(0, 0, this._overlayCanvas.width, this._overlayCanvas.height);
  }

  _buildOverlay() {
    const cvs = document.createElement('canvas');
    cvs.id = 'tfsOverlayCanvas';
    cvs.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      pointer-events:none; z-index:2500;
    `;
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;
    document.body.appendChild(cvs);
    this._overlayCanvas = cvs;
    this._overlayCtx = cvs.getContext('2d');

    const resize = () => {
      if (!this._overlayCanvas) return;
      this._overlayCanvas.width = window.innerWidth;
      this._overlayCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    this._resizeHandler = resize;
  }

  _buildHint() {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; bottom:12px; left:50%; transform:translateX(-50%);
      background:rgba(10,20,40,0.7); border:1px solid rgba(0,212,255,0.2);
      border-radius:20px; color:rgba(200,220,255,0.6); padding:5px 16px;
      z-index:2000; font-family:monospace; font-size:12px;
      pointer-events:none;
    `;
    el.textContent = 'Draw a shape to unlock Expert Mode';
    document.body.appendChild(el);
    this._hintEl = el;
  }
}
