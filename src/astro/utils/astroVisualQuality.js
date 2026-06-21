import { DynamicTexture, GlowLayer, ParticleSystem, Color4, Vector3 } from '@babylonjs/core';

const STORAGE_KEY = 'cosmiclearn_astro_quality';
const PRESETS = {
  low: { particleCount: 260, dustCount: 90, glowIntensity: 0.45, shadows: false, textureUsage: false, animationDensity: 0.55 },
  medium: { particleCount: 760, dustCount: 180, glowIntensity: 0.85, shadows: false, textureUsage: false, animationDensity: 1 },
  high: { particleCount: 1500, dustCount: 360, glowIntensity: 1.18, shadows: false, textureUsage: false, animationDensity: 1.35 },
};

function mobileDefault() {
  const coarse = matchMedia?.('(pointer: coarse)')?.matches;
  const narrow = window.innerWidth < 760;
  return coarse || narrow ? 'low' : 'medium';
}

export function getQualityPreset() {
  try { return localStorage.getItem(STORAGE_KEY) || mobileDefault(); }
  catch { return mobileDefault(); }
}

export function setQualityPreset(preset) {
  const safe = PRESETS[preset] ? preset : 'medium';
  try { localStorage.setItem(STORAGE_KEY, safe); } catch (_) {}
  return safe;
}

export function applySceneQuality(scene, presetName = getQualityPreset()) {
  const preset = PRESETS[presetName] || PRESETS.medium;
  scene.getEngine?.().setHardwareScalingLevel?.(presetName === 'low' ? 1.35 : 1);
  return preset;
}

export function createGlowLayer(scene, options = {}) {
  const glow = new GlowLayer(options.name || 'astro_quality_glow', scene);
  glow.intensity = options.intensity ?? (PRESETS[getQualityPreset()] || PRESETS.medium).glowIntensity;
  return glow;
}

function dotTexture(scene, name, color = '#ffffff') {
  const tex = new DynamicTexture(name, { width: 8, height: 8 }, scene);
  const ctx = tex.getContext();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(4, 4, 3, 0, Math.PI * 2);
  ctx.fill();
  tex.update();
  return tex;
}

export function createStarfield(scene, options = {}) {
  const preset = PRESETS[options.quality || getQualityPreset()] || PRESETS.medium;
  const count = options.count || preset.particleCount;
  const stars = new ParticleSystem(options.name || 'astro_quality_starfield', count, scene);
  stars.particleTexture = dotTexture(scene, `${stars.name}_tex`, '#ffffff');
  stars.createSphereEmitter(options.radius || 160, 0.85);
  stars.minEmitPower = 0;
  stars.maxEmitPower = 0;
  stars.minLifeTime = 99999;
  stars.maxLifeTime = 99999;
  stars.emitRate = count;
  stars.minSize = 0.04;
  stars.maxSize = options.maxSize || 0.22;
  stars.color1 = new Color4(1, 1, 1, 0.9);
  stars.color2 = new Color4(0.55, 0.75, 1, 0.68);
  stars.colorDead = new Color4(0, 0, 0, 0);
  stars.blendMode = ParticleSystem.BLENDMODE_ADD;
  stars.start();
  return stars;
}

export function createSpaceDust(scene, options = {}) {
  const preset = PRESETS[options.quality || getQualityPreset()] || PRESETS.medium;
  const count = options.count || preset.dustCount;
  const dust = new ParticleSystem(options.name || 'astro_space_dust', count, scene);
  dust.particleTexture = dotTexture(scene, `${dust.name}_tex`, '#9fdcff');
  dust.createSphereEmitter(options.radius || 60, 0.45);
  dust.minEmitPower = 0.005;
  dust.maxEmitPower = 0.025;
  dust.minLifeTime = 12;
  dust.maxLifeTime = 28;
  dust.emitRate = count / 3;
  dust.minSize = 0.015;
  dust.maxSize = 0.08;
  dust.color1 = new Color4(0.55, 0.75, 1, 0.18);
  dust.color2 = new Color4(1, 1, 1, 0.08);
  dust.colorDead = new Color4(0, 0, 0, 0);
  dust.gravity = new Vector3(0, 0, 0);
  dust.start();
  return dust;
}

export function disposeVisualEffects(context) {
  context?.starfield?.dispose?.();
  context?.dust?.dispose?.();
  context?.glow?.dispose?.();
}

export const ASTRO_QUALITY_PRESETS = PRESETS;
