let xrHelper = null;
let xrSessionActive = false;

export async function isWebXRARSupported() {
  try {
    return Boolean(navigator.xr && await navigator.xr.isSessionSupported?.('immersive-ar'));
  } catch {
    return false;
  }
}

export async function startWebXRARSky(scene, skyContext = {}, options = {}) {
  options.onStatus?.('Checking AR support.');
  if (!await isWebXRARSupported()) {
    options.onStatus?.('AR unavailable on this browser.');
    return { ok: false, mode: 'unavailable', message: 'AR unavailable on this browser.' };
  }
  try {
    if (!xrHelper) {
      xrHelper = await scene.createDefaultXRExperienceAsync({
        uiOptions: { sessionMode: 'immersive-ar', referenceSpaceType: 'local-floor' },
        optionalFeatures: true,
      });
    }
    await xrHelper.baseExperience.enterXRAsync('immersive-ar', 'local-floor');
    xrSessionActive = true;
    xrHelper.baseExperience.sessionManager.onXRSessionEnded.addOnce(() => {
      xrSessionActive = false;
      options.onStatus?.('AR session ended.');
    });
    updateARObjects(skyContext.objects || [], skyContext.state || {}, skyContext);
    options.onStatus?.('AR Sky active.');
    return { ok: true, mode: 'webxr', helper: xrHelper, message: 'AR Sky active.' };
  } catch (error) {
    xrSessionActive = false;
    options.onStatus?.('AR permission denied or cancelled.');
    return { ok: false, mode: 'unavailable', error, message: 'AR permission denied or cancelled.' };
  }
}

export async function stopWebXRARSky() {
  try {
    await xrHelper?.baseExperience?.exitXRAsync?.();
  } catch (_) {}
  xrSessionActive = false;
  return { ok: true, message: 'AR session ended.' };
}

export function createARAnchorForSkyObject(object, context = {}) {
  return {
    id: object.id,
    name: object.name,
    altitudeDeg: object.altitudeDeg,
    azimuthDeg: object.azimuthDeg,
    virtualDistance: context.virtualDistance || 8,
  };
}

export function updateARObjects(objects, state, context = {}) {
  return objects
    .filter(object => object.isAboveHorizon || state.showBelowHorizon)
    .slice(0, state.arLabelDensity === 'detailed' ? 32 : state.arLabelDensity === 'minimal' ? 10 : 18)
    .map(object => createARAnchorForSkyObject(object, context));
}

export function disposeAROverlay() {
  return stopWebXRARSky();
}

export const getWebXRARState = () => ({ xrSessionActive, hasHelper: Boolean(xrHelper) });
