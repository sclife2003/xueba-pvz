---
reviewer: Codex QA Reviewer
date: 2026-07-23
status: FAIL
baseline_head: 67be5b0e454523742f43040f72f70f330aecd76e
tested_state: current HEAD plus current worktree diff
work_item_ids:
  - TICKET-20260715-001
  - TICKET-20260715-002
  - TICKET-20260715-004
  - TICKET-20260723-002
finding_ids:
  - QA-20260723-001
  - QA-20260723-002
  - QA-20260723-003
---

# Phase 4.7 QA Closeout — Current Head

## Findings

### QA-20260723-001 — Severe — 四段 raster VFX 與實際傷害／命中時點脫鉤

- Linked ticket: `TICKET-20260715-001`
- Exact locations:
  - `index.html:3359`–`index.html:3361`：所有技能固定以 0/6/12/18 frames 排入 telegraph/cast/travel/impact。
  - `index.html:3506`–`index.html:3523`：遠程傷害只在 projectile 實際抵達時發生。
  - `index.html:3616`–`index.html:3622`：非 projectile 技能先建立 VFX，隨即同 frame 直接傷害目標。
- Impact:
  - 非遠程技能的「預警」與傷害同 frame 發生，玩家無法依預警反應。
  - 遠程技能的 impact 固定在第 18 frame 開始，卻不隨 projectile 距離／速度同步，畫面可在實際命中前顯示命中。
  - 不符合票面「telegraph → cast → travel → impact/aftermath」及「可辨識命中時點」核心 AC。
- Reproduction:
  1. 以現有 verifier 的方法抽取並執行 `spawnSpecialFx()`、`spawnEnemyProjectile()`、`updateEnemyProjectile()`。
  2. 設 `G=80`、敵人 `x=360`、目標 `x=80`、速度 `8.2`。
  3. 實測 VFX delays 為 `telegraph=0, cast=6, travel=12, impact=18`，projectile 在第 `32` frame 才命中。
  4. 對非 projectile 的 `slime` 執行 `resolveSpecialAttack()`，目標 HP 在 telegraph 顯示前即已下降。
- Required disposition:
  - 建議 Root 建立並連結 `FIX-20260723-003-vfx-hit-timing-lifecycle`，交回 DEV；新增近戰與多距離 projectile 的 damage/VFX 同步 executable regression。

### QA-20260723-002 — Severe — Boss execute 與 legacy special/bite 可重疊，死亡幀仍先走副作用

- Linked ticket: `TICKET-20260715-004`
- Exact locations:
  - `index.html:2347`–`index.html:2355`：`bossActionLocksEnemy()` 只鎖 telegraph/recovery，明確不鎖 execute。
  - `index.html:4044`–`index.html:4050`：只有 lock 成立才在副作用前 `continue`。
  - `index.html:4175`–`index.html:4200`：未鎖時仍可執行 SPECIAL_ATTACKS 與啃咬。
  - `index.html:4207`：`hp <= 0` 的移除／死亡處理位於上述副作用之後。
  - `scripts/verify_game_contracts.js:431`–`scripts/verify_game_contracts.js:433`：現有測試反而把 execute 不鎖定寫成通過條件。
- Impact:
  - Boss charge/execute 期間可同時觸發既有遠程特技與啃咬，破壞「同一 Boss 同時只有一個破壞 action」的 scheduler 契約。
  - HP 已為 0 的敵人仍可在移除前走 special/bite 路徑，可能留下死亡後 projectile 或死亡幀設施傷害。
  - 4-1/4-2 可能出現玩家無法從單一預警理解的疊加傷害，違反 overlap/death AC。
- Reproduction:
  1. 執行 `bossActionLocksEnemy([{type:'bossAction', state:'execute', delay:10, enemy}], enemy)`。
  2. 實測回傳 `false`；因此 `index.html:4175` 之後的 special/bite 路徑仍可達。
  3. 將 Boss `specialCd=0` 且與 tower 重疊，即可在 execute action 存在時產生 legacy special／bite。
  4. 將同一敵人 `hp=0` 後執行 enemy update；死亡 guard 要到 `index.html:4207` 才生效。
- Required disposition:
  - 建議 Root 建立並連結 `FIX-20260723-004-boss-action-overlap-death-guard`，交回 DEV；補 execute/travel exclusivity、死亡幀零副作用、延遲 projectile 清除及 queued phase vulnerability 不重疊測試。

### QA-20260723-003 — Moderate — 「稍後」會永久抑制同一 build 的更新提示

- Linked ticket: `TICKET-20260723-002`
- Exact locations:
  - `index.html:315`–`index.html:329`：`promptedBuildId` 一旦等於 pending build，`maybePrompt()` 永遠回 false。
  - `index.html:340`–`index.html:351`：後續 check/phase change 沒有 re-arm 機制。
  - `index.html:6631`：按「稍後」只清除 UI 的 `updateBuildId`，沒有通知 release monitor。
- Impact:
  - 玩家按一次「稍後」後，同一新 build 在後續安全 phase 與 5 分鐘輪詢都不再提示；舊分頁可無限期停留在舊素材版本。
- Reproduction:
  1. 建立 current=`a…a`、next=`b…b` 的 release monitor，phase=`menu`。
  2. 第一次 `check()` 回 `{status:'prompted'}`。
  3. 模擬「稍後」只執行 `ui.update({updateBuildId:''})`。
  4. 第二次 `check()` 回 `{status:'deferred'}`；切到 `world` 後 `handlePhaseChange()` 仍為 `false`；prompt count 維持 1。
- Required disposition:
  - 建議 Root 建立並連結 `FIX-20260723-005-release-update-reminder-rearm`，交回 DEV；明定稍後重試時間／下一安全 phase，並補 dismiss → reprompt regression。

## Verdict

**FAIL**

Gate reason：存在 2 個未解決 Severe findings。依 Phase 4.7 規則，不可回傳 PASS，必須經 BOSS 路由退回 DEV。

## Charter

- 目標：驗證四張 ticket 在 current HEAD + current worktree diff 的行為、邊界、錯誤路徑、效能與 release 安全性。
- 時間盒：30–60 分鐘。
- 範圍：raster VFX、scene loader／尺寸、Boss lifecycle／death／overlap、release safe phase／storage／artifact allowlist。
- Scope authority：repo 無 `POD-X.md` allowlist（`.vibemgmt/pods/` 僅有 `PM_SOP.md` 與 `.gitkeep`）；本輪以四張精確 ticket 的 Scope/AC 為 bounded allowlist。
- 受測版本：`67be5b0e454523742f43040f72f70f330aecd76e` 加目前未提交 worktree diff；未修改 source 或 ticket state。

## Fresh Evidence

| Command / probe | Result |
|---|---|
| `node scripts\verify_release_contracts.js` | PASS — safe/unsafe phase、no-store、same-build fallback、storage preservation、artifact allowlist |
| `node scripts\verify_game_contracts.js` | PASS — contract suite；但未驗證 Finding 001 的命中同步，且把 Finding 002 的 execute-unlocked 行為視為 OK |
| `node scripts\verify_mobile_interactions.js` | PASS |
| `node scripts\verify_account_client.js` | PASS |
| `python scripts\verify_long_battle_runtime.py` | PASS — 120,000 frames；objects peak 2、particles 6、floatTexts 1；soak 81 ms；RAF `82 -> 126`；0 uncaught page errors |
| `git diff --check` | PASS |
| release-scope secret scan | PASS — no matches |
| independent VFX timing probe | FAIL — impact frame 18，projectile hit frame 32 |
| independent Boss lock probe | FAIL — `executeLocked=false` |
| independent release dismiss probe | FAIL — first prompted；second deferred；phase reprompt false |

## Boundary and Failure-Path Coverage

- Input：dense raster VFX 不攔截 minigame input；mobile interaction suite PASS。
- Text：更新提示與 Boss announcement wiring 通過；未做超長／RTL 文案壓力測試，非本四票核心 mutation。
- Numeric：DPR capped；Boss threshold queue、grid clamp、120,000-frame lifecycle PASS；VFX/projectile timing FAIL。
- State：asset request ID cancellation、dedupe、WebP→PNG fallback PASS；Boss execute/death exclusivity FAIL。
- Time：5 分鐘 release polling、telegraph/recovery、long soak 已驗；dismiss re-arm FAIL。
- Environment：Windows + Node + Python；本機 Chrome full-page probe未能在 30 秒內達到 `networkidle`，未取得新的 startup/CPU/RAM 數據。既有 long-battle browser smoke仍為 PASS。
- Error paths：
  - asset duplicate load：PASS，同 logical ID 只 fetch 一次。
  - WebP fail → PNG fallback：PASS；雙失敗 fail-soft。
  - stale asset request interruption：PASS，request ID 阻止舊請求開戰。
  - version fetch failure：PASS，fail-soft、不 reload。
  - concurrent Boss action：FAIL，execute 仍可走 legacy special/bite。
  - death/interrupt：FAIL，死亡 guard 位於副作用之後。

## Asset Dimensions and Pixel Evidence

- 4/4 minigame landscape PNG/WebP：`2048x1153`，每組 pair 尺寸一致，達 `>=2048x1152`。
- 4/4 minigame portrait PNG/WebP：`1153x2048`，每組 pair 尺寸一致，達 `>=1152x2048`。
- 7/7 VFX families：均含非透明像素。
- dense cast：rasterFx peak capped at 160，180 frames 後完全回收。
- telegraph/cast/travel/impact：pixel signatures 可區分；但視覺時點與 gameplay hit 時點仍因 Finding 001 不合格。

## Release Safety Evidence

- `version.json` 使用 `{buildId}`；production workflow 以 immutable `github.sha` 取代 token。
- `fetchVersionManifest(..., {cache:'no-store'})` 通過。
- WebP/PNG fallback 使用相同 build query。
- 提示僅在 menu/world/prep/collection/workshop；unsafe phase confirm 不 reload。
- 無 `localStorage.clear()`、`sessionStorage.clear()`、`indexedDB.deleteDatabase()` 或 Service Worker。
- artifact executable test僅輸出 `index.html`、`assets/**`、`account-service.json`、`version.json`。
- release-scope secret scan無命中。
- 「稍後」生命週期仍因 Finding 003 不合格。

## Residual Manual Real-Device Risks

- iOS Safari 與 Android Chrome 真機的 dynamic toolbar、safe-area、orientation change、pointer/touch latency 尚未在本輪取得實機證據。
- 1920x1080 與手機高 DPR 的密集 Boss/VFX 真實 FPS、CPU、RAM、熱降頻與長時間耗電仍需真機量測。
- 14 關完整視覺矩陣、4 個直／橫章間小遊戲、2-3/4-1/4-2 完整 Boss journey 的可讀性仍需人工截圖／錄影驗收。
- production GitHub Pages/CDN 的同名素材更新與 no-store 行為需部署後 smoke；本輪未 deploy。

## Work Item Requests

QA 不建立或轉移 work item。請 Root/BOSS：

1. 建立 `FIX-20260723-003-vfx-hit-timing-lifecycle`，連結 `QA-20260723-001` / `TICKET-20260715-001`。
2. 建立 `FIX-20260723-004-boss-action-overlap-death-guard`，連結 `QA-20260723-002` / `TICKET-20260715-004`。
3. 建立 `FIX-20260723-005-release-update-reminder-rearm`，連結 `QA-20260723-003` / `TICKET-20260723-002`。
4. DEV 修復後重新執行 scoped Phase 4.7 QA；`TICKET-20260715-002` 本輪自動尺寸／loader／fallback evidence 通過，但不可單獨抵銷其他票的 Severe gate。
