import { Color3, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import { SKY_CONFIG } from './skyConfig.js';
import { cleanupSkyBag, createSkyCleanupBag } from './skyCleanup.js';
import { projectObjectToDome } from './skyProjection.js';

export function createDeepSkyRenderer(scene, options = {}) {
  const cleanup = createSkyCleanupBag();
  const meshes = new Map();
  const dynamicMaterials = new Set();
  let visible = true;
  let selectedObjectId = null;
  let deepSkyMode = 'normal';
  let selectedRing = null;

  const materialFor = (key, color, alpha) => {
    const mat = new StandardMaterial(`astro_deep_sky_${key}`, scene);
    mat.diffuseColor = color;
    mat.emissiveColor = color.scale(0.75);
    mat.alpha = alpha;
    mat.backFaceCulling = false;
    dynamicMaterials.add(mat);
    return mat;
  };

  const colors = {
    nebula: new Color3(0.85, 0.42, 0.76),
    galaxy: new Color3(0.75, 0.82, 1),
    'open-cluster': new Color3(0.78, 0.94, 1),
    'globular-cluster': new Color3(1, 0.86, 0.58),
    'milky-way-region': new Color3(0.52, 0.74, 1),
  };

  function disposeObjects() {
    meshes.forEach(entry => entry.parts.forEach(part => part.dispose?.()));
    dynamicMaterials.forEach(mat => mat.dispose?.());
    meshes.clear();
    dynamicMaterials.clear();
    selectedRing?.dispose?.();
    selectedRing = null;
  }

  function createObject(object, state) {
    const pos = projectObjectToDome(object, SKY_CONFIG.skyRadius * 0.985);
    const alpha = object.isAboveHorizon ? (deepSkyMode === 'premium' ? 0.72 : 0.48) : 0.16;
    const color = colors[object.objectType] || colors.nebula;
    const parts = [];
    let main;

    if (object.objectType === 'galaxy') {
      main = MeshBuilder.CreateDisc(`astro_deep_sky_${object.id}`, { radius: 7, tessellation: 48 }, scene);
      main.scaling.x = 1.8;
    } else if (object.objectType === 'open-cluster') {
      main = MeshBuilder.CreateSphere(`astro_deep_sky_${object.id}`, { diameter: 6, segments: 8 }, scene);
      for (let i = 0; i < 5; i++) {
        const dot = MeshBuilder.CreateSphere(`astro_deep_sky_${object.id}_star_${i}`, { diameter: 1.6, segments: 6 }, scene);
        dot.position = pos.add(new Vector3((i - 2) * 2.2, (i % 2) * 2.1, 0));
        dot.material = materialFor(`${object.id}_dot_${i}`, color, alpha);
        dot.isPickable = false;
        parts.push(dot);
      }
    } else if (object.objectType === 'globular-cluster') {
      main = MeshBuilder.CreateSphere(`astro_deep_sky_${object.id}`, { diameter: 9, segments: 16 }, scene);
    } else if (object.objectType === 'milky-way-region') {
      main = MeshBuilder.CreateDisc(`astro_deep_sky_${object.id}`, { radius: 18, tessellation: 64 }, scene);
      main.scaling.x = 2.4;
    } else {
      main = MeshBuilder.CreateDisc(`astro_deep_sky_${object.id}`, { radius: 8, tessellation: 48 }, scene);
    }

    main.position = pos;
    main.billboardMode = 7;
    main.material = materialFor(object.id, color, alpha);
    main.metadata = { skyObjectId: object.id };
    main.isPickable = true;
    options.interaction?.register?.(main, () => options.onObjectSelected?.(object), null, {
      metadata: { title: object.name, type: 'deep-sky', summary: object.visibilityNote },
      capabilities: { canMove: false, canThrow: false, canScale: false },
    });
    parts.unshift(main);
    parts.forEach(part => {
      part.setEnabled(visible);
    });
    meshes.set(object.id, { object, parts, main });
  }

  function updateSelected() {
    selectedRing?.dispose?.();
    selectedRing = null;
    if (!selectedObjectId || !meshes.has(selectedObjectId)) return;
    const mesh = meshes.get(selectedObjectId).main;
    selectedRing = MeshBuilder.CreateTorus(`astro_deep_sky_selected_${selectedObjectId}`, { diameter: 26, thickness: 0.9, tessellation: 64 }, scene);
    selectedRing.position = mesh.position.clone();
    selectedRing.billboardMode = 7;
    selectedRing.material = materialFor(`selected_${selectedObjectId}`, new Color3(0.92, 0.72, 1), 0.88);
    selectedRing.setEnabled(visible);
    addSkyDisposable(cleanup, selectedRing);
  }

  return {
    updateDeepSkyObjects(objects, state) {
      disposeObjects();
      if (!state.showDeepSkyObjects) return;
      const limit = state.performancePreset === 'battery-saver' ? 10 : state.deepSkyFilter === 'all' ? 24 : 16;
      objects.slice(0, limit).forEach(object => createObject(object, state));
      updateSelected();
    },
    setVisible(nextVisible) {
      visible = Boolean(nextVisible);
      meshes.forEach(entry => entry.parts.forEach(part => part.setEnabled(visible)));
      selectedRing?.setEnabled(visible);
    },
    setSelectedObject(objectId) {
      selectedObjectId = objectId;
      updateSelected();
    },
    setDeepSkyMode(mode) {
      deepSkyMode = mode || 'normal';
    },
    dispose() {
      disposeObjects();
      cleanupSkyBag(cleanup);
    },
  };
}
