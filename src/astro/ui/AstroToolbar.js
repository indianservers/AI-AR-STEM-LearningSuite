export class AstroToolbar {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this._el = null;
    this._paused = false;
    this._labels = true;
    this._speed = 1;
  }

  show() {
    this.hide();
    const el = document.createElement('div');
    el.className = 'astro-toolbar';
    el.innerHTML = `
      <button data-action="reset">Reset View</button>
      <button data-action="pause">Pause</button>
      <button data-action="labels">Labels On</button>
      <label class="astro-toolbar__slider">Speed <input data-action="speed" type="range" min="0" max="4" step="0.1" value="1" /></label>
      <label class="astro-toolbar__select">Quality
        <select data-action="quality">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <button data-action="ar">AR Mode</button>
      <button data-action="vr">VR Mode</button>
      <button data-action="gesture">Gesture Mode</button>
      <button data-action="teacher">Teacher</button>
      <button data-action="spectacle">Spectacle</button>
      <button data-action="help">Help</button>
    `;
    el.addEventListener('click', event => this._handleClick(event));
    el.addEventListener('input', event => this._handleInput(event));
    document.body.appendChild(el);
    this._el = el;
  }

  _handleClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'pause') {
      this._paused = !this._paused;
      button.textContent = this._paused ? 'Play' : 'Pause';
      this.callbacks.onPause?.(this._paused);
      return;
    }

    if (action === 'labels') {
      this._labels = !this._labels;
      button.textContent = this._labels ? 'Labels On' : 'Labels Off';
      this.callbacks.onLabels?.(this._labels);
      return;
    }

    const map = {
      reset: 'onReset',
      ar: 'onAR',
      vr: 'onVR',
      gesture: 'onGesture',
      teacher: 'onTeacher',
      spectacle: 'onSpectacle',
      help: 'onHelp',
    };
    this.callbacks[map[action]]?.();
  }

  _handleInput(event) {
    const input = event.target.closest('input[data-action="speed"]');
    if (input) {
      this._speed = Number(input.value);
      this.callbacks.onSpeed?.(this._speed);
      return;
    }
    const select = event.target.closest('select[data-action="quality"]');
    if (select) this.callbacks.onQuality?.(select.value);
  }

  hide() {
    this._el?.remove();
    this._el = null;
  }
}
