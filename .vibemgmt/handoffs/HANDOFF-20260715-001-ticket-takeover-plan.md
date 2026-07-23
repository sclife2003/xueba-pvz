---
type: handoff
status: done
resolution: superseded
owner: ROOT
created: 2026-07-15
completed: 2026-07-23
baseline_commit: 2b2b6e8
related_tickets:
  - TICKET-20260715-001
  - TICKET-20260715-002
  - TICKET-20260715-003
  - TICKET-20260715-004
  - TICKET-20260715-005
  - TICKET-20260723-002
---

# Handoff: 2026-07-15 全部 tickets 接手與執行規劃

> **Ticket 005 更新（2026-07-15）**：BOSS 已指定簡單帳號密碼且資料存於 GitHub。本文所有 Ticket 005 的 Supabase、Magic Link、Wave 5–7 與外部決策閘門內容已由 `DECISION-20260715-001` 取代；Ticket 001–004 規劃不受影響。帳號 Worker、前端 UI、local-first/CAS 與自動測試已在 worktree 實作，正式啟用與雙裝置 E2E 仍未完成。

> **Closeout audit（2026-07-23）**：此接手計畫的雲端架構與 immediate-next-action
> 已過期，因此以 `superseded` 結案。`001`、`002`、`004` 經 current-HEAD
> 複審仍有實作或必要證據缺口，維持 open；`005` 的雲端部分已完成，剩餘素材
> 發行版本化已拆至 `TICKET-20260723-002`。本 handoff 結案不關閉任何未完成需求。
>
> **Regression closeout（2026-07-23）**：`TICKET-20260715-001` 與
> `TICKET-20260715-002` 已通過 ticket-specific QA/UX 並以 `completed` 結案。
> `TICKET-20260715-004` 仍受 `FIX-20260723-004` 阻擋；素材發行票仍受
> `FIX-20260723-005` 的 modal keyboard finding 阻擋。

## Outcome

- `TICKET-20260715-001` 至 `004` 已由 `done` 重開為 `open`；既有結構 verifier 通過，但票面契約仍有可重現缺口或未取得的人工／真機證據。
- `TICKET-20260715-005` 保持 `open`；本機 Phase 0–1 可先做，Phase 2 雲端能力受 BOSS 決策與外部服務設定閘門約束。
- 五張票由 `Codex QA` 接手規劃；本次只修改 `.vibemgmt/` 管理狀態，未修改 `index.html`、assets、scripts、GitHub Pages 或 Supabase。
- 實作順序採「遊戲正確性 → raster 契約 → 真機驗收 → release/save 基礎 → cloud」；所有會碰 `index.html` 的工作串行，避免單檔衝突。

## Baseline and Evidence Boundary

接手基線：

- Commit：`2b2b6e8`
- `node scripts/verify_game_contracts.js`：exit 0，輸出 `Game contracts verified.`
- `index.html` 靜態 `<script>` opening/closing count：各 1
- `git diff --check`：exit 0
- 接手前 worktree：clean

證據邊界：現有 verifier 主要驗 manifest、token、欄位與 source ordering；它沒有執行完整多 frame `GameEngine`、跨關狀態、Boss 時序、完整 viewport/device matrix 或效能 soak。既有 QA/UX PASS 也明列未覆蓋完整 Boss journey、真機觸控與長時間效能。因此「verifier 綠燈」不得單獨作為關票依據。

## Ticket Disposition

| Ticket | 接手判定 | 已確認缺口 | 關票必要證據 |
|---|---|---|---|
| 001 怪物招式 raster VFX | PARTIAL；重開 | 2/8 AC 有完整自動證據；`spawnSpecialFx()` 正常路徑仍畫幾何特效；四 phase runtime 未形成可辨識構圖；偷陽光、衝刺／換路與 Boss 等缺 raster coverage；portrait minigame 無共用 VFX render path | runtime probes、資產契約、完整招式矩陣、橫／直式視覺、密集施放互動與效能證據 |
| 002 關卡 raster scenes | PARTIAL；重開 | 3/10 AC 有完整自動證據；`ASSETS.load()` 首戰仍等待全部 scenes/minigames/VFX；章間小遊戲現為 1672x941 / 941x1672，未達至少 2048x1152 / 1152x2048 | per-level dependency loading、尺寸 validator、14 關 visual regression、切關/DPR/fallback、桌面與真機矩陣 |
| 003 文具 AoE Option B | NEEDS_FIX；重開 | 跨關保留 `pendingUltimate` 後 `startLevel()` 將 stamps 歸零，仍可 confirm 並扣成 `-1`；高傷 AoE 可觸發 Boss threshold 跳階 | 跨關／戰敗／結算 regression、`phase === 'td' && stamps > 0` guard、7 招 × 5 級與 Boss concurrency probes、觸控驗收 |
| 004 Boss phase/ranged | NEEDS_FIX；重開 | vulnerability 與攻擊同時開始；`titanSlam` 無獨立 telegraph/recovery；多條 attack path 未統一排程；HP 可 0→2 跳階 | 單一 Boss action state machine、逐階 transition、所有破壞技的預警→執行→恢復→破綻、完整 Boss journeys |
| 005 asset version/cloud save | OPEN；已規劃 | 目前仍是 fixed asset URL + 單瀏覽器 localStorage；無 Actions Pages pipeline、SaveRepository、RLS/CAS/offline queue | Wave 4–7 的 unit/contract/SQL/browser/device/security/rollout 證據與 BOSS 決策 |

## Decisions Already Settled

- `TICKET-20260715-003` 採 Option B「指定範圍攻擊」。Ticket frontmatter 已記錄 `decision: approved-option-b`，且 commit `46132c1` 已提交實作；接手時不得重問。
- 保留 `SAVE_KEY = 'xueba_pvz_save_v1'`、目前 save schema 3、`XBPVZ1` 手動 export/import 與 local-first gameplay。
- 專案維持單一 `index.html`、無 runtime framework、靜態 `<script>` tag count 為 1、WebP runtime + PNG fallback、無正式 SVG 路徑。

## Dependency Order

1. Wave 0：003 + 004 正確性 blocker，必須一起修。
2. Wave 1：001 VFX runtime 與資產契約。
3. Wave 2：002 scene dependency loading 與資產尺寸。
4. Wave 3：001–004 共用的瀏覽器、真機、視覺與效能關票矩陣。
5. Wave 4：005 Phase 0 asset versioning + Phase 1 local SaveRepository。
6. Decision Gate：BOSS 決定外部服務與產品選項。
7. Wave 5：Supabase schema/RLS/CAS。
8. Wave 6：Auth、offline queue、conflict/history UI。
9. Wave 7：完整驗收、feature-flag rollout 與 rollback drill。

Wave 0–4 都會修改 `index.html`，由單一實作者依序完成。可以平行的只有唯讀 review、測試設計、SQL 草稿與 raster 資產製作；整合仍回到同一條序列。

## Wave 0 — P0 Gameplay Correctness (003 + 004)

### W0.1 RED: executable runtime regressions

Files:

- Create `scripts/verify_game_runtime.js`
- Modify `scripts/verify_game_contracts.js`

先建立會失敗的 deterministic probes：

1. 啟動大招瞄準後切關、戰敗、回世界地圖或完成關卡，`pendingUltimate` 必須清空。
2. `phase !== 'td'` 或 `stamps <= 0` 時 confirm 不造成效果、不扣章，stamps 永不小於 0。
3. Boss HP 一次跨越兩個 thresholds 時，phase 1、phase 2 依序各 queue 一次，不得 0→2 跳過中間階段。
4. vulnerability 在 execute/travel/recovery 完成前必須為 false。
5. phase ranged、hazard、charge、special 與 `titanSlam` 都經過同一 scheduler；scheduler 忙碌時 bite/special/slam 不得重疊。
6. `titanSlam` 先有可觀察 telegraph，命中後才進 recovery/vulnerability。

### W0.2 GREEN: ultimate state lifecycle

File: `index.html`

- 新增單一 `clearPendingUltimate(reason)`，由開始新關、退出 TD、戰敗、結算與回 menu/world 的 phase transition 共用。
- `confirmStampUltimate()` 在套用 AoE 前重新驗證 `phase === 'td'`、`pendingUltimate` 有效、目標有效、`stamps > 0`。
- 消耗印章與效果套用保持單一 atomic path；失敗／取消不得改 stamps。
- 不改已核准的 Option B、7 種文具 profile 或既有 save schema。

### W0.3 GREEN: unified Boss action state machine

File: `index.html`

- 建立 `idle -> telegraph -> execute/travel -> recovery -> vulnerability -> idle` 的單一 action state。
- phase ranged/summon/hazard/charge、`titanSlam`、special 與 bite 都先向 scheduler 申請；同一 Boss 同時只能有一個破壞 action。
- threshold 計算回傳「所有新跨越 phases」並逐一 queue；每階只觸發一次。
- vulnerability 只在 recovery 完成後開啟，持續時間結束才回 idle。
- 先修時序再調數值；本波不得順手做 balance tuning。

### W0.4 Refactor and gate

- runtime probes 全綠。
- 既有 verifier 全綠。
- 對 1-2、2-3、3-3、4-1、4-2 做瀏覽器 smoke；先驗 state/時序，不在本波關閉真機 AC。
- 003/004 維持 `open`，直到 Wave 3 的 device/balance gate 完成。

## Wave 1 — Ticket 001 Raster VFX Contract

### W1.1 RED: asset/runtime coverage

Files:

- Modify `scripts/verify_game_contracts.js`
- Create `scripts/verify_raster_assets.js`
- Modify `index.html`

測試先定義：

- 18/18 非 elf monster profiles 仍存在，且每個實際招式映射到可辨識的 telegraph/cast/travel/impact 行為。
- 正常成功路徑不得以 `skillFx` 線、圓、色塊或文字取代 raster；geometry 只可作 debug/last-resort degradation，且需可被測試辨識。
- phase 不只存在於 manifest；renderer 必須依 phase 改變 frame/region、位置、scale、方向或 lifecycle。
- sun steal、rush、vault/lane hop、summon、dirty/quiet、Boss ranged/impact 均有 raster coverage。
- 每個正式 PNG/WebP pair 存在、尺寸一致、非透明、無 SVG reference。
- profile 明確定義 landscape/portrait safe area 或共用 normalized anchor contract。

### W1.2 GREEN: raster profiles and assets

Files:

- Modify `index.html`
- Re-author existing pairs under `assets/vfx/vfx_*.{png,webp}` as phase-aware sheets or per-phase assets
- Expected new distinct pairs, subject to manifest freeze in W1.1:
  - `assets/vfx/vfx_dash.{png,webp}`
  - `assets/vfx/vfx_vault.{png,webp}`
  - `assets/vfx/vfx_summon.{png,webp}`
  - `assets/vfx/vfx_sun_steal.{png,webp}`
  - `assets/vfx/vfx_boss_warning.{png,webp}`

Implementation contract:

- `spawnVfxPhase()` 產生 phase-specific source rect/anchor/trajectory，renderer 依 telegraph/cast/travel/impact 分流。
- 橫式 TD 與直式小遊戲使用同一 normalized VFX renderer；若產品決定小遊戲不出現怪物招式，則必須先修票面 AC，不能用「目前沒呼叫」視為通過。
- WebP failure 與 slow-load fallback 必須走相同 logical asset key，不閃 geometry normal result。

### W1.3 Gate

- `scripts/verify_raster_assets.js` 與 existing/runtime verifiers 全綠。
- 連續施放、切關、WebP fail、DPR change、密集 VFX 下放塔／收陽光／大招 input smoke 通過。
- 視覺與真機證據併入 Wave 3 後才能關 001。

## Wave 2 — Ticket 002 Scene Loading and Dimensions

### W2.1 RED: dependency and dimension contracts

Files:

- Modify `scripts/verify_game_contracts.js`
- Extend `scripts/verify_raster_assets.js`

測試先證明：

- 首場只等待當前 level scene、該關實際 monster/Boss/VFX 依賴與必要 UI；不得把 14 scenes、8 minigame variants、全部 VFX 一次 `Promise.all`。
- scene cache key 包含 level id、orientation、DPR bucket 與 build id。
- 4 個 minigames 的 landscape PNG/WebP 均至少 2048x1152，portrait 均至少 1152x2048。
- 14 個 TD scene logical IDs 唯一，PNG/WebP pair 尺寸一致且 non-empty。

### W2.2 GREEN: scoped asset loader

File: `index.html`

- 將 `rasterAssetEntries()` 拆成 manifest index + `dependenciesForLevel(levelId, mode, orientation)`。
- 將 `ASSETS.load()` 改為 idempotent `ASSETS.ensure(logicalKeys)`；UI 先可互動，只阻擋當關必要資產。
- 切關取消或忽略舊 request 的 completion，避免舊背景回寫；fallback 與 cache 使用同一 context key。
- 不在本波加入 service worker；cache invalidation 由 Wave 4 build id 處理。

### W2.3 GREEN: scene assets

Files:

- Re-export `assets/scenes/minigame_*_landscape.{png,webp}` to at least 2048x1152
- Re-export `assets/scenes/minigame_*_portrait.{png,webp}` to at least 1152x2048
- Review existing `assets/scenes/scene_*.{png,webp}` against the recommended 2048x1152 source size; do not upscale blindly if it does not improve source detail

### W2.4 Gate

- Automated dimension/dependency/fallback tests 全綠。
- 固定 journey：`1-1 -> 2-1 -> 3-1 -> 4-2 -> 1-1`，含 retry 與 DPR change；不得串場、閃舊圖或出現低解析 fallback。
- 14/14 scenes 與 8/8 minigame variants 產生可追溯 visual evidence；真機部分併入 Wave 3。

## Wave 3 — Shared Browser, Device, Visual and Performance Gate

本波只驗收與修 blocking regression，不再擴 scope。

Required matrix:

- Desktop landscape：1920x1080、1366x768。
- Mobile landscape representative：844x390，另跑一台 iOS 與一台 Android 真機，包含動態工具列／safe area。
- Portrait minigame：1080x1920、390x844，另跑 iOS/Android 真機。
- Journeys：1-2、2-3、3-3、4-1、4-2；7 大招、所有 Boss phases、密集 VFX、orientation change、WebP fallback、長時間 soak。

Evidence recorded per case:

- viewport/device/browser/build id、steps、expected/actual、screenshot/video、console errors。
- frame-time/FPS 與 input responsiveness；票面只寫「可玩幀率」，測前先由 BOSS 核准量化 threshold，避免事後移動門檻。
- Boss 戰時、設施損失、印章數、死亡來源可理解度，作為後續 balance 證據，不與 correctness 修復混在一起。

Closure rule：001–004 各自 AC 全有 automated 或人工 evidence、無 Blocking/Severe finding，才可改回 `done`。

## Wave 4 — Ticket 005 Phase 0–1: Release and Local Save Foundation

### W4.1 Asset release versioning

Files:

- Create `.github/workflows/pages.yml`
- Create `scripts/build_pages_artifact.js`
- Create `scripts/verify_pages_artifact.js`
- Create `scripts/verify_asset_versioning.js`
- Modify `index.html`
- Modify `.gitignore`

Contract:

- Workflow 從 `GITHUB_SHA` 產生 `{ buildId, deployedAt }` 的 `version.json`，把 `index.html`、`assets/**` 與 runtime public config 組成單一 `_site` artifact；不得發布 `.vibemgmt/`、tests、scripts source、Supabase migrations 或 secrets。
- `ReleaseVersionService` 以 `cache: 'no-store'` 低頻檢查版本；戰鬥／小遊戲延後提示，只在安全 phase 顯示 reload。
- WebP 與 PNG fallback 使用同一 `buildId` query；asset map 仍以 logical path 作 key。
- reload 保留 `/xueba-pvz/` 子路徑；不得呼叫 `localStorage.clear()` 或 `indexedDB.deleteDatabase()`。
- 建 workflow 與本機 artifact 可先完成；切換 GitHub Pages Source 到 Actions 是外部設定 mutation，必須另獲 BOSS 授權。

### W4.2 Local-first SaveRepository

Files:

- Create `scripts/verify_save_repository.js`
- Create fixtures under `scripts/fixtures/save-{v1,v2,v3,corrupt}.json`
- Modify `index.html`

RED cases：v1/v2/v3 migration、corrupt/unknown/out-of-range payload、checksum failure、write failure、manual import/export round-trip、offline queue persistence。

GREEN contract：

- 純函式 `migrateV1ToV2()`、`migrateV2ToV3()`、`validateSavePayload()`、canonical JSON/checksum helpers。
- `LocalSaveStore`、`SyncQueueStore`、`SaveRepository`；boot `load()` 先同步回 local，`save()` 在任何 `await` 前先落 local，再非同步排 cloud op。
- `loadGameSave()` / `writeGameSave()` 保留為相容 facade；不改原 `SAVE_KEY`、schema 3、`XBPVZ1` export/import。
- migration/validation/checksum 失敗先保存 raw snapshot，不覆寫 last-known-good。
- IndexedDB 只存 pending ops、base/cloud revision/checksum 與 raw backups；高價值事件立即保存，低風險高頻更新才 debounce。

## Decision Gate Before Cloud Phase

以下項目未定案前，Wave 5–7 不得接 production cloud 或開啟 cloud feature flag：

| Decision | Recommendation | Required input / consequence |
|---|---|---|
| Auth | Parent Email Magic Link | BOSS 可選 Google 或 Recovery Code；Magic Link production 另需 custom SMTP、sender/domain DNS、rate limit/CAPTCHA 與 redirect allowlist |
| Save slots | Single `default` slot | 若選 multi-slot，schema/UI/conflict/history AC 必須先擴寫 |
| Supabase projects | Separate test + production | owner/org、region、project URL、publishable key、Site URL、allowed redirect URLs |
| Browser client delivery | Pinned vendored browser build + local-only fallback | 需先做 offline/single-script spike；不得把 secret/service-role 放入 bundle。CDN+SRI 為替代方案，自寫 Auth/REST client 不建議 |
| GitHub Pages source | GitHub Actions | 需 maintainer 授權外部設定變更；此前只能驗本機 artifact |
| Browser E2E tooling | Test-only Playwright | 若核准，新增 `package.json` / `package-lock.json`，不進 runtime；若拒絕，需另定可重現 browser test runner |
| Data limits | Freeze before SQL | payload bytes、collection caps、numeric ranges、history 10 筆、staged rollout cohort |

Public browser bundle 只可包含 Supabase project URL 與 publishable key。SMTP/OAuth credentials、secret key、service-role key 只存在 Supabase/GitHub Secrets 或本機未追蹤環境。

## Wave 5 — Supabase Schema, RLS and CAS

Files:

- Create `supabase/config.toml`
- Create `supabase/migrations/202607150001_cloud_saves.sql`
- Create `supabase/tests/cloud_saves_rls.test.sql`
- Create `scripts/verify_cloud_contracts.js`
- Modify `.gitignore`

TDD contract：

- `game_saves` 以 `(user_id, slot)` 為 PK，FK 至 `auth.users`；`game_save_history` 保留最近 10 revisions。
- payload 與 transport metadata 分離：revision、schema version、client build、checksum、timestamps。
- 所有 tables 啟用 RLS，只允許 `auth.uid() = user_id`；user A 讀寫 user B 的 pgTAP negative tests 必須失敗。
- CAS RPC 在 transaction 內 lock row、核對 `expected_revision`、拒絕 stale revision/較新 schema、先寫 history、再更新 canonical、最後裁 history。
- server 驗 JSON object、allowlist、payload bytes、collection caps、level IDs 與 stars/shards/tool levels ranges。
- SQL 與 local adapter contract 可平行撰寫；browser integration 必須等 Decision Gate 完成。

## Wave 6 — Auth, Offline, Conflict and History UX

Files:

- Create `scripts/verify_cloud_e2e.js`
- Conditionally create `package.json` and `package-lock.json`
- Modify `index.html`

Contract scenarios：

1. 未登入：完全 local-only，gameplay/export/import 正常。
2. 首次登入且 cloud empty：驗證 local 後建立 revision 1。
3. local empty/cloud present：先保存 raw cloud，再 migrate/validate/apply。
4. Online save：local 立即成功，cloud 以 CAS 更新。
5. Offline save：IndexedDB 保存 immutable payload、checksum、base revision、op ID；恢復連線後才送。
6. Conflict：不 silent LWW、不自動 field merge/rebase；保存 local/cloud 兩份並顯示安全摘要。
7. 「保留本機／採用雲端／restore history」都以最新 observed revision 做新的 CAS，並先寫 history。
8. Multi-tab 可用 `BroadcastChannel`/storage event 協調，但最終一致性只依賴 CAS。
9. Cloud schema 比 client 新時禁止 cloud write，要求 update；local gameplay 仍可用。
10. UI 顯示 `local-only / syncing / synced / offline queued / conflict`，並保留手動 export/import。

Feature flag 預設 off；不做自動 field merge，因 `shards` 等欄位可能因購買下降，不能用 monotonic merge。

## Wave 7 — Verification, Rollout and Rollback

依序：unit/runtime → repository contract → local Supabase/RLS → browser E2E → device A/B → Pages artifact/secret scan → existing regression。所有門檻通過後才申請：

1. 將 GitHub Pages Source 切到 Actions。
2. 部署 feature flag off。
3. 測試 cohort 開啟。
4. 觀察 sync/conflict/error metrics 後逐步擴大。

Rollback：

- Asset：revert/redeploy 前一 artifact；切回 branch source 仍需 BOSS 授權。
- Cloud：關 feature flag 回 local-only；不 drop tables、不清 browser storage。
- Migration：以 raw snapshots + 原 `SAVE_KEY` 回復 last-known-good。
- 任一 failure 不得自動清 localStorage、IndexedDB、auth/save keys。

## Requirements-to-Test Map

| Requirement | Primary verification |
|---|---|
| 001 phase-aware raster、coverage、fallback | `verify_game_contracts.js` + `verify_game_runtime.js` + `verify_raster_assets.js` + Wave 3 visual/device |
| 002 unique scenes、orientation、scoped preload、dimensions | `verify_raster_assets.js` + dependency probes + journey/visual/device matrix |
| 003 AoE Option B、state safety、concurrency | `verify_game_runtime.js` + 7×5-level probes + pointer/device cases |
| 004 phase sequencing、scheduler、post-action vulnerability | `verify_game_runtime.js` + full 2-3/4-1/4-2 journeys |
| 005 AC1–4 asset update | `verify_asset_versioning.js` + `verify_pages_artifact.js` + authorized Pages smoke |
| 005 AC5–6 save durability | `verify_save_repository.js` fixtures/contracts |
| 005 AC7–12 sync/conflict/history | `verify_cloud_e2e.js` device A/B and offline/multi-tab cases |
| 005 AC13–16 security | `supabase test db` + artifact secret scan + user A/B negative tests |

## Verification Commands

Always available:

```powershell
node scripts\verify_game_contracts.js
node scripts\verify_game_runtime.js
node scripts\verify_raster_assets.js
node scripts\verify_asset_versioning.js
node scripts\verify_save_repository.js
node scripts\build_pages_artifact.js
node scripts\verify_pages_artifact.js
git diff --check
(Select-String -Path index.html -Pattern '<script\b' -AllMatches).Matches.Count
(Select-String -Path index.html -Pattern '</script>' -AllMatches).Matches.Count
rg -n --hidden -g '!.git/**' -g '!assets/vendor/**' '(service_role|SUPABASE_SECRET_KEY|sb_secret_)' .
git status --short --branch
```

After local Supabase exists:

```powershell
supabase db reset
supabase test db
node scripts\verify_cloud_contracts.js
```

Only after test-only Playwright is approved:

```powershell
npm ci
npx playwright install chromium
node scripts\verify_cloud_e2e.js
```

GitHub Pages source changes, production Supabase writes, auth provider configuration and rollout are external mutations; they require separate BOSS authorization and are not implied by this handoff.

## Official References for Ticket 005

- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Supabase passwordless email / Magic Link](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase API keys](https://supabase.com/docs/guides/api/api-keys)
- [Supabase database testing](https://supabase.com/docs/guides/local-development/testing/overview)

## Immediate Next Action

從 W0.1 開始，只新增會先失敗的 gameplay runtime regressions；取得 RED 證據後才修改 `index.html`。Wave 0 完成並 review 綠燈後，再進 Wave 1，不要直接跳去雲端功能。
