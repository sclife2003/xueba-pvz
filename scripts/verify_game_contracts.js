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
assert(script.includes("type: 'skillFx'"), 'monster special attacks render visible skill FX objects');
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
const requiredVfxFamilies = ['corrosion', 'impact', 'paper', 'doodle', 'soundwave', 'sunshine', 'crystal'];
assert(vfxManifest && Object.keys(vfxManifest).length === enemyKeys.length, 'VFX_MANIFEST covers all 18 non-elf enemies');
assert(vfxManifest && enemyKeys.every(id => vfxManifest[id]), 'every non-elf enemy has a VFX profile');
assert(vfxManifest && Object.values(vfxManifest).every(profile => ['telegraph', 'cast', 'travel', 'impact'].every(phase => profile.phases && profile.phases.includes(phase))), 'every VFX profile declares telegraph/cast/travel/impact phases');
assert(vfxManifest && requiredVfxFamilies.every(family => Object.values(vfxManifest).some(profile => profile.family === family)), 'VFX manifest includes the seven required visual families');
assert(vfxManifest && Object.values(vfxManifest).every(profile => assetExists(profile.runtime) && assetExists(profile.fallback)), 'VFX runtime WebP and PNG fallback assets exist without SVG paths');
assert(script.includes('spawnVfxPhase('), 'runtime has a phase-aware VFX spawn helper');

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
assert(bossMechanics && Array.isArray(bossMechanics.super_boss && bossMechanics.super_boss.phaseAssets) && bossMechanics.super_boss.phaseAssets.every(asset => assetExists(asset.runtime) && assetExists(asset.fallback)), 'super boss has three painted WebP/PNG phase assets');
assert(script.includes('transitionBossPhase(') && script.includes('spawnBossRangedVolley(') && script.includes('spawnBossHazard(') && script.includes('startBossVulnerability('), 'runtime supports boss phase transitions, ranged volleys, hazards, and openings');
assert(script.includes("type: 'bossAction'") && script.includes('executeBossPhaseAction(action)'), 'boss phase attacks execute after their telegraph window');

const pendingBossProbe = loadTopLevelFunction('hasPendingBossTelegraph');
const probeBoss = { id: 'boss' };
assert(pendingBossProbe && pendingBossProbe([{ type: 'bossAction', enemy: probeBoss, delay: 30 }], probeBoss), 'executable probe detects a pending boss telegraph');
assert(pendingBossProbe && !pendingBossProbe([{ type: 'bossAction', enemy: probeBoss, delay: 0 }], probeBoss), 'executable probe releases the boss when telegraph countdown ends');
const enemyUpdateStart = script.indexOf("else if (o.type === 'enemy')");
const enemyUpdateEnd = script.indexOf("else if (o.type === 'bullet')", enemyUpdateStart);
const enemyUpdateBody = script.slice(enemyUpdateStart, enemyUpdateEnd);
const bossLockIndex = enemyUpdateBody.indexOf('if (hasPendingBossTelegraph(this.objs, o))');
const firstBossSideEffect = Math.min(...['sunSteal', 'titanOverdrive', 'specialCd', 'const eating =', 'if(move) o.x -= spd'].map(token => enemyUpdateBody.indexOf(token)).filter(index => index >= 0));
assert(bossLockIndex >= 0 && bossLockIndex < firstBossSideEffect && /if \(hasPendingBossTelegraph\(this\.objs, o\)\) \{[\s\S]*?continue;[\s\S]*?\}/.test(enemyUpdateBody), 'pending boss telegraph exits before movement, bite, special, slam, charge, and resource effects');

assert(script.includes('canvas.tabIndex = 0') && script.includes("canvas.setAttribute('role', 'application')"), 'canvas remains keyboard focusable with an application role');
assert(script.includes("setAttribute('aria-live', 'assertive')") && script.includes('renderLiveRegion()'), 'critical barrage and boss states use an assertive aria-live region');
assert(['没有可齐射的目标，印章未消耗', '全军齐射', 'BOSS 預警', 'BOSS 破綻'].every(message => script.includes(message)), 'aria-live messages cover barrage success/failure and Boss states');
assert(script.includes('const bossTextX = Math.max(') && script.includes("ctx.fillText('BOSS 預警 '"), 'boss warning text uses a safe horizontal position');

if (process.exitCode) process.exit(process.exitCode);
console.log('Game contracts verified.');
