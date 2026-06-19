import { GestureActions } from '../core/GestureActionRegistry.js';

const STORAGE_KEY = 'cosmiclearn_competitive_ladder';

const RANKS = [
  { name: 'Bronze Labhand', min: 0 },
  { name: 'Silver Navigator', min: 450 },
  { name: 'Gold Analyst', min: 1100 },
  { name: 'Platinum Tactician', min: 2200 },
  { name: 'Diamond Mentor', min: 4200 },
];

const DAILY_CHALLENGES = [
  {
    id: 'precision_scanner',
    title: 'Precision Scanner',
    detail: 'Inspect objects and open one learning path.',
    goals: [
      { metric: 'inspect', goal: 5, label: 'Inspect 5 objects' },
      { metric: 'pathOpen', goal: 1, label: 'Open 1 path' },
    ],
    reward: 180,
  },
  {
    id: 'boss_rush',
    title: 'Boss Rush',
    detail: 'Start a boss and land meaningful hits.',
    goals: [
      { metric: 'bossStart', goal: 1, label: 'Start 1 boss' },
      { metric: 'bossProgress', goal: 6, label: 'Land 6 boss hits' },
    ],
    reward: 220,
  },
  {
    id: 'gesture_chain',
    title: 'Gesture Chain',
    detail: 'Build a strong gesture flow inside any lab.',
    goals: [
      { metric: 'gestures', goal: 14, label: 'Use 14 gestures' },
      { metric: 'transform', goal: 4, label: 'Rotate or scale 4 times' },
    ],
    reward: 200,
  },
  {
    id: 'campaign_push',
    title: 'Campaign Push',
    detail: 'Advance story-mode mastery.',
    goals: [
      { metric: 'labs', goal: 3, label: 'Open 3 labs' },
      { metric: 'campaignProgress', goal: 1, label: 'Complete or advance a chapter' },
    ],
    reward: 260,
  },
];

const SCORE_TABLE = {
  gesture: 4,
  inspect: 18,
  transform: 12,
  parameter: 8,
  subjectEnter: 24,
  topicEnter: 36,
  pathOpen: 40,
  quizOpen: 26,
  bossStart: 55,
  bossProgress: 20,
  bossWeakExpose: 65,
  bossWeakHit: 120,
  bossPowerHit: 35,
  bossFinisherReady: 150,
  bossComplete: 260,
  campaignAdvance: 70,
  campaignChapterComplete: 220,
  campaignComplete: 500,
  powerUse: 95,
  arenaHit: 45,
  arenaClear: 300,
  mrSpectacle: 45,
  mrProjection: 130,
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function defaults() {
  return {
    totalScore: 0,
    bestDailyScore: 0,
    currentDay: todayKey(),
    dailyScore: 0,
    metrics: {},
    dailyCompleted: [],
    achievements: [],
    bestCombo: 0,
    streak: 0,
    lastGestureAt: 0,
  };
}

function challengeForDay(day) {
  const seed = String(day).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return DAILY_CHALLENGES[seed % DAILY_CHALLENGES.length];
}

function rankFor(score) {
  return RANKS.reduce((current, rank) => score >= rank.min ? rank : current, RANKS[0]);
}

function nextRankFor(score) {
  return RANKS.find(rank => rank.min > score) || null;
}

function cleanNumber(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

export class CompetitiveLadder {
  constructor({ gestureEngine, interaction, aiTutor, getGameState }) {
    this.gestureEngine = gestureEngine;
    this.interaction = interaction;
    this.aiTutor = aiTutor;
    this.getGameState = getGameState || (() => ({}));
    this._state = this._load();
    this._panel = null;
    this._mini = null;
    this._toast = null;
    this._lastRank = rankFor(this._state.totalScore).name;

    this._rollDay();
    this._buildMini();
    this._bind();
    this._render();
  }

  show(view = 'leaderboard') {
    if (this._panel) {
      this._panel.remove();
      this._panel = null;
      return;
    }
    const panel = document.createElement('section');
    panel.id = 'competitive-ladder-panel';
    panel.innerHTML = `
      <header>
        <div>
          <p>Competitive Ladder</p>
          <h2></h2>
        </div>
        <button type="button" data-action="close">Close</button>
      </header>
      <nav class="ladder-tabs">
        <button type="button" data-view="leaderboard" class="active">Rank</button>
        <button type="button" data-view="daily">Daily</button>
        <button type="button" data-view="achievements">Wins</button>
      </nav>
      <div class="ladder-body"></div>
    `;
    panel.addEventListener('click', event => {
      const action = event.target?.dataset?.action;
      const nextView = event.target?.dataset?.view;
      if (action === 'close') this.show();
      if (nextView) {
        panel.querySelectorAll('.ladder-tabs button').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.view === nextView);
        });
        this._renderPanel(nextView);
      }
    });
    document.body.appendChild(panel);
    this._panel = panel;
    this._render();
    this._renderPanel(view);
  }

  recordEvent(type, detail = {}) {
    this._rollDay();
    if (!type) return;
    if (type === 'topicEnter') this._bumpMetric('labs', 1);
    if (type === 'pathOpen') this._bumpMetric('pathOpen', 1);
    if (type === 'bossStart') this._bumpMetric('bossStart', 1);
    if (type === 'bossProgress') this._bumpMetric('bossProgress', 1);
    if (type === 'bossComplete') {
      this._bumpMetric('bossWins', 1);
      this._achievement(`Boss defeated: ${detail.boss || 'Victory'}`);
    }
    if (type === 'bossWeakExpose') {
      this._bumpMetric('bossWeakExpose', 1);
      this._achievement(`Exposed: ${detail.weakPoint || 'Weak Point'}`);
    }
    if (type === 'bossWeakHit') {
      this._bumpMetric('bossWeakHits', 1);
      this._achievement(`Weak hit: ${detail.weakPoint || 'Boss'}`);
    }
    if (type === 'bossFinisherReady') {
      this._bumpMetric('finishers', 1);
      this._achievement(`Finisher: ${detail.finisher || 'Ready'}`);
    }
    if (type === 'campaignAdvance' || type === 'campaignChapterComplete' || type === 'campaignComplete') {
      this._bumpMetric('campaignProgress', 1);
    }
    if (type === 'powerUse') {
      this._bumpMetric('powers', 1);
      this._achievement(`Power: ${detail.power || 'STEM'}`);
    }
    if (type === 'arenaHit') {
      this._bumpMetric('arenaHits', 1);
      if (detail.exact) this._bumpMetric('weakHits', 1);
    }
    if (type === 'arenaClear') {
      this._bumpMetric('arenaClears', 1);
      this._achievement(`Arena: ${detail.arena || 'Clear'}`);
    }
    if (type === 'mrSpectacle') {
      this._bumpMetric('mrActivations', 1);
    }
    if (type === 'mrProjection') {
      this._bumpMetric('mrProjections', 1);
      this._achievement(`MR: ${detail.label || 'Projection'}`);
    }
    this._score(SCORE_TABLE[type] || 0, this._labelFor(type));
    this._checkDaily();
    this._checkAchievements();
    this._save();
    this._render();
  }

  _bind() {
    this.gestureEngine?.onAction?.((action) => {
      if (!action || action.phase !== 'complete') return;
      this._rollDay();
      this._bumpMetric('gestures', 1);
      this._registerCombo();
      if (action.name === GestureActions.ROTATE || action.name === GestureActions.SCALE) {
        this._bumpMetric('transform', 1);
        this._score(SCORE_TABLE.transform, 'Transform');
      } else if (action.name === GestureActions.SWIPE_UP || action.name === GestureActions.SWIPE_DOWN) {
        this._bumpMetric('parameter', 1);
        this._score(SCORE_TABLE.parameter, 'Parameter');
      } else {
        this._score(SCORE_TABLE.gesture, 'Gesture', true);
      }
      this._checkDaily();
      this._checkAchievements();
      this._save();
      this._render();
    });

    this.interaction?.onObjectAction?.((event) => {
      if (!event) return;
      this._rollDay();
      if (event.actionName === GestureActions.INSPECT) {
        this._bumpMetric('inspect', 1);
        this._score(SCORE_TABLE.inspect, 'Inspect');
      }
      if (event.actionName === GestureActions.ROTATE || event.actionName === GestureActions.SCALE) {
        this._bumpMetric('transform', 1);
        this._score(SCORE_TABLE.transform, 'Object control');
      }
      this._checkDaily();
      this._checkAchievements();
      this._save();
      this._render();
    });

    document.addEventListener('cosmiclearn:game-event', event => {
      this.recordEvent(event.detail?.type, event.detail?.detail || {});
    });
  }

  _buildMini() {
    const mini = document.createElement('button');
    mini.id = 'competitive-ladder-mini';
    mini.type = 'button';
    mini.title = 'Competitive Ladder';
    mini.addEventListener('click', () => this.show());
    document.body.appendChild(mini);
    this._mini = mini;
  }

  _rollDay() {
    const day = todayKey();
    if (this._state.currentDay === day) return;
    this._state.bestDailyScore = Math.max(this._state.bestDailyScore, this._state.dailyScore || 0);
    this._state.currentDay = day;
    this._state.dailyScore = 0;
    this._state.metrics = {};
    this._state.dailyCompleted = [];
    this._state.streak = 0;
    this._save();
  }

  _score(points, label, quiet = false) {
    if (!points) return;
    const before = rankFor(this._state.totalScore).name;
    this._state.totalScore += points;
    this._state.dailyScore += points;
    const after = rankFor(this._state.totalScore).name;
    if (after !== before) {
      this._lastRank = after;
      this._achievement(`Rank: ${after}`);
      this._toastMessage(`Rank up: ${after}`);
      this.aiTutor?.coach?.(`New ladder rank: ${after}. The fastest gains now come from boss wins and campaign chapters.`, { kind: 'ladder' });
      return;
    }
    if (!quiet && points >= 18) this._toastMessage(`+${points} score ${label}`);
  }

  _registerCombo() {
    const now = Date.now();
    if (now - this._state.lastGestureAt < 4200) this._state.streak++;
    else this._state.streak = 1;
    this._state.lastGestureAt = now;
    this._state.bestCombo = Math.max(this._state.bestCombo, this._state.streak);
    if (this._state.streak === 6) {
      this._score(70, 'Combo x6');
      this._achievement('Combo x6');
    }
  }

  _bumpMetric(metric, count) {
    this._state.metrics[metric] = (this._state.metrics[metric] || 0) + count;
  }

  _checkDaily() {
    const challenge = challengeForDay(this._state.currentDay);
    if (this._state.dailyCompleted.includes(challenge.id)) return;
    const done = challenge.goals.every(goal => (this._state.metrics[goal.metric] || 0) >= goal.goal);
    if (!done) return;
    this._state.dailyCompleted.push(challenge.id);
    this._score(challenge.reward, challenge.title);
    this._achievement(`Daily: ${challenge.title}`);
    this._toastMessage(`Daily complete: ${challenge.title}`);
  }

  _checkAchievements() {
    if ((this._state.metrics.bossWins || 0) >= 1) this._achievement('Boss Winner');
    if ((this._state.metrics.labs || 0) >= 5) this._achievement('Five Lab Run');
    if ((this._state.metrics.inspect || 0) >= 10) this._achievement('Deep Scanner');
    if (this._state.bestCombo >= 8) this._achievement('Combo x8');
    if ((this.getGameState()?.level || 1) >= 4) this._achievement('Level 4 Competitor');
  }

  _achievement(label) {
    if (!label || this._state.achievements.includes(label)) return;
    this._state.achievements.push(label);
  }

  _labelFor(type) {
    return String(type || '').replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
  }

  _rankRows() {
    const player = {
      name: 'You',
      score: this._state.totalScore,
      active: true,
    };
    const rivals = [
      { name: 'Ari Vector', score: Math.max(220, this._state.totalScore - 180) },
      { name: 'Mira Flux', score: Math.max(480, this._state.totalScore + 120) },
      { name: 'Dev Ion', score: Math.max(940, this._state.totalScore + 390) },
      { name: 'Nia Orbit', score: Math.max(1600, this._state.totalScore + 760) },
    ];
    return [...rivals, player].sort((a, b) => b.score - a.score);
  }

  _render() {
    const rank = rankFor(this._state.totalScore);
    const next = nextRankFor(this._state.totalScore);
    const progress = next
      ? Math.round(((this._state.totalScore - rank.min) / Math.max(1, next.min - rank.min)) * 100)
      : 100;

    if (this._mini) {
      this._mini.innerHTML = `
        <span>RANK</span>
        <strong>${rank.name.split(' ')[0]}</strong>
        <i><b style="width:${progress}%"></b></i>
      `;
    }
    if (!this._panel) return;
    this._panel.querySelector('h2').textContent = rank.name;
    const view = this._panel.querySelector('.ladder-tabs button.active')?.dataset?.view || 'leaderboard';
    this._renderPanel(view);
  }

  _renderPanel(view) {
    if (!this._panel) return;
    const body = this._panel.querySelector('.ladder-body');
    if (!body) return;
    if (view === 'daily') {
      body.innerHTML = this._dailyMarkup();
      return;
    }
    if (view === 'achievements') {
      body.innerHTML = this._achievementMarkup();
      return;
    }
    body.innerHTML = this._leaderboardMarkup();
  }

  _leaderboardMarkup() {
    const rank = rankFor(this._state.totalScore);
    const next = nextRankFor(this._state.totalScore);
    const nextText = next ? `${next.min - this._state.totalScore} to ${next.name}` : 'Top rank reached';
    return `
      <div class="ladder-summary">
        <div><span>Total</span><strong>${cleanNumber(this._state.totalScore)}</strong></div>
        <div><span>Today</span><strong>${cleanNumber(this._state.dailyScore)}</strong></div>
        <div><span>Best Combo</span><strong>${cleanNumber(this._state.bestCombo)}</strong></div>
      </div>
      <p class="ladder-next">${rank.name} / ${nextText}</p>
      <div class="ladder-rows">
        ${this._rankRows().map((row, index) => `
          <article class="${row.active ? 'active' : ''}">
            <span>#${index + 1}</span>
            <strong>${row.name}</strong>
            <b>${cleanNumber(row.score)}</b>
          </article>
        `).join('')}
      </div>
    `;
  }

  _dailyMarkup() {
    const challenge = challengeForDay(this._state.currentDay);
    const complete = this._state.dailyCompleted.includes(challenge.id);
    return `
      <article class="daily-challenge-card ${complete ? 'complete' : ''}">
        <div>
          <span>${this._state.currentDay}</span>
          <strong>${challenge.title}</strong>
          <p>${challenge.detail}</p>
        </div>
        <b>${complete ? 'Complete' : `${challenge.reward} score`}</b>
      </article>
      <div class="ladder-goals">
        ${challenge.goals.map(goal => {
          const value = Math.min(this._state.metrics[goal.metric] || 0, goal.goal);
          const pct = Math.round((value / goal.goal) * 100);
          return `
            <article class="${value >= goal.goal ? 'complete' : ''}">
              <div><strong>${goal.label}</strong><span>${value} / ${goal.goal}</span></div>
              <i><b style="width:${pct}%"></b></i>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  _achievementMarkup() {
    if (!this._state.achievements.length) {
      return '<p class="ladder-empty">No ladder achievements yet. Complete a daily challenge or win a boss fight.</p>';
    }
    return `
      <div class="ladder-achievements">
        ${this._state.achievements.map(label => `<span>${label}</span>`).join('')}
      </div>
    `;
  }

  _toastMessage(message) {
    if (!message) return;
    if (!this._toast) {
      const toast = document.createElement('div');
      toast.id = 'ladder-toast';
      document.body.appendChild(toast);
      this._toast = toast;
    }
    this._toast.textContent = message;
    this._toast.classList.remove('visible');
    requestAnimationFrame(() => this._toast?.classList.add('visible'));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this._toast?.classList.remove('visible'), 1700);
  }

  _load() {
    try { return { ...defaults(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
    catch { return defaults(); }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
  }
}
