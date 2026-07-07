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

if (process.exitCode) process.exit(process.exitCode);
console.log('Game contracts verified.');

