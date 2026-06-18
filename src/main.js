import '../style.css';
import { SceneManager }       from './core/SceneManager.js';
import { EnvironmentBuilder }  from './core/EnvironmentBuilder.js';
import { HandTracker }         from './core/HandTracker.js';
import { GestureEngine }       from './core/GestureEngine.js';
import { InteractionManager }  from './core/InteractionManager.js';
import { SimulationControlBus } from './core/SimulationControlBus.js';
import { NavigationGestureController } from './core/NavigationGestureController.js';
import { XRManager }           from './core/XRManager.js';
import { HandVisualizer }      from './ui/HandVisualizer.js';
import { GestureFeedback }     from './ui/GestureFeedback.js';
import { HomeScreen }          from './ui/HomeScreen.js';
import { SubjectHub }          from './ui/SubjectHub.js';
import { HUD }                 from './ui/HUD.js';
import { PlayfulOverlay }      from './ui/PlayfulOverlay.js';
import { GestureGuide }        from './ui/GestureGuide.js';
import { InspectPanel }        from './ui/InspectPanel.js';
import { MathModule }          from './modules/math/MathModule.js';
import { PhysicsModule }       from './modules/physics/PhysicsModule.js';
import { ChemModule }          from './modules/chemistry/ChemModule.js';
import { VoiceCommands }       from './features/VoiceCommands.js';
import { ScreenshotShare }     from './features/ScreenshotShare.js';
import { ProgressDashboard }   from './features/ProgressDashboard.js';
import { SmartHint }           from './features/SmartHint.js';
import { HapticFeedback }      from './features/HapticFeedback.js';
import { AdaptiveDifficulty }  from './features/AdaptiveDifficulty.js';
import { AdaptiveMissionControl } from './features/AdaptiveMissionControl.js';
import { BossChallengeManager } from './features/BossChallengeManager.js';
import { ConceptGraph }        from './features/ConceptGraph.js';
import { LearningPathPlanner } from './features/LearningPathPlanner.js';
import { GameLayer }            from './features/GameLayer.js';
import { CampaignDirector }     from './features/CampaignDirector.js';
import { AirDrawing }          from './features/AirDrawing.js';
import { ExamMode }            from './features/ExamMode.js';
import { AITutor }             from './features/AITutor.js';
import { LearningIntelligence } from './features/LearningIntelligence.js';
import { Multiplayer }         from './features/Multiplayer.js';
import { TeacherControl }      from './features/TeacherControl.js';

// Loading progress helper
const loadBar = document.getElementById('loading-bar');
const loadStatus = document.getElementById('loading-status');
const LOADING_LINES = [
  'Calibrating curiosity...',
  'Teaching atoms to dance...',
  'Warming up photons...',
  'Untangling vectors...',
  'Charging the lab portals...',
  'Polishing the periodic table...',
  'Convincing gravity to behave...',
];
function setProgress(pct, msg) {
  if (loadBar) loadBar.style.width = pct + '%';
  if (loadStatus) loadStatus.textContent = msg || LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)];
}

// App state
let currentSubject = null;   // 'math' | 'physics' | 'chem'
let currentTopic   = null;
function currentGestureContext() {
  return currentTopic || currentSubject || 'home';
}

async function boot() {
  try {
    setProgress(5, 'Starting engine...');
    const canvas = document.getElementById('renderCanvas');

    // 1. Scene
    const sceneMgr = new SceneManager();
    const { engine, scene } = await sceneMgr.init(canvas);
    setProgress(20, 'Building environment...');

    // 2. Environment
    const env = new EnvironmentBuilder(scene);
    env.build();
    setProgress(35, 'Loading hand tracker...');

    // 3. Gesture / Interaction core
    const handTracker   = new HandTracker();
    const gestureEngine = new GestureEngine();
    gestureEngine.setGestureContext('home');
    gestureEngine.setGestureDebugEnabled(new URLSearchParams(window.location.search).has('gestureDebug'));
    const interaction   = new InteractionManager(scene, gestureEngine, env, sceneMgr);
    const simControl    = new SimulationControlBus(gestureEngine);
    const xrManager     = new XRManager(scene, engine);

    // 4. Hand visualizer & feedback
    const handViz      = new HandVisualizer(scene, gestureEngine);
    const gestureFB    = new GestureFeedback(scene, gestureEngine);

    // 5. Subject modules
    setProgress(50, 'Loading Math module...');
    const mathMod  = new MathModule(scene, interaction, env);
    setProgress(60, 'Loading Physics module...');
    const physMod  = new PhysicsModule(scene, interaction, env);
    setProgress(70, 'Loading Chemistry module...');
    const chemMod  = new ChemModule(scene, interaction, env);

    // 6. UI
    setProgress(75, 'Building UI...');
    const homeScreen = new HomeScreen(scene, interaction, env);
    const subjectHub = new SubjectHub();
    const play = new PlayfulOverlay();
    const gestureGuide = new GestureGuide(gestureEngine, currentGestureContext);

    // 7. Feature systems
    setProgress(80, 'Loading features...');
    const screenshot   = new ScreenshotShare(engine, scene);
    const progress     = new ProgressDashboard();
    const smartHint    = new SmartHint();
    const haptic       = new HapticFeedback();
    const adaptive     = new AdaptiveDifficulty();
    const examMode     = new ExamMode();
    const aiTutor      = new AITutor();
    const inspectPanel = new InspectPanel(interaction, gestureEngine, aiTutor);
    const multiplayer  = new Multiplayer({ wsUrl: null }); // set wsUrl for live multiplayer
    const teacherCtrl  = new TeacherControl(multiplayer);
    const airDrawing   = new AirDrawing(scene, gestureEngine);
    const conceptGraph = new ConceptGraph((subject, topicId) => {
      goSubject(subject);
      setTimeout(() => goTopic(subject, topicId), 100);
    });
    const pathPlanner = new LearningPathPlanner({
      progress,
      adaptive,
      aiTutor,
      onNavigate: (subject, topicId) => {
        goSubject(subject);
        setTimeout(() => goTopic(subject, topicId), 100);
      },
    });
    let intelligence = null;
    let missionControl = null;
    let gameLayer = null;
    let bossChallenge = null;
    let campaignDirector = null;

    // Navigation callbacks
    function goHome() {
      currentTopic = null;
      const prev = currentSubject;
      currentSubject = null;

      if (prev === 'math')    mathMod.hide();
      if (prev === 'physics') physMod.hide();
      if (prev === 'chem')    chemMod.hide();
      subjectHub.hide();
      simControl.clearActiveLab();
      interaction.clearAll();
      sceneMgr.resetCamera();
      homeScreen.show(goSubject);
      play.showHomePrompt();
      play.showMission('Choose a portal and start a tiny science adventure.', '#ffd700');
      hud.showBackHome(false, false);
      smartHint.setContext('home');
      aiTutor.setContext('home');
      intelligence?.syncContext?.();
      missionControl?.syncContext?.();
      campaignDirector?.syncContext?.();
      pathPlanner.syncContext({ currentSubject, currentTopic });
      gestureEngine.setGestureContext('home');
    }

    function goSubject(subjectId) {
      currentSubject = subjectId;
      homeScreen.hide();
      subjectHub.show(subjectId, goTopic);
      play.showSubject(subjectId);
      gameLayer?.recordEvent?.('subjectEnter', { subject: subjectId });
      hud.showBackHome(true, true);
      interaction.clearAll();
      simControl.clearActiveLab();
      sceneMgr.resetCamera();
      smartHint.setContext(subjectId);
      aiTutor.setContext(subjectId);
      intelligence?.syncContext?.();
      missionControl?.syncContext?.();
      campaignDirector?.syncContext?.();
      pathPlanner.syncContext({ currentSubject, currentTopic });
      pathPlanner.coachNext(subjectId);
      gestureEngine.setGestureContext(subjectId);
    }

    function goTopic(subjectId, topicId) {
      const prev = currentTopic;
      currentTopic = topicId;

      if (currentSubject === 'math')    { if (prev) mathMod.hide(); interaction.clearAll(); mathMod.showTopic(topicId); }
      if (currentSubject === 'physics') { if (prev) physMod.hide(); interaction.clearAll(); physMod.showTopic(topicId); }
      if (currentSubject === 'chem')    { if (prev) chemMod.hide(); interaction.clearAll(); chemMod.showTopic(topicId); }
      const activeLab =
        currentSubject === 'math' ? mathMod.getActiveLab() :
        currentSubject === 'physics' ? physMod.getActiveLab() :
        currentSubject === 'chem' ? chemMod.getActiveLab() :
        null;
      simControl.setActiveLab(activeLab, { subject: subjectId, topic: topicId });

      progress.recordLab(subjectId, topicId);
      gameLayer?.recordEvent?.('topicEnter', { subject: subjectId, topic: topicId });
      play.showTopic(subjectId, topicId);
      adaptive.record(topicId, 0);
      smartHint.setContext(topicId);
      aiTutor.setContext(topicId);
      intelligence?.syncContext?.();
      missionControl?.syncContext?.();
      campaignDirector?.syncContext?.();
      pathPlanner.syncContext({ currentSubject, currentTopic });
      gestureEngine.setGestureContext(topicId);
      haptic.select();
    }

    function goBack() {
      if (currentTopic) {
        if (currentSubject === 'math')    mathMod.hide();
        if (currentSubject === 'physics') physMod.hide();
        if (currentSubject === 'chem')    chemMod.hide();
        currentTopic = null;
        simControl.clearActiveLab();
        interaction.clearAll();
        subjectHub.show(currentSubject, goTopic);
        smartHint.setContext(currentSubject);
        aiTutor.setContext(currentSubject);
        gestureEngine.setGestureContext(currentSubject);
        intelligence?.syncContext?.();
        missionControl?.syncContext?.();
        campaignDirector?.syncContext?.();
        pathPlanner.syncContext({ currentSubject, currentTopic });
      } else if (currentSubject) {
        goHome();
      }
    }

    intelligence = new LearningIntelligence({
      gestureEngine,
      interaction,
      aiTutor,
      smartHint,
      getState: () => ({ currentSubject, currentTopic }),
    });
    gameLayer = new GameLayer({
      gestureEngine,
      interaction,
      aiTutor,
      getState: () => ({ currentSubject, currentTopic }),
    });
    campaignDirector = new CampaignDirector({
      gestureEngine,
      interaction,
      aiTutor,
      game: gameLayer,
      getState: () => ({ currentSubject, currentTopic }),
    });
    missionControl = new AdaptiveMissionControl({
      gestureEngine,
      interaction,
      aiTutor,
      progress,
      adaptive,
      game: gameLayer,
      getState: () => ({ currentSubject, currentTopic }),
    });
    bossChallenge = new BossChallengeManager({
      gestureEngine,
      interaction,
      aiTutor,
      game: gameLayer,
      progress,
      adaptive,
      getState: () => ({ currentSubject, currentTopic }),
    });

    const navGestures = new NavigationGestureController(gestureEngine, {
      getState: () => ({ currentSubject, currentTopic }),
      goHome,
      goBack,
      goSubject,
      showGuide: (category) => gestureGuide.show(category),
      toggleDraw: () => {
        if (airDrawing._active) airDrawing.deactivate();
        else airDrawing.activate();
      },
      showDashboard: () => progress.show(),
      showPath: () => {
        gameLayer.recordEvent('pathOpen');
        pathPlanner.show(currentSubject);
      },
      showLoadout: () => gameLayer.showLoadout(),
      showAvatar: () => gameLayer.showAvatar(),
      showCampaign: () => campaignDirector.show(),
      hideOverlays: () => gestureGuide.hide(),
      onModeChange: (mode) => {
        intelligence?.setMode?.(mode);
        if (mode === 'challenge') bossChallenge?.start?.();
      },
    });

    // HUD
    const hud = new HUD(gestureEngine, goBack, goHome);

    // XR
    await xrManager.init();

    // Voice Commands wiring
    const voice = new VoiceCommands((cmd, raw) => {
      if (cmd === 'home')           { goHome(); }
      else if (cmd === 'back')      { goBack(); }
      else if (cmd === 'reset')     { goHome(); }
      else if (cmd === 'screenshot'){ screenshot.capture(currentTopic || currentSubject || 'Home'); progress.recordScreenshot(); }
      else if (cmd === 'nav:math')  { goSubject('math'); }
      else if (cmd === 'nav:physics'){ goSubject('physics'); }
      else if (cmd === 'nav:chem')  { goSubject('chem'); }
      else if (cmd === 'dashboard') { progress.show(); }
      else if (cmd === 'path')      { gameLayer.recordEvent('pathOpen'); pathPlanner.show(currentSubject); }
      else if (cmd === 'loadout')   { gameLayer.showLoadout(); }
      else if (cmd === 'avatar')    { gameLayer.showAvatar(); }
      else if (cmd === 'campaign')  { campaignDirector.show(); }
      else if (cmd === 'exam')      { gameLayer.recordEvent('quizOpen'); currentTopic ? bossChallenge.start() : examMode.start(currentSubject || 'math'); }
      else if (cmd === 'airdraw')   { airDrawing.activate(); }
      else if (cmd === 'conceptgraph') { conceptGraph.show(); }
      else if (cmd.startsWith('topic:')) { if (currentSubject) goTopic(currentSubject, cmd.split(':')[1]); }
      else if (cmd.startsWith('raw:'))   { aiTutor.speak(raw); }
      progress.recordVoiceCommand();
    });
    voice.start();

    // 7. MediaPipe hand tracking
    setProgress(90, 'Initializing hand tracking...');
    const mpOk = await handTracker.init();

    // Patch GestureEngine to store raw landmarks
    handTracker.onResults(results => {
      if (results?.landmarks) {
        gestureEngine._lastLandmarks = results.landmarks;
      } else {
        gestureEngine._lastLandmarks = [];
      }
      const gestures = gestureEngine.process(results);
      if (gestures) gestureFB.showGestureHint(gestures[0]);
    });

    // Camera permission flow
    if (mpOk) {
      const cameraOverlay = document.getElementById('camera-overlay');
      cameraOverlay?.classList.remove('hidden');

      document.getElementById('enable-camera-btn')?.addEventListener('click', async () => {
        cameraOverlay?.classList.add('hidden');
        await handTracker.startCamera();
      });
      document.getElementById('skip-camera-btn')?.addEventListener('click', () => {
        cameraOverlay?.classList.add('hidden');
      });
    }

    // Feature toolbar buttons
    document.getElementById('feat-screenshot')?.addEventListener('click', () => {
      screenshot.capture(currentTopic || currentSubject || 'Home');
      progress.recordScreenshot();
    });
    document.getElementById('feat-dashboard')?.addEventListener('click', () => progress.show());
    document.getElementById('feat-exam')?.addEventListener('click', () => {
      gameLayer.recordEvent('quizOpen');
      if (currentTopic) bossChallenge.start();
      else examMode.start(currentSubject || 'math');
    });
    document.getElementById('feat-concept')?.addEventListener('click', () => {
      if (currentSubject && !currentTopic) {
        gameLayer.recordEvent('pathOpen');
        pathPlanner.show(currentSubject);
      }
      else conceptGraph.show();
    });
    document.getElementById('feat-guide')?.addEventListener('click', () => gestureGuide.toggle());
    document.getElementById('feat-campaign')?.addEventListener('click', () => campaignDirector.show());
    document.getElementById('feat-airdraw')?.addEventListener('click', () => {
      if (airDrawing._active) airDrawing.deactivate();
      else airDrawing.activate();
    });
    let voiceActive = false;
    document.getElementById('feat-voice')?.addEventListener('click', (e) => {
      voiceActive = !voiceActive;
      if (voiceActive) { voice.start(); e.target.style.background = 'rgba(0,212,255,0.25)'; }
      else { voice.stop(); e.target.style.background = ''; }
    });

    // Teacher command handler
    multiplayer._onTeacherCmd = (cmd) => {
      if (cmd === 'nav:math')    goSubject('math');
      if (cmd === 'nav:physics') goSubject('physics');
      if (cmd === 'nav:chem')    goSubject('chem');
      if (cmd === 'dashboard')   progress.show();
      if (cmd === 'path')        { gameLayer.recordEvent('pathOpen'); pathPlanner.show(currentSubject); }
      if (cmd === 'loadout')     gameLayer.showLoadout();
      if (cmd === 'avatar')      gameLayer.showAvatar();
      if (cmd === 'campaign')    campaignDirector.show();
      if (cmd === 'exam')        { gameLayer.recordEvent('quizOpen'); examMode.start(currentSubject || 'math'); }
      if (cmd === 'reset')       goHome();
    };

    // Tutorial
    const tutBtn = document.getElementById('tutorial-close-btn');
    tutBtn?.addEventListener('click', () => {
      document.getElementById('tutorial-overlay')?.classList.add('hidden');
      homeScreen.show(goSubject);
      play.showHomePrompt();
      play.showMission('Choose a portal and start a tiny science adventure.', '#ffd700');
    });

    // Show tutorial on first visit (or go straight home after 2s)
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    const firstVisit = !localStorage.getItem('cosmiclearn_visited');
    if (firstVisit) {
      tutorialOverlay?.classList.remove('hidden');
      localStorage.setItem('cosmiclearn_visited', '1');
    } else {
      tutorialOverlay?.classList.add('hidden');
      homeScreen.show(goSubject);
      play.showHomePrompt();
      play.showMission('Choose a portal and start a tiny science adventure.', '#ffd700');
    }

    // Main render loop
    let lastTime = performance.now();
    scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      const camera = scene.activeCamera;
      if (!camera) return;

      // Update environment
      env.update(deltaTime);

      // Update hand viz + feedback
      if (handTracker.isRunning) {
        handViz.update(camera, canvas);
        gestureFB.update(camera, canvas);
        interaction.update(camera, canvas);
        airDrawing.update(camera, canvas);
      }

      // Update active home screen
      homeScreen.update(deltaTime);

      // Update active lab
      if (currentSubject === 'math' && simControl.shouldUpdate(mathMod.getActiveLab()))    mathMod.update(deltaTime);
      if (currentSubject === 'physics' && simControl.shouldUpdate(physMod.getActiveLab())) physMod.update(deltaTime);
      if (currentSubject === 'chem' && simControl.shouldUpdate(chemMod.getActiveLab()))    chemMod.update(deltaTime);
    });

    // Fade out loading screen
    setProgress(100, 'Ready!');
    setTimeout(() => {
      const ls = document.getElementById('loading-screen');
      ls?.classList.add('fade-out');
      setTimeout(() => ls?.remove(), 900);
    }, 600);

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

  } catch (err) {
    console.error('CosmicLearn boot error:', err);
    setProgress(100, 'Error: ' + err.message);
  }
}

boot();
