# xueba-pvz GDD Addendum: Strategy Depth Upgrade

**Date:** 2026-06-13  
**Audience:** Claude Code / game design implementation agent  
**Related design doc:** `.vibemgmt/CLAUDE_HANDOFF_2026-06-13_game-optimization.md`  
**Purpose:** Add PvZ-like and tower-defense-inspired strategy depth after Phase 2  

---

## 1. Design Intent

This addendum extends the main design document with a new strategy-depth phase.

The game should not only become visually closer to a polished lane-defense game; it must also become more strategically interesting. The player should feel that they are:

- Reading enemy threats before the wave starts.
- Choosing a limited tool kit for the level.
- Making active decisions during combat.
- Managing risk by deciding whether to accelerate waves.
- Improving tools during a run.

The goal is not to copy any specific game. The goal is to learn from why similar tower defense games work.

---

## 2. Comparable Game Lessons

### Plants vs. Zombies

What to learn:

- Lane-based pressure is instantly readable.
- Enemy preview creates strategy before combat.
- Limited plant selection creates meaningful trade-offs.
- Every plant and enemy has a clear role.
- Units and enemies share the lane space, creating direct pressure when enemies reach defenders.

Application to `xueba-pvz`:

- Keep the 5-lane right-to-left defense.
- Add level-start enemy preview.
- Restrict loadout selection after early tutorial levels.
- Make each school tool counter a specific enemy type.

### Kingdom Rush

What to learn:

- Active skills create timing decisions.
- Hero / commander actions keep the player involved after placing towers.
- Wave pacing matters as much as tower stats.

Application to `xueba-pvz`:

- Add a `班主任技能槽` as a player-controlled active skill meter.
- Charge the meter through quiz success, enemy defeats, or wave survival.
- Let the player choose when to use a powerful classroom skill.

### Bloons TD

What to learn:

- Upgrade paths create long-term attachment to towers.
- Simple towers become interesting when they branch into different roles.
- Power fantasy grows over the course of a run.

Application to `xueba-pvz`:

- Add lightweight in-level upgrades first.
- Do not build a complex permanent meta system yet.
- Give each school tool one simple upgrade decision before adding full branches.

### GemCraft

What to learn:

- Wave manipulation creates high-skill risk/reward.
- Advanced players enjoy choosing when to increase pressure.
- Resource rewards can compensate for taking extra risk.

Application to `xueba-pvz`:

- Add an `提前上課` button to call the next wave early.
- Reward early wave calls with bonus energy.
- Let new players ignore the feature while skilled players use it to accelerate.

---

## 3. New Phase Order

Update the master roadmap to:

```text
Phase 1: Gameplay clarity
Phase 2: Quiz-to-combat integration
Phase 2.5: Strategy depth upgrade
Phase 3: PvZ-level original school art pass
Phase 4: Strategic level design and long-term progression
```

Rationale:

- Phase 1 makes the current game understandable.
- Phase 2 makes learning affect combat.
- Phase 2.5 makes the game worth replaying and thinking about.
- Phase 3 makes the visual presentation match the gameplay ambition.
- Phase 4 expands levels after the core systems are stronger.

Do not jump directly from Phase 2 to full art production if the strategy skeleton still feels shallow.

---

## 4. Phase 2.5: Strategy Depth Upgrade

### Goal

Make `xueba-pvz` feel less like a prototype where the player always uses the same best tools, and more like a strategic lane-defense game where each level asks a different question.

### Core deliverables

1. Level-start enemy preview.
2. Limited tool loadout.
3. Head teacher active skill meter.
4. Early next-wave call button.
5. Lightweight in-level upgrades.

---

## 5. System 1: Level-Start Enemy Preview

### Problem

The player currently reacts after enemies appear. This weakens strategy because the player cannot prepare intelligently.

### Design

Before a level starts, show a compact preparation panel:

```text
本關敵人
- 懶惰怪 x12
- 抄作業怪 x8
- 鐵桶考生 x2

推薦策略
- 用膠水陷阱拖住快速敵人
- 用橡皮堡壘擋住鐵桶考生
```

### Implementation notes

- Compute the preview from `LEVELS[levelIdx].waves`.
- Aggregate enemy counts across all waves.
- Sort by threat category or first appearance order.
- Use existing `ENEMIES` metadata, but add fields if needed:

```js
role: 'normal' | 'fast' | 'tank' | 'boss' | 'splitter'
hint: '用膠水陷阱拖住它'
```

### Acceptance

- Player can see the main threats before starting combat.
- Preview does not block the game after combat begins.
- Preview works on iPhone 12-15 landscape.

---

## 6. System 2: Limited Tool Loadout

### Problem

If every tool is always available, there is little strategic commitment. The player can simply use the same strongest setup every level.

### Design

After the tutorial chapter, the player may bring only 4 tools into a level.

Recommended progression:

```text
Chapter 1: fixed loadout, tutorial-friendly
Chapter 2: choose 4 of 6 tools
Chapter 3+: choose 4 tools, enemy preview shown first
```

### UI concept

Preparation screen:

```text
選擇 4 個文具上場
[課本發電站] [鉛筆投手] [墨水噴射器]
[膠水陷阱] [橡皮堡壘] [班主任指令]

已選: 3/4
```

### Implementation notes

- Add `activeLoadout` to game state.
- `renderTowerBar()` should render only tools in `activeLoadout`.
- Chapter 1 can auto-fill `activeLoadout` to avoid new-player friction.
- Save permanent unlocks separately from per-level loadout.

### Acceptance

- Player cannot start non-tutorial levels without the required loadout count.
- Tower bar only shows selected tools.
- Locked / unavailable tools remain visually clear.

---

## 7. System 3: Head Teacher Active Skill Meter

### Problem

The current game is mostly placement-driven. Once defenders are placed, the player needs more timing-based involvement.

### Design

Add a `班主任技能槽`.

The meter charges from:

- Correct quiz answers.
- Enemy defeats.
- Surviving a wave.

When full, the player can trigger one active skill.

### Initial active skills

Start with one or two skills only:

| Skill | Effect | Use case |
|---|---|---|
| 全班安靜 | Freeze or heavily slow all enemies for 3 seconds | Emergency control |
| 粉筆風暴 | Damage one selected lane | Lane collapse prevention |

Do not add a large skill tree yet.

### UI concept

```text
班主任技能
[ 72% ] 全班安靜
```

When full:

```text
班主任技能已準備
點擊釋放
```

### Implementation notes

- Add `teacherSkillCharge`.
- Add `teacherSkillReady`.
- Add a function such as `chargeTeacherSkill(amount)`.
- Correct quiz answers should provide a meaningful charge boost.
- Skill activation must show visible feedback.

### Acceptance

- Player understands when the skill is ready.
- Skill has immediate visible battlefield impact.
- Skill cannot be spammed.

---

## 8. System 4: Early Wave Call - `提前上課`

### Problem

Wave pacing is currently controlled mostly by the system. Skilled players need a way to trade risk for reward.

### Design

Add an `提前上課` button when the game is waiting for the next wave.

Effect:

- Starts the next wave immediately.
- Grants a small energy reward.
- If used repeatedly, creates overlapping pressure.

Suggested first tuning:

```text
提前上課 reward: +50 energy
Only available during wave wait / cleanup period
```

### UI copy

```text
提前上課
立刻開始下一波，獲得 +50 靈感值
```

### Implementation notes

- Expose `waitNextWave` status to UI.
- Add handler `callNextWaveEarly()`.
- If clicked:
  - Add energy.
  - Clear wait timer.
  - Start maze / next wave according to current flow.

Important: Current game inserts maze/quiz between waves. Decide whether early call skips cleanup only, or also skips maze. Recommended first version:

```text
提前上課 only shortens the wait timer before the existing between-wave flow.
Do not remove maze/quiz flow yet unless Phase 2 changes it.
```

### Acceptance

- Button only appears when meaningful.
- New players can ignore it.
- Skilled players can speed up runs.

---

## 9. System 5: Lightweight In-Level Upgrades

### Problem

Defenders do not currently create enough attachment or build variety across a level.

### Design

Add a simple in-level upgrade for each tool. First version should be lightweight: one upgrade per tool, no full upgrade tree yet.

Suggested upgrades:

| Tool | Upgrade | Effect |
|---|---|---|
| 課本發電站 | 高效筆記 | Produces energy faster |
| 鉛筆投手 | 削尖鉛筆 | Increased damage |
| 墨水噴射器 | 連續墨滴 | Increased attack rate |
| 膠水陷阱 | 黏性加強 | Longer slow duration |
| 橡皮堡壘 | 厚橡皮 | More HP |
| 班主任指令 | 重點提醒 | Larger burst radius or shorter cooldown |

### Upgrade trigger options

Recommended first version:

- Spend energy to upgrade an existing placed defender.
- Tap/select a placed defender to show an upgrade button.

Alternative:

- Award upgrade tokens after correct quiz answers.

Use energy first because it reuses existing economy.

### Acceptance

- Upgrade action is visible and understandable.
- Upgraded unit has a clear visual marker.
- Upgrade changes gameplay enough to feel worthwhile.

---

## 10. Priority Matrix

Use this order for Phase 2.5 implementation:

| Priority | Feature | Value | Effort | Reason |
|---|---|---:|---:|---|
| P0 | Level-start enemy preview | High | Low | Strategy begins before combat |
| P0 | Limited tool loadout | High | Medium | Creates real trade-offs |
| P1 | Head teacher active skill | High | Medium | Adds timing and excitement |
| P1 | Early wave call | Medium | Low | Adds skill expression |
| P2 | In-level upgrades | High | High | Adds depth but needs UI care |

Recommended build sequence:

1. Enemy preview.
2. Loadout selection.
3. Active skill meter.
4. Early wave call.
5. In-level upgrades.

---

## 11. Interaction With Existing Phases

### Phase 1 dependency

Phase 2.5 assumes Phase 1 already provides:

- Wave preview UI.
- Defender info cards.
- Lane warnings.
- Level tips.

### Phase 2 dependency

Phase 2.5 assumes Phase 2 already provides:

- Knowledge star / quiz integration.
- Correct-answer reward flow.
- At least some combat reward effects.

### Phase 3 dependency

Phase 3 art pass should take Phase 2.5 systems into account:

- Loadout screen needs polished art.
- Teacher skill meter needs its own identity.
- Upgrade states need visual markers.
- Early wave call needs strong but unobtrusive UI.

Do not make Phase 3 art before the strategy UI surfaces are known.

---

## 12. Claude Implementation Prompt

Use this prompt after Phase 2 is complete:

```text
請閱讀：
VibeProjects/xueba-pvz/.vibemgmt/GDD_ADDENDUM_2026-06-13_strategy-depth.md

然後實作 Phase 2.5：策略深度升級。

目標：
讓 xueba-pvz 不只是可玩，而是具備 PvZ-like 的進關前策略、有限選擇、主動技能、風險收益與關卡內成長。

請依序實作：
1. 關卡前敵人預告：統計本關敵人名稱與數量，顯示推薦策略。
2. 有限工具 loadout：第一章固定，第二章起玩家選 4 個工具上場。
3. 班主任主動技能槽：答題/擊殺/過波充能，滿後可釋放 1 個主動技能。
4. 提前上課：等待下一波時可提前開始，給少量能量獎勵。
5. 簡易關卡內升級：每個工具先做 1 個升級效果。

限制：
- 維持單檔 index.html。
- 不引入框架。
- 不拆檔。
- 不使用 PvZ 原素材、角色名、音效或圖片。
- 不破壞橫屏鎖定、safe-area、visualViewport 修正。
- 不破壞存檔匯入/匯出。
- 不做 Phase 3 美術替換。
- 新功能必須放在 index.html 對應區塊，不要散落插入。
- 完成後執行 inline script syntax check。

回報：
1. 修改範圍
2. Phase 2.5 每項如何完成
3. 驗證結果
4. 剩餘風險
5. 建議的下一步
```

