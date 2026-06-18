import { SUBJECT_TOPICS } from '../ui/SubjectHub.js';
import { CONCEPT_EDGES, CONCEPT_NODES } from './ConceptGraph.js';

const SUBJECT_LABELS = {
  math: 'Mathematics',
  physics: 'Physics',
  chem: 'Chemistry',
};

const REASON_COPY = {
  unvisited: 'New lab',
  lowMastery: 'Needs practice',
  prerequisite: 'Good next step',
  momentum: 'Builds momentum',
};

function labKey(subject, topicId) {
  return `${subject}:${topicId}`;
}

function titleFor(subject, topicId) {
  return (SUBJECT_TOPICS[subject] || []).find(t => t.id === topicId)?.label
    || CONCEPT_NODES.find(n => n.id === topicId)?.label
    || topicId;
}

function subjectForTopic(topicId) {
  return CONCEPT_NODES.find(n => n.id === topicId)?.subject || null;
}

export class LearningPathPlanner {
  constructor({ progress, adaptive, aiTutor, onNavigate }) {
    this.progress = progress;
    this.adaptive = adaptive;
    this.aiTutor = aiTutor;
    this.onNavigate = onNavigate;
    this._state = { currentSubject: null, currentTopic: null };
    this._strip = null;
    this._overlay = null;
  }

  syncContext(state = {}) {
    this._state = { ...this._state, ...state };
    this._renderStrip();
  }

  getRecommendations(subject = this._state.currentSubject, limit = 5) {
    const data = this.progress?.getData?.() || {};
    const mastery = data.mastery || {};
    const visited = data.visitedLabs || {};
    const subjects = subject ? [subject] : Object.keys(SUBJECT_TOPICS);
    const candidates = [];

    subjects.forEach(subj => {
      (SUBJECT_TOPICS[subj] || []).forEach((topic, index) => {
        const key = labKey(subj, topic.id);
        const m = mastery[key]?.score || 0;
        const visits = visited[key] || 0;
        const prereqBonus = this._prereqBonus(subj, topic.id, mastery);
        const level = this.adaptive?.getProfile?.(topic.id)?.level || 0;
        const reason =
          visits === 0 ? 'unvisited' :
          m < 35 ? 'lowMastery' :
          prereqBonus > 0 ? 'prerequisite' :
          'momentum';

        const score =
          (visits === 0 ? 48 : 0) +
          (m < 35 ? 34 - m : 0) +
          prereqBonus +
          Math.max(0, 10 - index) +
          level * 4;

        candidates.push({
          subject: subj,
          topicId: topic.id,
          label: topic.label,
          icon: topic.icon,
          mastery: m,
          visits,
          reason,
          score,
          profile: this.adaptive?.getSuggestion?.(topic.id) || 'Beginner Mission',
        });
      });
    });

    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  show(subject = this._state.currentSubject) {
    this.hide();
    const recommendations = this.getRecommendations(subject, 8);
    const overlay = document.createElement('div');
    overlay.id = 'learning-path-overlay';

    const panel = document.createElement('section');
    panel.className = 'learning-path-panel';
    panel.innerHTML = `
      <header>
        <div>
          <p>Personalized Path</p>
          <h2>${subject ? SUBJECT_LABELS[subject] : 'All Subjects'}</h2>
        </div>
        <button type="button" class="path-close">Close</button>
      </header>
      <div class="path-summary">${this._summaryText(subject)}</div>
      <div class="path-list"></div>
    `;

    const list = panel.querySelector('.path-list');
    recommendations.forEach((item, index) => list.appendChild(this._card(item, index)));
    panel.querySelector('.path-close').addEventListener('click', () => this.hide());
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) this.hide();
    });
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this._overlay = overlay;
  }

  hide() {
    this._overlay?.remove();
    this._overlay = null;
  }

  coachNext(subject = this._state.currentSubject) {
    const [next] = this.getRecommendations(subject, 1);
    if (!next) return;
    this.aiTutor?.coach?.(
      `Recommended next: ${next.label}. Reason: ${REASON_COPY[next.reason] || next.reason}.`,
      { kind: 'path' }
    );
  }

  _card(item, index) {
    const card = document.createElement('article');
    card.className = 'path-card';
    card.innerHTML = `
      <span class="path-rank">${index + 1}</span>
      <div>
        <strong>${item.label}</strong>
        <p>${SUBJECT_LABELS[item.subject]} - ${REASON_COPY[item.reason] || item.reason}</p>
        <div class="path-meta">
          <span>${item.profile}</span>
          <span>${item.visits} visit${item.visits === 1 ? '' : 's'}</span>
          <span>${item.mastery}% mastery</span>
        </div>
      </div>
      <button type="button">Start</button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      this.hide();
      this.onNavigate?.(item.subject, item.topicId);
    });
    return card;
  }

  _renderStrip() {
    const subject = this._state.currentSubject;
    const topic = this._state.currentTopic;
    if (!subject || topic) {
      this._strip?.remove();
      this._strip = null;
      return;
    }

    const [next] = this.getRecommendations(subject, 1);
    if (!next) return;
    if (!this._strip) {
      const strip = document.createElement('div');
      strip.id = 'learning-path-strip';
      strip.innerHTML = `
        <div>
          <span>Recommended next</span>
          <strong></strong>
          <small></small>
        </div>
        <button type="button" data-action="start">Start</button>
        <button type="button" data-action="more">Path</button>
      `;
      strip.addEventListener('click', (event) => {
        const action = event.target?.dataset?.action;
        const [currentNext] = this.getRecommendations(this._state.currentSubject, 1);
        if (action === 'start' && currentNext) this.onNavigate?.(currentNext.subject, currentNext.topicId);
        if (action === 'more') this.show(this._state.currentSubject);
      });
      document.body.appendChild(strip);
      this._strip = strip;
    }
    this._strip.querySelector('strong').textContent = next.label;
    this._strip.querySelector('small').textContent = REASON_COPY[next.reason] || next.reason;
  }

  _summaryText(subject) {
    const summary = this.progress?.getMasterySummary?.(subject);
    if (!summary || !summary.count) return 'No path data yet. Start with a recommended lab and the path will adapt.';
    return `Average mastery ${summary.average}%. Strongest lab: ${summary.strongest?.replace(':', ' / ') || 'none'}.`;
  }

  _prereqBonus(subject, topicId, mastery) {
    const incoming = CONCEPT_EDGES.filter(([, to]) => to === topicId);
    return incoming.reduce((sum, [from]) => {
      const fromSubject = subjectForTopic(from) || subject;
      const score = mastery[labKey(fromSubject, from)]?.score || 0;
      return sum + (score >= 35 ? 8 : 0);
    }, 0);
  }
}
