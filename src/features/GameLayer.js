import { GestureActions } from '../core/GestureActionRegistry.js';

const STORAGE_KEY = 'cosmiclearn_game_state';
const XP_TABLE = {
  gesture: 2,
  inspect: 8,
  transform: 5,
  parameter: 4,
  missionStart: 10,
  missionComplete: 80,
  pathOpen: 12,
  quizOpen: 10,
  subjectEnter: 15,
  topicEnter: 25,
  bossStart: 20,
  bossProgress: 10,
  bossComplete: 140,
  campaignAdvance: 25,
  campaignChapterComplete: 180,
  campaignComplete: 320,
};

const QUESTS = [
  { id: 'first_inspect', title: 'Scanner', detail: 'Inspect any object.', goal: 1, metric: 'inspect', reward: 40 },
  { id: 'hand_combo', title: 'Gesture Combo', detail: 'Use 5 meaningful gestures in a lab.', goal: 5, metric: 'labGestures', reward: 55 },
  { id: 'mission_clear', title: 'Mission Clear', detail: 'Complete one adaptive mission.', goal: 1, metric: 'missions', reward: 80 },
  { id: 'topic_hop', title: 'Lab Runner', detail: 'Enter 3 different labs.', goal: 3, metric: 'topics', reward: 70 },
];

const TOOLS = [
  {
    id: 'scanner_lens',
    name: 'Scanner Lens',
    unlock: 'Complete Scanner quest',
    isUnlocked: state => state.completedQuests.includes('first_inspect'),
    effect: 'Inspect actions grant extra XP and coach focus.',
  },
  {
    id: 'combo_stabilizer',
    name: 'Combo Stabilizer',
    unlock: 'Reach Level 2',
    isUnlocked: state => state.level >= 2,
    effect: 'Combo window is longer, making streaks easier to hold.',
  },
  {
    id: 'mission_booster',
    name: 'Mission Booster',
    unlock: 'Complete Mission Clear quest',
    isUnlocked: state => state.completedQuests.includes('mission_clear'),
    effect: 'Completed adaptive missions grant bonus XP.',
  },
  {
    id: 'path_compass',
    name: 'Path Compass',
    unlock: 'Enter 3 different labs',
    isUnlocked: state => state.completedQuests.includes('topic_hop'),
    effect: 'Opening the learning path grants extra XP and tutor guidance.',
  },
];

const COSMETICS = {
  themes: [
    { id: 'nova_blue', name: 'Nova Blue', unlock: 'Default', isUnlocked: () => true, color: '#00d4ff' },
    { id: 'gold_runner', name: 'Gold Runner', unlock: 'Reach Level 2', isUnlocked: state => state.level >= 2, color: '#ffd700' },
    { id: 'chem_green', name: 'Chem Green', unlock: 'Visit 3 labs', isUnlocked: state => (state.metrics.topics || 0) >= 3, color: '#7fff7f' },
    { id: 'ember_physics', name: 'Ember Physics', unlock: 'Complete one mission', isUnlocked: state => state.completedQuests.includes('mission_clear'), color: '#ff6b35' },
  ],
  titles: [
    { id: 'explorer', name: 'Explorer', unlock: 'Default', isUnlocked: () => true },
    { id: 'scanner', name: 'Scanner', unlock: 'Complete Scanner quest', isUnlocked: state => state.completedQuests.includes('first_inspect') },
    { id: 'combo_pilot', name: 'Combo Pilot', unlock: 'Complete Gesture Combo quest', isUnlocked: state => state.completedQuests.includes('hand_combo') },
    { id: 'mission_captain', name: 'Mission Captain', unlock: 'Complete Mission Clear quest', isUnlocked: state => state.completedQuests.includes('mission_clear') },
  ],
  trails: [
    { id: 'none', name: 'No Trail', unlock: 'Default', isUnlocked: () => true },
    { id: 'spark', name: 'Spark Trail', unlock: 'Reach Level 2', isUnlocked: state => state.level >= 2 },
    { id: 'combo', name: 'Combo Trail', unlock: 'Best combo 5', isUnlocked: state => state.bestCombo >= 5 },
    { id: 'mastery', name: 'Mastery Trail', unlock: 'Complete 3 missions', isUnlocked: state => (state.metrics.missions || 0) >= 3 },
  ],
};

function defaults() {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    bestCombo: 0,
    metrics: { inspect: 0, labGestures: 0, missions: 0, topics: 0 },
    completedQuests: [],
    unlockedBadges: [],
    activeTool: null,
    avatar: {
      theme: 'nova_blue',
      title: 'explorer',
      trail: 'none',
    },
  };
}

function levelForXp(xp) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 90)) + 1);
}

export class GameLayer {
  constructor({ gestureEngine, interaction, aiTutor, getState }) {
    this.gestureEngine = gestureEngine;
    this.interaction = interaction;
    this.aiTutor = aiTutor;
    this._getAppState = getState || (() => ({}));
    this._state = this._load();
    this._hud = null;
    this._questPanel = null;
    this._toast = null;
    this._effectsLayer = null;
    this._lastGestureAt = 0;
    this._lastTopicKey = '';

    this._buildHud();
    this._buildEffectsLayer();
    this._bind();
    this._render();
  }

  recordEvent(type, detail = {}) {
    if (type === 'subjectEnter') this._award(XP_TABLE.subjectEnter, 'Subject entered');
    if (type === 'topicEnter') {
      const key = `${detail.subject || ''}:${detail.topic || ''}`;
      if (key && key !== this._lastTopicKey) {
        this._lastTopicKey = key;
        this._bumpMetric('topics', 1);
      }
      this._award(XP_TABLE.topicEnter, 'Lab entered');
    }
    if (type === 'missionStart') this._award(XP_TABLE.missionStart, 'Challenge started');
    if (type === 'missionProgress') {
      this._award(6, 'Objective progress', { quiet: true });
      this._toolPulse('mission', 'Objective');
    }
    if (type === 'missionComplete') {
      this._bumpMetric('missions', 1);
      const bonus = this._hasTool('mission_booster') ? 25 : 0;
      this._award(XP_TABLE.missionComplete + bonus, 'Mission complete');
      if (this._hasTool('mission_booster')) this._toolPulse('mission_booster', 'Mission Booster');
      this._unlockBadge('Mission Finisher');
    }
    if (type === 'pathOpen') {
      const bonus = this._hasTool('path_compass') ? 12 : 0;
      this._award(XP_TABLE.pathOpen + bonus, 'Path opened');
      if (this._hasTool('path_compass')) {
        this._toolPulse('path_compass', 'Path Compass');
        this.aiTutor?.coach?.('Path Compass is active. Pick the highest ranked path when you want the fastest mastery gain.', { kind: 'game' });
      }
    }
    if (type === 'quizOpen') this._award(XP_TABLE.quizOpen, 'Quiz opened');
    if (type === 'bossStart') {
      this._award(XP_TABLE.bossStart, 'Boss started');
      this._toolPulse('boss', 'Boss Fight');
    }
    if (type === 'bossProgress') {
      this._award(XP_TABLE.bossProgress, 'Boss hit', { quiet: true });
      this._toolPulse('boss_hit', 'Hit');
    }
    if (type === 'bossComplete') {
      this._bumpMetric('missions', 1);
      this._award(XP_TABLE.bossComplete, 'Boss defeated');
      this._unlockBadge(`Boss: ${detail.boss || 'Victory'}`);
      this._trailBurst('boss');
    }
    if (type === 'bossFail') {
      this._award(8, 'Boss attempt', { quiet: true });
      this._toolPulse('boss_fail', 'Retry');
    }
    if (type === 'campaignAdvance') {
      this._award(XP_TABLE.campaignAdvance, 'Campaign chapter');
      this._toolPulse('campaign', 'Director');
    }
    if (type === 'campaignChapterComplete') {
      this._award(XP_TABLE.campaignChapterComplete, 'Chapter complete');
      this._unlockBadge(`Chapter: ${detail.chapter || 'Complete'}`);
      this._trailBurst('campaign');
    }
    if (type === 'campaignComplete') {
      this._award(XP_TABLE.campaignComplete, 'Campaign complete');
      this._unlockBadge('Campaign Clear');
      this._trailBurst('campaign');
    }
    this._checkQuests();
    this._save();
    this._render();
    document.dispatchEvent(new CustomEvent('cosmiclearn:game-event', {
      detail: { type, detail },
    }));
  }

  showQuests() {
    if (this._questPanel) {
      this._questPanel.remove();
      this._questPanel = null;
      return;
    }
    const panel = document.createElement('section');
    panel.id = 'game-quest-panel';
    panel.innerHTML = `
      <header>
        <div>
          <p>Game Quests</p>
          <h2>Level ${this._state.level} Explorer</h2>
        </div>
        <button type="button">Close</button>
      </header>
      <nav class="game-panel-tabs">
        <button type="button" data-view="quests" class="active">Quests</button>
        <button type="button" data-view="tools">Loadout</button>
        <button type="button" data-view="avatar">Avatar</button>
        <button type="button" data-view="badges">Badges</button>
      </nav>
      <div class="quest-list"></div>
    `;
    panel.querySelector('header button').addEventListener('click', () => this.showQuests());
    panel.querySelector('.game-panel-tabs').addEventListener('click', (event) => {
      const view = event.target?.dataset?.view;
      if (!view) return;
      panel.querySelectorAll('.game-panel-tabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
      this._renderPanel(view);
    });
    document.body.appendChild(panel);
    this._questPanel = panel;
    this._renderPanel('quests');
  }

  showLoadout() {
    if (!this._questPanel) this.showQuests();
    this._questPanel?.querySelectorAll('.game-panel-tabs button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === 'tools');
    });
    this._renderPanel('tools');
  }

  showAvatar() {
    if (!this._questPanel) this.showQuests();
    this._questPanel?.querySelectorAll('.game-panel-tabs button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === 'avatar');
    });
    this._renderPanel('avatar');
  }

  getGameState() {
    return JSON.parse(JSON.stringify(this._state));
  }

  _bind() {
    this.gestureEngine?.onAction?.((action) => {
      if (!action || action.phase !== 'complete' && action.phase !== 'start') return;
      const state = this._getAppState?.() || {};
      if (!state.currentTopic && action.name !== GestureActions.INSPECT) return;
      this._registerCombo(action.name);
      this._award(XP_TABLE.gesture, 'Gesture', { quiet: true });
      if (action.name === GestureActions.INSPECT) {
        this._bumpMetric('inspect', 1);
        this._award(XP_TABLE.inspect + (this._hasTool('scanner_lens') ? 6 : 0), 'Inspect');
        if (this._hasTool('scanner_lens')) {
          this._toolPulse('scanner_lens', 'Scanner Lens');
          this.aiTutor?.coach?.('Scanner Lens bonus: compare live values before changing the object.', { kind: 'game' });
        }
      }
      if (action.name === GestureActions.ROTATE || action.name === GestureActions.SCALE) {
        this._award(XP_TABLE.transform, 'Transform');
      }
      if (action.name === GestureActions.SWIPE_UP || action.name === GestureActions.SWIPE_DOWN) {
        this._award(XP_TABLE.parameter, 'Parameter change', { quiet: true });
      }
      this._checkQuests();
      this._save();
      this._render();
    });

    this.interaction?.onObjectAction?.((event) => {
      if (event.actionName === GestureActions.INSPECT) {
        this._bumpMetric('inspect', 1);
        this._award(XP_TABLE.inspect + (this._hasTool('scanner_lens') ? 6 : 0), 'Object scanned');
        if (this._hasTool('scanner_lens')) this._toolPulse('scanner_lens', 'Scanner Lens');
      }
      if (event.actionName === GestureActions.ROTATE || event.actionName === GestureActions.SCALE) {
        this._award(XP_TABLE.transform, 'Object control', { quiet: true });
      }
      this._checkQuests();
      this._save();
      this._render();
    });
  }

  _registerCombo(actionName) {
    const now = Date.now();
    const comboWindow = this._hasTool('combo_stabilizer') ? 5200 : 3600;
    if (now - this._lastGestureAt < comboWindow) this._state.streak++;
    else this._state.streak = 1;
    this._lastGestureAt = now;
    this._state.bestCombo = Math.max(this._state.bestCombo, this._state.streak);
    this._bumpMetric('labGestures', 1);
    if (this._state.streak === 3) this._toastMessage('Combo x3');
    if (this._state.streak === 5) {
      this._toastMessage(`Combo x5: ${actionName}`);
      this._trailBurst('combo');
    }
  }

  _award(amount, label, options = {}) {
    if (!amount) return;
    const beforeLevel = this._state.level;
    this._state.xp += amount;
    this._state.level = levelForXp(this._state.xp);
    if (this._state.level > beforeLevel) {
      this._unlockBadge(`Level ${this._state.level}`);
      this._toastMessage(`Level up: ${this._state.level}`);
      this.aiTutor?.coach?.(`Level ${this._state.level} unlocked. New missions will expect cleaner observations.`, { kind: 'game' });
    } else if (!options.quiet && label) {
      this._toastMessage(`+${amount} XP ${label}`);
    }
    if (amount >= 10) this._trailBurst('xp');
  }

  _bumpMetric(metric, count) {
    this._state.metrics[metric] = (this._state.metrics[metric] || 0) + count;
  }

  _checkQuests() {
    QUESTS.forEach(quest => {
      if (this._state.completedQuests.includes(quest.id)) return;
      if ((this._state.metrics[quest.metric] || 0) >= quest.goal) {
        this._state.completedQuests.push(quest.id);
        this._award(quest.reward, quest.title);
        this._unlockBadge(quest.title);
        this._unlockEligibleTools();
        this._toastMessage(`Quest complete: ${quest.title}`);
      }
    });
  }

  _unlockEligibleTools() {
    TOOLS.forEach(tool => {
      if (tool.isUnlocked(this._state)) this._unlockBadge(tool.name);
    });
    if (!this._state.activeTool) {
      const first = TOOLS.find(tool => tool.isUnlocked(this._state));
      if (first) this._equipTool(first.id);
    }
  }

  _unlockBadge(label) {
    if (!label || this._state.unlockedBadges.includes(label)) return;
    this._state.unlockedBadges.push(label);
  }

  _questCard(quest) {
    const done = this._state.completedQuests.includes(quest.id);
    const value = Math.min(this._state.metrics[quest.metric] || 0, quest.goal);
    const card = document.createElement('article');
    card.className = `game-quest-card ${done ? 'complete' : ''}`;
    card.innerHTML = `
      <strong>${quest.title}</strong>
      <p>${quest.detail}</p>
      <div><span style="width:${Math.round((value / quest.goal) * 100)}%"></span></div>
      <small>${value} / ${quest.goal} - ${quest.reward} XP</small>
    `;
    return card;
  }

  _toolCard(tool) {
    const unlocked = tool.isUnlocked(this._state);
    const active = this._state.activeTool === tool.id;
    const card = document.createElement('article');
    card.className = `game-tool-card ${unlocked ? 'unlocked' : 'locked'} ${active ? 'active' : ''}`;
    card.innerHTML = `
      <div>
        <strong>${tool.name}</strong>
        <p>${unlocked ? tool.effect : tool.unlock}</p>
      </div>
      <button type="button" ${unlocked ? '' : 'disabled'}>${active ? 'Equipped' : unlocked ? 'Equip' : 'Locked'}</button>
    `;
    card.querySelector('button').addEventListener('click', () => this._equipTool(tool.id));
    return card;
  }

  _badgeCard(label) {
    const card = document.createElement('span');
    card.className = 'game-badge-chip';
    card.textContent = label;
    return card;
  }

  _renderPanel(view = 'quests') {
    if (!this._questPanel) return;
    const list = this._questPanel.querySelector('.quest-list');
    if (!list) return;
    list.innerHTML = '';
    if (view === 'tools') {
      TOOLS.forEach(tool => list.appendChild(this._toolCard(tool)));
      return;
    }
    if (view === 'badges') {
      if (!this._state.unlockedBadges.length) {
        const empty = document.createElement('p');
        empty.className = 'game-empty';
        empty.textContent = 'No badges yet. Complete quests or level up.';
        list.appendChild(empty);
        return;
      }
      this._state.unlockedBadges.forEach(label => list.appendChild(this._badgeCard(label)));
      return;
    }
    if (view === 'avatar') {
      list.appendChild(this._avatarSummary());
      list.appendChild(this._cosmeticGroup('Theme', 'theme', COSMETICS.themes));
      list.appendChild(this._cosmeticGroup('Title', 'title', COSMETICS.titles));
      list.appendChild(this._cosmeticGroup('Trail', 'trail', COSMETICS.trails));
      return;
    }
    QUESTS.forEach(quest => list.appendChild(this._questCard(quest)));
  }

  _equipTool(toolId) {
    const tool = TOOLS.find(item => item.id === toolId);
    if (!tool || !tool.isUnlocked(this._state)) return;
    this._state.activeTool = toolId;
    this._toastMessage(`Equipped: ${tool.name}`);
    this._save();
    this._render();
    this._renderPanel('tools');
  }

  _hasTool(toolId) {
    return this._state.activeTool === toolId;
  }

  _avatarSummary() {
    const theme = COSMETICS.themes.find(item => item.id === this._state.avatar.theme) || COSMETICS.themes[0];
    const title = COSMETICS.titles.find(item => item.id === this._state.avatar.title) || COSMETICS.titles[0];
    const trail = COSMETICS.trails.find(item => item.id === this._state.avatar.trail) || COSMETICS.trails[0];
    const card = document.createElement('article');
    card.className = 'avatar-summary-card';
    card.style.setProperty('--avatar-accent', theme.color);
    card.innerHTML = `
      <div class="avatar-mark">${this._avatarInitial(title.name)}</div>
      <div>
        <strong>${title.name}</strong>
        <p>${theme.name} / ${trail.name}</p>
      </div>
    `;
    return card;
  }

  _cosmeticGroup(label, key, items) {
    const group = document.createElement('section');
    group.className = 'cosmetic-group';
    group.innerHTML = `<h3>${label}</h3>`;
    const grid = document.createElement('div');
    grid.className = 'cosmetic-grid';
    items.forEach(item => grid.appendChild(this._cosmeticCard(key, item)));
    group.appendChild(grid);
    return group;
  }

  _cosmeticCard(key, item) {
    const unlocked = item.isUnlocked(this._state);
    const active = this._state.avatar[key] === item.id;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `cosmetic-card ${unlocked ? 'unlocked' : 'locked'} ${active ? 'active' : ''}`;
    if (item.color) card.style.setProperty('--cosmetic-accent', item.color);
    card.innerHTML = `
      <span></span>
      <strong>${item.name}</strong>
      <small>${unlocked ? active ? 'Equipped' : 'Available' : item.unlock}</small>
    `;
    card.disabled = !unlocked;
    card.addEventListener('click', () => this._equipCosmetic(key, item.id));
    return card;
  }

  _equipCosmetic(key, id) {
    const groups = { theme: COSMETICS.themes, title: COSMETICS.titles, trail: COSMETICS.trails };
    const item = groups[key]?.find(entry => entry.id === id);
    if (!item || !item.isUnlocked(this._state)) return;
    this._state.avatar[key] = id;
    this._toastMessage(`Equipped ${item.name}`);
    this._save();
    this._render();
    this._renderPanel('avatar');
  }

  _avatarInitial(title) {
    return String(title || 'Explorer').slice(0, 1).toUpperCase();
  }

  _buildHud() {
    const hud = document.createElement('button');
    hud.id = 'game-hud';
    hud.type = 'button';
    hud.title = 'Game quests and XP';
    hud.addEventListener('click', () => this.showQuests());
    document.body.appendChild(hud);
    this._hud = hud;
  }

  _buildEffectsLayer() {
    const layer = document.createElement('div');
    layer.id = 'game-effects-layer';
    document.body.appendChild(layer);
    this._effectsLayer = layer;
  }

  _render() {
    if (!this._hud) return;
    const nextLevelXp = Math.pow(this._state.level, 2) * 90;
    const prevLevelXp = Math.pow(this._state.level - 1, 2) * 90;
    const levelProgress = Math.max(0, Math.min(100, ((this._state.xp - prevLevelXp) / Math.max(1, nextLevelXp - prevLevelXp)) * 100));
    const theme = COSMETICS.themes.find(item => item.id === this._state.avatar.theme) || COSMETICS.themes[0];
    const title = COSMETICS.titles.find(item => item.id === this._state.avatar.title) || COSMETICS.titles[0];
    const tool = TOOLS.find(item => item.id === this._state.activeTool);
    this._hud.style.setProperty('--game-accent', theme.color);
    this._hud.innerHTML = `
      <span>${title.name} / LV ${this._state.level}</span>
      <strong>${this._state.xp} XP</strong>
      <i><b style="width:${levelProgress}%"></b></i>
      <small>${tool ? tool.name : 'No tool'} / Combo ${this._state.streak}</small>
    `;
    if (this._questPanel) {
      const activeView = this._questPanel.querySelector('.game-panel-tabs button.active')?.dataset?.view || 'quests';
      this._renderPanel(activeView);
    }
  }

  _toastMessage(message) {
    if (!message) return;
    if (!this._toast) {
      const toast = document.createElement('div');
      toast.id = 'game-toast';
      document.body.appendChild(toast);
      this._toast = toast;
    }
    this._toast.textContent = message;
    this._toast.classList.remove('visible');
    requestAnimationFrame(() => this._toast?.classList.add('visible'));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this._toast?.classList.remove('visible'), 1500);
  }

  _toolPulse(toolId, label) {
    if (!this._effectsLayer) return;
    const theme = COSMETICS.themes.find(item => item.id === this._state.avatar.theme) || COSMETICS.themes[0];
    const pulse = document.createElement('div');
    pulse.className = `tool-effect-pulse tool-${toolId}`;
    pulse.style.setProperty('--tool-accent', theme.color);
    pulse.textContent = label || 'Tool';
    this._effectsLayer.appendChild(pulse);
    setTimeout(() => pulse.remove(), 1200);
    this._trailBurst('tool');
  }

  _trailBurst(kind = 'xp') {
    if (!this._effectsLayer || this._state.avatar.trail === 'none') return;
    const theme = COSMETICS.themes.find(item => item.id === this._state.avatar.theme) || COSMETICS.themes[0];
    const trail = this._state.avatar.trail;
    const count = trail === 'mastery' ? 14 : trail === 'combo' ? 10 : 7;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('span');
      dot.className = `game-trail-dot trail-${trail} burst-${kind}`;
      dot.style.setProperty('--trail-accent', theme.color);
      dot.style.setProperty('--tx', `${Math.round((Math.random() - 0.5) * 180)}px`);
      dot.style.setProperty('--ty', `${Math.round(-40 - Math.random() * 120)}px`);
      dot.style.setProperty('--delay', `${Math.random() * 0.16}s`);
      this._effectsLayer.appendChild(dot);
      setTimeout(() => dot.remove(), 1000);
    }
  }

  _load() {
    try { return { ...defaults(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
    catch { return defaults(); }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
  }
}
