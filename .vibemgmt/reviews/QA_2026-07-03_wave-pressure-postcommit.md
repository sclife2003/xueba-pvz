---
type: qa-review
date: 2026-07-03
reviewer: Claude
scope: commit 41ea5c4 (index.html wave-beat/archetype/laneMode additions; post-commit QA)
status: PASS
---

# QA Review: 41ea5c4 monster wave pressure（补审）

前情：facility-damage 部分已于 CROSSREVIEW_2026-07-03 审过（APPROVE WITH COMMENTS）。本篇补审同 commit 中**未经审查的新系统**：`MONSTER_ATTACK_PLAN`、`WAVE_BEATS`、`laneModeForArchetype`、`chooseSpawnRowForGroup` 与 spawn/warning 接线。

## 结论：PASS（0 Critical / 0 High / 1 Low / 2 Info）

## 已验证正确项

1. **Warning 与 spawn 同路保证成立**：预警在 `timer<=75` 时经 `chooseSpawnRowForGroup` 决定 `nextRow`，spawn 消费同一 `nextRow`；timer 逐帧递减保证预警分支必先于 spawn 分支执行，`_laneCursor` 每只怪只前进一次，闪红路 == 出怪路。
2. **组切换边界正确**：组末只怪 spawn 时 `groupIdx` 已前进，下一次预警读到的是新组的 laneMode/preDelay。
3. **elf / 未知 id 安全**：`getMonsterAttackPlan` fallback `{melee, random}`，elf 行为与旧版一致（纯随机路）。
4. **前轮 8 项 findings 全落地**：verifier +12 条断言（specialCd 出生初始化、silence 消费、eatCd 节奏、destroyed 过滤、archetype/beat/laneMode 覆盖）全绿 32/32；死码已删；eating finder 已补 `hp>0 && !destroyed`；MEMORY.md 日期已更新。
5. `chooseEnemyByRole` 扩展（role 或 archetype 双匹配）与 `WAVE_BEATS` countBonus/intervalShift（interval 下限 55→45）逻辑一致，无越界。

## Findings

### [LOW] `_laneCursor` 残留在静态 LEVELS 波次数据上，跨重玩不重置
`chooseSpawnRowForGroup` 把 `_laneCursor` 写在 `LEVELS[..].waves[..].groups[..]` 对象上（index.html `grp._laneCursor = cursor + 1`）。`applyPacingTuning` 只在页面载入时复制一次 waves，因此**同一 session 内重玩同关**，cursor 从上次残值继续：`sweep` 起始路漂移、`split`/`edges` 奇偶相位互换。不影响正确性（行值合法、预警仍同路），但破坏「同关重玩节奏可预期」。
**建议**：关卡开始时重置（startLevel 里 `level.waves.forEach(w => w.groups.forEach(g => { g._laneCursor = 0; }))`），或改用 `grp.n - mobsLeftInGroup` 推导 cursor、不写回静态数据。

### [INFO] `wave.beat` 元数据与实际旗帜波逻辑不对齐
`applyPacingTuning` 按 waveIdx 顺序贴 beat（第 5 波 = 'flag'），但实际旗帜大波由既有 `isFlagBeat`（`isFinal || (waveIdx+1)%3===0` → 第 3/6 波）决定。beat 只是 authoring 元数据不影响 gameplay，但未来用它做平衡工具时会误读。可在下轮把 'flag' beat 对齐 isFlagBeat 或改名。

### [INFO] focus/split 的目标路完全确定性（seed 为小整数）
`laneSeed = waveNo + groups.length*2`（或 `waveIdx+1`），同关每次重玩 siege/boss 压的都是同一路。对小学生「可学习性」是优点；若 BOSS 觉得重玩太可预测，可把 laneSeed 换成关卡内 run 序号混合。

## 平衡观察（沿用前轮 + 新增）
finale/flag 的 `countBonus +3~4` 与 interval 下限 45 叠加在 facility-damage 系统之上，后期波密度显著上升——真机 checklist 维持：1-2 啃咬压力、2-2 sunshine 经济、3-x quiet/support 静音可读性、4-1 boss 拆防恢复、4-2 super boss 重击+特攻叠加。

## 状态核对
- `41ea5c4` 已 push（origin/main 对齐，GitHub Pages 已上线）
- `node scripts/verify_game_contracts.js` → 32/32 [OK]
- Ticket `TICKET_2026-07-03_claude-review-monster-facility-damage.md` → `status: done` ✓
