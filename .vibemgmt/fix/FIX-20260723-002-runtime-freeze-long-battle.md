---
type: fix
status: done
resolution: fixed
owner: DEV
priority: blocking
created: 2026-07-23
completed: 2026-07-23
---

# Fix: 長時間遊玩後畫面凍結

## RCA

### Reproduce

- BOSS 真機回報遊玩到一半後整個畫面凍結且無法操作。
- Chromium 844x390、DPR 2 高壓戰鬥模擬放入全怪物與完整防線；Boss 場地技能
  執行時穩定中斷。

### Log Analysis

- `TypeError: this.enemyGridColumn is not a function`
- Stack：`spawnBossHazard()` -> `executeBossPhaseAction()` -> `update()`。
- `startLoop()` 只有在 `update()` 與 `draw()` 都返回後才安排下一個
  `requestAnimationFrame`；例外發生後沒有下一幀，因此畫面與輸入反饋一起定格。

### Localize

- `TICKET-20260723-001` 移除舊指定範圍大招時，連同共用的
  `enemyGridColumn()` 一起刪除。
- Boss hazard runtime 仍在 `spawnBossHazard()` 呼叫該 helper。

### Deduce

- 這是可重現的 runtime regression，不是裝置效能不足或特效陣列無界增長。
- 恢復獨立、clamped 的敵人格位換算 helper，並加入 Boss hazard 可執行測試；
  另以靜態方法引用檢查避免 GameEngine 再出現缺失 helper。

## Fix Plan

1. 建立能重現 Boss hazard runtime 例外的失敗測試。
2. 恢復 `enemyGridColumn()`，保留 `[0, C - 1]` 夾限語意。
3. 靜態稽核所有 `this.method()` 引用，避免 GameEngine 再有缺失 helper。
4. 驗證長局壓力、既有戰鬥合約、帳號存檔與行動裝置互動。

## Verification

- 長時間 runtime soak / object-count probe
- `node scripts/verify_mobile_interactions.js`
- `node scripts/verify_game_contracts.js`
- `node scripts/verify_account_client.js`
- Chromium landscape browser smoke
- `git diff --check`

## Resolution

- 恢復 Boss hazard 共用的 `enemyGridColumn()`，修正 Boss 場地技能觸發後
  `update()` 拋錯、RAF 停止排程所造成的整個畫面凍結。
- 新增 `scripts/verify_long_battle_runtime.py`：
  - 可執行 Boss hazard 與 clamped grid conversion；
  - 稽核所有 `GameEngine` 直接方法呼叫都有定義；
  - 120,000 幀 soak 峰值 `objs=2`、`particles=6`、`floatTexts=1`，
    排空後皆為 0；
  - RAF `147 -> 190`，無 uncaught page error。
- Root 額外以全怪物與完整防線跑 3,000 幀，間隔執行 Canvas draw：
  2.29 秒完成、無 page error。
- `verify_mobile_interactions.js`、`verify_game_contracts.js`、
  `verify_account_client.js`、inline script syntax、單一 `<script>` 與
  `git diff --check` 全部通過。
