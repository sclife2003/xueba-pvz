---
type: fix
status: done
owner: DEV
created: 2026-07-23
ticket: TICKET-20260715-001
resolution: completed
closed: 2026-07-23
findings:
  - QA-20260723-001
---

# Fix: Synchronize VFX phases with gameplay hits

## RCA

### Reproduce

Projectile impact VFX is scheduled at a fixed frame while projectile hit time varies with distance. Non-projectile damage occurs in the same frame as its telegraph.

### Localize

`spawnSpecialFx()`, `spawnEnemyProjectile()`, `updateEnemyProjectile()`, and `resolveSpecialAttack()` in `index.html`.

### Deduce

Visual phase ownership is detached from the gameplay event that causes damage.

## Fix Plan

- Bind projectile travel VFX to projectile lifetime and spawn impact VFX at collision.
- Give non-projectile special attacks a scheduler so telegraph precedes damage.
- Add executable near/far projectile and non-projectile timing regressions.

## Verification

- `node scripts/verify_game_contracts.js`
- `python scripts/verify_long_battle_runtime.py`
- Independent QA regression verified near/far projectile collision timing and non-projectile telegraph/cast/travel/impact ordering.
- Independent UX regression verified distinct nontransparent browser pixels for all four phases.
