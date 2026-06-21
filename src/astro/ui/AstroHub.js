import { getAstroLessonPacks } from '../data/astroLessonPacks.js';

export class AstroHub {
  constructor(modules, onLaunch) {
    this.modules = modules;
    this.onLaunch = onLaunch;
    this._el = null;
  }

  show() {
    this.hide();
    const root = document.createElement('section');
    root.className = 'astro-hub';
    root.innerHTML = `
      <div class="astro-hub__header">
        <div>
          <p class="astro-kicker">New learning area</p>
          <h2>Astro Physics</h2>
          <p>Explore the Universe through 3D, AR Sky, telescopes, stars, planets, galaxies, and space missions.</p>
        </div>
        <button class="astro-lessons-toggle" data-astro-lessons>Teacher Lessons</button>
      </div>
      <section class="astro-lessons-panel" data-lessons-panel hidden>
        <h3>Teacher Lesson Packs</h3>
        <div class="astro-lessons-grid">
          ${getAstroLessonPacks().map(lesson => `
            <article class="astro-lesson-card">
              <div class="astro-card__top">
                <span>${lesson.gradeBand}</span>
                <span>${lesson.duration}</span>
              </div>
              <h4>${lesson.title}</h4>
              <p>${lesson.teacherIntro}</p>
              <details>
                <summary>Lesson details</summary>
                <p><b>Objectives:</b> ${lesson.learningObjectives.join('; ')}</p>
                <p><b>Activity:</b> ${lesson.studentActivitySteps.join(' ')}</p>
                <p><b>Discuss:</b> ${lesson.discussionQuestions.join(' ')}</p>
                <p><b>Watch for:</b> ${lesson.misconceptionAlerts.join(' ')}</p>
                <p><b>Assess:</b> ${lesson.quickAssessmentQuestions.join(' ')}</p>
                <p><b>Extend:</b> ${lesson.extensionActivity}</p>
              </details>
              <button class="astro-launch" data-astro-id="${lesson.requiredSubmodule}">Launch Related Module</button>
            </article>
          `).join('')}
        </div>
      </section>
      <div class="astro-card-grid">
        ${this.modules.map(module => `
          <article class="astro-card">
            <div class="astro-card__top">
              <span>${module.difficulty}</span>
              <span>${module.status}</span>
            </div>
            <h3>${module.title}</h3>
            <p>${module.description}</p>
            <div class="astro-concepts">
              ${module.concepts.slice(0, 4).map(concept => `<span>${concept}</span>`).join('')}
            </div>
            <button class="astro-launch" data-astro-id="${module.id}">Launch</button>
          </article>
        `).join('')}
      </div>
    `;

    root.querySelectorAll('[data-astro-id]').forEach(button => {
      button.addEventListener('click', () => this.onLaunch?.(button.dataset.astroId));
    });
    root.querySelector('[data-astro-lessons]')?.addEventListener('click', () => {
      const panel = root.querySelector('[data-lessons-panel]');
      if (panel) panel.hidden = !panel.hidden;
    });

    document.body.appendChild(root);
    this._el = root;
  }

  hide() {
    this._el?.remove();
    this._el = null;
  }
}
