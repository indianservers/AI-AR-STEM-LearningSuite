export class AstroInfoPanel {
  constructor() {
    this._el = null;
  }

  show(content) {
    this.hide();
    this.update(content);
  }

  update(content) {
    if (!this._el) {
      const el = document.createElement('aside');
      el.className = 'astro-info-panel';
      document.body.appendChild(el);
      this._el = el;
    }
    const concepts = content.concepts || [];
    const rows = [
      ['Learning goal', content.goal],
      ['What to observe', content.observe],
      ['Scientific explanation', content.explanation],
      ['Try this', content.tryThis],
      ['Common misconception', content.misconception],
      ['Teacher note', content.teacherNote],
      ['Student challenge', content.challenge],
    ].filter(([, value]) => value);
    this._el.innerHTML = `
      <p class="astro-kicker">Astro Physics</p>
      <h3>${content.title}</h3>
      <section>
        <strong>Key concepts</strong>
        <p>${concepts.join(', ')}</p>
      </section>
      ${rows.map(([label, value]) => `
        <section>
          <strong>${label}</strong>
          <p>${value}</p>
        </section>
      `).join('')}
    `;
  }

  hide() {
    this._el?.remove();
    this._el = null;
  }
}
