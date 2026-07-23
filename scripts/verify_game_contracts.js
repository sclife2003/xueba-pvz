// Copyright (c) 2026. All rights reserved.
// Verifies gameplay contracts that are easy to regress in the single-file game.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`[OK] ${message}`);
}

function assert(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

function extractConstObject(name) {
  const marker = `const ${name} = {`;
  const start = html.indexOf(marker);
  if (start < 0) return '';
  let depth = 0;
  let bodyStart = -1;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') {
      depth++;
      if (bodyStart < 0) bodyStart = i + 1;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return html.slice(bodyStart, i);
    }
  }
  return '';
}

function topLevelKeys(body) {
  return Array.from(body.matchAll(/^\s*([A-Za-z0-9_]+):\s*\{/gm)).map(m => m[1]);
}

function readConstObject(name) {
  const body = extractConstObject(name);
  if (!body) return null;
  try {
    return new Function(`return ({${body}});`)();
  } catch (error) {
    fail(`${name} is a readable data-only contract: ${error.message}`);
    return null;
  }
}

function assetExists(relativePath) {
  return typeof relativePath === 'string'
    && !relativePath.includes('.svg')
    && fs.existsSync(path.join(root, relativePath));
}

function loadTopLevelFunction(name) {
  const marker = `function ${name}(`;
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const bodyStart = html.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) {
      const source = html.slice(start, i + 1);
      return new Function(`${source}; return ${name};`)();
    }
  }
  return null;
}

function extractClassMethod(name) {
  const marker = `        ${name}(`;
  const start = html.indexOf(marker);
  if (start < 0) return '';
  const bodyStart = html.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1).trim();
  }
  return '';
}

if (!scriptMatch) {
  fail('index.html has one extractable inline script');
  process.exit(1);
}

const script = scriptMatch[1];
new Function(script);
pass('inline script compiles');

const enemyKeys = topLevelKeys(extractConstObject('ENEMIES')).filter(id => id !== 'elf');
const specialKeys = topLevelKeys(extractConstObject('SPECIAL_ATTACKS'));
const missingSpecials = enemyKeys.filter(id => !specialKeys.includes(id));

assert(script.includes('this.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));'), 'canvas stores capped DPR');
assert(script.includes('this.canvas.width = Math.round(cssW * this.dpr);'), 'canvas backing width uses DPR');
assert(script.includes('this.canvas.height = Math.round(cssH * this.dpr);'), 'canvas backing height uses DPR');
assert(script.includes('ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);'), 'draw path resets DPR transform');
assert(script.includes("ctx.imageSmoothingQuality = 'high';"), 'draw path requests high image smoothing');
assert(!script.includes('this.canvas.width / rect.width'), 'input mapping avoids backing-store width');
assert(!script.includes('this.canvas.height / rect.height'), 'input mapping avoids backing-store height');

assert(enemyKeys.length >= 18, 'enemy roster is detected');
assert(specialKeys.length >= enemyKeys.length, 'SPECIAL_ATTACKS covers the enemy roster');
assert(missingSpecials.length === 0, `all non-elf enemies have specialty attacks${missingSpecials.length ? `: ${missingSpecials.join(', ')}` : ''}`);
assert(script.includes('findSpecialAttackTarget(enemy, cfg)'), 'special attack target helper exists');
assert(script.includes('resolveSpecialAttack(enemy, target, cfg)'), 'special attack resolver exists');
assert(script.includes('damageTower(tower, amount, sourceColor, label'), 'tower damage helper exists');
assert(script.includes('this.resolveSpecialAttack(o, specialTarget, specialCfg);'), 'enemy update triggers special attacks');
assert(script.includes('this.damageTower(eating,'), 'bite damage goes through tower damage helper');
assert(script.includes('applyTowerCooldownPenalty(tower, frames)'), 'cooldown disruption helper documents mixed cd semantics');
assert(script.includes('tower.cd = Math.max(0, (tower.cd || 0) - penalty);'), 'producer cdPenalty delays the next resource tick');
assert(script.includes('tower.cd = Math.max(tower.cd || 0, penalty);'), 'shooter cdPenalty delays the next attack');
assert(script.includes('this.applyTowerCooldownPenalty(target, cfg.cdPenalty);'), 'special attacks route cdPenalty through the helper');
assert(script.includes('const MONSTER_ATTACK_PLAN = {'), 'monster attack archetype plan exists');
assert(script.includes("archetype: 'ranged'"), 'ranged monster archetypes are represented');
assert(script.includes("archetype: 'siege'"), 'siege monster archetypes are represented');
assert(script.includes("archetype: 'support'"), 'support monster archetypes are represented');
assert(script.includes("rangeBand: 'ranged'"), 'monster plan distinguishes ranged pressure');
assert(script.includes("rangeBand: 'melee'"), 'monster plan distinguishes melee pressure');
assert(script.includes('const WAVE_BEATS = ['), 'PvZ-style wave beat table exists');
assert(script.includes('const SCENE_BEAT_PROFILES = {'), 'scene-specific wave beat profiles exist');
assert(script.includes("beat: beat.id"), 'generated pressure waves record their beat');
assert(script.includes('laneMode: laneModeForArchetype'), 'generated groups receive readable lane modes');
assert(script.includes('chooseSpawnRowForGroup(grp, wave, this.R)'), 'spawn routing uses group lane modes');
assert(script.includes('function getWavePressureMultiplier(enemyDef, level, wave)'), 'wave-aware enemy survival scaling exists');
assert(script.includes('MIN_SURVIVAL_SECONDS'), 'enemy scaling targets minimum survival time');
assert(script.includes('scaleEnemyStats(eDef, LEVELS[this.levelIdx], this.challengeRule, wave)'), 'spawn scaling receives current wave pressure');
assert(script.includes('specialCd: 45 + Math.floor(Math.random() * 55)'), 'enemy spawn initializes specialCd');
assert(script.includes('if (o.silenceTimer > 0) {'), 'tower silence state is consumed in the update loop');
assert(script.includes('o.eatCd = 24;'), 'bite damage cadence is explicit');
assert(script.includes("t.type==='tower' && t.hp > 0 && !t.destroyed"), 'eating finder ignores destroyed towers');
assert(script.includes('function levelStickerAsset(level)'), 'collection level stickers use scene/signature art');
assert(script.includes("asset: 'enemy_' + id"), 'enemy stickers reuse painted enemy assets');
assert(script.includes("frameKind: 'badge'"), 'badge entries use dedicated medal frames');
assert(html.includes('.collection-card--owned'), 'collection cards have premium owned styling');
assert(html.includes('.collection-art--badge'), 'badge art has a dedicated presentation frame');
assert(html.includes('collectionShimmer'), 'collection cards include gloss/shimmer treatment');
assert(script.includes('fallbackUrlForAsset(url)'), 'painted assets can fall back from WebP to PNG before legacy drawing');
assert(script.includes('hasExpectedAsset(id)'), 'renderer can distinguish expected painted assets from legacy fallback');
assert(script.includes('drawMissingPaintedAsset'), 'missing painted assets use a neutral placeholder instead of old SVG-style art while loading');
assert(script.includes('startLevelWhenAssetsReady(idx, loadout)'), 'combat start waits for painted assets before entering the field');
const towers = readConstObject('TOWERS');
assert(towers && towers.eraser && towers.eraser.recharge === 300, 'eraser shield cooldown is reduced to 300 frames');
assert(
  towers
    && towers.ruler
    && towers.ruler.type === 'shoot'
    && towers.ruler.pierce === true
    && towers.ruler.bidirectional === true,
  'ruler data contract declares a bidirectional piercing shooter'
);
assert(script.includes('const MONSTER_SKILL_DESIGN = {'), 'monster dedicated skill design table exists');
assert(script.includes('const PVZ_ZOMBIE_PATTERN_STUDY = {'), 'PvZ zombie pattern study is captured in game design data');
assert(script.includes('catapultRanged'), 'PvZ-inspired ranged pressure pattern is represented');
assert(script.includes('vaultBypass'), 'PvZ-inspired vault bypass pattern is represented');
assert(script.includes('supportSummon'), 'PvZ-inspired summon pressure pattern is represented');
assert(script.includes("poisonGas"), 'monster skill planning includes poison gas pressure');
assert(script.includes('spawnSpecialFx(enemy, target, cfg)'), 'monster special attacks create visible combat effects');
assert(
  !script.includes("type: 'skillFx'")
    && !script.includes("o.type === 'skillFx'")
    && !script.includes("o.type==='skillFx'"),
  'normal runtime has no geometric skillFx object or renderer dependency'
);
assert(script.includes('spawnDirtyZone(enemy, target, cfg)'), 'doodle poison gas creates a visible dirty zone');
assert(script.includes("type: 'dirtyZone'"), 'dirty zone is represented as a gameplay object');
assert(script.includes('spawnEnemyProjectile(enemy, target, cfg)'), 'ranged monsters launch delayed projectiles instead of only instant damage');
assert(script.includes("type: 'enemyProjectile'"), 'enemy ranged attacks are represented as projectile objects');
assert(script.includes('tryVaultTower(enemy, tower, cfg)'), 'runner monsters can vault over the first blocking tower');
assert(script.includes('summonSupportEnemies(enemy, cfg)'), 'support monsters can summon lane pressure enemies');
assert(script.includes('const STAMP_KILLS_REQUIRED = 10'), 'stamp ultimate charges every 10 defeated monsters');
assert(script.includes('const STAMP_BARRAGE = {'), 'one-click global stamp barrage contract exists');
assert(script.includes('releaseStampUltimate(toolId)'), 'stamp ultimate release function exists');
assert(script.includes('this.registerEnemyDefeat(o);'), 'enemy defeat routes through stamp charge handler');
assert(script.includes('const CHAPTER_MINIGAMES = {'), 'chapter interval sunlight minigame plan exists');
assert(script.includes('function chapterMinigameForCompletedLevel(levelIdx)'), 'chapter interval minigame boundary helper exists');
assert(script.includes("this.phase = 'minigame'"), 'chapter interval minigame has an active phase');
assert(script.includes('startChapterMinigame(levelIdx, nextLevelIdx)'), 'chapter interval minigame can be started');
assert(script.includes('handleMinigameInput(type, x, y)'), 'chapter interval minigame handles shooting input');
assert(script.includes('finishChapterMinigame()'), 'chapter interval minigame has a reward finish path');
assert(script.includes('pendingSunBonus'), 'chapter interval minigame carries sunlight into the next level');
assert(script.includes("subject: '科技'"), 'question bank includes technology questions for grades 4-5');

const vfxManifest = readConstObject('VFX_MANIFEST');
const vfxPhaseRender = readConstObject('VFX_PHASE_RENDER');
const requiredVfxFamilies = ['corrosion', 'impact', 'paper', 'doodle', 'soundwave', 'sunshine', 'crystal'];
const requiredVfxPhases = ['telegraph', 'cast', 'travel', 'impact'];
assert(vfxManifest && Object.keys(vfxManifest).length === enemyKeys.length, 'VFX_MANIFEST covers all 18 non-elf enemies');
assert(vfxManifest && enemyKeys.every(id => vfxManifest[id]), 'every non-elf enemy has a VFX profile');
assert(vfxManifest && Object.values(vfxManifest).every(profile => requiredVfxPhases.every(phase => profile.phases && profile.phases.includes(phase))), 'every VFX profile declares telegraph/cast/travel/impact phases');
assert(vfxManifest && requiredVfxFamilies.every(family => Object.values(vfxManifest).some(profile => profile.family === family)), 'VFX manifest includes the seven required visual families');
assert(vfxManifest && Object.values(vfxManifest).every(profile => assetExists(profile.runtime) && assetExists(profile.fallback)), 'VFX runtime WebP and PNG fallback assets exist without SVG paths');
assert(
  vfxManifest
    && Object.values(vfxManifest).every(profile => {
      const landscape = profile.landscapeSafeArea;
      const portrait = profile.portraitSafeArea;
      return landscape
        && portrait
        && landscape.axis === 'horizontal'
        && portrait.axis === 'vertical'
        && [landscape, portrait].every(area =>
          ['x', 'y', 'w', 'h'].every(key => Number.isFinite(area[key]))
          && area.x >= 0
          && area.y >= 0
          && area.w > 0
          && area.h > 0
          && area.x + area.w <= 1
          && area.y + area.h <= 1
        );
    }),
  'every VFX profile declares bounded landscapeSafeArea and portraitSafeArea direction profiles'
);
assert(
  vfxPhaseRender
    && requiredVfxPhases.every(phase => vfxPhaseRender[phase])
    && new Set(requiredVfxPhases.map(phase => JSON.stringify(vfxPhaseRender[phase]))).size === requiredVfxPhases.length
    && new Set(requiredVfxPhases.map(phase => vfxPhaseRender[phase].composition)).size === requiredVfxPhases.length
    && requiredVfxPhases.every(phase => {
      const profile = vfxPhaseRender[phase];
      return Number.isFinite(profile.scaleX)
        && Number.isFinite(profile.scaleY)
        && Number.isFinite(profile.alphaMin)
        && Number.isFinite(profile.alphaMax)
        && Number.isFinite(profile.pulseRate)
        && profile.alphaMin < profile.alphaMax;
    }),
  'telegraph/cast/travel/impact have distinct executable composition, size, alpha, and rhythm profiles'
);
assert(script.includes('spawnVfxPhase('), 'runtime has a phase-aware VFX spawn helper');
const spawnSpecialFxSource = extractClassMethod('spawnSpecialFx');
const spawnVfxPhaseSource = extractClassMethod('spawnVfxPhase');
const drawRasterFxSource = extractClassMethod('drawRasterFx');
const spawnEnemyProjectileSource = extractClassMethod('spawnEnemyProjectile');
const updateEnemyProjectileSource = extractClassMethod('updateEnemyProjectile');
const drawEnemySource = extractClassMethod('drawEnemy');
const drawEnemySpriteSource = extractClassMethod('drawEnemySprite');
const advanceSpecialAttackSource = extractClassMethod('advanceSpecialAttack');
const executeSpecialAttackImpactSource = extractClassMethod('executeSpecialAttackImpact');
const resolveSpecialAttackSource = extractClassMethod('resolveSpecialAttack');
assert(
  spawnSpecialFxSource
    && requiredVfxPhases.every(phase => spawnSpecialFxSource.includes(`'${phase}'`))
    && !spawnSpecialFxSource.includes('skillFx'),
  'formal monster skills emit only the four rasterFx lifecycle phases'
);
assert(
  spawnVfxPhaseSource
    && spawnVfxPhaseSource.includes("type: 'rasterFx'")
    && spawnVfxPhaseSource.includes('landscapeSafeArea')
    && spawnVfxPhaseSource.includes('portraitSafeArea'),
  'rasterFx objects carry both orientation-safe profiles'
);
assert(
  spawnEnemyProjectileSource
    && updateEnemyProjectileSource
    && updateEnemyProjectileSource.includes("this.spawnVfxPhase(projectile.enemy, 'impact'")
    && !spawnEnemyProjectileSource.includes("'impact'"),
  'projectile impact VFX is emitted only by the actual collision path'
);
assert(
  advanceSpecialAttackSource
    && advanceSpecialAttackSource.includes("state === 'telegraph'")
    && advanceSpecialAttackSource.includes("state === 'cast'")
    && advanceSpecialAttackSource.includes('executeSpecialAttackImpact'),
  'non-projectile specials advance from telegraph and cast before gameplay impact'
);
if (spawnEnemyProjectileSource && updateEnemyProjectileSource) {
  const ProjectileProbe = new Function(
    `return class ProjectileProbe {
${spawnEnemyProjectileSource}
${updateEnemyProjectileSource}
}`
  )();
  for (const enemyX of [180, 440]) {
    const probe = new ProjectileProbe();
    probe.G = 80;
    probe.objs = [];
    probe.mp = 100;
    probe.vfx = [];
    probe.damageFrames = [];
    probe.frame = 0;
    probe.spawnVfxPhase = (enemy, phase) => {
      const fx = { type: 'rasterFx', phase, x: 0, y: 0, life: 150 };
      probe.vfx.push({ phase, frame: probe.frame });
      probe.objs.push(fx);
      return fx;
    };
    probe.damageTower = () => probe.damageFrames.push(probe.frame);
    probe.applyTowerCooldownPenalty = () => {};
    probe.updateStats = () => {};
    const enemy = { id: 'note', x: enemyX, y: 0, dmg: 20, baseDmg: 20, data: {} };
    const target = { x: 40, y: 0, r: 0, hp: 100, destroyed: false };
    assert(
      probe.spawnEnemyProjectile(enemy, target, { projectileSpeed: 8, label: 'probe' }),
      `projectile timing probe launches at distance ${enemyX - target.x}`
    );
    const projectile = probe.objs.find(item => item.type === 'enemyProjectile');
    while (projectile && projectile.life > 0 && probe.frame < 120) {
      probe.frame++;
      probe.updateEnemyProjectile(projectile);
    }
    const impact = probe.vfx.find(item => item.phase === 'impact');
    assert(
      impact && impact.frame === probe.damageFrames[0],
      `projectile impact and damage share one frame at distance ${enemyX - target.x}`
    );
  }

  const deadSourceProbe = new ProjectileProbe();
  deadSourceProbe.G = 80;
  deadSourceProbe.objs = [];
  deadSourceProbe.mp = 100;
  deadSourceProbe.vfx = [];
  deadSourceProbe.damageFrames = [];
  deadSourceProbe.frame = 0;
  deadSourceProbe.spawnVfxPhase = (enemy, phase) => {
    const fx = { type: 'rasterFx', phase, life: 150 };
    deadSourceProbe.vfx.push({ phase, frame: deadSourceProbe.frame });
    deadSourceProbe.objs.push(fx);
    return fx;
  };
  deadSourceProbe.damageTower = () => deadSourceProbe.damageFrames.push(deadSourceProbe.frame);
  deadSourceProbe.applyTowerCooldownPenalty = () => {};
  deadSourceProbe.updateStats = () => {};
  const defeatedBoss = { id: 'boss', hp: 120, x: 440, y: 0, dmg: 40, baseDmg: 40, data: {} };
  const protectedTower = { x: 40, y: 0, r: 0, hp: 100, destroyed: false };
  deadSourceProbe.spawnEnemyProjectile(defeatedBoss, protectedTower, { projectileSpeed: 8, label: 'boss-probe' });
  const orphanedProjectile = deadSourceProbe.objs.find(item => item.type === 'enemyProjectile');
  defeatedBoss.hp = 0;
  deadSourceProbe.frame++;
  deadSourceProbe.updateEnemyProjectile(orphanedProjectile);
  assert(
    orphanedProjectile.life === 0
      && deadSourceProbe.damageFrames.length === 0
      && !deadSourceProbe.vfx.some(item => item.phase === 'impact'),
    'a projectile is cancelled without damage or impact when its source dies'
  );
}

assert(
  drawEnemySource
    && drawEnemySource.includes('const assetId = o.spriteAssetId || baseAssetId')
    && drawEnemySpriteSource
    && drawEnemySpriteSource.includes('o.vulnerabilityTimer'),
  'Boss phase assets take precedence and vulnerability has a persistent sprite-attached cue'
);
if (drawEnemySource) {
  const selectedAssets = [];
  const DrawProbe = new Function(
    'ASSETS',
    'hasExpectedAsset',
    'drawMissingPaintedAsset',
    `return class DrawProbe {\n${drawEnemySource}\n}`
  )(
    { get: id => ({ id }) },
    () => false,
    () => {}
  );
  const probe = new DrawProbe();
  probe.drawEnemySprite = (ctx, enemy, size, sprite) => selectedAssets.push(sprite.id);
  probe.drawEnemy({}, {
    id: 'super_boss',
    spriteAssetId: 'enemy_super_boss_phase3',
    x: 0, y: 0,
    data: { name: 'Boss', color: '#000' }
  }, 80);
  assert(selectedAssets[0] === 'enemy_super_boss_phase3', 'drawEnemy uses the selected painted Boss phase asset');
}
if (advanceSpecialAttackSource && executeSpecialAttackImpactSource && resolveSpecialAttackSource) {
  const SpecialAttackProbe = new Function(
    `return class SpecialAttackProbe {
${resolveSpecialAttackSource}
${advanceSpecialAttackSource}
${executeSpecialAttackImpactSource}
}`
  )();
  const probe = new SpecialAttackProbe();
  probe.G = 80;
  probe.objs = [];
  probe.mp = 100;
  probe.frame = 0;
  probe.events = [];
  probe.spawnVfxPhase = (enemy, phase) => {
    probe.events.push({ type: 'vfx', phase, frame: probe.frame });
    return {};
  };
  probe.damageTower = target => {
    target.hp -= 10;
    probe.events.push({ type: 'damage', frame: probe.frame });
  };
  probe.spawnDirtyZone = () => {};
  probe.applyTowerCooldownPenalty = () => {};
  probe.updateStats = () => {};
  probe.spawnEnemyProjectile = () => {};
  const enemy = { id: 'slime', hp: 100, x: 180, y: 0, dmg: 10, baseDmg: 10, data: {} };
  const target = { hp: 100, x: 80, y: 0, destroyed: false };
  assert(probe.resolveSpecialAttack(enemy, target, { label: 'probe' }), 'non-projectile attack enters the lifecycle scheduler');
  const action = probe.objs.find(item => item.type === 'specialAttackAction');
  while (action && probe.advanceSpecialAttack(action)) probe.frame++;
  const damageEvent = probe.events.find(event => event.type === 'damage');
  const impactEvent = probe.events.find(event => event.phase === 'impact');
  assert(
    damageEvent
      && damageEvent.frame >= 36
      && impactEvent
      && impactEvent.frame === damageEvent.frame
      && probe.events.filter(event => event.type === 'vfx').map(event => event.phase).join(',') === 'telegraph,cast,travel,impact',
    'non-projectile telegraph/cast/travel precede same-frame impact damage'
  );
}
assert(
  drawRasterFxSource
    && drawRasterFxSource.includes('VFX_PHASE_RENDER')
    && drawRasterFxSource.includes("orientation === 'portrait'")
    && !drawRasterFxSource.includes('.rotate(')
    && drawRasterFxSource.includes('drawMissingPaintedAsset'),
  'raster renderer composes phase and orientation profiles without rotating the whole image or falling back to SVG'
);
const spawnMinigameTargetSource = extractClassMethod('spawnMinigameTarget');
const handleMinigameInputSource = extractClassMethod('handleMinigameInput');
const updateMinigameSource = extractClassMethod('updateChapterMinigame');
const drawMinigameSource = extractClassMethod('drawChapterMinigame');
assert(
  spawnMinigameTargetSource.includes('spawnVfxPhase')
    && handleMinigameInputSource.includes('spawnVfxPhase')
    && updateMinigameSource.includes('updateRasterFxObjects')
    && drawMinigameSource.includes('drawRasterFx'),
  'chapter minigame spawns, advances, and draws portrait-safe raster VFX'
);
assert(
  handleMinigameInputSource.includes('this.minigame.targets.forEach')
    && !handleMinigameInputSource.includes('this.objs.forEach'),
  'minigame hit testing ignores raster VFX objects so effects cannot intercept input'
);

const sceneManifest = readConstObject('SCENE_MANIFEST');
const levelIds = Array.from(script.matchAll(/id:\s*'([^']+)'\s*,\s*chapterId:/g)).map(match => match[1]);
assert(sceneManifest && Object.keys(sceneManifest).length === 14, 'SCENE_MANIFEST contains 14 level scene profiles');
assert(sceneManifest && levelIds.every(id => sceneManifest[id]), 'each playable level has a scene profile');
assert(sceneManifest && Object.entries(sceneManifest).every(([id, profile]) => profile.orientation === 'landscape' && profile.runtime === `assets/scenes/scene_${id.replace(/[^a-z0-9]+/gi, '_')}.webp` && assetExists(profile.runtime) && assetExists(profile.fallback)), 'tower-defense scene profiles load landscape WebP plus PNG fallback');
assert(script.includes('level.sceneProfile = SCENE_MANIFEST[level.id]'), 'level data is wired to its scene profile');

const minigameScenes = readConstObject('MINIGAME_SCENE_MANIFEST');
assert(minigameScenes && Object.keys(minigameScenes).length === 4, 'four chapter minigames have scene variants');
assert(minigameScenes && Object.values(minigameScenes).every(profile => assetExists(profile.landscape.runtime) && assetExists(profile.landscape.fallback) && assetExists(profile.portrait.runtime) && assetExists(profile.portrait.fallback)), 'each minigame has independent landscape and portrait raster assets');
const orientationMatrix = readConstObject('ORIENTATION_MATRIX');
assert(orientationMatrix && orientationMatrix.td.landscape === 'landscape', 'orientation matrix: td + landscape = landscape');
assert(orientationMatrix && orientationMatrix.td.portrait === 'gate', 'orientation matrix: td + portrait = gate');
assert(orientationMatrix && orientationMatrix.minigame.landscape === 'landscape', 'orientation matrix: minigame + landscape = landscape');
assert(orientationMatrix && orientationMatrix.minigame.portrait === 'portrait', 'orientation matrix: minigame + portrait = portrait');
assert(script.includes('function resolveSceneVariant(mode, viewportOrientation, levelId, minigameId)'), 'scene resolver is game-mode and viewport aware');
const stageCacheKeySource = extractClassMethod('getStageCacheKey');
if (stageCacheKeySource) {
  const StageCacheProbe = new Function(
    `return class StageCacheProbe {\n${stageCacheKeySource}\n}`
  )();
  const stageCacheProbe = new StageCacheProbe();
  Object.assign(stageCacheProbe, {
    w: 1280,
    h: 720,
    OX: 180,
    OY: 40,
    C: 10,
    R: 5,
    dpr: 1
  });
  const firstLevelKey = stageCacheProbe.getStageCacheKey(80, 'classroom', '1-1');
  const nextLevelKey = stageCacheProbe.getStageCacheKey(80, 'classroom', '1-2');
  stageCacheProbe.dpr = 2;
  const highDprKey = stageCacheProbe.getStageCacheKey(80, 'classroom', '1-2');
  assert(
    firstLevelKey !== nextLevelKey && nextLevelKey !== highDprKey,
    'stage cache key separates same-chapter levels and DPR changes'
  );
}

const barrage = readConstObject('STAMP_BARRAGE');
assert(
  barrage
    && barrage.buffFrames === 300
    && barrage.damageMultiplier === 1.2
    && barrage.laneRadius === 2,
  'global barrage contract fixes the buff at 300 frames, 1.2x damage, and +/-2 lanes'
);
assert(
  !script.includes('pendingUltimate')
    && !script.includes('armStampUltimate(')
    && !script.includes('confirmStampUltimate(')
    && !script.includes('cancelStampUltimate(')
    && !script.includes('renderUltimateControls()')
    && !script.includes('drawUltimateTargetPreview(')
    && !script.includes('stampBtn.onpointer'),
  'one-click barrage removes pending targets, aim preview, cancel row, drag/capture, and second confirmation'
);
const releaseStart = script.indexOf('releaseStampUltimate(toolId) {');
const releaseEnd = script.indexOf('queueBossPhaseThresholds(', releaseStart);
const releaseBody = script.slice(releaseStart, releaseEnd);
const noShotGuardIndex = releaseBody.indexOf('if (!shots.length) {');
const stampSpendIndex = releaseBody.indexOf('this.stamps = Math.max(0, this.stamps - 1);');
const buffAllAttackTowersIndex = releaseBody.indexOf('attackTowers.forEach(tower => {', stampSpendIndex);
assert(
  releaseStart >= 0
    && releaseBody.includes("tower.data && tower.data.type === 'shoot'")
    && releaseBody.includes('tower.hp > 0 && !tower.destroyed')
    && releaseBody.includes('tower.r - STAMP_BARRAGE.laneRadius')
    && releaseBody.includes('tower.r + STAMP_BARRAGE.laneRadius')
    && releaseBody.includes("this.towerTargetsInDirection(tower, row, 'front', 1)")
    && releaseBody.includes("this.towerTargetsInDirection(tower, row, 'back', 1)")
    && noShotGuardIndex >= 0
    && releaseBody.indexOf('return false;', noShotGuardIndex) >= 0
    && stampSpendIndex > noShotGuardIndex,
  'barrage plans nearest legal front/back shots before spending one stamp'
);
assert(
  buffAllAttackTowersIndex > stampSpendIndex
    && releaseBody.indexOf('tower.barrageTimer = STAMP_BARRAGE.buffFrames;', buffAllAttackTowersIndex) > buffAllAttackTowersIndex
    && script.includes('this.tickTowerBarrage(o);')
    && script.includes('this.getTowerAttackDamage(o)'),
  'every alive deployed attack tower owns and expires the 300-frame damage multiplier after a successful cast'
);
assert(
  script.includes('this.damagePiercingTargets(o, o.r, atk, hitCount)')
    && script.includes("this.towerTargetsInDirection(tower, row, 'front', hitCount)")
    && script.includes("this.towerTargetsInDirection(tower, row, 'back', hitCount)"),
  'ruler normal attacks pierce forward and backward independently'
);

const bossMechanics = readConstObject('BOSS_MECHANICS');
const phaseBosses = ['sunshine', 'deadline', 'boss', 'super_boss'];
const hasBossPhaseTables = bossMechanics && phaseBosses.every(id => Array.isArray(bossMechanics[id] && bossMechanics[id].phases) && bossMechanics[id].phases.length >= 3);
assert(hasBossPhaseTables, 'sunshine/deadline/boss/super_boss expose phase tables');
assert(hasBossPhaseTables && phaseBosses.every(id => bossMechanics[id].phases.every(phase => phase.telegraph >= 48 && phase.telegraph <= 90)), 'boss phase actions have readable 0.8-1.5 second telegraphs');
assert(hasBossPhaseTables && ['sunshine', 'boss', 'super_boss'].every(id => bossMechanics[id].phases.some(phase => phase.ranged)), 'major bosses include ranged attacks');
assert(hasBossPhaseTables && phaseBosses.every(id => bossMechanics[id].phases.some(phase => phase.summon || phase.hazard || phase.charge)), 'boss phases include summon, arena, or charge pressure');
assert(hasBossPhaseTables && phaseBosses.every(id => bossMechanics[id].phases.some(phase => phase.vulnerability)), 'bosses expose a counterattack vulnerability window');
assert(hasBossPhaseTables && phaseBosses.every(id => bossMechanics[id].phases.every(phase => phase.recovery > 0)), 'every Boss phase action declares a recovery before vulnerability');
assert(
  bossMechanics
    && bossMechanics.super_boss
    && bossMechanics.super_boss.titanSlam
    && bossMechanics.super_boss.titanSlam.interval === 210
    && bossMechanics.super_boss.titanSlam.damage === 850
    && bossMechanics.super_boss.titanSlam.telegraph > 0
    && bossMechanics.super_boss.titanSlam.recovery > 0
    && bossMechanics.super_boss.titanSlam.vulnerability > 0,
  'titanSlam preserves 210-frame/850-damage balance and declares telegraph, recovery, and vulnerability'
);
assert(
  bossMechanics
    && bossMechanics.boss
    && bossMechanics.boss.focusStrike
    && bossMechanics.boss.focusStrike.interval === 420
    && bossMechanics.boss.focusStrike.damage === 2000
    && bossMechanics.boss.focusStrike.telegraph === 95
    && bossMechanics.boss.focusStrike.recovery > 0
    && bossMechanics.boss.focusStrike.vulnerability > 0,
  'facility-destroying red-pen focus strike uses the shared lifecycle without changing its damage cadence'
);
assert(bossMechanics && Array.isArray(bossMechanics.super_boss && bossMechanics.super_boss.phaseAssets) && bossMechanics.super_boss.phaseAssets.every(asset => assetExists(asset.runtime) && assetExists(asset.fallback)), 'super boss has three painted WebP/PNG phase assets');
assert(script.includes('transitionBossPhase(') && script.includes('spawnBossRangedVolley(') && script.includes('spawnBossHazard(') && script.includes('startBossVulnerability('), 'runtime supports boss phase transitions, ranged volleys, hazards, and openings');
assert(
  script.includes("state: 'telegraph'")
    && script.includes('advanceBossAction(action)')
    && script.includes('beginBossActionRecovery(action)')
    && script.includes('completeBossAction(action)'),
  'Boss major attacks share telegraph -> execute -> recovery -> vulnerability states'
);

const pendingBossProbe = loadTopLevelFunction('hasPendingBossTelegraph');
const bossLockProbe = loadTopLevelFunction('bossActionLocksEnemy');
const probeBoss = { id: 'boss' };
assert(pendingBossProbe && pendingBossProbe([{ type: 'bossAction', enemy: probeBoss, delay: 30 }], probeBoss), 'executable probe detects a pending boss telegraph');
assert(pendingBossProbe && !pendingBossProbe([{ type: 'bossAction', enemy: probeBoss, delay: 0 }], probeBoss), 'executable probe releases the boss when telegraph countdown ends');
assert(
  pendingBossProbe
    && pendingBossProbe([{ type: 'bossAction', enemy: probeBoss, state: 'recovery', delay: 30 }], probeBoss),
  'recovery remains mutually exclusive with another Boss action'
);
assert(
  bossLockProbe
    && bossLockProbe([{ type: 'bossAction', enemy: probeBoss, state: 'telegraph', delay: 30 }], probeBoss)
    && bossLockProbe([{ type: 'bossAction', enemy: probeBoss, state: 'recovery', delay: 30 }], probeBoss)
    && bossLockProbe([{ type: 'bossAction', enemy: probeBoss, state: 'execute', delay: 30 }], probeBoss),
  'telegraph, execute, and recovery all lock legacy Boss side effects'
);
const enemyUpdateStart = script.indexOf("else if (o.type === 'enemy')");
const enemyUpdateEnd = script.indexOf("else if (o.type === 'bullet')", enemyUpdateStart);
const enemyUpdateBody = script.slice(enemyUpdateStart, enemyUpdateEnd);
const bossLockIndex = enemyUpdateBody.indexOf('if (bossActionLocksEnemy(this.objs, o))');
const enemyDeathGuardIndex = enemyUpdateBody.indexOf('if (o.hp <= 0)');
const firstBossSideEffect = Math.min(...['sunSteal', 'titanOverdrive', 'specialCd', 'const eating =', 'if(move) o.x -= spd'].map(token => enemyUpdateBody.indexOf(token)).filter(index => index >= 0));
assert(enemyDeathGuardIndex >= 0 && enemyDeathGuardIndex < firstBossSideEffect, 'enemy death guard runs before every movement, bite, special, and resource side effect');
assert(bossLockIndex >= 0 && bossLockIndex < firstBossSideEffect && /if \(bossActionLocksEnemy\(this\.objs, o\)\) \{[\s\S]*?continue;[\s\S]*?\}/.test(enemyUpdateBody), 'active Boss lifecycle exits before legacy movement, bite, special, slam, and resource effects');
assert(
  !enemyUpdateBody.includes('this.frame % (slam.interval')
    && !/titanSlam[\s\S]*?this\.damageTower\(targetTower,\s*slam\.damage/.test(enemyUpdateBody)
    && enemyUpdateBody.includes('this.scheduleTitanSlam(o, bossCfg)'),
  'titanSlam schedules through bossAction instead of direct modulo damage'
);
assert(
  !script.includes('this.bossMarks.push(')
    && enemyUpdateBody.includes('this.scheduleBossFocusStrike(o, bossCfg)'),
  'red-pen focus strike schedules through bossAction instead of the legacy bossMarks path'
);

const executeBossActionSource = extractClassMethod('executeBossPhaseAction');
if (executeBossActionSource) {
  const ImmediateProbe = new Function(
    'BOSS_MECHANICS',
    `return class ImmediateProbe {\n${executeBossActionSource}\n}`
  )(bossMechanics);
  const immediate = new ImmediateProbe();
  const vulnerabilityCalls = [];
  immediate.spawnBossRangedVolley = () => {};
  immediate.summonSupportEnemies = () => {};
  immediate.spawnBossHazard = () => {};
  immediate.executeTitanSlam = () => {};
  immediate.executeBossFocusStrike = () => {};
  immediate.spawnVfxPhase = () => {};
  immediate.startBossVulnerability = (...args) => vulnerabilityCalls.push(args);
  immediate.floatText = () => {};
  immediate.announce = () => {};
  immediate.transitionBossPhase = () => {};
  const alive = { id: 'boss', hp: 100, maxHp: 100 };
  assert(
    immediate.executeBossPhaseAction({
      enemy: alive,
      phase: { hazard: 'exam_sheet', recovery: 30, vulnerability: 90 },
      cfg: bossMechanics.boss
    }) === true
      && vulnerabilityCalls.length === 0,
    'executing a Boss attack does not open vulnerability before recovery'
  );
  const dead = { id: 'boss', hp: 0, maxHp: 100 };
  const vulnerabilityCountBeforeDeadAction = vulnerabilityCalls.length;
  assert(
    immediate.executeBossPhaseAction({
      enemy: dead,
      phase: { titanSlam: 850, recovery: 30, vulnerability: 90 },
      cfg: bossMechanics.boss
    }) === false
      && vulnerabilityCalls.length === vulnerabilityCountBeforeDeadAction,
    'dead Bosses execute no major attack and open no vulnerability'
  );
}

const lifecycleMethodNames = [
  'executeBossPhaseAction',
  'executeTitanSlam',
  'executeBossFocusStrike',
  'beginBossActionRecovery',
  'completeBossAction',
  'advanceBossAction',
  'scheduleTitanSlam',
  'scheduleBossFocusStrike',
  'startBossVulnerability'
];
const lifecycleMethodSources = lifecycleMethodNames.map(extractClassMethod);
assert(lifecycleMethodSources.every(Boolean), 'Boss lifecycle methods are executable contracts');

if (lifecycleMethodSources.every(Boolean) && pendingBossProbe && bossLockProbe) {
  const LifecycleProbe = new Function(
    'BOSS_MECHANICS',
    'hasPendingBossTelegraph',
    `return class LifecycleProbe {\n${lifecycleMethodSources.join('\n')}\n}`
  )(bossMechanics, pendingBossProbe);
  const engine = new LifecycleProbe();
  const damageLog = [];
  const vulnerabilityLog = [];
  engine.objs = [];
  engine.G = 80;
  engine.floatText = () => {};
  engine.spawnVfxPhase = () => {};
  engine.announce = () => {};
  engine.spawnBossRangedVolley = () => {};
  engine.summonSupportEnemies = () => {};
  engine.spawnBossHazard = () => {};
  engine.transitionBossPhase = () => false;
  engine.damageTower = (tower, damage) => {
    tower.hp -= damage;
    damageLog.push(damage);
    return true;
  };
  engine.startBossVulnerability = (enemy, frames) => {
    enemy.vulnerabilityTimer = Math.max(enemy.vulnerabilityTimer || 0, frames);
    vulnerabilityLog.push(frames);
  };

  const titan = { id: 'super_boss', hp: 1000, maxHp: 1000, r: 2, x: 640, y: 200 };
  const titanTower = { type: 'tower', hp: 3000, r: 2, x: 360 };
  engine.objs = [titanTower];
  assert(engine.scheduleTitanSlam(titan, bossMechanics.super_boss), 'titanSlam enters the shared scheduler');
  const titanAction = engine.objs.find(obj => obj.type === 'bossAction');
  assert(
    titanAction
      && titanAction.state === 'telegraph'
      && damageLog.length === 0
      && !engine.scheduleTitanSlam(titan, bossMechanics.super_boss),
    'titanSlam telegraphs without damage and cannot overlap another pending action'
  );
  titanAction.delay = 1;
  assert(
    engine.advanceBossAction(titanAction)
      && titanAction.state === 'recovery'
      && damageLog.length === 1
      && damageLog[0] === 850
      && vulnerabilityLog.length === 0,
    'titanSlam deals its preserved damage only at execute, then enters recovery'
  );
  titanAction.delay = 1;
  assert(
    !engine.advanceBossAction(titanAction)
      && titan.vulnerabilityTimer === bossMechanics.super_boss.titanSlam.vulnerability,
    'titanSlam vulnerability begins only after recovery completes'
  );

  const chargeBoss = { id: 'sunshine', hp: 500, maxHp: 500, bossPhaseTransitioning: true };
  const chargeAction = {
    type: 'bossAction',
    enemy: chargeBoss,
    state: 'telegraph',
    delay: 1,
    maxDelay: 1,
    actionKind: 'phase',
    phase: { charge: 'track_dash', actionFrames: 2, recovery: 2, vulnerability: 7 },
    cfg: bossMechanics.sunshine
  };
  assert(
    engine.advanceBossAction(chargeAction)
      && chargeAction.state === 'execute'
      && chargeBoss.vulnerabilityTimer === undefined
      && bossLockProbe([chargeAction], chargeBoss),
    'charge starts after telegraph without opening vulnerability or legacy side effects'
  );
  chargeAction.delay = 1;
  assert(
    engine.advanceBossAction(chargeAction)
      && chargeAction.state === 'recovery'
      && bossLockProbe([chargeAction], chargeBoss),
    'charge execution is followed by a locking recovery'
  );
  chargeAction.delay = 1;
  assert(
    !engine.advanceBossAction(chargeAction)
      && chargeBoss.vulnerabilityTimer === 7
      && chargeBoss.bossPhaseTransitioning === false,
    'phase vulnerability and scheduler unlock happen after recovery without deadlock'
  );

  const deadBoss = { id: 'super_boss', hp: 0, maxHp: 1000, r: 2 };
  const deadAction = {
    type: 'bossAction',
    enemy: deadBoss,
    state: 'telegraph',
    delay: 1,
    phase: { titanSlam: 850, recovery: 30, vulnerability: 90 }
  };
  const damageCountBeforeDeadAction = damageLog.length;
  assert(
    !engine.advanceBossAction(deadAction)
      && damageLog.length === damageCountBeforeDeadAction
      && deadBoss.vulnerabilityTimer === undefined,
    'dead Boss actions are discarded before execute/recovery side effects'
  );
}

assert(script.includes('canvas.tabIndex = 0') && script.includes("canvas.setAttribute('role', 'application')"), 'canvas remains keyboard focusable with an application role');
assert(script.includes("setAttribute('aria-live', 'assertive')") && script.includes('renderLiveRegion()'), 'critical barrage and boss states use an assertive aria-live region');
assert(['没有可齐射的目标，印章未消耗', '全军齐射', 'BOSS 預警', 'BOSS 破綻'].every(message => script.includes(message)), 'aria-live messages cover barrage success/failure and Boss states');
assert(
  script.includes('const bossTextX = Math.max(')
    && script.includes("actionState === 'recovery' ? 'BOSS 恢复'")
    && script.includes("actionState === 'execute' ? 'BOSS 进攻' : 'BOSS 預警'"),
  'boss action text uses a safe horizontal position and names each lifecycle state'
);

async function verifyLayeredAssetLoader() {
  const createLoader = loadTopLevelFunction('createAssetLoader');
  assert(createLoader, 'asset loader exposes an executable factory');
  if (!createLoader) return;

  const requests = [];
  let releaseSceneRuntime = null;
  class ProbeImage {
    set src(url) {
      this._src = url;
      const pathname = url.split(/[?#]/)[0];
      requests.push(pathname);
      const finish = callback => setImmediate(() => callback && callback());
      if (pathname === 'scene_1_1.webp') {
        releaseSceneRuntime = () => finish(this.onerror);
      } else if (pathname === 'vfx_corrosion.webp' || pathname === 'vfx_corrosion.png') {
        finish(this.onerror);
      } else {
        finish(this.onload);
      }
    }
    get src() { return this._src; }
  }

  const loader = createLoader(() => new ProbeImage(), {
    spriteManifest: {
      badge_first: 'badge_first.webp',
      tower_textbook: 'tower_textbook.webp',
      tower_textbook_lv1: 'tower_textbook_lv1.webp',
      enemy_slime: 'enemy_slime.webp',
      enemy_elf: 'enemy_elf.webp',
      enemy_bat: 'enemy_bat.webp'
    },
    sceneManifest: {
      '1-1': { runtime: 'scene_1_1.webp', fallback: 'scene_1_1.png' },
      '2-1': { runtime: 'scene_2_1.webp', fallback: 'scene_2_1.png' }
    },
    minigameSceneManifest: {
      chalk_shooter: {
        landscape: { runtime: 'minigame_landscape.webp', fallback: 'minigame_landscape.png' },
        portrait: { runtime: 'minigame_portrait.webp', fallback: 'minigame_portrait.png' }
      }
    },
    vfxManifest: {
      slime: { family: 'corrosion', runtime: 'vfx_corrosion.webp', fallback: 'vfx_corrosion.png' },
      bat: { family: 'impact', runtime: 'vfx_impact.webp', fallback: 'vfx_impact.png' }
    },
    bossMechanics: { super_boss: { phaseAssets: [] } },
    levels: [
      {
        id: '1-1',
        mainlineLoadout: ['textbook'],
        waves: [{ groups: [{ e: 'slime' }, { e: 'elf' }] }]
      },
      {
        id: '2-1',
        mainlineLoadout: ['textbook'],
        waves: [{ groups: [{ e: 'bat' }] }]
      }
    ],
    towers: { textbook: {} },
    minigameVfxEnemies: { chalk_shooter: 'slime' }
  });

  await loader.loadBase();
  assert(
    requests.includes('badge_first.webp')
      && requests.includes('tower_textbook.webp')
      && !requests.includes('enemy_bat.webp')
      && !requests.some(url => url.startsWith('scene_') || url.startsWith('minigame_')),
    'base preload excludes level scenes, minigame scenes, and unrelated enemy sprites'
  );

  let currentLevelSettled = false;
  const firstLoad = loader
    .loadLevel(0, ['textbook'], { textbook: 1 })
    .then(() => { currentLevelSettled = true; });
  const duplicateLoad = loader.loadLevel(0, ['textbook'], { textbook: 1 });
  await new Promise(resolve => setImmediate(resolve));
  assert(
    !currentLevelSettled && typeof releaseSceneRuntime === 'function',
    'current-level wait remains pending until its required scene fallback settles'
  );
  releaseSceneRuntime();
  await Promise.all([firstLoad, duplicateLoad]);

  const requestCount = url => requests.filter(request => request === url).length;
  assert(
    requestCount('scene_1_1.webp') === 1
      && requestCount('scene_1_1.png') === 1
      && requestCount('enemy_slime.webp') === 1
      && requestCount('enemy_elf.webp') === 1
      && requestCount('tower_textbook_lv1.webp') === 1
      && !requests.includes('scene_2_1.webp')
      && !requests.includes('enemy_bat.webp')
      && !requests.some(url => url.startsWith('minigame_')),
    'duplicate level loads fetch only current-level dependencies once'
  );
  assert(
    loader.images.scene_1_1
      && loader.failed.vfx_corrosion
      && Object.keys(loader.loading).length === 0,
    'WebP fallback succeeds while double failure is recorded and resolves fail-soft'
  );

  await loader.loadMinigame('chalk_shooter', 'portrait');
  assert(
    requests.includes('minigame_portrait.webp')
      && !requests.includes('minigame_landscape.webp')
      && requestCount('vfx_corrosion.webp') === 1,
    'minigame preload selects one orientation and deduplicates its VFX dependency'
  );
}

verifyLayeredAssetLoader()
  .then(() => {
    if (process.exitCode) process.exit(process.exitCode);
    console.log('Game contracts verified.');
  })
  .catch(error => {
    fail(`layered asset loader probe threw: ${error.stack || error.message}`);
    process.exit(process.exitCode || 1);
  });
