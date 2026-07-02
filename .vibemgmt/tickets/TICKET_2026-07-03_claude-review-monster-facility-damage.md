---
type: ticket
status: done
owner: Claude Review
created: 2026-07-03
reviewed: 2026-07-03
---

# Ticket: Claude Review - monster facility damage and high-DPI rendering

## Context

BOSS requested two follow-up changes after art and balance work:

- High-quality art should stay sharp during gameplay.
- Game difficulty should be more durable; monsters should have distinctive attacks that can damage or disable player facilities.

Current local work in `index.html` adds high-DPI canvas backing-store rendering, monster `SPECIAL_ATTACKS`, shared tower damage handling, and facility destruction feedback. A regression verifier was added at `scripts/verify_game_contracts.js`.

## Scope

Review these files:

- `index.html`
- `.vibemgmt/MEMORY.md`
- `scripts/verify_game_contracts.js`

Focus areas:

- Correctness of DPR canvas sizing and input coordinate mapping.
- Balance risk from monster special attack frequency, tower damage, silence duration, MP drain, and boss attacks.
- Correct cooldown semantics in `applyTowerCooldownPenalty`: producer towers count `cd` upward toward production; shooter towers count `cd` downward toward firing.
- Whether `damageTower` centralization handles normal bite damage, boss marks, titan slam, and special attacks consistently.
- Whether the new verifier is sufficient for this single-file game or should move into a richer test harness later.

## Acceptance Criteria

- Canvas remains visually sharp on high-DPI displays without breaking mouse/touch targeting.
- Every non-elf enemy has a defined special attack and can pressure player facilities in a readable way.
- Tower destruction/removal is consistent and does not leave broken objects in `this.objs`.
- Producer cooldown penalties delay resource production; shooter cooldown penalties delay the next shot.
- No obvious security, performance, or infinite-loop risks are introduced.

## Verification

RED observed before implementation:

```text
[FAIL] cooldown disruption helper documents mixed cd semantics
[FAIL] producer cdPenalty delays the next resource tick
[FAIL] shooter cdPenalty delays the next attack
[FAIL] special attacks route cdPenalty through the helper
```

GREEN after implementation:

```powershell
node "C:\Users\Legion5 IRX_5070\VibeProjects\xueba-pvz\scripts\verify_game_contracts.js"
```

Result:

```text
Game contracts verified.
```

## Review Request

Please return one of:

- APPROVE
- APPROVE WITH COMMENTS
- REQUEST CHANGES

Lead with findings ordered by severity, with file and line references.

## Review Result (Claude, 2026-07-03)

**APPROVE WITH COMMENTS** — 0 Critical / 0 High / 1 Medium (balance watch) / 3 Low / 1 Minor.

Full report: `.vibemgmt/reviews/CROSSREVIEW_2026-07-03_monster-facility-damage.md`

Key confirmations: producer/shooter cd semantics verified line-by-line (index.html:2191 / :2194);
damageTower centralization complete (no stray tower `hp -=` left); destroyed-tower cleanup is
single-point and splice-safe; DPR sizing, offscreen cache key, and input mapping all correct.

Non-blocking follow-ups (author's choice before commit): MEMORY.md `Last Updated` + review index,
3 extra verifier assertions (silence consumption / specialCd spawn init / eatCd), dead code at
index.html:2212, destroyed filter on the eating finder, and add double-dip monsters
(quiet / boss / super_boss / sunshine) + bite DPS +75% to the real-device balance checklist.

## Implementation Follow-up (Codex, 2026-07-03)

Resolved before commit:

- Added verifier assertions for silence consumption, `specialCd`, bite cadence, destroyed-tower filtering, monster archetypes, wave beats, and lane-mode spawn routing.
- Removed the unreachable tower branch cleanup line.
- Added destroyed/hp filtering to the enemy eating finder.
- Added `MONSTER_ATTACK_PLAN`, `WAVE_BEATS`, and group-level `laneMode` routing for PvZ-style staged pressure.
- Captured Claude's follow-up planning in `.vibemgmt/reviews/CLAUDE_PLAN_2026-07-03_pvz-wave-archetypes.md`.

Author may flip this ticket to `status: done` at commit time.
