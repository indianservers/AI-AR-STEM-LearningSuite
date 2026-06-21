import { DEEP_SKY_CATALOG } from './deepSkyCatalog.js';
import { METEOR_SHOWER_CATALOG } from './meteorShowers.js';

export function runSkyMapSelfAudit(context = {}) {
  return {
    locationSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    sensorsSupported: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
    arSupported: typeof navigator !== 'undefined' && Boolean(navigator.xr),
    cameraSupported: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
    astronomyEngineAvailable: true,
    starCatalogueLoaded: (context.starCount || 0) > 0,
    deepSkyCatalogueLoaded: DEEP_SKY_CATALOG.length,
    meteorCatalogueLoaded: METEOR_SHOWER_CATALOG.length,
    rendererActive: Boolean(context.rendererActive),
    cleanupBagActive: Boolean(context.cleanupActive),
    currentMode: context.state?.arMode || context.state?.alignmentMode || 'unknown',
    objectCount: context.objectCount || 0,
    knownLimitations: getSkyMapKnownLimitations(),
  };
}

export function getSkyMapFeatureChecklist() {
  return ['Location permission', 'Device sensors', 'WebXR AR fallback', 'Camera overlay fallback', 'Astronomy Engine', 'Star catalogue', 'Deep-sky catalogue', 'Meteor showers', 'Sky calendar', 'Observation planner', 'Planetarium mode', 'Voice commands optional', 'Offline catalogue readiness', 'Accessibility preferences', 'Cleanup paths'];
}

export function getSkyMapKnownLimitations() {
  return ['AR alignment depends on browser sensors.', 'WebXR support varies by device and browser.', 'Deep-sky visibility is estimated.', 'Meteor shower activity is approximate.', 'No weather or cloud integration.', 'Educational use only, not navigation or telescope pointing.'];
}
