import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export class HandTracker {
  constructor() {
    this.landmarker = null;
    this.lastVideoTime = -1;
    this.results = null;
    this._video = document.getElementById('webcam');
    this._running = false;
    this._listeners = [];
    this._mode = 'desktop'; // 'desktop' | 'camera'
  }

  async init() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        numHands: 2,
        runningMode: 'VIDEO',
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      return true;
    } catch (err) {
      console.warn('MediaPipe HandLandmarker init failed:', err);
      return false;
    }
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      this._video.srcObject = stream;
      await new Promise(res => { this._video.onloadedmetadata = res; });
      this._video.play();
      this._running = true;
      this._mode = 'camera';
      this._detectLoop();
      return true;
    } catch (err) {
      console.warn('Camera access denied:', err);
      return false;
    }
  }

  _detectLoop() {
    if (!this._running || !this.landmarker) return;

    const now = performance.now();
    if (this._video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this._video.currentTime;
      try {
        this.results = this.landmarker.detectForVideo(this._video, now);
        this._listeners.forEach(fn => fn(this.results));
      } catch (_) {}
    }

    requestAnimationFrame(() => this._detectLoop());
  }

  onResults(fn) { this._listeners.push(fn); }

  stop() {
    this._running = false;
    if (this._video.srcObject) {
      this._video.srcObject.getTracks().forEach(t => t.stop());
      this._video.srcObject = null;
    }
  }

  get isRunning() { return this._running; }
  get mode() { return this._mode; }
}
