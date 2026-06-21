import { skyAltAzToScreenPosition } from './arAlignment.js';

export function createARLabelRenderer(container, options = {}) {
  const layer = document.createElement('div');
  layer.className = 'ar-label-layer';
  container.appendChild(layer);
  let selectedObjectId = null;
  let guidanceTargetId = null;
  let projectedObjects = [];

  function priority(object) {
    if (object.id === selectedObjectId || object.id === guidanceTargetId) return 100;
    if (object.type === 'moon') return 90;
    if (object.type === 'planet') return object.name === 'Jupiter' ? 88 : 80;
    if (object.type === 'sun') return 70;
    return Math.max(0, 40 - (object.apparentMagnitude || 6) * 8);
  }

  return {
    updateLabels(objects, state, alignment) {
      const rect = container.getBoundingClientRect();
      const max = state.arLabelDensity === 'detailed' ? 28 : state.arLabelDensity === 'minimal' ? 8 : 16;
      projectedObjects = objects
        .filter(object => (object.isAboveHorizon || state.showBelowHorizon) && (object.type !== 'sun' || state.showSun))
        .sort((a, b) => priority(b) - priority(a))
        .slice(0, max)
        .map(object => ({ object, ...skyAltAzToScreenPosition(object.altitudeDeg, object.azimuthDeg, alignment, { width: rect.width || innerWidth, height: rect.height || innerHeight }) }));
      layer.innerHTML = projectedObjects.map(item => {
        const edgeFade = item.inView ? 1 : 0.35;
        const selected = item.object.id === selectedObjectId ? ' selected' : '';
        const target = item.object.id === guidanceTargetId ? ' target' : '';
        const safety = item.object.type === 'sun' ? '<small>Do not look directly at the Sun.</small>' : '';
        return `<button class="ar-object-label${selected}${target}" data-ar-object="${item.object.id}" style="left:${Math.max(8, Math.min((rect.width || innerWidth) - 120, item.x))}px; top:${Math.max(8, Math.min((rect.height || innerHeight) - 58, item.y))}px; opacity:${edgeFade}">
          <strong>${item.object.name}</strong><span>${item.object.type}</span>${safety}
        </button>`;
      }).join('');
      layer.querySelectorAll('[data-ar-object]').forEach(button => {
        button.addEventListener('click', () => options.onObjectSelected?.(button.dataset.arObject));
      });
    },
    setSelectedObject(objectId) { selectedObjectId = objectId; },
    setGuidanceTarget(objectId) { guidanceTargetId = objectId; },
    setVisible(visible) { layer.hidden = !visible; },
    getProjectedObjects() { return projectedObjects; },
    dispose() { layer.remove(); projectedObjects = []; },
  };
}
