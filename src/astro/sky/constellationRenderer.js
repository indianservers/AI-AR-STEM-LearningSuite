import { Color3, MeshBuilder, Vector3 } from '@babylonjs/core';
import { createSkyCleanupBag, addSkyDisposable, cleanupSkyBag } from './skyCleanup.js';

export function createConstellationRenderer(scene, options = {}) {
  const cleanup = createSkyCleanupBag();
  let resources = [];
  let visible = false;
  let highlightedId = null;

  function clear() {
    resources.forEach(resource => resource.dispose?.());
    resources = [];
  }

  function makeLine(name, from, to, highlighted) {
    const line = MeshBuilder.CreateLines(`astro_constellation_${name}`, { points: [from.clone(), to.clone()] }, scene);
    line.color = highlighted ? new Color3(1, 0.86, 0.26) : new Color3(0.35, 0.65, 1);
    line.alpha = highlighted ? 0.9 : 0.34;
    line.isPickable = false;
    addSkyDisposable(cleanup, line);
    resources.push(line);
  }

  return {
    updateConstellations(constellations, visibleStarsByName, state) {
      clear();
      visible = Boolean(state.showConstellations);
      if (!visible) return;
      const only = state.highlightedConstellationId;
      const groups = only ? constellations.filter(item => item.id === only) : constellations;
      groups.forEach(group => {
        const highlighted = group.id === highlightedId || group.id === only;
        group.lines.forEach(([a, b]) => {
          const from = visibleStarsByName.get(a);
          const to = visibleStarsByName.get(b);
          if (!from || !to) return;
          makeLine(`${group.id}_${a}_${b}`, from.cartesianPosition, to.cartesianPosition, highlighted);
        });
        const labelStar = visibleStarsByName.get(group.majorStars[0]);
        if (labelStar && options.createLabel && highlighted) {
          const label = options.createLabel(group.name, labelStar.cartesianPosition.add(new Vector3(0, 26, 0)), true);
          resources.push(label);
        }
      });
    },
    highlightConstellation(constellationId) {
      highlightedId = constellationId;
    },
    clearHighlight() {
      highlightedId = null;
    },
    setVisible(nextVisible) {
      visible = nextVisible;
      resources.forEach(resource => resource.setEnabled?.(visible));
    },
    dispose() {
      clear();
      cleanupSkyBag(cleanup);
    },
  };
}
