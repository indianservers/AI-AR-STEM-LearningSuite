export const getLocationPermissionExplanation = () => 'Location helps place the stars, Moon, Sun, and planets correctly for your sky. Without it, the app uses a demo sky.';
export const getSensorPermissionExplanation = () => 'Phone sensors help the sky move as you point your mobile device. If unavailable, you can still drag the sky manually.';
export const getARPermissionExplanation = () => 'AR overlay places sky labels over your camera view where supported. Accuracy depends on browser and sensor support.';

export function createPermissionResultMessage(type, result) {
  if (result?.ok) return `${type} permission active.`;
  return result?.message || `${type} permission is unavailable.`;
}
