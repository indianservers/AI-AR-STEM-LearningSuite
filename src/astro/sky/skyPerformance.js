export function createPerformanceMonitor() {
  let last = performance.now();
  let frames = 0;
  let fps = 60;
  return {
    tick() {
      frames += 1;
      const now = performance.now();
      if (now - last >= 1000) {
        fps = Math.round((frames * 1000) / (now - last));
        frames = 0;
        last = now;
      }
      return fps;
    },
    getFPS: () => fps,
  };
}

export function getRecommendedQualityMode(deviceInfo = {}, fps = 60) {
  if (fps < 24 || deviceInfo.mobile) return 'battery-saver';
  if (fps > 50 && deviceInfo.classroomDisplay) return 'classroom-display';
  return 'balanced';
}

export function applySkyPerformancePreset(preset, context = {}) {
  const settings = {
    'battery-saver': { labelDensity: 'minimal', arUpdateRate: 'battery-saver', meteorAnimation: false, glow: false },
    balanced: { labelDensity: 'normal', arUpdateRate: 'balanced', meteorAnimation: true, glow: true },
    'high-quality': { labelDensity: 'detailed', arUpdateRate: 'smooth', meteorAnimation: true, glow: true },
    'classroom-display': { labelDensity: 'detailed', arUpdateRate: 'balanced', meteorAnimation: true, glow: true },
  }[preset] || {};
  context.updateState?.({ performancePreset: preset, labelDensity: settings.labelDensity, arUpdateRate: settings.arUpdateRate });
  return settings;
}

export function throttleSkyUpdates(callback, intervalMs) {
  let last = 0;
  return (...args) => {
    const now = performance.now();
    if (now - last >= intervalMs) {
      last = now;
      return callback(...args);
    }
    return undefined;
  };
}

export const pauseNonEssentialEffects = () => ({ effectsPaused: true });
export const resumeNonEssentialEffects = () => ({ effectsPaused: false });
