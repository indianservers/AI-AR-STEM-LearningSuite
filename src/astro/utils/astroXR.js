export function isWebXRAvailable() {
  return typeof navigator !== 'undefined' && Boolean(navigator.xr);
}

export async function enterAstroAR(scene, options = {}) {
  if (!isWebXRAvailable()) return { ok: false, message: 'WebXR AR is unavailable on this browser.' };
  try {
    const helper = await scene.createDefaultXRExperienceAsync({
      uiOptions: { sessionMode: 'immersive-ar' },
      optionalFeatures: ['hit-test', 'anchors', 'light-estimation'],
      ...options,
    });
    return { ok: true, helper, message: 'Astro AR session started.' };
  } catch (_) {
    return { ok: false, message: 'Astro AR could not start on this device.' };
  }
}

export async function enterAstroVR(scene, options = {}) {
  if (!isWebXRAvailable()) return { ok: false, message: 'WebXR VR is unavailable on this browser.' };
  try {
    const helper = await scene.createDefaultXRExperienceAsync({
      uiOptions: { sessionMode: 'immersive-vr' },
      optionalFeatures: true,
      ...options,
    });
    return { ok: true, helper, message: 'Astro VR session started.' };
  } catch (_) {
    return { ok: false, message: 'Astro VR could not start on this device.' };
  }
}

export async function exitAstroXR(helper) {
  try {
    await helper?.baseExperience?.exitXRAsync?.();
    return { ok: true, message: 'Astro XR session ended.' };
  } catch (_) {
    return { ok: false, message: 'Astro XR session could not be ended cleanly.' };
  }
}
