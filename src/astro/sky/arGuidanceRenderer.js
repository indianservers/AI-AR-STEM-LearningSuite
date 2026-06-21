import { createGuidanceToObject } from './skyGuidance.js';

export function createARGuidanceRenderer(container, options = {}) {
  const el = document.createElement('div');
  el.className = 'ar-guidance-card';
  el.hidden = true;
  container.appendChild(el);
  return {
    updateGuidance(targetObject, currentPointing, alignmentState = {}) {
      if (!targetObject) return this.clearGuidance();
      const guidance = createGuidanceToObject(targetObject, currentPointing);
      if (!targetObject.isAboveHorizon) return this.showBelowHorizonState(targetObject);
      if (guidance?.centered) return this.showCenteredState(targetObject);
      this.showArrow(guidance?.arrow || 'near', `${guidance?.text || 'Move slowly.'} ${alignmentState.warning || ''}`);
    },
    showArrow(direction, text) {
      el.hidden = false;
      el.innerHTML = `<div class="ar-guidance-arrow">${direction}</div><p class="ar-guidance-text">${text}</p>`;
    },
    showCenteredState(object) {
      el.hidden = false;
      el.innerHTML = `<div class="ar-guidance-arrow centered">centered</div><p class="ar-guidance-text">${object.name} is centered.</p>`;
    },
    showBelowHorizonState(object) {
      el.hidden = false;
      el.innerHTML = `<div class="ar-guidance-arrow below">below</div><p class="ar-guidance-text">${object.name} is below the horizon from your current location.</p>`;
    },
    clearGuidance() {
      el.hidden = true;
      el.innerHTML = '';
    },
    dispose() { el.remove(); },
  };
}
