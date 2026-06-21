import { SKY_CONFIG } from './skyConfig.js';
import { getSavedObserverLocation } from './observerLocation.js';

let state = createInitialSkyState();
const listeners = new Set();

export function createInitialSkyState() {
  const saved = getSavedObserverLocation();
  return {
    observerLocation: saved || { ...SKY_CONFIG.defaultLocation, timestamp: Date.now() },
    currentDateTime: new Date(),
    timeMode: SKY_CONFIG.defaultTimeMode,
    timeSpeed: 1,
    timeAnimationActive: false,
    arMode: 'off',
    cameraOverlayActive: false,
    arSessionActive: false,
    arAlignmentConfidence: 'unknown',
    arStatusMessage: '',
    arLabelDensity: 'normal',
    arUpdateRate: 'balanced',
    voiceGuideEnabled: false,
    teacherModeEnabled: false,
    activeTourId: null,
    activeTourStepIndex: 0,
    tourStatus: 'idle',
    learningSessionActive: false,
    learningSessionId: null,
    diagnosticsOpen: false,
    manualOverlayOffset: { x: 0, y: 0 },
    cameraPermissionStatus: 'unknown',
    arPermissionStatus: 'unknown',
    showDeepSkyObjects: false,
    deepSkyFilter: 'binoculars',
    selectedDeepSkyObjectId: null,
    meteorModeEnabled: false,
    activeMeteorShowerId: null,
    skyCalendarOpen: false,
    observationPlannerOpen: false,
    planetariumModeActive: false,
    planetariumSequenceId: 'tonights-sky',
    planetariumStepIndex: 0,
    achievementsOpen: false,
    voiceCommandsEnabled: false,
    voiceCommandStatus: 'stopped',
    lastVoiceCommand: '',
    offlineStatus: 'unknown',
    performancePreset: 'balanced',
    accessibilityPreferences: {},
    exportPanelOpen: false,
    highlightedEventId: null,
    alignmentMode: SKY_CONFIG.defaultAlignmentMode,
    sensorMode: 'off',
    locationMode: saved ? 'saved' : 'default',
    selectedObjectId: null,
    lockedObjectId: null,
    pointingMode: 'off',
    pointingTargetId: null,
    pointingAltDeg: null,
    pointingAzDeg: null,
    pointingNearestObject: null,
    pointingAccuracyDeg: null,
    guidanceMode: 'off',
    guidanceTargetId: null,
    guidanceOffset: null,
    guidanceText: '',
    selectedConstellationId: null,
    highlightedConstellationId: null,
    showStars: SKY_CONFIG.showStarsDefault,
    showPlanets: SKY_CONFIG.showPlanetsDefault,
    showSun: SKY_CONFIG.showSunDefault,
    showMoon: SKY_CONFIG.showMoonDefault,
    showLabels: SKY_CONFIG.showLabelsDefault,
    showHorizon: SKY_CONFIG.showHorizonDefault,
    showBelowHorizon: SKY_CONFIG.showBelowHorizonDefault,
    showConstellations: SKY_CONFIG.showConstellationsDefault,
    magnitudeLimit: SKY_CONFIG.defaultMagnitudeLimit,
    visibilityFilter: 'beginner',
    visibleHighlights: [],
    sensorReliability: 'unknown',
    calibrationState: { active: false, headingOffsetDeg: 0, reliability: 'unknown', samples: [] },
    labelDensity: 'normal',
    observationLogOpen: false,
    tutorialOpen: false,
    nightMode: false,
    searchQuery: '',
    calibration: { headingOffsetDeg: 0 },
    statusMessages: [],
    lastUpdatedAt: Date.now(),
    errors: [],
  };
}

export const getSkyState = () => state;

export function updateSkyState(partial) {
  state = { ...state, ...partial, lastUpdatedAt: Date.now() };
  listeners.forEach(listener => listener(state));
  return state;
}

export function subscribeSkyState(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function resetSkyState() {
  state = createInitialSkyState();
  listeners.forEach(listener => listener(state));
  return state;
}
