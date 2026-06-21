import { soundFX } from '../features/SoundFX.js';

export class HUD {
  constructor(gestureEngine, onBack, onHome) {
    this._gestureEngine = gestureEngine;
    this._backBtn = document.getElementById('back-btn');
    this._homeBtn = document.getElementById('home-btn');
    this._hintEl = document.getElementById('gesture-hint');
    this._hintTimer = null;

    this._backBtn.addEventListener('click', () => { soundFX.swooshDown(); onBack(); });
    this._homeBtn.addEventListener('click', () => { soundFX.home(); onHome(); });

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
      pinch: '🤏 Grabbed it!',
      open_palm: '✋ Released!',
      point: '☝️ Looking at that!',
      fist: '✊ Going back!',
      two_hand_spread: '🤲 Making it bigger!',
      two_hand_rotate: '🔄 Spinning it!',
      swipe_left: '⬅️ Swiped left!',
      swipe_right: '➡️ Swiped right!',
      swipe_up: '⬆️ Swiped up!',
      swipe_down: '⬇️ Swiped down!',
      grab: '👋 Grabbed!',
    };
    const label = labels[gesture];
    if (!label || !this._hintEl) return;
    this._hintEl.textContent = label;
    this._hintEl.classList.add('visible');
    if (gesture === 'pinch' || gesture === 'grab') soundFX.pop();
    else if (gesture === 'swipe_left' || gesture === 'swipe_right') soundFX.swipe();
    else if (gesture === 'open_palm') soundFX.blip();
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
