---
reviewer: Codex QA Reviewer
review_date: 2026-07-24
requested_artifact_date: 2026-07-23
status: FAIL
baseline_head: 67be5b0e454523742f43040f72f70f330aecd76e
tested_state: current HEAD plus current worktree changes
work_item_ids:
  - TICKET-20260715-001
  - TICKET-20260715-002
  - TICKET-20260715-004
  - TICKET-20260723-002
linked_fix_ids:
  - FIX-20260723-003
  - FIX-20260723-004
  - FIX-20260723-005
unresolved_finding_ids:
  - QA-20260723-002
verified_finding_ids:
  - QA-20260723-001
  - QA-20260723-003
---

# Phase 4.7 QA Closeout Regression

## 結論

**FAIL**

`QA-20260723-001` 與 `QA-20260723-003` 的指定回歸已通過；`QA-20260723-002` 只有部分修復。Boss 的 telegraph／execute／recovery exclusivity、死亡當幀 guard 與 charge movement 均通過，但 Boss 死亡前已發出的 `enemyProjectile` 仍會在死亡後命中並造成傷害。此 Severe finding 仍阻擋 Phase 4.7。

## Charter

- 目標：對四張 ticket 與三張 linked FIX 的目前 worktree 執行 closeout regression，確認既有三項 finding 與指定生命週期、loader、scene、release、長幀安全性。
- 時間盒：45 分鐘。
- 範圍：VFX／傷害時點、非投射技能 scheduler、Boss action exclusivity／死亡副作用／charge movement、更新提示 snooze、scene loader／方向矩陣、120,000-frame lifecycle。
- 版本：`67be5b0e454523742f43040f72f70f330aecd76e` 加目前未提交 worktree changes；未切換版本。
- Scope authority：`.vibemgmt/pods/` 沒有 `POD-X.md`（僅 `PM_SOP.md` 與 `.gitkeep`），因此沒有可讀的 POD 交付 allowlist。本輪以四張 ticket 與三張 FIX 的明示 Scope／AC 作為 bounded allowlist。
- 寫入邊界：未修改 source、tests、tickets、FIX、MEMORY、assets 或既有報告；只建立本報告。

## 測試環境與效能基線

- OS：Windows 11 Pro 10.0.26200
- CPU：Intel Core Ultra 7 265HX，20 logical processors
- RAM：23.4 GB
- Node：v24.14.0
- Python：3.14.2
- Browser：本機 Chrome，Playwright headless，1280x720
- Browser launch：913 ms；頁面 load：629–644 ms；HTTP 200
- 1 秒 CDP baseline：engine frame counter +145、main-thread TaskDuration 9.4%、JS heap 1.4 MB used／3.5 MB total
- Playwright process-tree snapshot：643.5 MB RSS；此值包含 Chrome 多程序與 Playwright driver，只作環境基線，不作遊戲 RAM gate。
- 獨立回歸 probe latency：12 ms；page errors：0

上述 CPU／RAM 數值來自 headless harness，不等同手機實機。120k soak 為加速物件生命週期測試，不等同 8 小時真實遊玩。

## Fresh command evidence

| Command / probe | Result |
|---|---|
| `node scripts\verify_game_contracts.js` | PASS，250 ms |
| `node scripts\verify_release_contracts.js` | PASS，771 ms |
| `node scripts\verify_mobile_interactions.js` | PASS，238 ms |
| `node scripts\verify_account_client.js` | PASS，280 ms |
| `python scripts\verify_long_battle_runtime.py` | PASS，6,085 ms |
| `git diff --check` | PASS |
| inline `<script>` count | PASS，1 |
| release strong-secret signature scan | PASS，0 matched files |
| independent executable VFX lifecycle probe | PASS |
| independent Boss execute／charge／death probe | **FAIL：dead-source projectile 仍命中** |
| independent stale-loader／scene matrix probe | PASS |

### 120,000-frame safety

- 120,000 frames completed；synthetic soak 69 ms。
- Peak：`objs=2`、`particles=6`、`floatTexts=1`。
- Drain 後：三者均為 0。
- RAF smoke：`75 -> 120`；0 uncaught page errors。
- `enemyGridColumn()` 對左／中／右邊界夾限為 `0 / 4 / 8`。

## Regression matrix

| Target | Result | Fresh evidence |
|---|---|---|
| QA-20260723-001：近／遠 projectile 的 VFX／damage timing | PASS | 近距離 frame 15、遠距離 frame 93；兩者 `impactFrame === hitFrame`，travel Fx 均回收為 0 |
| QA-20260723-001：非 projectile lifecycle | PASS | telegraph 0 → cast 18 → travel 24 → damage/impact 30；敵人中途死亡時 damage 0 |
| QA-20260723-002：Boss execute exclusivity | PASS | telegraph／execute／recovery 均 lock；execute 期間 tower HP 不變、orb 未被偷、special/projectile 0 |
| QA-20260723-002：charge movement | PASS | 3 execute frames 僅 scheduler-owned movement，總位移 4.05；進 recovery 後停止 |
| QA-20260723-002：死亡當幀副作用 | PASS | `hp=0` Boss 一次 update 後移除；tower HP 不變、harmful object 0 |
| QA-20260723-002：死亡後延遲 projectile | **FAIL** | Boss 設為 `hp=0` 後，既有 projectile 仍於 frame 48 造成 1 次 damage 與 1 次 impact |
| QA-20260723-003：dismiss／snooze lifecycle | PASS | dismiss 後同 build 在 interval-1 不提示；滿 5 分鐘 polling interval 後重新提示；unsafe phase 不 reload |
| TICKET-20260715-002：loader interrupt／scene matrix | PASS | 快速發出 level 0→1：只 start level 1，舊 request 回 false；`td landscape/portrait = landscape/gate`，`minigame landscape/portrait = landscape/portrait` |
| TICKET-20260715-002：scene size／fallback | PASS | 4 組 landscape 均 2048x1153；4 組 portrait 均 1153x2048；PNG/WebP pair 尺寸一致；WebP→PNG 與雙失敗 fail-soft 通過 |

## Findings

### QA-20260723-002 — Severe — Boss 死亡後既有投射物仍造成延遲傷害

- Linked work item：`TICKET-20260715-004`
- Linked fix：`FIX-20260723-004`
- 狀態：**未解決；原 finding 部分修復**

#### 影響

Boss 已死亡、scheduler action 已被取消後，死亡前發出的遠程投射物仍可命中塔並產生 impact。玩家會在 Boss 死亡後承受無法再阻止的設施傷害，違反票面「不在死亡後施放」與上一輪要求的「延遲 projectile 清除」生命週期契約。

#### 重現步驟

1. 從目前 `index.html` 實際抽取並執行 `spawnEnemyProjectile()` 與 `updateEnemyProjectile()`。
2. 建立存活 Boss、存活 tower，呼叫 `spawnEnemyProjectile()`。
3. 在 projectile 飛行前把來源 Boss 設為 `hp=0`，模擬 Boss 被擊殺。
4. 持續呼叫 `updateEnemyProjectile()` 到 projectile 結束。
5. Actual：frame 48 發生 `damage=1`、`impact=1`。
6. Expected：來源 Boss 死亡後，該延遲攻擊不得再造成 damage／impact。
7. 同一 probe 重跑 alive/dead source，兩者皆在 frame 48 命中，結果穩定可重現。

#### Root-cause evidence

- `index.html:3503-3506`：projectile 保存來源 `enemy` reference。
- `index.html:3530-3537`：更新 guard 只檢查 target，不檢查 `projectile.enemy.hp`。
- `index.html:3540-3543`：命中路徑直接 damage 並建立 impact。
- `index.html:4105-4112`：死亡 guard 只移除 enemy 本體，未終止該 enemy 已存在的 projectile。
- 對照：`advanceBossAction()` 與 `advanceSpecialAttack()` 都會在來源 enemy 死亡時中止；projectile lifecycle 沒有等價 guard。
- 現有 `verify_game_contracts.js` 覆蓋 alive-source 近／遠距離與 dead Boss action，但沒有 dead-source projectile case，因此 suite 綠燈未覆蓋此失敗。

## Boundary／error-path checklist

- Input：portrait VFX 不攔截 minigame input；mobile interaction suite PASS。
- Text：更新 modal semantics／CTA contract PASS；超長、RTL 與 emoji 文案不屬本輪 mutation，未另做壓力測試。
- Numeric：近／遠距離、DPR cache key、scene 尺寸、grid clamp、120k frames 已覆蓋。
- State：safe／unsafe update phase、dismiss snooze、stale asset request、duplicate load、fallback、Boss phase lock 已覆蓋。
- Time：18-frame non-projectile telegraph、projectile 實際飛行時間、5 分鐘 snooze 邊界、Boss execute/recovery、120k soak 已覆蓋。
- Environment：Windows + headless Chrome；無 iOS Safari／Android Chrome 真機。
- Cancel：target destroyed 後 projectile `life=0`、travel Fx `life=0`，無 damage／impact。
- Interrupt：非 projectile 技能在 enemy 死亡後中止；Boss action 在 enemy 死亡後中止。
- Duplicate：同 logical asset load dedupe PASS；同 Boss pending action 不重複排程。
- Concurrent：Boss execute 期間 legacy special／bite／sun-steal 均被鎖；但死亡後既有 projectile 仍是未解決路徑。

## Residual risks

- 尚無 iOS Safari／Android Chrome 真機的 dynamic toolbar、safe-area、orientation change、pointer latency 與熱降頻證據。
- 尚未人工走完 14 關場景、4 組橫／直章間小遊戲與 2-3／4-1／4-2 完整 Boss journey；本輪 scene 結論限自動 loader／尺寸／方向契約。
- 尚未部署，因此未驗證 production GitHub Pages／CDN 的同名素材換版與 `version.json no-store` 行為。
- Headless main-thread baseline 為 9.4%，高於 `qa-testing` 通用 idle 參考值 5%；遊戲持續 RAF 且 headless refresh cadence 非實機，此數字不單獨建立效能 finding，需真機 profiling 判定。
- 120k synthetic soak 證明 bounded lifecycle，不能替代 8 小時 soak、實際戰鬥 FPS、完整瀏覽器 RAM 或耗電測量。

## Gate disposition

- Blocking：0
- Severe：1（`QA-20260723-002` 未解決）
- Moderate：0
- Minor：0
- Phase 4.7：**FAIL**
- Next owner：BOSS 將 `FIX-20260723-004` 退回 DEV；修正後重新執行 dead-source projectile、完整 Boss lifecycle 與 120k regression。

