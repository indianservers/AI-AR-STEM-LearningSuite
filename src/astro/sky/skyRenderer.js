import { Color3, DynamicTexture, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import { SKY_CONFIG } from './skyConfig.js';
import { createSkyCleanupBag, addSkyDisposable, cleanupSkyBag } from './skyCleanup.js';
import { isWithinVisibleSky, objectTypeToRenderStyle, projectObjectToDome } from './skyProjection.js';
import { orientationToSkyCameraRotation } from './deviceSensors.js';
import { createConstellationRenderer } from './constellationRenderer.js';
import { altAzToUnitVector } from './skyGuidance.js';

export function createSkyRenderer(scene, options = {}) {
  const cleanup = createSkyCleanupBag();
  const objects = new Map();
  const materials = new Map();
  const labels = new Map();
  let horizonMeshes = [];
  let selectedHighlight = null;
  let lockedHighlight = null;
  let guidanceLine = null;
  let guidanceTarget = null;
  let pointingMarker = null;
  let reticle = null;
  let lockedObjectId = null;
  const constellationRenderer = createConstellationRenderer(scene, { createLabel });

  const materialFor = (key, color, alpha = 1, emissive = 0.8) => {
    const matKey = `${key}_${alpha}_${emissive}`;
    if (materials.has(matKey)) return materials.get(matKey);
    const mat = new StandardMaterial(`astro_sky_${matKey}`, scene);
    mat.diffuseColor = color;
    mat.emissiveColor = color.scale(emissive);
    mat.alpha = alpha;
    mat.backFaceCulling = false;
    addSkyDisposable(cleanup, mat);
    materials.set(matKey, mat);
    return mat;
  };

  function createLabel(text, position, visible = true) {
    const plane = MeshBuilder.CreatePlane(`astro_sky_label_${text.replace(/\W+/g, '_')}`, { width: 58, height: 15 }, scene);
    plane.position = position.clone();
    plane.billboardMode = 7;
    plane.isPickable = false;
    const tex = new DynamicTexture(`astro_sky_label_tex_${text}`, { width: 512, height: 128 }, scene);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(2, 8, 22, 0.72)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#eef7ff';
    ctx.font = '700 44px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    tex.update();
    const mat = new StandardMaterial(`astro_sky_label_mat_${text}`, scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    plane.material = mat;
    plane.setEnabled(visible);
    addSkyDisposable(cleanup, tex);
    addSkyDisposable(cleanup, mat);
    addSkyDisposable(cleanup, plane);
    return plane;
  }

  function buildStaticSky() {
    const dome = MeshBuilder.CreateSphere('astro_real_sky_dome', { diameter: SKY_CONFIG.skyRadius * 2, segments: 48 }, scene);
    dome.material = materialFor('dome', new Color3(0.005, 0.011, 0.035), 0.38, 0.7);
    dome.isPickable = false;
    addSkyDisposable(cleanup, dome);

    const horizon = createRing('horizon', SKY_CONFIG.horizonRadius, new Color3(0.18, 0.9, 0.86));
    horizonMeshes.push(horizon);
    [
      ['North', new Vector3(0, 18, -SKY_CONFIG.horizonRadius)],
      ['East', new Vector3(SKY_CONFIG.horizonRadius, 18, 0)],
      ['South', new Vector3(0, 18, SKY_CONFIG.horizonRadius)],
      ['West', new Vector3(-SKY_CONFIG.horizonRadius, 18, 0)],
      ['Zenith', new Vector3(0, SKY_CONFIG.skyRadius, 0)],
    ].forEach(([name, position]) => {
      const label = createLabel(name, position, true);
      horizonMeshes.push(label);
    });
  }

  function createRing(name, radius, color) {
    const points = [];
    for (let i = 0; i <= 192; i++) {
      const angle = (Math.PI * 2 * i) / 192;
      points.push(new Vector3(Math.sin(angle) * radius, 0, -Math.cos(angle) * radius));
    }
    const ring = MeshBuilder.CreateLines(`astro_sky_${name}`, { points }, scene);
    ring.color = color;
    ring.isPickable = false;
    addSkyDisposable(cleanup, ring);
    return ring;
  }

  function makeMarker(object, state) {
    const style = objectTypeToRenderStyle(object);
    const alpha = object.altitudeDeg < 0 ? 0.16 : 1;
    const mesh = MeshBuilder.CreateSphere(`astro_sky_obj_${object.id}`, { diameter: style.diameter, segments: object.type === 'star' ? 8 : 24 }, scene);
    mesh.position = projectObjectToDome(object, SKY_CONFIG.skyRadius);
    mesh.material = materialFor(object.type + object.name, style.color, alpha, style.emissive);
    mesh.metadata = { skyObjectId: object.id };
    mesh.isPickable = true;
    mesh.actionManager = null;
    mesh.onDisposeObservable.add(() => options.interaction?.unregister?.(mesh));
    options.interaction?.register?.(mesh, () => options.onObjectSelected?.(object), null, {
      metadata: { title: object.name, type: object.type, summary: object.visibilityExplanation },
      capabilities: { canMove: false, canThrow: false, canScale: false },
    });
    addSkyDisposable(cleanup, mesh);
    objects.set(object.id, { object, mesh });

    if (object.name === 'Saturn') {
      const ring = MeshBuilder.CreateTorus(`astro_sky_saturn_ring_${object.id}`, { diameter: style.diameter * 1.7, thickness: 0.45, tessellation: 48 }, scene);
      ring.position = mesh.position.clone();
      ring.rotation.x = Math.PI / 2.25;
      ring.material = materialFor('saturn-ring', new Color3(1, 0.86, 0.58), alpha, 0.7);
      ring.isPickable = false;
      addSkyDisposable(cleanup, ring);
    }

    const density = state.labelDensity || 'normal';
    const threshold = density === 'minimal' ? 0 : density === 'detailed' ? 3.5 : 2.2;
    const shouldLabel = state.showLabels && (style.label || object.labelPriority <= 2 || (object.apparentMagnitude ?? 9) <= threshold);
    if (shouldLabel) {
      const label = createLabel(object.name, mesh.position.add(new Vector3(0, style.diameter * 1.2 + 12, 0)), true);
      labels.set(object.id, label);
    }
  }

  function clearDynamicObjects() {
    objects.forEach(({ mesh }) => {
      options.interaction?.unregister?.(mesh);
      mesh.dispose?.();
    });
    labels.forEach(label => label.dispose?.());
    objects.clear();
    labels.clear();
    selectedHighlight?.dispose?.();
    selectedHighlight = null;
  }

  buildStaticSky();

  return {
    updateSkyObjects(skyObjects, state) {
      clearDynamicObjects();
      skyObjects
        .filter(object => isWithinVisibleSky(object.altitudeDeg, state.showBelowHorizon))
        .forEach(object => makeMarker(object, state));
      const starsByName = new Map(skyObjects.filter(object => object.type === 'star').map(object => [object.name, object]));
      constellationRenderer.updateConstellations(options.constellations || [], starsByName, state);
      this.setSelectedObject(state.selectedObjectId);
      this.setLockedObject(state.lockedObjectId);
      this.setHorizonVisible(state.showHorizon);
      this.setLabelsVisible(state.showLabels);
      this.setViewReticleVisible(state.pointingMode === 'active');
    },
    updateCameraForSensor(orientation, state) {
      const camera = scene.activeCamera;
      if (!camera || !orientation) return;
      const rotation = orientationToSkyCameraRotation(orientation, state.calibration);
      camera.alpha = rotation.alpha;
      camera.beta = rotation.beta;
      if (lockedObjectId && objects.has(lockedObjectId)) camera.target = objects.get(lockedObjectId).mesh.position.clone();
    },
    setSelectedObject(objectId) {
      selectedHighlight?.dispose?.();
      selectedHighlight = null;
      if (!objectId || !objects.has(objectId)) return;
      const mesh = objects.get(objectId).mesh;
      selectedHighlight = MeshBuilder.CreateTorus(`astro_sky_selected_${objectId}`, { diameter: Math.max(16, mesh.getBoundingInfo().boundingSphere.radius * 3.6), thickness: 0.75, tessellation: 64 }, scene);
      selectedHighlight.position = mesh.position.clone();
      selectedHighlight.billboardMode = 7;
      selectedHighlight.material = materialFor('selected', new Color3(0.3, 1, 0.85), 0.92, 0.9);
      selectedHighlight.isPickable = false;
      addSkyDisposable(cleanup, selectedHighlight);
    },
    setLockedObject(objectId) {
      lockedObjectId = objectId;
      lockedHighlight?.dispose?.();
      lockedHighlight = null;
      if (!objectId || !objects.has(objectId)) return;
      const mesh = objects.get(objectId).mesh;
      lockedHighlight = MeshBuilder.CreateTorus(`astro_sky_locked_${objectId}`, { diameter: Math.max(22, mesh.getBoundingInfo().boundingSphere.radius * 4.8), thickness: 1.1, tessellation: 64 }, scene);
      lockedHighlight.position = mesh.position.clone();
      lockedHighlight.billboardMode = 7;
      lockedHighlight.material = materialFor('locked', new Color3(1, 0.86, 0.28), 0.86, 0.95);
      lockedHighlight.isPickable = false;
      addSkyDisposable(cleanup, lockedHighlight);
    },
    setGuidanceTarget(object) {
      guidanceTarget = object;
      guidanceLine?.dispose?.();
      guidanceLine = null;
      if (!object?.isAboveHorizon) return;
      const start = Vector3.Zero();
      const end = projectObjectToDome(object, SKY_CONFIG.skyRadius * 0.92);
      guidanceLine = MeshBuilder.CreateLines(`astro_sky_guidance_${object.id}`, { points: [start, end] }, scene);
      guidanceLine.color = new Color3(1, 0.86, 0.28);
      guidanceLine.isPickable = false;
      addSkyDisposable(cleanup, guidanceLine);
    },
    clearGuidanceTarget() {
      guidanceTarget = null;
      guidanceLine?.dispose?.();
      guidanceLine = null;
    },
    setPointingDirection(altAz) {
      pointingMarker?.dispose?.();
      pointingMarker = null;
      if (!altAz) return;
      const pos = altAzToUnitVector(altAz.altitudeDeg, altAz.azimuthDeg).scale(SKY_CONFIG.skyRadius * 0.94);
      pointingMarker = MeshBuilder.CreateTorus('astro_sky_pointing_marker', { diameter: 28, thickness: 0.9, tessellation: 64 }, scene);
      pointingMarker.position = pos;
      pointingMarker.billboardMode = 7;
      pointingMarker.material = materialFor('pointing', new Color3(0.55, 1, 0.9), 0.85, 0.9);
      pointingMarker.isPickable = false;
      addSkyDisposable(cleanup, pointingMarker);
    },
    setViewReticleVisible(visible) {
      if (!reticle) {
        reticle = MeshBuilder.CreateTorus('astro_sky_view_reticle', { diameter: 20, thickness: 0.6, tessellation: 48 }, scene);
        reticle.position = new Vector3(0, 0, -SKY_CONFIG.skyRadius * 0.38);
        reticle.billboardMode = 7;
        reticle.material = materialFor('reticle', new Color3(0.5, 0.9, 1), 0.5, 0.8);
        reticle.isPickable = false;
        addSkyDisposable(cleanup, reticle);
      }
      reticle.setEnabled(Boolean(visible));
    },
    centerOnObject(object) {
      if (!object || !scene.activeCamera) return;
      scene.activeCamera.target = projectObjectToDome(object, SKY_CONFIG.skyRadius);
    },
    highlightConstellation(constellationId) {
      constellationRenderer.highlightConstellation(constellationId);
    },
    clearConstellationHighlight() {
      constellationRenderer.clearHighlight();
    },
    updateLabelDensity() {
      // Density is applied on the next updateSkyObjects call.
    },
    setLabelsVisible(visible) {
      labels.forEach(label => label.setEnabled(visible));
    },
    setHorizonVisible(visible) {
      horizonMeshes.forEach(mesh => mesh.setEnabled(visible));
    },
    resize() {},
    dispose() {
      clearDynamicObjects();
      constellationRenderer.dispose();
      cleanupSkyBag(cleanup);
      materials.clear();
      horizonMeshes = [];
    },
  };
}
