---
type: planning-review
date: 2026-07-03
author: Claude
implementer: Codex
status: accepted-for-implementation
---

# Claude Plan: PvZ-style Wave Beats and Monster Archetypes

## Facility-Damage Ticket Verdict

Claude accepted `TICKET_2026-07-03_claude-review-monster-facility-damage.md` as implemented with comments: 0 Critical / 0 High. The remaining risk is balance, especially stacked facility pressure from stronger bite damage and monsters that combine legacy abilities with new special attacks.

## Implementation Plan

1. Add monster attack archetype metadata in `index.html`.
   - Cover every non-elf monster with an archetype such as `melee`, `rush`, `ranged`, `support`, `siege`, `economy`, or `boss`.
   - Use the metadata for authoring and later balance reviews; do not change save schema.

2. Add staged wave beats in the pacing pass.
   - Model beats like `opener`, `swarm`, `support_mix`, `siege`, `flag`, and `finale`.
   - Existing and generated waves should carry `beat`, `pressureLevel`, and a readable `laneMode`.
   - Generated pressure waves should choose enemies by scene pool, signature monster, role, and archetype instead of only adding raw counts.

3. Make lane pressure readable.
   - Add group-level `laneMode` values: `random`, `focus`, `split`, `sweep`, and `edges`.
   - Route spawn warnings and actual spawns through one helper so the warning row matches the spawn row.
   - Use focused lanes for siege/boss, split lanes for ranged/support/economy, and sweep lanes for rush/swarm beats.

4. Strengthen verification.
   - Extend `scripts/verify_game_contracts.js` to assert archetype coverage, wave beat metadata, laneMode routing, `specialCd` initialization, silence consumption, bite cadence, and destroyed-tower filtering.

5. Manual QA checklist.
   - Test 1-2 for new bite pressure.
   - Test 2-2 for sunshine economy pressure.
   - Test 3-x for quiet/support silence readability.
   - Test 4-1 for boss facility destruction recovery.
   - Test 4-2 for super boss slam and special attack overlap.

## Risks

- Later levels may become too punishing because multiple facility-pressure systems can stack.
- String-based verifier is appropriate for the current no-build single-file game, but it should become a behavior harness if more combat logic is extracted later.
- Real-device feel remains unverified until BOSS tests touch targeting, DPR sharpness, and balance.
