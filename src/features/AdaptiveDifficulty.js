// Feature 2: Adaptive Difficulty - tracks engagement and recommends missions
const KEY = 'cosmiclearn_adaptive';

export class AdaptiveDifficulty {
  constructor() {
    this._data = this._load();
  }

  _load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }

  _save() { localStorage.setItem(KEY, JSON.stringify(this._data)); }

  record(labId, interactionCount = 0) {
    const d = this._entry(labId);
    d.visits++;
    d.interactions += interactionCount;
    d.lastSeen = Date.now();
    this._save();
  }

  recordGesture(labId, actionName) {
    if (!labId || !actionName) return;
    const d = this._entry(labId);
    d.interactions++;
    d.gestures[actionName] = (d.gestures[actionName] || 0) + 1;
    d.lastSeen = Date.now();
    this._save();
  }

  recordChallengeResult(labId, success) {
    if (!labId) return;
    const d = this._entry(labId);
    d.challenges++;
    if (success) d.challengeWins++;
    d.lastSeen = Date.now();
    this._save();
  }

  getProfile(labId) {
    const d = this._entry(labId);
    const level = this.getLevel(labId);
    const labels = ['Beginner', 'Intermediate', 'Advanced'];
    const challengeRate = d.challenges ? d.challengeWins / d.challenges : 0;
    return { ...d, level, label: labels[level], challengeRate };
  }

  /** Returns 0 (beginner) | 1 (intermediate) | 2 (advanced) */
  getLevel(labId) {
    const d = this._data[labId];
    if (!d || d.visits < 2) return 0;
    if (d.visits < 5 || d.interactions < 24 || d.challengeWins < 2) return 1;
    return 2;
  }

  getSuggestion(currentLabId) {
    const profile = this.getProfile(currentLabId);
    return `${profile.label} Mission`;
  }

  getRecommendedMission(labId) {
    const level = this.getLevel(labId);
    if (level === 0) return 'Inspect one object, then make one slow change.';
    if (level === 1) return 'Change one parameter twice and explain the pattern.';
    return 'Create a before/after comparison and predict the next state.';
  }

  _entry(labId) {
    const key = labId || 'global';
    if (!this._data[key]) {
      this._data[key] = {
        visits: 0,
        interactions: 0,
        challenges: 0,
        challengeWins: 0,
        gestures: {},
        lastSeen: 0,
      };
    }
    return this._data[key];
  }

  reset() { this._data = {}; this._save(); }
}
