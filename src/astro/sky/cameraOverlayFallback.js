let stream = null;
let activeVideo = null;

export function isCameraOverlaySupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export async function startCameraOverlay(videoElement, options = {}) {
  if (!isCameraOverlaySupported()) {
    return { ok: false, state: 'unsupported', message: 'Camera overlay is not supported by this browser.' };
  }
  if (typeof window !== 'undefined' && !window.isSecureContext && location.hostname !== 'localhost') {
    return { ok: false, state: 'insecure', message: 'Camera overlay needs a secure browser context.' };
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    activeVideo = videoElement;
    activeVideo.srcObject = stream;
    activeVideo.setAttribute('playsinline', 'true');
    activeVideo.muted = true;
    await activeVideo.play();
    options.onStatus?.('Camera sky overlay active.');
    return { ok: true, state: 'active', message: 'Camera sky overlay active.' };
  } catch (error) {
    const message = error?.name === 'NotAllowedError'
      ? 'Camera permission denied. Normal sky map remains available.'
      : 'Camera overlay could not start. Normal sky map remains available.';
    options.onStatus?.(message);
    return { ok: false, state: 'failed', error, message };
  }
}

export function stopCameraOverlay() {
  stream?.getTracks?.().forEach(track => track.stop());
  if (activeVideo) activeVideo.srcObject = null;
  stream = null;
  activeVideo = null;
  return { ok: true, message: 'Camera overlay stopped.' };
}

export function getCameraOverlayState() {
  return { active: Boolean(stream), hasVideo: Boolean(activeVideo) };
}

export function createCameraPermissionMessage(result) {
  if (result?.ok) return 'Camera is used locally for live overlay only. No image or video is uploaded.';
  return result?.message || 'Camera overlay unavailable. You can still use the normal sky map.';
}
