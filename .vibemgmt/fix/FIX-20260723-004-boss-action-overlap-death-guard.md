---
type: fix
status: done
owner: DEV
created: 2026-07-23
ticket: TICKET-20260715-004
findings:
  - QA-20260723-002
  - UX-20260724-002
  - UX-20260724-003
resolution: completed
closed: 2026-07-24
---

# Fix: Enforce Boss action exclusivity and death guards

## RCA

### Reproduce

`bossActionLocksEnemy()` excludes execute state, and enemy death is checked after special and bite side effects.

### Localize

Boss scheduler helpers and the enemy update branch in `index.html`.

### Deduce

Charge movement and legacy side-effect locking were represented by one boolean, while death cleanup was placed at the end of the update.

## Fix Plan

- Lock legacy Boss side effects throughout telegraph, execute, and recovery.
- Allow only scheduler-owned charge movement during execute.
- Move death handling before every enemy side effect.
- Add executable execute/death regressions.

## Verification

- `node scripts/verify_game_contracts.js`
- `python scripts/verify_long_battle_runtime.py`

## Resolution

- `updateEnemyProjectile()` now cancels an in-flight projectile and its travel VFX when the source enemy is dead; it creates neither impact nor tower damage.
- `drawEnemy()` now chooses `spriteAssetId` before the base enemy asset, so the final Boss phase sprites render in combat.
- `drawEnemySprite()` renders an attached vulnerability countdown ring and remaining seconds for the whole opening.
- Fresh evidence: `node scripts/verify_game_contracts.js`, `python scripts/verify_long_battle_runtime.py`, and the final QA/UX closeout reports all pass.
