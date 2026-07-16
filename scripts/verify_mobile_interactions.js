// Copyright (c) 2026. All rights reserved.
// Executable regressions for mobile account focus and targeted ultimate gestures.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let failures = 0;

function check(condition, message) {
  if (condition) console.log(`[OK] ${message}`);
  else {
    failures++;
    console.error(`[FAIL] ${message}`);
  }
}

function extractBlock(start, braceStart) {
  let depth = 0;
  for (let i = braceStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  return '';
}

function extractTopLevelFunction(name) {
  const marker = `function ${name}(`;
  const start = html.indexOf(marker);
  if (start < 0) return '';
  return extractBlock(start, html.indexOf('{', start));
}

function extractClassMethod(name) {
  const marker = `        ${name}(`;
  const start = html.indexOf(marker);
  if (start < 0) return '';
  return extractBlock(start, html.indexOf('{', start)).trim();
}

function extractClassMethodAfter(className, methodSignature) {
  const classStart = html.indexOf(`class ${className} {`);
  const marker = `        ${methodSignature}`;
  const start = html.indexOf(marker, classStart);
  if (classStart < 0 || start < 0) return '';
  return extractBlock(start, html.indexOf('{', start)).trim();
}

function extractAssignedArrow(marker) {
  const assignmentStart = html.indexOf(marker);
  if (assignmentStart < 0) return '';
  const arrowStart = html.indexOf('event =>', assignmentStart);
  if (arrowStart < 0) return '';
  return extractBlock(arrowStart, html.indexOf('{', arrowStart));
}

function readConstObject(name) {
  const marker = `const ${name} = {`;
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const body = extractBlock(start, html.indexOf('{', start));
  try {
    return new Function(`${body}; return ${name};`)();
  } catch (error) {
    return null;
  }
}

function verifyAccountResizeGate() {
  const source = extractTopLevelFunction('syncUiOrientation');
  const orientationSource = extractTopLevelFunction('readStableLandscapeOrientation');
  check(!!source, 'orientation sync helper is executable');
  check(!!orientationSource, 'stable orientation signal helper is executable');
  if (!source || !orientationSource) return;

  const syncUiOrientation = new Function(`${source}; return syncUiOrientation;`)();
  const readStableLandscapeOrientation = new Function(`${orientationSource}; return readStableLandscapeOrientation;`)();
  const focusedInput = { isConnected: true, value: 'student_01' };
  const documentState = { activeElement: focusedInput };
  const ui = {
    isLandscape: false,
    renderCount: 0,
    update(patch) {
      Object.assign(this, patch);
      this.renderCount++;
      focusedInput.isConnected = false;
      documentState.activeElement = null;
    }
  };

  const viewport = { innerWidth: 390, innerHeight: 844, orientation: undefined, navigator: { maxTouchPoints: 5 } };
  const display = { orientation: { type: 'portrait-primary' } };
  viewport.innerHeight = 280;
  const keyboardOrientation = readStableLandscapeOrientation(ui.isLandscape, false, viewport, display);
  const sameOrientation = syncUiOrientation(ui, keyboardOrientation);
  check(sameOrientation === false, 'soft-keyboard resize is classified as a non-orientation resize');
  check(
    ui.renderCount === 0
      && focusedInput.isConnected
      && documentState.activeElement === focusedInput
      && focusedInput.value === 'student_01',
    'keyboard resize crossing the viewport aspect ratio preserves input node, focus, and value'
  );

  display.orientation.type = 'landscape-primary';
  viewport.innerWidth = 844;
  viewport.innerHeight = 390;
  const rotatedOrientation = readStableLandscapeOrientation(ui.isLandscape, false, viewport, display);
  const changedOrientation = syncUiOrientation(ui, rotatedOrientation);
  const duplicateOrientation = syncUiOrientation(ui, rotatedOrientation);
  check(
    changedOrientation === true
      && duplicateOrientation === false
      && ui.renderCount === 1
      && ui.isLandscape === true,
    'real Screen Orientation API changes update the UI exactly once'
  );

  const fallbackViewport = { innerWidth: 844, innerHeight: 390, navigator: { maxTouchPoints: 5 } };
  const stableWithoutApi = readStableLandscapeOrientation(false, false, fallbackViewport, {});
  const rotatedWithoutApi = readStableLandscapeOrientation(false, true, fallbackViewport, {});
  check(
    stableWithoutApi === false && rotatedWithoutApi === true,
    'orientation fallback ignores resize aspect flips and only samples viewport on an orientation event'
  );
}

function verifyPointerCaptureIntegration() {
  const updateSource = extractClassMethodAfter('UIManager', 'update(patch) {');
  const pointerUpSource = extractAssignedArrow('stampBtn.onpointerup = event =>');
  const lostPointerCaptureSource = extractAssignedArrow('stampBtn.onlostpointercapture = event =>');
  check(!!updateSource, 'UIManager.update is executable in the DOM integration regression');
  check(!!pointerUpSource, 'ultimate pointerup handler is executable in the DOM integration regression');
  check(!!lostPointerCaptureSource, 'ultimate lostpointercapture handler is executable in the DOM integration regression');
  if (!updateSource || !pointerUpSource || !lostPointerCaptureSource) return;

  const UiHarness = new Function(`return class UiHarness {\n${updateSource}\n}`)();
  const ui = new UiHarness();
  const capturedButton = { isConnected: true };
  ui.renderCount = 0;
  ui.render = () => {
    ui.renderCount++;
    capturedButton.isConnected = false;
  };
  ui.ultimatePointer = { pointerId: 9, toolId: 'pencil', dragging: true };
  ui.update({ liveMessage: '大招瞄準' });
  ui.update({ stats: { mp: 500 } });
  check(ui.renderCount === 0 && capturedButton.isConnected, 'announcement and combat updates preserve the captured ultimate icon during drag');

  let pointerStateObservedByEnd = 'not-called';
  let returnedToIcon = null;
  ui.suppressUltimateClick = false;
  ui.onUltimateGestureEnd = returned => {
    pointerStateObservedByEnd = ui.ultimatePointer;
    returnedToIcon = returned;
    ui.update({ pendingUltimate: { toolId: 'pencil', state: 'locked' } });
  };
  const stampBtn = {
    getBoundingClientRect: () => ({ left: 0, right: 80, top: 0, bottom: 80 })
  };
  const pointerUp = new Function('stampBtn', `return (${pointerUpSource});`).call(ui, stampBtn);
  pointerUp({ pointerId: 9, isPrimary: true, clientX: 320, clientY: 140, preventDefault() {} });
  check(pointerStateObservedByEnd === null, 'pointerup releases UI pointer state before the lock callback can render');
  check(returnedToIcon === false && ui.pendingUltimate.state === 'locked', 'pointerup outside the icon locks the battlefield target after capture-safe cleanup');

  const lostUi = {
    ultimatePointer: { pointerId: 12, toolId: 'pencil', dragging: true },
    suppressUltimateClick: false
  };
  const engine = {
    pendingUltimate: { toolId: 'pencil', state: 'dragging', previewCell: { c: 4, r: 1 } },
    stamps: 1,
    cancelCalls: 0,
    cancelUltimateGesture() {
      this.cancelCalls++;
      this.pendingUltimate = null;
    }
  };
  lostUi.onUltimateGestureCancel = () => engine.cancelUltimateGesture();
  const lostPointerCapture = new Function(
    'stampBtn',
    `return (${lostPointerCaptureSource});`
  ).call(lostUi, stampBtn);
  const lostEvent = { pointerId: 12 };
  lostPointerCapture(lostEvent);
  lostPointerCapture(lostEvent);
  check(
    lostUi.ultimatePointer === null
      && engine.pendingUltimate === null
      && engine.stamps === 1
      && engine.cancelCalls === 1,
    'lostpointercapture clears UI and engine gesture state once without spending a stamp'
  );
}

function buildUltimateEngine() {
  const names = [
    'clearPendingUltimate',
    'beginUltimateGesture',
    'updateUltimateGesture',
    'endUltimateGesture',
    'cancelUltimateGesture',
    'armStampUltimate',
    'screenToGridCell',
    'enemyGridColumn',
    'ultimateTargets',
    'confirmStampUltimate',
    'releaseStampUltimate'
  ];
  const methods = Object.fromEntries(names.map(name => [name, extractClassMethod(name)]));
  names.forEach(name => check(!!methods[name], `GameEngine.${name} is executable`));
  if (names.some(name => !methods[name])) return null;

  const TOOL_ULTIMATES = readConstObject('TOOL_ULTIMATES');
  check(!!TOOL_ULTIMATES, 'ultimate profiles are readable by the runtime regression');
  if (!TOOL_ULTIMATES) return null;

  const TestEngine = new Function(
    'TOOL_ULTIMATES',
    'defaultToolLevels',
    `return class TestEngine {\n${names.map(name => methods[name]).join('\n')}\n}`
  )(TOOL_ULTIMATES, () => ({ pencil: 1 }));

  const engine = new TestEngine();
  engine.phase = 'td';
  engine.combatPaused = false;
  engine.stamps = 2;
  engine.C = 10;
  engine.R = 5;
  engine.G = 50;
  engine.OX = 100;
  engine.OY = 50;
  engine.w = 800;
  engine.h = 450;
  engine.canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 450 }) };
  engine.save = { toolLevels: { pencil: 1 } };
  engine.objs = [{ type: 'enemy', id: 'slime', r: 1, x: 325, y: 100, hp: 500, maxHp: 500, data: { role: 'normal' } }];
  engine.announcements = [];
  engine.damageCalls = 0;
  engine.announce = message => engine.announcements.push(message);
  engine.pushCombatState = () => {};
  engine.updateStats = () => {};
  engine.floatText = () => {};
  engine.spawnParticles = () => {};
  engine.spawnVfxPhase = () => {};
  engine.startBossVulnerability = () => {};
  engine.damageEnemy = (enemy, damage) => {
    engine.damageCalls++;
    enemy.hp -= damage;
  };
  return engine;
}

function verifyUltimateGesture() {
  const engine = buildUltimateEngine();
  if (!engine) return;

  check(engine.beginUltimateGesture('pencil') === true, 'holding an ultimate icon enters drag targeting');
  check(engine.pendingUltimate && engine.pendingUltimate.state === 'dragging', 'gesture state starts as dragging');
  check(engine.updateUltimateGesture(325, 125) === true, 'dragging over the battlefield updates the target cell');
  check(engine.pendingUltimate.previewCell.c === 4 && engine.pendingUltimate.previewCell.r === 1, 'range preview follows pointer coordinates');
  check(engine.endUltimateGesture(false) === true, 'pointerup over the battlefield locks the target');
  check(engine.pendingUltimate && engine.pendingUltimate.state === 'locked' && engine.stamps === 2, 'pointerup locks without casting or spending a stamp');

  check(engine.releaseStampUltimate('pencil') === true, 'clicking the same locked icon casts the ultimate');
  check(engine.stamps === 1 && engine.damageCalls === 1 && engine.pendingUltimate === null, 'successful cast spends exactly one stamp and resolves exactly once');
  engine.releaseStampUltimate('pencil');
  check(engine.stamps === 1 && engine.damageCalls === 1, 'a repeated click cannot double-spend or double-resolve');
  engine.clearPendingUltimate('test-reset', false);

  engine.stamps = 1;
  engine.beginUltimateGesture('pencil');
  engine.updateUltimateGesture(325, 125);
  check(engine.cancelUltimateGesture() === true && engine.pendingUltimate === null && engine.stamps === 1, 'pointercancel clears targeting without spending a stamp');

  engine.beginUltimateGesture('pencil');
  engine.updateUltimateGesture(325, 125);
  check(engine.endUltimateGesture(true) === false && engine.pendingUltimate === null && engine.stamps === 1, 'dragging back to the icon cancels without spending a stamp');

  engine.pendingUltimate = { toolId: 'pencil', state: 'locked', previewCell: { c: 4, r: 1 } };
  engine.clearPendingUltimate('level-start');
  check(engine.pendingUltimate === null && engine.stamps === 1, 'level transitions clear pending targeting without spending a stamp');

  engine.pendingUltimate = { toolId: 'pencil', state: 'locked', previewCell: { c: 4, r: 1 } };
  engine.stamps = 0;
  check(engine.releaseStampUltimate('pencil') === false && engine.pendingUltimate === null && engine.stamps === 0, 'missing stamps invalidate stale pending targeting without going negative');

  const lifecycleMethods = ['startLevel', 'startChapterMinigame', 'finishChapterMinigame', 'startMaze', 'nextLevel', 'update'];
  lifecycleMethods.forEach(name => {
    const body = extractClassMethod(name);
    check(body.includes('clearPendingUltimate('), `${name} clears pending ultimate state at its phase boundary`);
  });
}

function verifyBossThresholdQueue() {
  const queueSource = extractClassMethod('queueBossPhaseThresholds');
  const transitionSource = extractClassMethod('transitionBossPhase');
  const pendingSource = extractTopLevelFunction('hasPendingBossTelegraph');
  check(!!queueSource, 'Boss threshold queue helper is executable');
  check(!!transitionSource, 'Boss transition method is executable');
  if (!queueSource || !transitionSource || !pendingSource) return;

  const hasPendingBossTelegraph = new Function(`${pendingSource}; return hasPendingBossTelegraph;`)();
  const TestEngine = new Function(
    'hasPendingBossTelegraph',
    `return class TestEngine {\n${queueSource}\n${transitionSource}\n}`
  )(hasPendingBossTelegraph);
  const engine = new TestEngine();
  engine.objs = [];
  engine.floatText = () => {};
  engine.spawnVfxPhase = () => {};
  engine.announce = () => {};
  const enemy = { id: 'boss', hp: 20, maxHp: 100, bossPhase: 0, x: 500, y: 120 };
  const cfg = {
    label: 'Test Boss',
    phases: [
      { at: 1, telegraph: 60 },
      { at: 0.65, telegraph: 60 },
      { at: 0.3, telegraph: 60 }
    ]
  };

  check(engine.transitionBossPhase(enemy, cfg) === true, 'high AoE damage starts the next sequential Boss phase');
  check(enemy.bossPhase === 1 && JSON.stringify(enemy.bossPhaseQueue) === '[2]', 'crossed Boss thresholds are queued without skipping phase 1');
  check(hasPendingBossTelegraph(engine.objs, enemy), 'queued Boss transition locks side effects during its telegraph');
  check(engine.transitionBossPhase(enemy, cfg) === false && engine.objs.length === 1, 'pending Boss transition cannot be duplicated while locked');

  engine.objs.length = 0;
  enemy.bossPhaseTransitioning = false;
  check(engine.transitionBossPhase(enemy, cfg) === true && enemy.bossPhase === 2, 'queued phase 2 starts only after phase 1 unlocks');
}

verifyAccountResizeGate();
verifyPointerCaptureIntegration();
verifyUltimateGesture();
verifyBossThresholdQueue();

if (failures) {
  console.error(`Mobile interaction regressions failed: ${failures}`);
  process.exitCode = 1;
} else {
  console.log('Mobile interaction regressions verified.');
}
