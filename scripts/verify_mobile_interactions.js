// Copyright (c) 2026. All rights reserved.
// Executable regressions for mobile account focus and one-click stamp barrages.

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

function createFakeElement(tagName) {
  return {
    tagName: String(tagName || 'div').toUpperCase(),
    style: {},
    attributes: {},
    children: [],
    className: '',
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    append(...children) {
      children.forEach(child => this.appendChild(child));
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name];
    }
  };
}

function findFakeElement(rootNode, predicate) {
  if (!rootNode) return null;
  if (predicate(rootNode)) return rootNode;
  for (const child of rootNode.children || []) {
    const match = findFakeElement(child, predicate);
    if (match) return match;
  }
  return null;
}

function verifyLandscapeSeedBank() {
  const source = extractClassMethodAfter('UIManager', 'renderTowerBar() {');
  check(!!source, 'UIManager.renderTowerBar is executable in the landscape seed-bank regression');
  if (!source) return;

  const towerIds = ['textbook', 'pencil', 'watering', 'glue', 'ruler', 'eraser', 'teacher'];
  const towers = Object.fromEntries(towerIds.map((id, index) => [id, {
    id,
    cost: 50 + index * 10,
    icon: id.slice(0, 1).toUpperCase(),
    name: id
  }]));
  const documentStub = {
    createElement: tagName => createFakeElement(tagName),
    createTextNode: text => ({ nodeType: 3, textContent: String(text), children: [] })
  };
  const windowStub = { innerWidth: 568, innerHeight: 320 };
  const TestUi = new Function(
    'window',
    'document',
    'TOWERS',
    'STAMP_BARRAGE',
    'STAMP_KILLS_REQUIRED',
    'SIDEBAR_WIDTH_LANDSCAPE',
    'readSafeAreaInset',
    'getToolLevelFromMap',
    'getToolLevelMeta',
    'ASSETS',
    'getTowerAssetId',
    `return class TestUi {\n${source}\n}`
  )(
    windowStub,
    documentStub,
    towers,
    { label: '全军齐射' },
    10,
    110,
    () => 0,
    () => 1,
    () => null,
    { get: () => null },
    id => id
  );

  const ui = new TestUi();
  ui.phase = 'td';
  ui.isLandscape = true;
  ui.activeLoadout = towerIds.slice();
  ui.stats = { mp: 999, hp: 3, cooldowns: {} };
  ui.toolLevels = {};
  ui.teacherCharge = 0;
  ui.teacherReady = false;
  ui.stamps = 0;
  ui.stampProgress = 0;
  ui.selectedTower = null;
  ui.el = (tagName, style, text) => {
    const node = createFakeElement(tagName);
    Object.assign(node.style, style || {});
    if (text != null) node.textContent = String(text);
    return node;
  };
  ui.onSelectTower = id => {
    ui.selectedTower = id;
  };

  const landscapeBar = ui.renderTowerBar();
  const landscapeInner = landscapeBar && landscapeBar.children[0];
  const towerSlots = findFakeElement(
    landscapeBar,
    node => node.getAttribute && node.getAttribute('data-tower-slots') === 'landscape'
  );
  const actionRow = findFakeElement(
    landscapeBar,
    node => node.getAttribute && node.getAttribute('data-landscape-action-row') === 'landscape'
  );
  const teacherAction = findFakeElement(
    actionRow,
    node => node.getAttribute && node.getAttribute('data-landscape-action') === 'teacher'
  );
  const stampAction = findFakeElement(
    actionRow,
    node => node.getAttribute && node.getAttribute('data-landscape-action') === 'stamp'
  );
  check(
    windowStub.innerWidth === 568
      && windowStub.innerHeight === 320
      && !!actionRow
      && actionRow.style.display === 'grid'
      && actionRow.style.gridTemplateColumns === 'repeat(2, minmax(0, 1fr))'
      && parseFloat(actionRow.style.minHeight) >= 46,
    '568x320 landscape uses one fixed two-column action row'
  );
  check(
    !!teacherAction
      && !!stampAction
      && actionRow.children.length === 2
      && actionRow.style.overflow === 'hidden'
      && [teacherAction, stampAction].every(action =>
        action.style.minHeight === '0'
          && action.style.overflow === 'hidden'
          && action.style.whiteSpace === 'nowrap'
      ),
    'landscape teacher and stamp controls stay inside the fixed action row without overlapping seed slots'
  );
  check(
    !!towerSlots
      && towerSlots.style.display === 'grid'
      && towerSlots.style.gridTemplateColumns === 'repeat(2, minmax(0, 1fr))'
      && towerSlots.style.gridTemplateRows === 'repeat(4, minmax(0, 1fr))'
      && towerSlots.children.length === 7,
    'landscape university loadout uses seven simultaneously rendered slots in a fixed 2x4 seed bank'
  );
  check(
    !!towerSlots
      && parseFloat(towerSlots.style.minHeight) >= 187
      && towerSlots.children.every(button => parseFloat(button.style.minHeight) >= 44),
    '568x320 landscape reserves at least 44px height for every seed slot'
  );
  check(
    !!landscapeInner
      && !['auto', 'scroll'].includes(landscapeInner.style.overflowY)
      && !!towerSlots
      && !['auto', 'scroll'].includes(towerSlots.style.overflowY),
    'landscape seed bank does not depend on vertical scrolling'
  );

  const eraserButton = findFakeElement(
    towerSlots,
    node => node.getAttribute && node.getAttribute('data-tower-id') === 'eraser'
  );
  if (eraserButton) eraserButton.onclick({ stopPropagation() {} });
  const selectedBar = ui.renderTowerBar();
  const selectedEraserButton = findFakeElement(
    selectedBar,
    node => node.getAttribute && node.getAttribute('data-tower-id') === 'eraser'
  );
  if (selectedEraserButton) selectedEraserButton.onclick({ stopPropagation() {} });
  check(
    !!eraserButton && !!selectedEraserButton && ui.selectedTower === null,
    'eraser remains reachable and toggles selected then unselected in the landscape seed bank'
  );

  ui.activeLoadout = towerIds.slice(0, 4);
  const earlyLandscapeBar = ui.renderTowerBar();
  const earlyLandscapeSlots = findFakeElement(
    earlyLandscapeBar,
    node => node.getAttribute && node.getAttribute('data-tower-slots') === 'landscape'
  );
  check(
    !!earlyLandscapeSlots && earlyLandscapeSlots.children.length === 4,
    'early landscape loadouts keep every available stationery item in the fixed seed bank'
  );

  ui.isLandscape = false;
  const portraitBar = ui.renderTowerBar();
  const portraitInner = portraitBar && portraitBar.children[0];
  const portraitTowerButtons = (portraitInner && portraitInner.children || []).filter(
    node => node.getAttribute && node.getAttribute('data-tower-id')
  );
  check(
    !!portraitInner
      && portraitInner.style.overflowX === 'auto'
      && portraitTowerButtons.length === 4
      && !findFakeElement(
        portraitBar,
        node => node.getAttribute && node.getAttribute('data-tower-slots') === 'landscape'
      )
      && !findFakeElement(
        portraitBar,
        node => node.getAttribute && node.getAttribute('data-landscape-action-row') === 'landscape'
      ),
    'portrait and early-level stationery behavior remains unchanged'
  );

  ui.isLandscape = true;
  ui.activeLoadout = towerIds.slice();
  ui.stamps = 1;
  let barrageClicks = 0;
  ui.onStampUltimate = () => {
    barrageClicks++;
  };
  const readyBar = ui.renderTowerBar();
  const readyStamp = findFakeElement(
    readyBar,
    node => node.getAttribute && node.getAttribute('data-landscape-action') === 'stamp'
  );
  if (readyStamp && readyStamp.onclick) readyStamp.onclick({ stopPropagation() {} });
  check(
    !!readyStamp && typeof readyStamp.onclick === 'function' && barrageClicks === 1,
    'one stamp button click invokes the global barrage exactly once'
  );
  check(
    !!readyStamp
      && !readyStamp.onpointerdown
      && !readyStamp.onpointermove
      && !readyStamp.onpointerup
      && !readyStamp.onpointercancel
      && !readyStamp.onlostpointercapture,
    'stamp button has no drag, capture, cancel, or second-confirmation pointer handlers'
  );
  check(
    !html.includes('renderUltimateControls()')
      && !html.includes('pendingUltimate')
      && !html.includes('stampBtn.setPointerCapture'),
    'one-click barrage UI has no pending target, aim overlay, or cancel row'
  );
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

function createCombatHarness(TestEngine) {
  const engine = new TestEngine();
  engine.phase = 'td';
  engine.combatPaused = false;
  engine.stamps = 2;
  engine.R = 5;
  engine.G = 50;
  engine.OX = 100;
  engine.OY = 50;
  engine.w = 800;
  engine.objs = [];
  engine.damageLog = [];
  engine.announcements = [];
  engine.damageEnemy = (enemy, damage) => {
    engine.damageLog.push({ id: enemy.testId, damage });
    enemy.hp -= damage;
  };
  engine.announce = message => engine.announcements.push(message);
  engine.floatText = () => {};
  engine.spawnParticles = () => {};
  engine.updateStats = () => {};
  engine.pushCombatState = () => {};
  return engine;
}

function tower(testId, row, x, damage, extra = {}) {
  return {
    type: 'tower',
    id: testId,
    r: row,
    x,
    y: 50 + row * 50,
    hp: 500,
    maxHp: 500,
    destroyed: false,
    data: { type: 'shoot', dmg: damage, color: '#48bb78', ...extra }
  };
}

function enemy(testId, row, x) {
  return {
    type: 'enemy',
    id: 'slime',
    testId,
    r: row,
    x,
    y: 50 + row * 50,
    hp: 1000,
    maxHp: 1000,
    data: { role: 'normal' }
  };
}

function verifyOneClickBarrageRuntime() {
  const desiredNames = [
    'towerTargetsInDirection',
    'getTowerAttackDamage',
    'tickTowerBarrage',
    'damagePiercingTargets',
    'releaseStampUltimate'
  ];
  const desiredMethods = Object.fromEntries(desiredNames.map(name => [name, extractClassMethod(name)]));
  desiredNames.forEach(name => check(!!desiredMethods[name], `GameEngine.${name} is executable`));

  if (desiredNames.slice(0, -1).some(name => !desiredMethods[name])) {
    const legacyRelease = desiredMethods.releaseStampUltimate;
    const legacyArm = extractClassMethod('armStampUltimate');
    if (!legacyRelease || !legacyArm) return;
    const LegacyEngine = new Function(
      'TOOL_ULTIMATES',
      `return class LegacyEngine {\n${legacyArm}\n${legacyRelease}\n}`
    )({ pencil: { label: 'legacy target mode' } });
    const legacy = createCombatHarness(LegacyEngine);
    legacy.C = 10;
    legacy.selectedTower = 'pencil';
    legacy.pendingUltimate = null;
    const target = enemy('front', 2, 350);
    legacy.objs = [tower('pencil', 2, 200, 100), target];
    const result = legacy.releaseStampUltimate('pencil');
    check(
      result === true && legacy.stamps === 1 && target.hp === 880 && !legacy.pendingUltimate,
      'first stamp click immediately damages a target, spends exactly one stamp, and leaves no pending state'
    );
    return;
  }

  const TestEngine = new Function(
    'STAMP_BARRAGE',
    `return class TestEngine {\n${desiredNames.map(name => desiredMethods[name]).join('\n')}\n}`
  )({ buffFrames: 300, damageMultiplier: 1.2, laneRadius: 2 });

  const engine = createCombatHarness(TestEngine);
  const pencil = tower('pencil', 2, 200, 100);
  const noTargetTower = tower('pencil-idle', 0, 700, 80);
  const destroyedTower = tower('pencil-destroyed', 1, 180, 90);
  destroyedTower.hp = 0;
  destroyedTower.destroyed = true;
  const producerTower = {
    type: 'tower',
    id: 'textbook',
    r: 3,
    x: 180,
    y: 200,
    hp: 500,
    destroyed: false,
    data: { type: 'producer', dmg: 100 }
  };
  const lane0 = enemy('lane-0-nearest', 0, 320);
  const lane2 = enemy('lane-2-nearest', 2, 300);
  const lane2Far = enemy('lane-2-far', 2, 420);
  const lane4 = enemy('lane-4-nearest', 4, 260);
  const behind = enemy('behind-pencil', 2, 120);
  engine.objs = [pencil, noTargetTower, destroyedTower, producerTower, lane0, lane2, lane2Far, lane4, behind];

  check(engine.releaseStampUltimate() === true, 'one-click barrage casts immediately when legal shots exist');
  check(engine.stamps === 1, 'successful one-click barrage spends exactly one stamp');
  check(
    JSON.stringify(engine.damageLog.map(hit => hit.id).sort()) === JSON.stringify([
      'lane-0-nearest',
      'lane-2-nearest',
      'lane-4-nearest'
    ]),
    'each participating tower fires at most once at the nearest front target in every legal lane'
  );
  check(
    engine.damageLog.every(hit => hit.damage === 120)
      && pencil.barrageTimer === 300
      && noTargetTower.barrageTimer === 300
      && !destroyedTower.barrageTimer
      && !producerTower.barrageTimer,
    'all alive deployed attack towers receive the exact 300-frame 1.2x buff even when they had no opening shot'
  );
  check(
    lane2Far.hp === 1000 && behind.hp === 1000,
    'ordinary barrage shots do not hit farther same-lane or rear enemies'
  );

  const upgraded = tower('upgraded-pencil', 2, 200, 100);
  upgraded.atkOverride = 150;
  upgraded.barrageTimer = 300;
  check(engine.getTowerAttackDamage(upgraded) === 180, 'barrage damage multiplies upgraded attack by exactly 1.2');
  for (let frame = 0; frame < 299; frame++) engine.tickTowerBarrage(upgraded);
  check(
    upgraded.barrageTimer === 1 && engine.getTowerAttackDamage(upgraded) === 180,
    'damage buff remains active through frame 299'
  );
  engine.tickTowerBarrage(upgraded);
  check(
    upgraded.barrageTimer === 0 && engine.getTowerAttackDamage(upgraded) === 150,
    'frame 300 expiry restores upgrade damage without mutating it'
  );
  const newlyPlaced = tower('new-pencil', 2, 200, 100);
  check(
    !newlyPlaced.barrageTimer && engine.getTowerAttackDamage(newlyPlaced) === 100,
    'a tower placed after the cast does not inherit the barrage buff'
  );

  const noTowerEngine = createCombatHarness(TestEngine);
  noTowerEngine.stamps = 1;
  noTowerEngine.objs = [
    { type: 'tower', id: 'textbook', r: 2, x: 200, hp: 500, data: { type: 'producer', dmg: 100 } },
    enemy('unused', 2, 300)
  ];
  check(
    noTowerEngine.releaseStampUltimate() === false && noTowerEngine.stamps === 1,
    'no deployed attack tower returns false without spending a stamp'
  );
  const noEnemyEngine = createCombatHarness(TestEngine);
  noEnemyEngine.stamps = 1;
  noEnemyEngine.objs = [tower('pencil', 2, 200, 100)];
  check(
    noEnemyEngine.releaseStampUltimate() === false && noEnemyEngine.stamps === 1,
    'no alive enemy returns false without spending a stamp'
  );

  const rulerEngine = createCombatHarness(TestEngine);
  rulerEngine.stamps = 1;
  const ruler = tower('ruler', 2, 300, 50, { pierce: true, pierceCount: 2, bidirectional: true, color: '#f97316' });
  const front1 = enemy('front-1', 2, 400);
  const front2 = enemy('front-2', 2, 500);
  const front3 = enemy('front-3', 2, 600);
  const back1 = enemy('back-1', 2, 200);
  const back2 = enemy('back-2', 2, 100);
  const back3 = enemy('back-3', 2, 50);
  rulerEngine.objs = [ruler, front1, front2, front3, back1, back2, back3];
  check(rulerEngine.releaseStampUltimate() === true, 'ruler participates in the one-click barrage');
  check(
    JSON.stringify(rulerEngine.damageLog.map(hit => hit.id).sort()) === JSON.stringify(['back-1', 'front-1']),
    'ruler barrage chooses at most one nearest front and one nearest back target per lane'
  );

  rulerEngine.damageLog = [];
  [front1, front2, front3, back1, back2, back3].forEach(target => {
    target.hp = 1000;
  });
  rulerEngine.objs = [ruler, front1, front2, front3, back1, back2, back3];
  rulerEngine.damagePiercingTargets(ruler, 2, 50, 2);
  const normalHits = Object.fromEntries(rulerEngine.damageLog.map(hit => [hit.id, hit.damage]));
  check(
    normalHits['front-1'] === 50
      && normalHits['front-2'] === 36
      && normalHits['back-1'] === 50
      && normalHits['back-2'] === 36
      && !normalHits['front-3']
      && !normalHits['back-3'],
    'ruler normal attack applies its pierce limit and falloff independently forward and backward'
  );
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

verifyLandscapeSeedBank();
verifyAccountResizeGate();
verifyOneClickBarrageRuntime();
verifyBossThresholdQueue();

if (failures) {
  console.error(`Mobile interaction regressions failed: ${failures}`);
  process.exitCode = 1;
} else {
  console.log('Mobile interaction regressions verified.');
}
