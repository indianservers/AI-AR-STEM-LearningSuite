import '../sky/skyMap.css';
import { SKY_CONFIG } from '../sky/skyConfig.js';
import { createSkyRenderer } from '../sky/skyRenderer.js';
import { createInitialSkyState, getSkyState, resetSkyState, updateSkyState } from '../sky/skyState.js';
import { requestObserverLocation, createLocationStatusMessage, stopWatchingObserverLocation } from '../sky/observerLocation.js';
import {
  calibrateNorth,
  getLastOrientation,
  requestDeviceOrientationPermission,
  startDeviceOrientationTracking,
  stopDeviceOrientationTracking,
} from '../sky/deviceSensors.js';
import { getSolarSystemObjects } from '../sky/ephemerisEngine.js';
import { getVisibleStars } from '../sky/starCatalogNakedEye.js';
import { buildSkySearchIndex, findSkyObjectById, searchSkyObjects, azimuthToDirectionText } from '../sky/skySearch.js';
import { createRealtimeClock, formatDateTimeForInput, formatSkyTime, parseDateTimeInput, stepTime, stopRealtimeClock } from '../sky/skyTime.js';
import { getARPermissionExplanation, getLocationPermissionExplanation, getSensorPermissionExplanation } from '../sky/skyPermissions.js';
import {
  addSkyEventCleanup,
  addSkyIntervalCleanup,
  createSkyCleanupBag,
  cleanupSkyBag,
} from '../sky/skyCleanup.js';
import { CONSTELLATION_CATALOG, findConstellationById } from '../sky/constellationCatalog.js';
import { createGuidanceToObject, findNearestVisibleObject, formatLookDirection, formatPointingAccuracyNote, getPointedSkyDirection, getPointingSummary } from '../sky/skyGuidance.js';
import { estimateSkyCondition, getVisibilityExplanation, getVisibilityGrade, sortVisibleHighlights } from '../sky/skyVisibility.js';
import { getRiseSetTransit } from '../sky/riseSetEngine.js';
import { getSkyHighlights } from '../sky/skyEvents.js';
import { buildConstellationInfo, buildObjectInfoCard } from '../sky/skyObjectInfo.js';
import { calibrateNorthFromCurrentHeading, getCalibrationInstructions, resetCalibration } from '../sky/skyCalibration.js';
import { clearSkyObservations, createObservationEntry, deleteSkyObservation, getSkyObservations, saveSkyObservation } from '../sky/skyObservationTools.js';
import { getARAlignmentExplanation, getARSkyTutorialSteps, getMisconceptionCorrection, getObjectChallenge, getSkyMapTutorialSteps, getTeacherPrompt } from '../sky/skyTutorials.js';
import { disposeAROverlay, isWebXRARSupported, startWebXRARSky, stopWebXRARSky, updateARObjects } from '../sky/arSkyOverlay.js';
import { createCameraPermissionMessage, isCameraOverlaySupported, startCameraOverlay, stopCameraOverlay } from '../sky/cameraOverlayFallback.js';
import { createAlignmentModel, estimateAlignmentConfidence, findObjectNearScreenPoint, getAlignmentWarning, updateAlignmentFromCalibration, updateAlignmentFromSensor } from '../sky/arAlignment.js';
import { createARLabelRenderer } from '../sky/arLabelRenderer.js';
import { createARGuidanceRenderer } from '../sky/arGuidanceRenderer.js';
import { buildTourStepGuidance, getAvailableSkyTours, getCurrentTourStep, nextTourStep, previousTourStep, startSkyTour, stopSkyTour } from '../sky/skyTours.js';
import { buildTourNarration, buildVoiceGuideText, isSpeechSupported, speakTextIfEnabled, stopSpeaking } from '../sky/skyVoiceGuide.js';
import { createTeacherSkySession, formatTeacherExplanation, getClassroomQuestions, getMisconceptionCards, getTeacherPrompts } from '../sky/teacherSkyMode.js';
import { getSavedSkySessions, getSkySessionSummary, recordSkySessionEvent, startSkySessionRecording, stopSkySessionRecording } from '../sky/skySessionRecorder.js';
import { buildSkyDiagnostics } from '../sky/skyDiagnostics.js';
import { getVisibleDeepSkyObjects } from '../sky/deepSkyCatalog.js';
import { createDeepSkyRenderer } from '../sky/deepSkyRenderer.js';
import { getActiveMeteorShowers, getMeteorShowerRadiantPosition, formatMeteorShowerInfo } from '../sky/meteorShowers.js';
import { formatCalendarEvent, getSkyEventsForDate } from '../sky/skyEventCalendar.js';
import { addObjectToObservationPlan, clearObservationPlan, createObservationPlan, getObservationPlan, markObservationPlanItem, removeObjectFromObservationPlan } from '../sky/observationPlanner.js';
import { getPlanetariumSequences, nextPlanetariumScene, previousPlanetariumScene, startPlanetariumMode, stopPlanetariumMode } from '../sky/planetariumMode.js';
import { getSkyAchievements, unlockSkyAchievement } from '../sky/skyAchievements.js';
import { getVoiceCommandHelp, isVoiceCommandSupported, startVoiceCommands, stopVoiceCommands } from '../sky/skyVoiceCommands.js';
import { cacheSkyData, getCachedSkyDataStatus, getOfflineCapabilitySummary, isOfflineMode } from '../sky/offlineSkyCache.js';
import { applySkyPerformancePreset, createPerformanceMonitor } from '../sky/skyPerformance.js';
import { applyAccessibilityPreferences, loadAccessibilityPreferences, saveAccessibilityPreferences } from '../sky/skyAccessibility.js';
import { copySkySummaryToClipboard, createSkySnapshotSummary, downloadLearningSessionSummary, downloadObservationPlan, shareSkyObject } from '../sky/skyExportShare.js';
import { runSkyMapSelfAudit } from '../sky/skyFinalAudit.js';

export class ARSkyMap {
  constructor(context) {
    this.context = context;
    this.scene = context.scene;
    this.astroScene = context.astroScene;
    this.interaction = context.interaction;
    this._panel = null;
    this._renderer = null;
    this._cleanup = createSkyCleanupBag();
    this._solarSystemObjects = [];
    this._stars = [];
    this._deepSkyObjects = [];
    this._meteorShowers = [];
    this._skyCalendarEvents = [];
    this._skyObjects = [];
    this._searchIndex = [];
    this._clockId = null;
    this._ephemerisInterval = null;
    this._timeTravelTimer = null;
    this._lastOrientation = null;
    this._arContainer = null;
    this._arVideo = null;
    this._arLabels = null;
    this._arGuidance = null;
    this._alignment = createAlignmentModel();
    this._arUpdateTimer = null;
    this._deepSkyRenderer = null;
    this._performanceMonitor = createPerformanceMonitor();
  }

  show() {
    this.astroScene.beginScene('skyMap');
    resetSkyState();
    this._buildPanel();
    this._renderer = createSkyRenderer(this.scene, {
      interaction: this.interaction,
      constellations: CONSTELLATION_CATALOG,
      onObjectSelected: object => this._selectObject(object.id),
    });
    this._deepSkyRenderer = createDeepSkyRenderer(this.scene, {
      interaction: this.interaction,
      onObjectSelected: object => this._selectObject(object.id),
    });
    const accessibility = loadAccessibilityPreferences();
    updateSkyState({ accessibilityPreferences: accessibility });
    applyAccessibilityPreferences(accessibility);
    this._refreshSkyData('Real sky engine initialized with demo or saved location.');
    unlockSkyAchievement('first-sky-view');
    this._startRealtime();
    this.context.info.show({
      title: 'AR Sky Map',
      concepts: ['Real sky', 'Location', 'Time', 'Altitude', 'Azimuth'],
      goal: 'Identify planets, stars, the Moon, and the Sun using your location and current time.',
      observe: 'Tap a marker or search Jupiter, Moon, Venus, Sirius, Polaris, Mars, or Saturn.',
      explanation: 'Educational sky map. Sensor alignment is approximate.',
      tryThis: 'Enable Location from the card when you are ready to align the sky to where you are.',
      misconception: 'This is not for navigation or scientific telescope pointing.',
    });
  }

  _buildPanel() {
    this._panel?.remove();
    const state = getSkyState();
    const panel = document.createElement('div');
    panel.className = 'astro-sky-real-panel';
    panel.innerHTML = `
      <header class="astro-sky-header">
        <div>
          <p class="astro-kicker">AR Sky Map</p>
          <h3>AR Sky Map</h3>
          <p>Point your phone at the sky to identify planets, stars, the Moon, and the Sun using your location and current time.</p>
        </div>
        <div class="astro-sky-badges" data-badges></div>
      </header>
      <section class="astro-sky-permissions">
        <article>
          <strong>Enable Location</strong>
          <p>${getLocationPermissionExplanation()}</p>
          <button type="button" data-action="enable-location">Enable Location</button>
        </article>
        <article>
          <strong>Enable Phone Sensors</strong>
          <p>${getSensorPermissionExplanation()}</p>
          <button type="button" data-action="enable-sensors">Enable Phone Sensors</button>
        </article>
      </section>
      <section class="astro-sky-controls">
        <div class="astro-sky-control-row">
          <button type="button" data-action="time-realtime">Real Time</button>
          <button type="button" data-action="time-manual">Manual Time</button>
          <input data-control="datetime" type="datetime-local" value="${formatDateTimeForInput(state.currentDateTime)}" />
          <button type="button" data-action="now">Now</button>
        </div>
        <label>Search
          <input data-control="search" type="search" placeholder="Search Moon, Jupiter, Venus, Sirius, Polaris..." autocomplete="off" />
        </label>
        <div class="astro-sky-quick-search" aria-label="Quick sky searches">
          ${['Jupiter', 'Moon', 'Venus', 'Mars', 'Saturn', 'Sirius', 'Polaris', 'Orion', 'Pleiades', 'Andromeda'].map(item => `<button type="button" data-quick-search="${item}">${item}</button>`).join('')}
        </div>
        <div data-search-results class="astro-sky-search-results"></div>
        <label>Magnitude limit <b data-mag-label>${state.magnitudeLimit.toFixed(1)}</b>
          <input data-control="magnitude" type="range" min="0" max="6" step="0.1" value="${state.magnitudeLimit}" />
        </label>
        <div class="astro-sky-toggle-grid">
          ${[
            ['showLabels', 'Labels'],
            ['showStars', 'Stars'],
            ['showPlanets', 'Planets'],
            ['showSun', 'Sun'],
            ['showMoon', 'Moon'],
            ['showHorizon', 'Horizon'],
            ['showBelowHorizon', 'Below Horizon'],
            ['nightMode', 'Night Mode'],
          ].map(([key, label]) => `<label><input data-toggle="${key}" type="checkbox" ${state[key] ? 'checked' : ''} /> ${label}</label>`).join('')}
        </div>
        <div class="astro-sky-control-row">
          <button type="button" data-action="reset-view">Reset View</button>
          <button type="button" data-action="lock">Lock Selected</button>
          <button type="button" data-action="guide">Guide Me</button>
          <button type="button" data-action="center">Center in View</button>
          <button type="button" data-action="show-path">Show Path</button>
          <button type="button" data-action="clear">Clear Selection</button>
          <button type="button" data-action="calibrate">Calibrate North</button>
          <button type="button" data-action="disable-sensors">Disable Sensors</button>
          <button type="button" data-action="ar-overlay">AR Overlay</button>
        </div>
      </section>
      <details class="astro-sky-section" open>
        <summary>AR Camera Overlay</summary>
        <div class="astro-sky-control-row">
          <button type="button" data-action="start-webxr-ar">Start AR Sky</button>
          <button type="button" data-action="start-camera-overlay">Camera Overlay</button>
          <button type="button" data-action="exit-ar">Exit AR</button>
          <button type="button" data-action="normal-sky">Normal Sky Map</button>
        </div>
        <label>AR label density
          <select data-control="ar-label-density">
            <option value="minimal">minimal</option>
            <option value="normal" selected>normal</option>
            <option value="detailed">detailed</option>
          </select>
        </label>
        <label>AR update rate
          <select data-control="ar-update-rate">
            <option value="battery-saver">battery-saver</option>
            <option value="balanced" selected>balanced</option>
            <option value="smooth">smooth</option>
          </select>
        </label>
        <div data-ar-status class="astro-sky-live-card">${getARPermissionExplanation()}</div>
      </details>
      <details class="astro-sky-section">
        <summary>Guided Sky Tours</summary>
        <label>Tour
          <select data-control="sky-tour">
            ${getAvailableSkyTours().map(tour => `<option value="${tour.id}">${tour.title}</option>`).join('')}
          </select>
        </label>
        <div class="astro-sky-control-row">
          <button type="button" data-action="start-tour">Start tour</button>
          <button type="button" data-action="prev-tour">Back</button>
          <button type="button" data-action="next-tour">Next</button>
          <button type="button" data-action="guide-tour-step">Guide this step</button>
          <button type="button" data-action="stop-tour">Stop</button>
        </div>
        <div data-tour-panel class="astro-sky-live-card">Choose a tour to begin.</div>
      </details>
      <details class="astro-sky-section">
        <summary>Voice, Teacher, Session</summary>
        <div class="astro-sky-control-row">
          <label><input data-toggle="voiceGuideEnabled" type="checkbox" /> Voice Guide</label>
          <label><input data-toggle="teacherModeEnabled" type="checkbox" /> Teacher Sky Mode</label>
          <button type="button" data-action="start-session">Start Learning Session</button>
          <button type="button" data-action="end-session">End Session</button>
        </div>
        <div data-teacher-panel class="astro-sky-live-card">Teacher mode is optional. Use it for classroom prompts and big-label discussion.</div>
        <div data-session-panel class="astro-sky-live-card">No learning session active.</div>
      </details>
      <details class="astro-sky-section">
        <summary>Diagnostics</summary>
        <button type="button" data-action="refresh-diagnostics">Refresh Diagnostics</button>
        <div data-diagnostics-panel class="astro-sky-live-card">Diagnostics are hidden until refreshed.</div>
      </details>
      <details class="astro-sky-section">
        <summary>Premium Planetarium</summary>
        <label>Sequence
          <select data-control="planetarium-sequence">
            ${getPlanetariumSequences().map(seq => `<option value="${seq.id}">${seq.title}</option>`).join('')}
          </select>
        </label>
        <div class="astro-sky-control-row">
          <button type="button" data-action="start-planetarium">Start Planetarium</button>
          <button type="button" data-action="prev-planetarium">Back</button>
          <button type="button" data-action="next-planetarium">Next</button>
          <button type="button" data-action="stop-planetarium">Exit</button>
        </div>
        <div data-planetarium-panel class="astro-sky-live-card">Choose a cinematic sequence for classroom or self-guided learning.</div>
      </details>
      <details class="astro-sky-section">
        <summary>Deep Sky</summary>
        <div class="astro-sky-control-row">
          <label><input data-toggle="showDeepSkyObjects" type="checkbox" /> Deep Sky Objects</label>
          <select data-control="deep-sky-filter">
            <option value="naked-eye">naked-eye</option>
            <option value="binoculars" selected>binoculars</option>
            <option value="small-telescope">small telescope</option>
            <option value="dark-sky">dark sky only</option>
            <option value="all">all</option>
          </select>
        </div>
        <div data-deep-sky-panel class="astro-sky-highlight-grid"></div>
      </details>
      <details class="astro-sky-section">
        <summary>Meteor Showers</summary>
        <div class="astro-sky-control-row">
          <label><input data-toggle="meteorModeEnabled" type="checkbox" /> Meteor Mode</label>
          <button type="button" data-action="show-meteor-peak">Set to Peak</button>
        </div>
        <div data-meteor-panel class="astro-sky-live-card">Meteor showers are best viewed with eyes from a dark open sky.</div>
      </details>
      <details class="astro-sky-section">
        <summary>Sky Calendar</summary>
        <div class="astro-sky-control-row">
          <button type="button" data-action="calendar-today">Today</button>
          <button type="button" data-action="calendar-week">This Week</button>
        </div>
        <div data-calendar-panel class="astro-sky-highlight-grid"></div>
      </details>
      <details class="astro-sky-section">
        <summary>Observation Planner</summary>
        <div class="astro-sky-control-row">
          <button type="button" data-action="plan-tonight">Plan Tonight</button>
          <button type="button" data-action="add-selected-plan">Add Selected Object</button>
          <button type="button" data-action="download-plan">Download Plan</button>
          <button type="button" data-action="clear-plan">Clear Plan</button>
        </div>
        <div data-planner-panel class="astro-sky-observation-log"></div>
      </details>
      <details class="astro-sky-section">
        <summary>Achievements</summary>
        <div data-achievements-panel class="astro-sky-achievements"></div>
      </details>
      <details class="astro-sky-section">
        <summary>Voice Commands</summary>
        <div class="astro-sky-control-row">
          <button type="button" data-action="enable-voice-commands">Enable Voice Commands</button>
          <button type="button" data-action="stop-voice-commands">Stop Voice</button>
        </div>
        <div data-voice-panel class="astro-sky-live-card">Voice commands are optional and never start automatically.</div>
      </details>
      <details class="astro-sky-section">
        <summary>Offline, Performance, Accessibility, Export</summary>
        <label>Performance Mode
          <select data-control="performance-preset">
            <option value="battery-saver">Battery Saver</option>
            <option value="balanced" selected>Balanced</option>
            <option value="high-quality">High Quality</option>
            <option value="classroom-display">Classroom Display</option>
          </select>
        </label>
        <div class="astro-sky-toggle-grid">
          <label><input data-accessibility="highContrast" type="checkbox" /> High Contrast</label>
          <label><input data-accessibility="largeText" type="checkbox" /> Large Text</label>
          <label><input data-accessibility="reducedMotion" type="checkbox" /> Reduced Motion</label>
        </div>
        <div class="astro-sky-control-row">
          <button type="button" data-action="cache-offline">Cache Offline Prefs</button>
          <button type="button" data-action="copy-summary">Copy Summary</button>
          <button type="button" data-action="share-object">Share Object</button>
          <button type="button" data-action="download-session">Download Session</button>
        </div>
        <div data-offline-panel class="astro-sky-live-card"></div>
        <div data-a11y-panel class="astro-sky-live-card">Accessibility settings are local to this browser.</div>
      </details>
      <details class="astro-sky-section" open>
        <summary>Live Pointing</summary>
        <div class="astro-sky-control-row">
          <button type="button" data-action="pointing">What am I looking at?</button>
          <label><input data-toggle="pointingMode" type="checkbox" /> Live Identify</label>
        </div>
        <div data-pointing-panel class="astro-sky-live-card">Live identify is off.</div>
      </details>
      <details class="astro-sky-section" open>
        <summary>Guide</summary>
        <div data-guide-panel class="astro-sky-guide-card">Select an object, then tap Guide Me.</div>
      </details>
      <details class="astro-sky-section">
        <summary>Tonight's Highlights</summary>
        <div class="astro-sky-control-row">
          <button type="button" data-filter="beginner">Beginner</button>
          <button type="button" data-filter="planets">Planets only</button>
          <button type="button" data-filter="stars">Stars only</button>
          <button type="button" data-filter="high">High in sky</button>
        </div>
        <div data-highlights class="astro-sky-highlight-grid"></div>
      </details>
      <details class="astro-sky-section">
        <summary>Constellation Guide</summary>
        <label>Constellation
          <select data-control="constellation">
            <option value="">Choose a constellation</option>
            ${CONSTELLATION_CATALOG.map(item => `<option value="${item.id}">${item.name}</option>`).join('')}
          </select>
        </label>
        <div class="astro-sky-control-row">
          <button type="button" data-action="highlight-constellation">Highlight</button>
          <button type="button" data-action="highlight-orion">Highlight Orion</button>
          <button type="button" data-action="clear-constellation">Clear Lines</button>
        </div>
        <div data-constellation-info class="astro-sky-live-card">Constellation lines are simplified educational patterns.</div>
      </details>
      <details class="astro-sky-section">
        <summary>Time Travel</summary>
        <div class="astro-sky-control-row">
          <button type="button" data-time-step="-1:h">-1 hour</button>
          <button type="button" data-time-step="1:h">+1 hour</button>
          <button type="button" data-time-step="-1:d">-1 day</button>
          <button type="button" data-time-step="1:d">+1 day</button>
          <button type="button" data-action="play-time">Play time</button>
          <button type="button" data-action="pause-time">Pause</button>
          <select data-control="time-speed">
            <option value="1">realtime</option>
            <option value="10">10x</option>
            <option value="100">100x</option>
            <option value="1000">1000x</option>
          </select>
        </div>
        <p class="astro-panel-note" data-time-travel-label>Watch stars move because Earth rotates.</p>
      </details>
      <details class="astro-sky-section">
        <summary>Calibration Assistant</summary>
        <div data-calibration-panel class="astro-sky-live-card">${getCalibrationInstructions({ mode: state.sensorMode })}</div>
        <div class="astro-sky-control-row">
          <button type="button" data-action="calibrate">Calibrate North</button>
          <button type="button" data-action="reset-calibration">Reset Calibration</button>
        </div>
      </details>
      <details class="astro-sky-section">
        <summary>Observation Log</summary>
        <textarea data-observation-note rows="3" placeholder="What did you observe?"></textarea>
        <div class="astro-sky-control-row">
          <button type="button" data-action="log-observation">Log Observation</button>
          <button type="button" data-action="clear-observations">Clear Log</button>
        </div>
        <div data-observation-log class="astro-sky-observation-log"></div>
      </details>
      <details class="astro-sky-section">
        <summary>Help / Tutorial</summary>
        <ol>${getSkyMapTutorialSteps().map(step => `<li>${step}</li>`).join('')}</ol>
        <h4>Using AR Sky Mode</h4>
        <ol>${getARSkyTutorialSteps().map(step => `<li>${step}</li>`).join('')}</ol>
        <h4>Why AR Sky May Not Align Perfectly</h4>
        <ul>${getARAlignmentExplanation().map(step => `<li>${step}</li>`).join('')}</ul>
        <p>${getMisconceptionCorrection('earthRotation')}</p>
        <p>${getMisconceptionCorrection('polaris')}</p>
      </details>
      <section class="astro-sky-info" data-object-info>
        <p>Tap a star, planet, Sun, or Moon to learn about it.</p>
        <p>Search Jupiter, Moon, Venus, Sirius, Polaris, or Mars.</p>
      </section>
      <details class="astro-sky-accuracy" open>
        <summary>Accuracy & Safety</summary>
        <p>Educational sky map. Sensor alignment is approximate.</p>
        <p>Object visibility depends on weather, light pollution, horizon obstruction, twilight, and eyesight.</p>
        <p>Never look directly at the real Sun, especially through binoculars or telescopes.</p>
        <p>Use only certified solar filters for any optical Sun observation.</p>
        <p>Camera, microphone, and location permissions start only after you tap a control. Camera frames, audio, and video are not recorded or uploaded.</p>
        <p>This is not for navigation or scientific telescope pointing.</p>
      </details>
      <p class="astro-panel-note" data-status>${createLocationStatusMessage(state.observerLocation)}</p>
    `;
    document.body.appendChild(panel);
    this._panel = panel;
    this._buildAROverlayDOM();
    this._bindPanelEvents();
    this._renderBadges();
  }

  _buildAROverlayDOM() {
    this._arContainer?.remove();
    const container = document.createElement('div');
    container.className = 'ar-sky-overlay';
    container.hidden = true;
    container.innerHTML = `
      <video class="camera-overlay-video" data-ar-video autoplay playsinline muted></video>
      <div class="ar-status-bar" data-ar-overlay-status>AR overlay inactive.</div>
      <button type="button" class="ar-exit-button" data-ar-exit>Exit AR</button>
      <div class="ar-sun-warning" data-ar-sun-warning hidden>Avoid pointing your eyes or optical devices directly at the Sun.</div>
    `;
    document.body.appendChild(container);
    this._arContainer = container;
    this._arVideo = container.querySelector('[data-ar-video]');
    this._arLabels = createARLabelRenderer(container, { onObjectSelected: id => this._selectObject(id) });
    this._arGuidance = createARGuidanceRenderer(container);
    container.querySelector('[data-ar-exit]').addEventListener('click', () => this._exitARMode());
    container.addEventListener('click', event => {
      if (event.target.closest('[data-ar-object], [data-ar-exit]')) return;
      const near = this._arLabels?.getProjectedObjects?.() ? findObjectNearScreenPoint(event.clientX, event.clientY, this._arLabels.getProjectedObjects().map(item => ({ ...item, id: item.object.id }))) : null;
      if (near?.object?.id) this._selectObject(near.object.id);
    });
  }

  _bindPanelEvents() {
    addSkyEventCleanup(this._cleanup, this._panel, 'click', event => this._handleClick(event));
    addSkyEventCleanup(this._cleanup, this._panel, 'input', event => this._handleInput(event));
    addSkyEventCleanup(this._cleanup, this._panel, 'change', event => this._handleChange(event));
    addSkyEventCleanup(this._cleanup, window, 'keydown', event => this._handleKeyboardShortcut(event));
  }

  _handleKeyboardShortcut(event) {
    if (event.target?.matches?.('input, textarea, select')) return;
    const key = event.key.toLowerCase();
    if (key === '/') { event.preventDefault(); this._panel?.querySelector('[data-control="search"]')?.focus(); }
    if (key === 'escape') { this._exitARMode(); updateSkyState({ guidanceMode: 'off', guidanceTargetId: null }); this._renderGuidePanel(); }
    if (key === 'n') { updateSkyState({ nightMode: !getSkyState().nightMode }); document.body.classList.toggle('astro-sky-night-mode', getSkyState().nightMode); this._renderSky(); }
    if (key === 'g') this._startGuidance();
    if (key === 'l') { updateSkyState({ showLabels: !getSkyState().showLabels }); this._renderSky(); }
    if (key === 't') this._panel?.querySelector('[data-control="datetime"]')?.focus();
  }

  async _handleClick(event) {
    const guideResult = event.target.closest('[data-guide-id]');
    if (guideResult) {
      this._selectObject(guideResult.dataset.guideId);
      this._startGuidance();
      return;
    }
    const result = event.target.closest('[data-result-id]');
    if (result) {
      this._selectObject(result.dataset.resultId);
      return;
    }
    const highlight = event.target.closest('[data-highlight-id]');
    if (highlight) {
      this._selectObject(highlight.dataset.highlightId);
      return;
    }
    const quickSearch = event.target.closest('[data-quick-search]');
    if (quickSearch) {
      const query = quickSearch.dataset.quickSearch;
      const input = this._panel?.querySelector('[data-control="search"]');
      if (input) input.value = query;
      updateSkyState({ searchQuery: query });
      this._renderSearchResults(query);
      const first = searchSkyObjects(query, this._searchIndex, { limit: 1 })[0];
      if (first) this._selectObject(first.id);
      return;
    }
    const addPlan = event.target.closest('[data-add-plan-id]');
    if (addPlan) {
      const object = findSkyObjectById(addPlan.dataset.addPlanId, this._searchIndex);
      if (object) {
        addObjectToObservationPlan(object, getSkyState().currentDateTime, 'Added from search result.');
        unlockSkyAchievement('first-observation-plan');
        this._renderPlannerPanel();
        this._status(`Added ${object.name || object.title} to the observation plan.`);
      }
      return;
    }
    const filter = event.target.closest('[data-filter]');
    if (filter) {
      updateSkyState({ visibilityFilter: filter.dataset.filter });
      this._renderHighlights();
      return;
    }
    const timeStep = event.target.closest('[data-time-step]');
    if (timeStep) {
      const [amount, unitShort] = timeStep.dataset.timeStep.split(':');
      this._stepTime(Number(amount), unitShort === 'h' ? 'hour' : 'day');
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'enable-location') await this._enableLocation();
    if (action === 'enable-sensors') await this._enableSensors();
    if (action === 'disable-sensors') this._disableSensors();
    if (action === 'calibrate') this._calibrateNorth();
    if (action === 'time-realtime') this._setRealtimeMode();
    if (action === 'time-manual') this._setManualMode();
    if (action === 'now') this._useNow();
    if (action === 'reset-view') this.context.module?.resetView?.();
    if (action === 'lock') this._lockSelected();
    if (action === 'guide') this._startGuidance();
    if (action === 'center') this._centerSelected();
    if (action === 'show-path') this._showPathToSelected();
    if (action === 'clear') this._selectObject(null);
    if (action === 'ar-overlay') await this.startARSkyOverlay();
    if (action === 'start-webxr-ar') await this._startWebXRARMode();
    if (action === 'start-camera-overlay') await this._startCameraOverlayMode();
    if (action === 'exit-ar') await this._exitARMode();
    if (action === 'normal-sky') await this._exitARMode();
    if (action === 'start-tour') this._startSelectedTour();
    if (action === 'next-tour') this._moveTour(1);
    if (action === 'prev-tour') this._moveTour(-1);
    if (action === 'stop-tour') this._stopTour();
    if (action === 'guide-tour-step') this._guideCurrentTourStep();
    if (action === 'start-session') this._startLearningSession();
    if (action === 'end-session') this._endLearningSession();
    if (action === 'refresh-diagnostics') this._renderDiagnostics();
    if (action === 'start-planetarium') this._startPlanetarium();
    if (action === 'next-planetarium') this._movePlanetarium(1);
    if (action === 'prev-planetarium') this._movePlanetarium(-1);
    if (action === 'stop-planetarium') this._stopPlanetarium();
    if (action === 'show-meteor-peak') this._setActiveMeteorPeakDate();
    if (action === 'calendar-today') this._renderCalendarPanel();
    if (action === 'calendar-week') this._renderCalendarPanel(7);
    if (action === 'plan-tonight') this._planTonight();
    if (action === 'add-selected-plan') this._addSelectedToPlan();
    if (action === 'download-plan') downloadObservationPlan(getObservationPlan(), getSkyState());
    if (action === 'clear-plan') { clearObservationPlan(); this._renderPlannerPanel(); }
    if (action === 'enable-voice-commands') this._enableVoiceCommands();
    if (action === 'stop-voice-commands') this._stopVoiceCommands();
    if (action === 'cache-offline') this._cacheOfflinePreferences();
    if (action === 'copy-summary') this._copySelectedSummary();
    if (action === 'share-object') this._shareSelectedObject();
    if (action === 'download-session') downloadLearningSessionSummary(getSkySessionSummary() || getSavedSkySessions()[0] || {});
    if (action === 'pointing') this._togglePointingMode();
    if (action === 'highlight-constellation') this._highlightSelectedConstellation();
    if (action === 'highlight-orion') this._highlightConstellation('orion');
    if (action === 'clear-constellation') this._highlightConstellation(null);
    if (action === 'play-time') this._playTimeTravel();
    if (action === 'pause-time') this._pauseTimeTravel();
    if (action === 'reset-calibration') this._resetCalibration();
    if (action === 'log-observation') this._logObservation();
    if (action === 'clear-observations') this._clearObservationLog();

  }

  _handleInput(event) {
    const search = event.target.closest('[data-control="search"]');
    const magnitude = event.target.closest('[data-control="magnitude"]');
    if (search) {
      updateSkyState({ searchQuery: search.value });
      this._renderSearchResults(search.value);
    }
    if (magnitude) {
      updateSkyState({ magnitudeLimit: Number(magnitude.value) });
      this._panel.querySelector('[data-mag-label]').textContent = Number(magnitude.value).toFixed(1);
      this._refreshSkyData('Magnitude limit updated.');
    }
  }

  _handleChange(event) {
    const dateInput = event.target.closest('[data-control="datetime"]');
    const toggle = event.target.closest('[data-toggle]');
    const constellation = event.target.closest('[data-control="constellation"]');
    const speed = event.target.closest('[data-control="time-speed"]');
    const arDensity = event.target.closest('[data-control="ar-label-density"]');
    const arRate = event.target.closest('[data-control="ar-update-rate"]');
    const deepSkyFilter = event.target.closest('[data-control="deep-sky-filter"]');
    const planetariumSequence = event.target.closest('[data-control="planetarium-sequence"]');
    const performancePreset = event.target.closest('[data-control="performance-preset"]');
    const accessibility = event.target.closest('[data-accessibility]');
    if (dateInput) {
      updateSkyState({ currentDateTime: parseDateTimeInput(dateInput.value), timeMode: 'manual' });
      this._refreshSkyData('Manual sky time applied.');
    }
    if (toggle) {
      const key = toggle.dataset.toggle;
      if (key === 'pointingMode') updateSkyState({ pointingMode: toggle.checked ? 'active' : 'off' });
      else if (key === 'voiceGuideEnabled') { updateSkyState({ voiceGuideEnabled: toggle.checked }); if (!toggle.checked) stopSpeaking(); }
      else if (key === 'teacherModeEnabled') { updateSkyState({ teacherModeEnabled: toggle.checked, labelDensity: toggle.checked ? 'minimal' : getSkyState().labelDensity }); this._renderTeacherPanel(); this._renderSky(); }
      else updateSkyState({ [key]: toggle.checked });
      document.body.classList.toggle('astro-sky-night-mode', Boolean(getSkyState().nightMode));
      this._renderSky();
    }
    if (constellation) this._highlightConstellation(constellation.value || null);
    if (speed) updateSkyState({ timeSpeed: Number(speed.value) });
    if (arDensity) { updateSkyState({ arLabelDensity: arDensity.value }); this._updateAROverlay(); }
    if (arRate) { updateSkyState({ arUpdateRate: arRate.value }); this._restartARUpdateTimer(); }
    if (deepSkyFilter) { updateSkyState({ deepSkyFilter: deepSkyFilter.value }); this._refreshSkyData('Deep-sky filter updated.'); }
    if (planetariumSequence) updateSkyState({ planetariumSequenceId: planetariumSequence.value });
    if (performancePreset) {
      applySkyPerformancePreset(performancePreset.value, { updateState: partial => updateSkyState(partial) });
      this._refreshSkyData(`Performance mode: ${performancePreset.value}.`);
    }
    if (accessibility) this._saveAccessibilityFromPanel();
  }

  async _enableLocation() {
    this._status('Location is required to align the real sky.');
    const result = await requestObserverLocation();
    updateSkyState({
      observerLocation: result.location,
      locationMode: result.ok ? 'gps' : (result.location?.source || 'default'),
      alignmentMode: result.ok ? 'real-sky' : 'demo',
    });
    this._status(result.message);
    this._refreshSkyData(result.message);
    if (result.ok) {
      recordSkySessionEvent({ type: 'location-enabled', concept: 'location sky alignment' });
      unlockSkyAchievement('location-enabled');
      this._renderAchievementsPanel();
    }
  }

  async _enableSensors() {
    const result = await requestDeviceOrientationPermission();
    if (result.ok) {
      updateSkyState({ sensorMode: 'active', alignmentMode: 'sensor-aligned' });
      startDeviceOrientationTracking(({ orientation }) => {
        this._lastOrientation = orientation;
        this._renderer?.updateCameraForSensor(orientation, getSkyState());
      });
      this._status('Phone sensors active. Point your phone north; if shifted, tap Calibrate North.');
      recordSkySessionEvent({ type: 'sensors-enabled', concept: 'sensor alignment' });
      unlockSkyAchievement('sensors-enabled');
      this._renderAchievementsPanel();
    } else {
      updateSkyState({ sensorMode: result.state });
      this._status(result.message);
    }
    this._renderBadges();
  }

  _disableSensors() {
    stopDeviceOrientationTracking();
    updateSkyState({ sensorMode: 'off', alignmentMode: 'real-sky' });
    this._status('Phone sensors disabled. Use drag controls.');
    this._renderBadges();
  }

  _calibrateNorth() {
    const calibration = calibrateNorth(getLastOrientation());
    const calibrationState = { ...getSkyState().calibrationState, ...calibrateNorthFromCurrentHeading(getLastOrientation()), reliability: 'fair' };
    updateSkyState({ calibration, calibrationState, sensorReliability: calibrationState.reliability });
    this._status('North calibrated. Sensor alignment is approximate.');
    this._renderCalibration();
  }

  _setRealtimeMode() {
    updateSkyState({ timeMode: 'realtime', currentDateTime: new Date() });
    this._startRealtime();
    this._refreshSkyData('Realtime sky mode active.');
  }

  _setManualMode() {
    updateSkyState({ timeMode: 'manual' });
    this._stopRealtime();
    this._status('Manual time mode active.');
    this._renderBadges();
  }

  _useNow() {
    const now = new Date();
    updateSkyState({ currentDateTime: now, timeMode: 'realtime' });
    this._panel.querySelector('[data-control="datetime"]').value = formatDateTimeForInput(now);
    this._startRealtime();
    this._refreshSkyData('Using current time.');
  }

  async startARSkyOverlay() {
    return this._startWebXRARMode();
  }

  async _startWebXRARMode() {
    updateSkyState({ alignmentMode: 'ar-overlay', arStatusMessage: 'Checking AR support.', arPermissionStatus: 'checking' });
    this._setARStatus('Checking AR support.');
    const supported = await isWebXRARSupported();
    if (!supported) {
      updateSkyState({ arMode: 'unavailable', arPermissionStatus: 'unsupported', arStatusMessage: 'AR unavailable. Try Camera Overlay.' });
      this._setARStatus('AR unavailable on this browser/device. Try Camera Overlay.');
      this._renderBadges();
      return;
    }
    const result = await startWebXRARSky(this.scene, { objects: this._skyObjects, state: getSkyState() }, { onStatus: msg => this._setARStatus(msg) });
    updateSkyState({ arMode: result.ok ? 'webxr' : 'unavailable', arSessionActive: result.ok, arPermissionStatus: result.ok ? 'granted' : 'denied', arStatusMessage: result.message });
    this._showAROverlayLayer(result.ok);
    if (result.ok) unlockSkyAchievement('ar-explorer');
    this._restartARUpdateTimer();
    this._renderBadges();
  }

  async _startCameraOverlayMode() {
    if (!isCameraOverlaySupported()) {
      const message = 'Camera Overlay needs browser camera support and permission.';
      updateSkyState({ arMode: 'unavailable', cameraPermissionStatus: 'unsupported', arStatusMessage: message });
      this._setARStatus(message);
      this._renderBadges();
      return;
    }
    const result = await startCameraOverlay(this._arVideo, { onStatus: msg => this._setARStatus(msg) });
    updateSkyState({
      arMode: result.ok ? 'camera-overlay' : 'unavailable',
      cameraOverlayActive: result.ok,
      cameraPermissionStatus: result.ok ? 'granted' : 'denied',
      arStatusMessage: createCameraPermissionMessage(result),
    });
    this._showAROverlayLayer(result.ok);
    if (result.ok) unlockSkyAchievement('ar-explorer');
    this._setARStatus(createCameraPermissionMessage(result));
    this._restartARUpdateTimer();
    this._renderBadges();
  }

  async _exitARMode() {
    await stopWebXRARSky();
    stopCameraOverlay();
    disposeAROverlay();
    this._showAROverlayLayer(false);
    this._clearARUpdateTimer();
    updateSkyState({ arMode: 'off', cameraOverlayActive: false, arSessionActive: false, alignmentMode: 'real-sky', arStatusMessage: 'Normal sky map active.' });
    this._setARStatus('Normal sky map active.');
    this._renderBadges();
  }

  _showAROverlayLayer(visible) {
    if (!this._arContainer) return;
    this._arContainer.hidden = !visible;
    this._arLabels?.setVisible(visible);
    if (!visible) this._arGuidance?.clearGuidance();
  }

  _setARStatus(message) {
    this._status(message);
    const local = this._panel?.querySelector('[data-ar-status]');
    const overlay = this._arContainer?.querySelector('[data-ar-overlay-status]');
    if (local) local.textContent = message;
    if (overlay) overlay.textContent = message;
  }

  _restartARUpdateTimer() {
    this._clearARUpdateTimer();
    const state = getSkyState();
    if (state.arMode === 'off' || state.arMode === 'unavailable') return;
    const ms = state.arUpdateRate === 'smooth' ? 120 : state.arUpdateRate === 'battery-saver' ? 800 : 300;
    this._arUpdateTimer = setInterval(() => this._updateAROverlay(), ms);
    addSkyIntervalCleanup(this._cleanup, this._arUpdateTimer);
    this._updateAROverlay();
  }

  _clearARUpdateTimer() {
    if (this._arUpdateTimer) clearInterval(this._arUpdateTimer);
    this._arUpdateTimer = null;
  }

  _updateAROverlay() {
    const state = getSkyState();
    if (state.arMode === 'off') return;
    this._alignment = updateAlignmentFromCalibration(updateAlignmentFromSensor(this._alignment, this._lastOrientation), state.calibration);
    const confidence = estimateAlignmentConfidence({ mode: state.sensorMode }, state.calibrationState, state.observerLocation);
    updateSkyState({ arAlignmentConfidence: confidence });
    const alignment = { ...this._alignment, manualOffsetX: state.manualOverlayOffset?.x || 0, manualOffsetY: state.manualOverlayOffset?.y || 0 };
    const overlayObjects = state.showDeepSkyObjects ? [...this._skyObjects, ...this._deepSkyObjects] : this._skyObjects;
    const arObjects = updateARObjects(overlayObjects, state, { alignment });
    this._arLabels?.setSelectedObject(state.selectedObjectId);
    this._arLabels?.setGuidanceTarget(state.guidanceTargetId);
    this._arLabels?.updateLabels(arObjects.map(anchor => overlayObjects.find(object => object.id === anchor.id)).filter(Boolean), state, alignment);
    const target = state.guidanceTargetId ? findSkyObjectById(state.guidanceTargetId, this._searchIndex) : null;
    const pointing = getPointedSkyDirection(this.scene.activeCamera, { orientation: this._lastOrientation, mode: state.sensorMode });
    this._arGuidance?.updateGuidance(target, pointing, { confidence, warning: getAlignmentWarning(confidence) });
    const sunWarning = this._arContainer?.querySelector('[data-ar-sun-warning]');
    if (sunWarning) sunWarning.hidden = !this._skyObjects.some(object => object.type === 'sun' && object.isAboveHorizon);
  }

  _startRealtime() {
    this._stopRealtime();
    this._clockId = createRealtimeClock(date => {
      if (getSkyState().timeMode !== 'realtime') return;
      updateSkyState({ currentDateTime: date });
      const input = this._panel?.querySelector('[data-control="datetime"]');
      if (input) input.value = formatDateTimeForInput(date);
      this._renderBadges();
    }, SKY_CONFIG.clockUpdateMs);
    addSkyIntervalCleanup(this._cleanup, this._clockId);
    this._ephemerisInterval = setInterval(() => {
      if (getSkyState().timeMode === 'realtime') this._refreshSkyData();
    }, SKY_CONFIG.realtimeUpdateMs);
    addSkyIntervalCleanup(this._cleanup, this._ephemerisInterval);
  }

  _stopRealtime() {
    stopRealtimeClock(this._clockId);
    if (this._ephemerisInterval) clearInterval(this._ephemerisInterval);
    this._clockId = null;
    this._ephemerisInterval = null;
  }

  _refreshSkyData(message = '') {
    const state = getSkyState();
    this._solarSystemObjects = getSolarSystemObjects(state.currentDateTime, state.observerLocation);
    const skyCondition = estimateSkyCondition(state.currentDateTime, state.observerLocation, this._solarSystemObjects);
    this._stars = getVisibleStars(state.currentDateTime, state.observerLocation, {
      magnitudeLimit: state.magnitudeLimit,
      showBelowHorizon: true,
    });
    const withVisibility = object => {
      const visibilityGrade = getVisibilityGrade(object, { ...skyCondition, magnitudeLimit: state.magnitudeLimit });
      return {
        ...object,
        visibilityGrade,
        visibilityExplanation: getVisibilityExplanation(object, { ...skyCondition, magnitudeLimit: state.magnitudeLimit }),
        riseSet: getRiseSetTransit(object.id, state.currentDateTime, state.observerLocation, object),
      };
    };
    this._solarSystemObjects = this._solarSystemObjects.map(withVisibility);
    this._stars = this._stars.map(withVisibility);
    this._deepSkyObjects = getVisibleDeepSkyObjects(state.currentDateTime, state.observerLocation, {
      magnitudeLimit: state.showDeepSkyObjects ? 9 : 7,
      showBelowHorizon: state.showBelowHorizon,
      bestSeenWith: state.deepSkyFilter === 'all' || state.deepSkyFilter === 'dark-sky' ? null : state.deepSkyFilter,
      moonIlluminationPercent: this._solarSystemObjects.find(object => object.type === 'moon')?.illuminationPercent || 35,
    }).map(object => ({ ...object, visibilityExplanation: `${object.visibilityGrade}: ${object.visibilityNote}` }));
    this._meteorShowers = getActiveMeteorShowers(state.currentDateTime).map(shower => getMeteorShowerRadiantPosition(shower, state.currentDateTime, state.observerLocation));
    const visibleHighlights = sortVisibleHighlights([...this._solarSystemObjects, ...this._stars], { ...skyCondition, magnitudeLimit: state.magnitudeLimit }).slice(0, 8);
    updateSkyState({ visibleHighlights });
    this._skyCalendarEvents = getSkyEventsForDate(state.currentDateTime, state.observerLocation, [...this._solarSystemObjects, ...this._stars], { magnitudeLimit: state.magnitudeLimit });
    this._searchIndex = buildSkySearchIndex(this._solarSystemObjects, this._stars, CONSTELLATION_CATALOG, {
      deepSkyObjects: this._deepSkyObjects,
      meteorShowers: this._meteorShowers,
      events: this._skyCalendarEvents,
    });
    this._renderSky();
    this._renderSearchResults(state.searchQuery);
    this._renderHighlights();
    this._renderDeepSkyPanel();
    this._renderMeteorPanel();
    this._renderCalendarPanel();
    this._renderPlannerPanel();
    this._renderAchievementsPanel();
    this._renderOfflinePanel();
    this._renderObservationLog();
    this._renderCalibration();
    if (message) this._status(message);
  }

  _renderSky() {
    const state = getSkyState();
    this._skyObjects = [
      ...(state.showSun ? this._solarSystemObjects.filter(obj => obj.type === 'sun') : []),
      ...(state.showMoon ? this._solarSystemObjects.filter(obj => obj.type === 'moon') : []),
      ...(state.showPlanets ? this._solarSystemObjects.filter(obj => obj.type === 'planet') : []),
      ...(state.showStars ? this._stars : []),
      ...(state.meteorModeEnabled ? this._meteorShowers.map(shower => ({
        ...shower,
        id: shower.id,
        name: shower.name,
        type: 'meteor-shower',
        apparentMagnitude: 1,
        labelPriority: 2,
        visibilityExplanation: formatMeteorShowerInfo(shower),
      })) : []),
    ];
    this._renderer?.updateSkyObjects(this._skyObjects, state);
    this._deepSkyRenderer?.updateDeepSkyObjects(this._deepSkyObjects, state);
    this._deepSkyRenderer?.setSelectedObject(state.selectedObjectId);
    this._renderBadges();
    const selected = state.selectedObjectId ? findSkyObjectById(state.selectedObjectId, this._searchIndex) : null;
    this._renderObjectInfo(selected);
    this._renderGuidePanel();
    this._renderPointingPanel();
    this._renderTeacherPanel();
    this._updateAROverlay();
  }

  _selectObject(objectId) {
    updateSkyState({ selectedObjectId: objectId });
    this._renderer?.setSelectedObject(objectId);
    const object = objectId ? findSkyObjectById(objectId, this._searchIndex) : null;
    this._arLabels?.setSelectedObject(objectId);
    this._deepSkyRenderer?.setSelectedObject(objectId);
    this._renderObjectInfo(object);
    if (object) {
      recordSkySessionEvent({ type: 'object-selected', objectId: object.id, objectName: object.name, concept: object.type });
      if (object.name === 'Jupiter') unlockSkyAchievement('found-jupiter');
      if (object.name === 'Moon') unlockSkyAchievement('found-moon');
      if (object.name === 'Venus') unlockSkyAchievement('found-venus');
      if (object.name === 'Polaris') unlockSkyAchievement('found-polaris');
      if (object.type === 'deep-sky') unlockSkyAchievement('first-deep-sky-object');
      if (object.type === 'meteor-shower') unlockSkyAchievement('meteor-shower-explorer');
      this._renderAchievementsPanel();
      if (object.type === 'constellation') {
        this._highlightConstellation(object.id.replace('constellation-', ''));
        this.context.info.update({
          title: object.name,
          concepts: ['Constellation', object.hemisphere || 'sky pattern'],
          goal: object.visibilityNote,
          observe: `Major stars: ${(object.majorStars || []).join(', ')}`,
          explanation: object.learningFact,
          tryThis: object.studentChallenge,
          teacherNote: object.mythologyNote,
          misconception: 'Constellation lines are simplified patterns, not physical connections in space.',
        });
        return;
      }
      this.context.info.update({
        title: object.name,
        concepts: [object.type, object.constellation || object.subtype || 'sky object'],
        goal: `Locate ${object.name} in the current sky.`,
        observe: this._whereToLook(object),
        explanation: object.visibilityExplanation,
        tryThis: object.name === 'Jupiter' ? 'If Jupiter is above the horizon, compare its steady planet-like light with nearby stars.' : 'Change time and watch the object position update.',
        teacherNote: object.learningFact,
        misconception: object.safetyNote || 'Sensor alignment is approximate and can drift.',
      });
    }
  }

  _lockSelected() {
    const id = getSkyState().selectedObjectId;
    updateSkyState({ lockedObjectId: id });
    this._renderer?.setLockedObject(id);
    this._status(id ? 'Selected object locked for camera follow.' : 'Select an object before locking view.');
  }

  _startGuidance() {
    const id = getSkyState().selectedObjectId;
    const object = this._resolveGuidanceObject(id ? findSkyObjectById(id, this._searchIndex) : null);
    if (!object) {
      this._status('Select a sky object with a known direction before using Guide Me.');
      return;
    }
    const pointing = getPointedSkyDirection(this.scene.activeCamera, { orientation: this._lastOrientation, mode: getSkyState().sensorMode });
    const guidance = createGuidanceToObject(object, pointing);
    updateSkyState({ guidanceMode: 'active', guidanceTargetId: object.id, guidanceOffset: guidance?.offset || null, guidanceText: guidance?.text || '' });
    this._renderer?.setGuidanceTarget(object);
    this._arLabels?.setGuidanceTarget(object.id);
    recordSkySessionEvent({ type: 'object-guided', objectId: object.id, objectName: object.name, concept: 'guidance' });
    this._renderGuidePanel();
    this._updateAROverlay();
  }

  _centerSelected() {
    const object = this._resolveGuidanceObject(getSkyState().selectedObjectId ? findSkyObjectById(getSkyState().selectedObjectId, this._searchIndex) : null);
    this._renderer?.centerOnObject(object);
    this._status(object ? `Centered ${object.name}.` : 'Select an object first.');
  }

  _showPathToSelected() {
    const object = this._resolveGuidanceObject(getSkyState().selectedObjectId ? findSkyObjectById(getSkyState().selectedObjectId, this._searchIndex) : null);
    this._renderer?.setGuidanceTarget(object);
    this._status(object ? `Showing approximate path to ${object.name}.` : 'Select an object first.');
  }

  _resolveGuidanceObject(object) {
    if (!object) return null;
    if (object.altitudeDeg != null && object.azimuthDeg != null) return object;
    const linked = object.objectIds?.map(id => findSkyObjectById(id, this._searchIndex)).find(item => item?.altitudeDeg != null && item?.azimuthDeg != null);
    return linked || null;
  }

  _togglePointingMode() {
    const active = getSkyState().pointingMode !== 'active';
    updateSkyState({ pointingMode: active ? 'active' : 'off' });
    const input = this._panel?.querySelector('[data-toggle="pointingMode"]');
    if (input) input.checked = active;
    this._renderPointingPanel();
    this._renderSky();
  }

  _updatePointing() {
    const state = getSkyState();
    if (state.pointingMode !== 'active') return;
    const pointing = getPointedSkyDirection(this.scene.activeCamera, { orientation: this._lastOrientation, mode: state.sensorMode });
    const nearest = findNearestVisibleObject(pointing.altitudeDeg, pointing.azimuthDeg, this._skyObjects);
    updateSkyState({
      pointingAltDeg: pointing.altitudeDeg,
      pointingAzDeg: pointing.azimuthDeg,
      pointingNearestObject: nearest?.object || null,
      pointingTargetId: nearest?.object?.id || null,
      pointingAccuracyDeg: nearest?.distanceDeg ?? null,
    });
    this._renderer?.setPointingDirection(pointing);
    this._renderPointingPanel();
    if (state.guidanceMode === 'active') this._renderGuidePanel();
  }

  _renderPointingPanel() {
    const el = this._panel?.querySelector('[data-pointing-panel]');
    if (!el) return;
    const state = getSkyState();
    if (state.pointingMode !== 'active') {
      el.textContent = 'Live identify is off.';
      return;
    }
    const pointing = { altitudeDeg: state.pointingAltDeg ?? 0, azimuthDeg: state.pointingAzDeg ?? 0 };
    const nearest = state.pointingNearestObject ? { object: state.pointingNearestObject, distanceDeg: state.pointingAccuracyDeg ?? 0 } : null;
    el.innerHTML = `
      <strong>${getPointingSummary(nearest, pointing)}</strong>
      <p>Alt ${Math.round(pointing.altitudeDeg)} deg | Az ${Math.round(pointing.azimuthDeg)} deg | ${azimuthToDirectionText(pointing.azimuthDeg)}</p>
      <p>${nearest?.object?.visibilityExplanation || 'No major object near this direction.'}</p>
      <p>${nearest?.object?.learningFact || ''}</p>
      <small>${formatPointingAccuracyNote({ mode: state.sensorMode })}</small>
    `;
  }

  _renderGuidePanel() {
    const el = this._panel?.querySelector('[data-guide-panel]');
    if (!el) return;
    const state = getSkyState();
    const target = state.guidanceTargetId ? findSkyObjectById(state.guidanceTargetId, this._searchIndex) : null;
    if (!target) {
      el.textContent = 'Select an object, then tap Guide Me.';
      return;
    }
    const pointing = getPointedSkyDirection(this.scene.activeCamera, { orientation: this._lastOrientation, mode: state.sensorMode });
    const guidance = createGuidanceToObject(target, pointing);
    el.innerHTML = `
      <strong>${target.name}</strong>
      <p class="astro-sky-guidance-arrow">${guidance?.arrow || 'hidden'}</p>
      <p>${guidance?.text || `${target.name} is below the horizon from your current location.`}</p>
      <small>${state.sensorMode === 'active' ? 'Move phone slowly. Guidance is approximate.' : 'Enable sensors for phone-pointing guidance, or drag the sky manually.'}</small>
    `;
  }

  _highlightSelectedConstellation() {
    const id = this._panel?.querySelector('[data-control="constellation"]')?.value;
    this._highlightConstellation(id || null);
  }

  _highlightConstellation(id) {
    updateSkyState({ showConstellations: Boolean(id) || getSkyState().showConstellations, selectedConstellationId: id, highlightedConstellationId: id });
    this._renderer?.highlightConstellation(id);
    if (id) {
      recordSkySessionEvent({ type: 'constellation-highlighted', objectId: id, objectName: findConstellationById(id)?.name || id, concept: 'constellation' });
      unlockSkyAchievement(id === 'orion' ? 'found-orion' : 'first-constellation');
      this._renderAchievementsPanel();
    }
    this._renderSky();
    const info = id ? buildConstellationInfo(findConstellationById(id)) : null;
    const el = this._panel?.querySelector('[data-constellation-info]');
    if (!el) return;
    if (!info) {
      el.textContent = 'Constellation lines cleared.';
      this._renderer?.clearConstellationHighlight();
      return;
    }
    el.innerHTML = `<strong>${info.title}</strong>${info.rows.map(([k, v]) => `<p><b>${k}:</b> ${v}</p>`).join('')}<p>${info.studentPrompt}</p>`;
  }

  _stepTime(amount, unit) {
    const next = stepTime(getSkyState().currentDateTime, amount, unit);
    updateSkyState({ currentDateTime: next, timeMode: 'time-travel' });
    this._panel.querySelector('[data-control="datetime"]').value = formatDateTimeForInput(next);
    recordSkySessionEvent({ type: 'time-travel-used', concept: 'Earth rotation' });
    unlockSkyAchievement('time-traveler');
    this._refreshSkyData(`Time travel: ${amount > 0 ? '+' : ''}${amount} ${unit}.`);
  }

  _playTimeTravel() {
    this._pauseTimeTravel();
    updateSkyState({ timeMode: 'time-travel', timeAnimationActive: true });
    this._timeTravelTimer = setInterval(() => this._stepTime(getSkyState().timeSpeed || 10, 'minute'), 1000);
    addSkyIntervalCleanup(this._cleanup, this._timeTravelTimer);
    this._status('Time travel animation running.');
  }

  _pauseTimeTravel() {
    if (this._timeTravelTimer) clearInterval(this._timeTravelTimer);
    this._timeTravelTimer = null;
    updateSkyState({ timeAnimationActive: false });
  }

  _resetCalibration() {
    updateSkyState({ calibration: { headingOffsetDeg: 0 }, calibrationState: resetCalibration(), sensorReliability: 'unknown' });
    this._renderCalibration();
    this._status('Sensor calibration reset.');
  }

  _renderCalibration() {
    const el = this._panel?.querySelector('[data-calibration-panel]');
    if (!el) return;
    const state = getSkyState();
    el.innerHTML = `
      <p>${getCalibrationInstructions({ mode: state.sensorMode })}</p>
      <p>Sensor: ${state.sensorMode}. Reliability: ${state.sensorReliability}. Offset: ${Math.round(state.calibration?.headingOffsetDeg || 0)} deg.</p>
    `;
  }

  _logObservation() {
    const object = getSkyState().selectedObjectId ? findSkyObjectById(getSkyState().selectedObjectId, this._searchIndex) : null;
    if (!object) {
      this._status('Select an object before logging an observation.');
      return;
    }
    const note = this._panel?.querySelector('[data-observation-note]')?.value || '';
    saveSkyObservation(createObservationEntry(object, getSkyState(), note));
    recordSkySessionEvent({ type: 'observation-logged', objectId: object.id, objectName: object.name, concept: 'observation' });
    unlockSkyAchievement('first-observation-logged');
    this._panel.querySelector('[data-observation-note]').value = '';
    this._renderObservationLog();
    this._status(`Observation logged: ${object.name}.`);
  }

  _clearObservationLog() {
    clearSkyObservations();
    this._renderObservationLog();
  }

  _renderObservationLog() {
    const el = this._panel?.querySelector('[data-observation-log]');
    if (!el) return;
    const observations = getSkyObservations().slice(0, 5);
    el.innerHTML = observations.length
      ? observations.map(item => `<article><strong>${item.objectName}</strong><p>${item.dateTime} | Alt ${item.altitudeDeg} deg | ${item.userNote || 'No note'}</p><button data-delete-observation="${item.id}">Delete</button></article>`).join('')
      : '<p>No sky observations yet. Select an object and log what you saw.</p>';
    el.querySelectorAll('[data-delete-observation]').forEach(button => {
      button.addEventListener('click', () => {
        deleteSkyObservation(button.dataset.deleteObservation);
        this._renderObservationLog();
      }, { once: true });
    });
  }

  _renderHighlights() {
    const el = this._panel?.querySelector('[data-highlights]');
    if (!el) return;
    const state = getSkyState();
    const highlights = getSkyHighlights(state.currentDateTime, state.observerLocation, this._skyObjects);
    let objects = state.visibleHighlights || [];
    if (state.visibilityFilter === 'planets') objects = objects.filter(item => item.type === 'planet');
    if (state.visibilityFilter === 'stars') objects = objects.filter(item => item.type === 'star');
    if (state.visibilityFilter === 'high') objects = objects.filter(item => item.altitudeDeg > 35);
    const cards = [
      ...highlights.map(event => ({ id: event.objectIds[0], title: event.title, text: event.explanation })),
      ...objects.slice(0, 6).map(object => ({ id: object.id, title: object.name, text: `${object.visibilityGrade}: ${formatLookDirection(object.altitudeDeg, object.azimuthDeg)}` })),
    ].slice(0, 8);
    el.innerHTML = cards.map(card => `<button type="button" data-highlight-id="${card.id}"><strong>${card.title}</strong><span>${card.text}</span></button>`).join('');
  }

  _startSelectedTour() {
    const id = this._panel?.querySelector('[data-control="sky-tour"]')?.value || 'beginner-sky';
    const step = startSkyTour(id, { state: getSkyState() });
    updateSkyState({ activeTourId: id, activeTourStepIndex: 0, tourStatus: 'active' });
    recordSkySessionEvent({ type: 'tour-started', tourId: id, concept: 'guided tour' });
    this._renderTourPanel(step);
  }

  _moveTour(direction) {
    const step = direction > 0 ? nextTourStep() : previousTourStep();
    if (step) updateSkyState({ activeTourStepIndex: step.index, tourStatus: 'active' });
    this._renderTourPanel(step);
  }

  _stopTour() {
    const tour = stopSkyTour();
    if (tour) recordSkySessionEvent({ type: 'tour-completed', tourId: tour.id, concept: 'guided tour' });
    updateSkyState({ activeTourId: null, activeTourStepIndex: 0, tourStatus: 'idle' });
    this._renderTourPanel(null);
  }

  _guideCurrentTourStep() {
    const step = getCurrentTourStep();
    const guided = buildTourStepGuidance(step, this._searchIndex, { state: getSkyState() });
    if (guided?.target?.id) {
      this._selectObject(guided.target.id);
      this._startGuidance();
    }
    this._speakOrShow(guided?.guidance || step?.text || 'Tour step ready.');
  }

  _renderTourPanel(step) {
    const el = this._panel?.querySelector('[data-tour-panel]');
    if (!el) return;
    if (!step) {
      el.textContent = 'Choose a tour to begin.';
      return;
    }
    const guided = buildTourStepGuidance(step, this._searchIndex, { state: getSkyState() });
    el.innerHTML = `<strong>${step.title}</strong><p>Step ${step.index + 1}/${step.total}: ${step.text}</p><p>${guided?.guidance || ''}</p><p><b>Student challenge:</b> ${guided?.target ? getObjectChallenge(guided.target) : 'Explain what evidence the sky map is using.'}</p>`;
    this._speakOrShow(buildTourNarration(step, { state: getSkyState() }));
  }

  _speakOrShow(text) {
    const state = getSkyState();
    const spoken = speakTextIfEnabled(buildVoiceGuideText(text), { enabled: state.voiceGuideEnabled && isSpeechSupported() });
    if (!spoken) this._status(buildVoiceGuideText(text));
  }

  _renderTeacherPanel() {
    const el = this._panel?.querySelector('[data-teacher-panel]');
    if (!el) return;
    const state = getSkyState();
    if (!state.teacherModeEnabled) {
      el.textContent = 'Teacher mode is optional. Use it for classroom prompts and big-label discussion.';
      return;
    }
    const selected = state.selectedObjectId ? findSkyObjectById(state.selectedObjectId, this._searchIndex) : null;
    createTeacherSkySession({ topic: 'sky-map' });
    const questions = getClassroomQuestions(selected || 'sky');
    el.innerHTML = `
      <strong>Teacher Sky Mode</strong>
      <p>${getTeacherPrompts(selected?.name === 'Jupiter' ? 'jupiter' : selected?.type === 'moon' ? 'moon' : 'motion')}</p>
      <p>${formatTeacherExplanation('altaz')}</p>
      <ul>${questions.map(question => `<li>${question}</li>`).join('')}</ul>
      <details><summary>Misconception Cards</summary>${getMisconceptionCards('sky').map(card => `<p>${card}</p>`).join('')}</details>
    `;
  }

  _startLearningSession() {
    const session = startSkySessionRecording();
    updateSkyState({ learningSessionActive: true, learningSessionId: session.id });
    this._renderSessionPanel();
    this._status('Local learning session started. No video is recorded.');
  }

  _endLearningSession() {
    const summary = stopSkySessionRecording();
    updateSkyState({ learningSessionActive: false, learningSessionId: null });
    this._renderSessionPanel(summary);
    this._status('Learning session ended.');
  }

  _renderSessionPanel(summary = null) {
    const el = this._panel?.querySelector('[data-session-panel]');
    if (!el) return;
    const sessions = getSavedSkySessions();
    const state = getSkyState();
    if (state.learningSessionActive) {
      const live = getSkySessionSummary();
      el.innerHTML = `<strong>Session active</strong><p>Started: ${live?.startedAt || 'now'}</p><p>Events are local text-only learning logs.</p>`;
      return;
    }
    const finalSummary = summary || sessions[0];
    el.innerHTML = finalSummary
      ? `<strong>Last Session</strong><p>Duration: ${finalSummary.durationSeconds}s</p><p>Objects: ${(finalSummary.objectsViewed || []).join(', ') || 'none yet'}</p><p>Observations: ${finalSummary.observationsLogged}</p>`
      : 'No learning session active.';
  }

  _renderDiagnostics() {
    const el = this._panel?.querySelector('[data-diagnostics-panel]');
    if (!el) return;
    const diagnostics = buildSkyDiagnostics(getSkyState(), {
      orientation: this._lastOrientation,
      objectCount: this._skyObjects.length + this._deepSkyObjects.length + this._meteorShowers.length,
      starCount: this._stars.length,
      deepSkyCount: this._deepSkyObjects.length,
      constellationLineCount: getSkyState().showConstellations ? CONSTELLATION_CATALOG.length : 0,
      arLabelCount: this._arLabels?.getProjectedObjects?.().length || 0,
      rendererState: {
        fps: this._performanceMonitor.getFPS(),
        arLabelDensity: getSkyState().arLabelDensity,
        arUpdateRate: getSkyState().arUpdateRate,
        performancePreset: getSkyState().performancePreset,
        cameraOverlayActive: getSkyState().cameraOverlayActive,
      },
      cleanupState: {
        activeIntervals: this._cleanup?.intervals?.length || 0,
        activeEvents: this._cleanup?.events?.length || 0,
        overlayPresent: Boolean(this._arContainer && !this._arContainer.hidden),
      },
    });
    const audit = runSkyMapSelfAudit({
      state: getSkyState(),
      objectCount: this._skyObjects.length + this._deepSkyObjects.length,
      starCount: this._stars.length,
      rendererActive: Boolean(this._renderer),
      cleanupActive: Boolean(this._cleanup),
    });
    el.innerHTML = `
      <p><b>Location:</b> ${diagnostics.location.source} (${diagnostics.location.latitudeRounded}, ${diagnostics.location.longitudeRounded})</p>
      <p><b>Sensors:</b> ${diagnostics.sensor.status}; heading ${diagnostics.sensor.headingAvailable ? 'available' : 'unavailable'}</p>
      <p><b>AR:</b> ${diagnostics.ar.arMode}; camera ${diagnostics.ar.cameraOverlayActive ? 'active' : 'off'}; confidence ${diagnostics.ar.confidence}</p>
      <p><b>Rendered objects:</b> ${diagnostics.objectCount}; stars ${diagnostics.starCount}; deep sky ${diagnostics.deepSkyCount}; meteor radiants ${this._meteorShowers.length}</p>
      <p><b>Labels:</b> ${diagnostics.performance.labelDensity}; AR labels ${diagnostics.arLabelCount}; update ${diagnostics.performance.updateRate}; preset ${diagnostics.performance.preset}</p>
      <p><b>FPS:</b> ${diagnostics.performance.fps}; <b>Cleanup:</b> ${diagnostics.cleanup.activeEvents} events, ${diagnostics.cleanup.activeIntervals} intervals, overlay ${diagnostics.cleanup.overlayPresent ? 'visible' : 'clear'}</p>
      <p><b>Performance Recommendation:</b> ${diagnostics.recommendation}</p>
      <p><b>Self-audit:</b> stars ${audit.starCatalogueLoaded ? 'loaded' : 'missing'}; deep sky ${audit.deepSkyCatalogueLoaded}; camera ${audit.cameraSupported ? 'supported' : 'unknown'}.</p>
      <p><b>Last update:</b> ${diagnostics.lastEphemerisUpdate}</p>
    `;
  }

  _renderDeepSkyPanel() {
    const el = this._panel?.querySelector('[data-deep-sky-panel]');
    if (!el) return;
    const objects = this._deepSkyObjects.slice(0, 8);
    el.innerHTML = objects.length
      ? objects.map(object => `<button type="button" data-result-id="${object.id}"><strong>${object.name}</strong><span>${object.bestSeenWith} | ${object.visibilityGrade} | ${this._whereToLook(object)}</span></button>`).join('')
      : '<p>No deep-sky suggestions for this filter/date. Try All or Dark Sky.</p>';
  }

  _renderMeteorPanel() {
    const el = this._panel?.querySelector('[data-meteor-panel]');
    if (!el) return;
    if (!this._meteorShowers.length) {
      el.textContent = 'No major meteor shower is active for the selected date. Meteor showers are best viewed with eyes, not telescopes.';
      return;
    }
    el.innerHTML = this._meteorShowers.map(shower => `<article><strong>${shower.name}</strong><p>${formatMeteorShowerInfo(shower)}</p><p>Radiant: ${Math.round(shower.altitudeDeg)} deg above ${azimuthToDirectionText(shower.azimuthDeg)}.</p><button type="button" data-result-id="${shower.id}">Select Radiant</button></article>`).join('');
  }

  _renderCalendarPanel(days = 1) {
    const el = this._panel?.querySelector('[data-calendar-panel]');
    if (!el) return;
    const events = days > 1
      ? this._skyCalendarEvents
      : this._skyCalendarEvents.slice(0, 8);
    el.innerHTML = events.length
      ? events.map(event => `<button type="button" data-result-id="${event.id}"><strong>${event.title}</strong><span>${formatCalendarEvent(event)}</span></button>`).join('')
      : '<p>No calendar events available for the selected date.</p>';
  }

  _renderPlannerPanel() {
    const el = this._panel?.querySelector('[data-planner-panel]');
    if (!el) return;
    const plan = getObservationPlan();
    el.innerHTML = plan.length
      ? plan.map(item => `<article><strong>${item.objectName}</strong><p>${item.directionHint} | ${item.equipmentHint} | ${item.completed ? 'observed' : 'planned'}</p><button type="button" data-plan-done="${item.id}">Mark Observed</button><button type="button" data-plan-remove="${item.id}">Remove</button></article>`).join('')
      : '<p>No observation plan yet. Plan Tonight or add the selected object.</p>';
    el.querySelectorAll('[data-plan-done]').forEach(button => button.addEventListener('click', () => { markObservationPlanItem(button.dataset.planDone, true); this._renderPlannerPanel(); }, { once: true }));
    el.querySelectorAll('[data-plan-remove]').forEach(button => button.addEventListener('click', () => { removeObjectFromObservationPlan(button.dataset.planRemove); this._renderPlannerPanel(); }, { once: true }));
  }

  _renderAchievementsPanel() {
    const el = this._panel?.querySelector('[data-achievements-panel]');
    if (!el) return;
    el.innerHTML = getSkyAchievements().filter(item => item.unlocked).slice(0, 12).map(item => `<span>${item.title}</span>`).join('') || '<p>No sky achievements unlocked yet.</p>';
  }

  _renderOfflinePanel() {
    const el = this._panel?.querySelector('[data-offline-panel]');
    if (!el) return;
    const cached = getCachedSkyDataStatus();
    const summary = getOfflineCapabilitySummary();
    el.innerHTML = `<p><b>${isOfflineMode() ? 'Offline mode' : 'Online'}</b>: ${summary.catalogues}</p><p>${cached.ready ? `Offline prefs cached ${cached.cachedAt}.` : 'Offline preferences not cached yet.'}</p><p>${summary.note}</p>`;
  }

  _startPlanetarium() {
    const sequenceId = this._panel?.querySelector('[data-control="planetarium-sequence"]')?.value || getSkyState().planetariumSequenceId;
    const sequence = startPlanetariumMode(sequenceId, { onCaption: text => this._renderPlanetariumPanel(text) });
    updateSkyState({ planetariumModeActive: true, planetariumSequenceId: sequence.id, planetariumStepIndex: sequence.index, labelDensity: 'detailed' });
    this._renderPlanetariumPanel(sequence.caption);
    this._speakOrShow(sequence.caption);
  }

  _movePlanetarium(direction) {
    const sequence = direction > 0 ? nextPlanetariumScene() : previousPlanetariumScene();
    if (!sequence) return this._startPlanetarium();
    updateSkyState({ planetariumStepIndex: sequence.index });
    this._renderPlanetariumPanel(sequence.caption);
    this._speakOrShow(sequence.caption);
  }

  _stopPlanetarium() {
    stopPlanetariumMode();
    updateSkyState({ planetariumModeActive: false, planetariumStepIndex: 0 });
    this._renderPlanetariumPanel('Planetarium mode stopped.');
  }

  _renderPlanetariumPanel(text = '') {
    const el = this._panel?.querySelector('[data-planetarium-panel]');
    if (el) el.innerHTML = `<strong>${getSkyState().planetariumModeActive ? 'Planetarium active' : 'Planetarium ready'}</strong><p>${text || 'Choose a cinematic sequence for classroom or self-guided learning.'}</p>`;
  }

  _planTonight() {
    createObservationPlan(getSkyState().currentDateTime, getSkyState().observerLocation, { objects: [...this._skyObjects, ...this._deepSkyObjects] });
    unlockSkyAchievement('first-observation-plan');
    this._renderPlannerPanel();
  }

  _addSelectedToPlan() {
    const object = getSkyState().selectedObjectId ? findSkyObjectById(getSkyState().selectedObjectId, this._searchIndex) : null;
    if (!object) return this._status('Select an object before adding it to the observation plan.');
    addObjectToObservationPlan(object, getSkyState().currentDateTime, 'Added from AR Sky Map.');
    unlockSkyAchievement('first-observation-plan');
    this._renderPlannerPanel();
  }

  _setActiveMeteorPeakDate() {
    const shower = this._meteorShowers[0];
    if (!shower) return this._status('No active meteor shower for this date.');
    updateSkyState({ activeMeteorShowerId: shower.id });
    this._status(`${shower.name} peaks around ${shower.peakDateApprox}. Set the date manually to that peak window for planning.`);
  }

  _enableVoiceCommands() {
    if (!isVoiceCommandSupported()) {
      updateSkyState({ voiceCommandStatus: 'unsupported' });
      return this._renderVoicePanel('Voice commands are unsupported in this browser.', true);
    }
    const result = startVoiceCommands((command, text) => this._handleVoiceCommand(command, text));
    updateSkyState({ voiceCommandsEnabled: result.ok, voiceCommandStatus: result.status });
    this._renderVoicePanel(result.message);
  }

  _stopVoiceCommands() {
    stopVoiceCommands();
    updateSkyState({ voiceCommandsEnabled: false, voiceCommandStatus: 'stopped' });
    this._renderVoicePanel('Voice commands stopped.');
  }

  _renderVoicePanel(message = '', showHelp = false) {
    const el = this._panel?.querySelector('[data-voice-panel]');
    if (!el) return;
    el.innerHTML = `<p>${message || `Status: ${getSkyState().voiceCommandStatus}`}</p><p>Last: ${getSkyState().lastVoiceCommand || 'none'}</p>${showHelp ? `<p>${getVoiceCommandHelp().join(', ')}</p>` : ''}`;
  }

  _handleVoiceCommand(command, text) {
    updateSkyState({ lastVoiceCommand: text, voiceCommandStatus: 'listening' });
    if (command.action === 'find') {
      const found = searchSkyObjects(command.query, this._searchIndex, { limit: 1 })[0];
      if (found) this._selectObject(found.id);
    }
    if (command.action === 'toggle') updateSkyState({ [command.key]: command.value });
    if (command.action === 'start-tour') this._startSelectedTour();
    if (command.action === 'stop-tour') this._stopTour();
    if (command.action === 'pointing') this._togglePointingMode();
    if (command.action === 'guide') this._startGuidance();
    if (command.action === 'exit-ar') this._exitARMode();
    this._renderVoicePanel(`Recognized: ${text}`);
    this._renderSky();
  }

  _cacheOfflinePreferences() {
    cacheSkyData({
      locationSource: getSkyState().locationMode,
      magnitudeLimit: getSkyState().magnitudeLimit,
      nightMode: getSkyState().nightMode,
      labelDensity: getSkyState().labelDensity,
      teacherModeEnabled: getSkyState().teacherModeEnabled,
    });
    this._renderOfflinePanel();
  }

  _saveAccessibilityFromPanel() {
    const prefs = {
      highContrast: this._panel?.querySelector('[data-accessibility="highContrast"]')?.checked || false,
      largeText: this._panel?.querySelector('[data-accessibility="largeText"]')?.checked || false,
      reducedMotion: this._panel?.querySelector('[data-accessibility="reducedMotion"]')?.checked || false,
    };
    updateSkyState({ accessibilityPreferences: saveAccessibilityPreferences(prefs) });
  }

  async _copySelectedSummary() {
    const object = getSkyState().selectedObjectId ? findSkyObjectById(getSkyState().selectedObjectId, this._searchIndex) : null;
    await copySkySummaryToClipboard(createSkySnapshotSummary(getSkyState(), object));
    this._status('Sky summary copied locally.');
  }

  async _shareSelectedObject() {
    const object = getSkyState().selectedObjectId ? findSkyObjectById(getSkyState().selectedObjectId, this._searchIndex) : null;
    if (!object) return this._status('Select an object before sharing.');
    await shareSkyObject(object, { state: getSkyState() });
    this._status('Sky object shared or copied.');
  }

  _renderObjectInfo(object) {
    const el = this._panel?.querySelector('[data-object-info]');
    if (!el) return;
    if (!object) {
      el.innerHTML = '<p>Tap a star, planet, Sun, or Moon to learn about it.</p><p>Search Jupiter, Moon, Venus, Sirius, Polaris, or Mars.</p>';
      return;
    }
    if (object.type === 'constellation') {
      const info = buildConstellationInfo(object);
      el.innerHTML = `<h4>${info.title}</h4>${info.rows.map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')}<p><strong>Challenge:</strong> ${info.studentPrompt}</p><details><summary>Teacher Note</summary><p>${info.teacherNote}</p></details>`;
      return;
    }
    const card = buildObjectInfoCard(object, { riseSet: object.riseSet, visibilityExplanation: object.visibilityExplanation });
    el.innerHTML = `
      <h4>${card.title}</h4>
      ${card.rows.map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')}
      ${object.illuminationPercent != null ? `<p><strong>Moon/phase:</strong> ${object.illuminationPercent}% illuminated ${object.phaseName ? `(${object.phaseName})` : ''}</p>` : ''}
      <p><strong>Student Challenge:</strong> ${getObjectChallenge(object)}</p>
      <details><summary>Teacher Note</summary><p>${card.teacherNote || getTeacherPrompt('guidance')}</p></details>
      ${card.safetyNote ? `<p class="astro-sky-safety">${card.safetyNote}</p>` : ''}
      <div class="astro-sky-control-row">
        <button type="button" data-action="lock">Lock View</button>
        <button type="button" data-action="guide">Guide Me</button>
        <button type="button" data-action="center">Center in View</button>
        <button type="button" data-action="clear">Clear Selection</button>
      </div>
    `;
  }

  _renderSearchResults(query) {
    const el = this._panel?.querySelector('[data-search-results]');
    if (!el) return;
    const results = searchSkyObjects(query || '', this._searchIndex);
    el.innerHTML = results.map(object => `
      <article class="astro-sky-result-card">
        <strong>${object.name}</strong>
        <span>${object.type}${object.constellation ? `, ${object.constellation}` : ''}</span>
        <small>${this._formatSearchVisibility(object)}</small>
        <div class="astro-sky-result-actions">
          <button type="button" data-result-id="${object.id}">Select</button>
          <button type="button" data-guide-id="${object.id}">Guide Me</button>
          <button type="button" data-add-plan-id="${object.id}">Add to Plan</button>
        </div>
      </article>
    `).join('');
  }

  _formatSearchVisibility(object) {
    if (object.type === 'constellation' || object.type === 'sky-event') return object.visibilityExplanation || object.learningNote || 'Educational sky item.';
    if (object.type === 'meteor-shower') return `${object.peakDateApprox || 'active window'} | radiant ${object.radiantConstellation}`;
    if (object.altitudeDeg == null || object.azimuthDeg == null) return object.visibilityExplanation || object.visibilityNote || 'Direction unavailable.';
    return `${object.isAboveHorizon ? 'Visible' : 'Hidden'} | ${object.altitudeDeg.toFixed(1)} deg | ${azimuthToDirectionText(object.azimuthDeg)}`;
  }

  _renderBadges() {
    const state = getSkyState();
    const el = this._panel?.querySelector('[data-badges]');
    if (!el) return;
    el.innerHTML = [
      state.alignmentMode === 'demo' ? 'Demo Sky' : state.alignmentMode === 'ar-overlay' ? `AR ${state.arMode || 'Overlay'}` : 'Real Sky',
      state.sensorMode === 'active' ? 'Sensors Active' : 'Sensors Off',
      state.locationMode === 'gps' ? 'Location Active' : 'Location Off',
      state.arAlignmentConfidence && state.arAlignmentConfidence !== 'unknown' ? `AR Confidence ${state.arAlignmentConfidence}` : null,
      state.timeMode === 'realtime' ? 'Realtime' : 'Manual Time',
      formatSkyTime(state.currentDateTime),
    ].filter(Boolean).map(text => `<span>${text}</span>`).join('');
  }

  _whereToLook(object) {
    if (object?.whereToLook) return object.whereToLook;
    if (object?.azimuthDeg == null || object?.altitudeDeg == null) return 'Use the guide panel or event note for direction.';
    if (!object?.isAboveHorizon) return 'Below the horizon now.';
    return `Look about ${object.altitudeDeg.toFixed(0)} deg above the ${azimuthToDirectionText(object.azimuthDeg).toLowerCase()} horizon.`;
  }

  _status(message) {
    this.astroScene.showStatus(message);
    const el = this._panel?.querySelector('[data-status]');
    if (el) el.textContent = message;
  }

  requestLocationPermission() { return this._enableLocation(); }
  requestDeviceOrientationPermission() { return this._enableSensors(); }
  alignSkyToDevice() { this._status('Sensor alignment is approximate. Calibrate North if the sky looks shifted.'); }
  startARSkyMode() { return this.startARSkyOverlay(); }
  startARSkySession() { return this.startARSkyOverlay(); }
  stopARSkyMode() { this._disableSensors(); }
  alignWithDeviceOrientation() { this.alignSkyToDevice(); }
  setPaused(paused) { updateSkyState({ timeMode: paused ? 'manual' : 'realtime' }); if (paused) this._stopRealtime(); else this._startRealtime(); }
  setLabelsVisible(visible) { updateSkyState({ showLabels: visible }); this._renderer?.setLabelsVisible(visible); }
  setSpeed() {}

  update() {
    this._performanceMonitor.tick();
    this._updatePointing();
  }

  getLessonObjective() { return 'Use location, time, stars, and solar-system ephemeris to identify real sky objects educationally.'; }
  getDiscussionQuestions() { return ['Why does location change the sky map?', 'Is Jupiter above the horizon right now?', 'Why can sensors be approximate even when calculations are correct?']; }
  getTeacherSpotlight() { return 'Spotlight altitude and azimuth: they tell students where to point, while RA/Dec are fixed sky coordinates.'; }
  pauseSimulation() { this.setPaused(true); }
  resetForClassroom() { updateSkyState(createInitialSkyState()); this._refreshSkyData('Classroom sky reset.'); this.context.module?.resetView?.(); }

  hide() {
    this._stopRealtime();
    this._pauseTimeTravel();
    this._clearARUpdateTimer();
    void stopWebXRARSky();
    stopCameraOverlay();
    disposeAROverlay();
    stopSpeaking();
    stopVoiceCommands();
    stopSkyTour();
    stopPlanetariumMode();
    stopWatchingObserverLocation();
    stopDeviceOrientationTracking();
    this._arLabels?.dispose();
    this._arGuidance?.dispose();
    this._arContainer?.remove();
    this._arLabels = null;
    this._arGuidance = null;
    this._arContainer = null;
    this._arVideo = null;
    this._renderer?.dispose();
    this._deepSkyRenderer?.dispose();
    this._renderer = null;
    this._deepSkyRenderer = null;
    this._panel?.remove();
    this._panel = null;
    document.body.classList.remove('astro-sky-night-mode');
    cleanupSkyBag(this._cleanup);
    this._cleanup = createSkyCleanupBag();
    this._solarSystemObjects = [];
    this._stars = [];
    this._deepSkyObjects = [];
    this._meteorShowers = [];
    this._skyCalendarEvents = [];
    this._skyObjects = [];
    this._searchIndex = [];
    this.astroScene.cleanup();
  }
}
