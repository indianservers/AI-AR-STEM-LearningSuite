export class HUD {
  constructor(gestureEngine, onBack, onHome) {
    this._gestureEngine = gestureEngine;
    this._backBtn = document.getElementById('back-btn');
    this._homeBtn = document.getElementById('home-btn');
    this._hintEl = document.getElementById('gesture-hint');
    this._hintTimer = null;

    this._backBtn.addEventListener('click', onBack);
    this._homeBtn.addEventListener('click', onHome);

    gestureEngine.onChange((gesture) => {
      this._showHint(gesture);
    });
  }

  showBackHome(showBack = true, showHome = true) {
    this._backBtn.classList.toggle('hidden', !showBack);
    this._homeBtn.classList.toggle('hidden', !showHome);
  }

  _showHint(gesture) {
    const labels = {
      pinch: '🤏 Nice grab',
      open_palm: '✋ Released',
      point: '☝ Target locked',
      fist: '✊ Back to base',
      two_hand_spread: '🤲 Scaling space',
      two_hand_rotate: '👏 Spin mode',
      swipe_left: '← Swipe left',
      swipe_right: '→ Swipe right',
    };
    const label = labels[gesture];
    if (!label || !this._hintEl) return;
    this._hintEl.textContent = label;
    this._hintEl.classList.add('visible');
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => {
      this._hintEl.classList.remove('visible');
    }, 1600);
  }

  showMessage(text, duration = 2000) {
    if (!this._hintEl) return;
    this._hintEl.textContent = text;
    this._hintEl.classList.add('visible');
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => {
      this._hintEl.classList.remove('visible');
    }, duration);
  }
}
