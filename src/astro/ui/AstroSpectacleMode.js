export class AstroSpectacleMode {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this._el = null;
    this._step = 0;
    this._sequence = [
      'Start wide: identify the system before naming details.',
      'Move to the brightest or largest object and ask what it controls.',
      'Compare one nearby object with one distant object.',
      'End by naming what the model simplifies for learning.',
    ];
  }

  toggle() {
    if (this._el) this.hide();
    else this.show();
  }

  show() {
    this.hide();
    document.body.classList.add('astro-spectacle-active');
    const el = document.createElement('div');
    el.className = 'astro-spectacle-mode';
    el.innerHTML = `
      <div class="astro-spectacle-mode__bar">
        <p data-caption>${this._sequence[this._step]}</p>
        <div>
          <button type="button" data-action="prev" aria-label="Previous spectacle cue">Prev</button>
          <button type="button" data-action="next" aria-label="Next spectacle cue">Next</button>
          <button type="button" data-action="fullscreen" aria-label="Enter fullscreen">Fullscreen</button>
          <button type="button" data-action="close" aria-label="Exit spectacle mode">Exit</button>
        </div>
      </div>
    `;
    el.addEventListener('click', event => this._handleClick(event));
    document.body.appendChild(el);
    this._el = el;
    this.callbacks.getActive?.()?.startSpectacleSequence?.();
  }

  _handleClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'close') this.hide();
    if (button.dataset.action === 'next') this._move(1);
    if (button.dataset.action === 'prev') this._move(-1);
    if (button.dataset.action === 'fullscreen') {
      document.documentElement.requestFullscreen?.();
    }
  }

  _move(direction) {
    this._step = Math.max(0, Math.min(this._sequence.length - 1, this._step + direction));
    const caption = this._el?.querySelector('[data-caption]');
    if (caption) caption.textContent = this._sequence[this._step];
    this.callbacks.getActive?.()?.advanceSpectacleCue?.(this._step);
  }

  hide() {
    this.callbacks.getActive?.()?.stopSpectacleSequence?.();
    this._el?.remove();
    this._el = null;
    document.body.classList.remove('astro-spectacle-active');
  }
}
