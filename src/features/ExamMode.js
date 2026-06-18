// Feature 24: Exam Mode - randomized quizzes per subject
const QUESTIONS = {
  math: [
    { q: 'What is the derivative of sin(x)?', options: ['cos(x)', '-cos(x)', 'sin(x)', '-sin(x)'], answer: 0 },
    { q: 'The dot product of two perpendicular vectors is:', options: ['0', '1', '-1', 'undefined'], answer: 0 },
    { q: 'A saddle point is a critical point where the function:', options: ['Has no local min/max', 'Is always negative', 'Is always positive', 'Is undefined'], answer: 0 },
    { q: 'The Mandelbrot set boundary shows:', options: ['Fractal complexity', 'Linear growth', 'Exponential decay', 'Constant curvature'], answer: 0 },
    { q: "Euler's formula e^(i*pi) + 1 equals:", options: ['0', '1', '-1', 'i'], answer: 0 },
  ],
  physics: [
    { q: "Newton's second law states F =", options: ['ma', 'mv', 'mv^2', 'm/a'], answer: 0 },
    { q: 'A double pendulum exhibits:', options: ['Chaotic motion', 'Simple harmonic motion', 'Constant velocity', 'Linear motion'], answer: 0 },
    { q: 'Constructive interference occurs when waves are:', options: ['In phase', 'Out of phase', 'Perpendicular', 'At rest'], answer: 0 },
    { q: "Snell's law relates angles of:", options: ['Refraction', 'Reflection', 'Diffraction', 'Interference'], answer: 0 },
    { q: 'At maximum pendulum height, kinetic energy is:', options: ['Minimum', 'Maximum', 'Equal to PE', 'Constant'], answer: 0 },
  ],
  chem: [
    { q: 'Which element has atomic number 79 (Au)?', options: ['Gold', 'Silver', 'Platinum', 'Copper'], answer: 0 },
    { q: 'Water (H2O) has a bond angle of approximately:', options: ['104.5 degrees', '90 degrees', '120 degrees', '180 degrees'], answer: 0 },
    { q: 'The 2p orbital has the shape of a:', options: ['Dumbbell', 'Sphere', 'Donut', 'Cube'], answer: 0 },
    { q: 'In ionic bonding, electrons are:', options: ['Transferred', 'Shared equally', 'Shared unequally', 'Annihilated'], answer: 0 },
    { q: 'Noble gases are in group:', options: ['18', '1', '17', '2'], answer: 0 },
  ],
};

export class ExamMode {
  constructor() {
    this._el = null;
    this._score = { correct: 0, total: 0 };
    this._questions = [];
    this._current = 0;
  }

  start(subject = 'math') {
    const pool = QUESTIONS[subject] || QUESTIONS.math;
    this._questions = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
    this._current = 0;
    this._score = { correct: 0, total: 0 };
    this._render();
  }

  _render() {
    this._el?.remove();
    const q = this._questions[this._current];
    if (!q) { this._showResult(); return; }

    const overlay = document.createElement('div');
    overlay.className = 'exam-overlay';

    const card = document.createElement('section');
    card.className = 'exam-card';

    const progress = document.createElement('div');
    progress.className = 'exam-progress';
    progress.textContent = `QUESTION ${this._current + 1} OF ${this._questions.length}`;

    const qText = document.createElement('p');
    qText.className = 'exam-question';
    qText.textContent = q.q;

    const optWrap = document.createElement('div');
    optWrap.className = 'exam-options';

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.textContent = String.fromCharCode(65 + i) + '. ' + opt;
      btn.onclick = () => this._answer(i, q, optWrap, btn);
      optWrap.appendChild(btn);
    });

    const skipBtn = document.createElement('button');
    skipBtn.className = 'exam-skip';
    skipBtn.textContent = 'Skip';
    skipBtn.onclick = () => { overlay.remove(); this._el = null; };

    card.append(progress, qText, optWrap, skipBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    this._el = overlay;
  }

  _answer(index, question, optWrap, btn) {
    const correct = index === question.answer;
    btn.classList.add(correct ? 'correct' : 'wrong');
    if (correct) this._score.correct++;
    else optWrap.children[question.answer]?.classList.add('correct');
    this._score.total++;
    optWrap.querySelectorAll('button').forEach(b => b.disabled = true);
    setTimeout(() => { this._current++; this._el?.remove(); this._render(); }, 1200);
  }

  _showResult() {
    this._el?.remove();
    const pct = Math.round((this._score.correct / Math.max(1, this._score.total)) * 100);
    const grade = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good job' : 'Keep practicing';

    const overlay = document.createElement('div');
    overlay.className = 'exam-overlay';
    overlay.innerHTML = `
      <section class="exam-result">
        <div class="exam-result-mark">${pct >= 80 ? 'A' : pct >= 60 ? 'B' : 'C'}</div>
        <h2>${grade}</h2>
        <p>${this._score.correct} / ${this._score.total}</p>
        <span>${pct}% correct</span>
        <button type="button">Continue Learning</button>
      </section>
    `;
    overlay.querySelector('button').addEventListener('click', () => { overlay.remove(); this._el = null; });
    document.body.appendChild(overlay);
    this._el = overlay;
  }
}
