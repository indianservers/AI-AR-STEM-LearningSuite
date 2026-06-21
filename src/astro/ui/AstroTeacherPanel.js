export class AstroTeacherPanel {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this._el = null;
    this._visible = false;
  }

  toggle() {
    if (this._visible) this.hide();
    else this.show();
  }

  show() {
    this.hide();
    const active = this.callbacks.getActive?.();
    const el = document.createElement('aside');
    el.className = 'astro-teacher-panel';
    el.innerHTML = `
      <div class="astro-teacher-panel__header">
        <div>
          <p class="astro-kicker">Teacher panel</p>
          <h3>${active?.constructor?.name?.replace(/([A-Z])/g, ' $1').trim() || 'Astro Classroom'}</h3>
        </div>
        <button type="button" data-action="close" aria-label="Close teacher panel">Close</button>
      </div>
      <section>
        <strong>Learning objective</strong>
        <p>${active?.getLessonObjective?.() || 'Guide students to observe, compare, explain, and test the active astronomy model.'}</p>
      </section>
      <section>
        <strong>Discussion prompts</strong>
        <ul>
          ${(active?.getDiscussionQuestions?.() || [
            'What evidence can you see in the model?',
            'Which part is compressed, simplified, or symbolic?',
            'What misconception would this view help correct?',
          ]).map(question => `<li>${question}</li>`).join('')}
        </ul>
      </section>
      <div class="astro-teacher-panel__actions">
        <button type="button" data-action="pause">Pause Class</button>
        <button type="button" data-action="spotlight">Spotlight Concept</button>
        <button type="button" data-action="reset">Reset Classroom</button>
      </div>
      <p class="astro-panel-note" data-teacher-status>Ready for whole-class discussion.</p>
    `;
    el.addEventListener('click', event => this._handleClick(event));
    document.body.appendChild(el);
    this._el = el;
    this._visible = true;
  }

  _handleClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const active = this.callbacks.getActive?.();
    if (action === 'close') this.hide();
    if (action === 'pause') {
      active?.pauseSimulation?.();
      this.callbacks.onPause?.(true);
      this._status('Classroom pause enabled.');
    }
    if (action === 'reset') {
      active?.resetForClassroom?.();
      this.callbacks.onReset?.();
      this._status('Classroom view reset.');
    }
    if (action === 'spotlight') {
      active?.spotlightTeacherMoment?.();
      this._status(active?.getTeacherSpotlight?.() || 'Ask students to explain the visible cause-and-effect relationship.');
    }
  }

  _status(message) {
    const el = this._el?.querySelector('[data-teacher-status]');
    if (el) el.textContent = message;
  }

  hide() {
    this._el?.remove();
    this._el = null;
    this._visible = false;
  }
}
