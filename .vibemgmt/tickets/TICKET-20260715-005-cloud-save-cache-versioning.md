---
type: ticket
status: open
owner: Codex QA
created: 2026-07-15
priority: high
decision: github-worker-private-repo
takeover_plan: HANDOFF-20260715-001
architecture_decision: DECISION-20260715-001
---

# Ticket: 素材版本化與真正的跨裝置雲端存檔

> 2026-07-15 BOSS 指定「簡單帳號密碼、跨裝置同步、資料存在 GitHub」。已改採 **Cloudflare Worker + PasswordHasher Durable Object + 私有 GitHub data repo + KV session**；本票下方舊 Supabase 規劃保留作歷史背景，但已由 `DECISION-20260715-001` 取代。帳號 UI、local-first、revision conflict、private data repo、KV、secrets、Worker 部署與正式雙裝置 E2E 均已完成；本票仍 open 的剩餘範圍是素材 cache versioning。

## Context / Root Cause

目前進度不是 cookie，而是儲存在 `index.html` 的單一瀏覽器鍵值：

- `SAVE_KEY = 'xueba_pvz_save_v1'`
- `SAVE_SCHEMA_VERSION = 3`
- `loadGameSave()` / `writeGameSave()` 直接讀寫 `localStorage`
- 選單已有手動存檔碼匯出/匯入，但沒有帳號或雲端備份

圖片則使用固定 URL（例如 `assets/scenes/scene_4_2.webp`）。GitHub Pages 目前對 HTML 與圖片回傳 `Cache-Control: max-age=600`；同名圖片更新後，玩家可能短時間仍看到舊圖。玩家目前以「清除網站資料」強制刷新，結果連 `localStorage` 進度一起刪除。

這是兩個不同問題：

1. **素材快取沒有 release version**，導致更新後仍讀到同名舊圖。
2. **進度只有本機副本**，清除網站資料、換瀏覽器或換裝置後無法自動恢復。

基準 commit：`46132c1 feat: upgrade battle art and boss combat`。

## Goals

- 圖片更新後不需要清除網站資料；玩家可收到「新版本已就緒」提示並安全刷新。
- 保留離線可玩與本機快速讀寫，不讓雲端延遲阻塞遊戲。
- 登入玩家清除網站資料或換裝置後，可以重新登入恢復進度。
- 新版程式能安全遷移舊 v1/v2/v3 存檔，失敗時不覆寫原始本機或雲端資料。
- 多分頁、多裝置或離線重連時不得靜默覆蓋較新的存檔。
- 保留現有手動存檔碼作為最後一道災難復原工具。

## Non-Goals

- 本票不調整關卡、怪物、文具或數值平衡。
- 本票不做排行榜、社群、好友或多人功能。
- 本票不收集兒童姓名、生日、學校等個人資料；登入資料應以家長 Email 或既有第三方帳號為主。
- IndexedDB / `navigator.storage.persist()` 只能降低自動清理風險，不能替代雲端存檔；使用者主動清除網站資料時仍會被刪除。

## Recommended Architecture

```text
Game State
   |
   v
SaveRepository
   |-- LocalSaveStore (localStorage compatibility + IndexedDB offline queue)
   |-- CloudSaveStore (Supabase Auth + Postgres/RLS)
   `-- SaveMigrator / SaveValidator

Release Version
   |
   |-- GitHub Actions produces version.json from GITHUB_SHA
   |-- ASSETS.load() fetches version.json with cache: no-store
   `-- every raster URL becomes path?v=<commit-sha>
```

### A. Release-aware asset loading

1. 新增 GitHub Pages workflow，由部署 commit 產生：

   ```json
   { "buildId": "<full-github-sha>", "deployedAt": "<iso-time>" }
   ```

2. `ASSETS.load()` 在載入圖片前以 `cache: 'no-store'` 讀取 `version.json`。
3. 新增 `versionedAssetUrl(path, buildId)`，WebP 與 PNG fallback 都附加 `?v=<buildId>`。
4. 啟動後低頻檢查 `version.json`；build ID 改變時顯示「新版本已就緒」。
5. 玩家確認更新時導向 `/?v=<newBuildId>`，只刷新程式與素材，不清除任何 Storage。
6. 第一階段不新增 Service Worker，避免同時維護瀏覽器 HTTP cache 與自訂 cache 兩套失效規則。

### B. Local-first save repository

把目前散落的 `loadGameSave()` / `writeGameSave()` 收斂到介面：

```js
SaveRepository.load()
SaveRepository.save(payload, reason)
SaveRepository.flush()
SaveRepository.import(code)
SaveRepository.export()
SaveRepository.getSyncStatus()
```

- `LocalSaveStore` 第一版仍讀寫現有 `xueba_pvz_save_v1`，確保無破壞升級。
- IndexedDB 只存待同步操作、最後成功雲端 revision 與 migration backup。
- 關卡完成、文具升級、匯入存檔屬高價值寫入：立即本機保存並觸發雲端同步。
- 收藏等高頻低風險更新可 debounce 500-1000ms，但離頁前應 `flush()`。

### C. Cloud save provider

推薦使用 **Supabase Auth + Postgres**：靜態 GitHub Pages 可直接使用公開 client key，資料表以 Row Level Security 限制 `auth.uid() = user_id`。瀏覽器中禁止放置 secret/service-role key。

```sql
create table game_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null default 1,
  revision bigint not null default 1,
  schema_version integer not null,
  client_version text not null,
  payload jsonb not null,
  checksum text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

create table game_save_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null,
  revision bigint not null,
  schema_version integer not null,
  payload jsonb not null,
  checksum text not null,
  created_at timestamptz not null default now()
);
```

RLS policies 對 `select/insert/update/delete` 都必須限制為目前登入使用者。雲端更新使用 Postgres function + `supabase.rpc()`，以 `expected_revision` 做 compare-and-swap，避免單純 upsert 的 last-write-wins 覆蓋。

### D. Sync and conflict rules

1. **未登入**：完全使用本機存檔，顯示「僅儲存在此裝置」。
2. **第一次登入且雲端無檔**：驗證本機存檔後上傳為 revision 1。
3. **本機空、雲端有檔**：下載、migrate、validate，保留原始 cloud snapshot 後套用。
4. **兩邊都有且 revision 相符**：正常 optimistic update。
5. **兩邊都有但 revision 衝突**：禁止自動覆寫；顯示本機/雲端的更新時間、解鎖關卡、星數、文具等級與碎片，讓玩家選擇。
6. **離線寫入**：先保存本機並排入 IndexedDB；恢復連線後依原 base revision 送出。
7. **較新 schema**：舊 client 不得降級覆寫；進入 read-only 提示並要求更新遊戲。
8. 每次成功覆寫前將上一版寫入 `game_save_history`，每個 slot 保留最近 10 版。

## Schema / Migration Safety

- 不把 cloud revision、client version 等 transport metadata 混入遊戲 payload；payload 繼續用自己的 `schemaVersion`。
- 將目前單一 `migrateSave()` 拆成可測試的逐版 pure functions：`migrateV1ToV2`、`migrateV2ToV3`、未來 `migrateV3ToV4`。
- migration 前保存 raw snapshot；migration 後執行白名單、數值範圍、collection 上限、level id 與 tool level 驗證。
- migration、checksum 或 validation 任一失敗時：不寫回本機 canonical save、不更新雲端 revision，並提供恢復上一版或匯出損壞資料的入口。
- checksum 用於損壞偵測，不視為安全簽章；權限安全由 Auth + RLS 提供。

## UI / UX

- 主選單增加雲端狀態：`僅本機保存`、`同步中`、`已同步`、`離線，等待同步`、`存檔衝突，需要選擇`。
- 登入建議以「家長 Email Magic Link」為預設；Google 登入可作第二選項。
- 清除網站資料後會失去本機 auth session，但玩家重新登入後必須能恢復雲端存檔。
- 保留「匯出存檔 / 匯入存檔」，並新增「立即同步」與「雲端版本紀錄」。
- 更新提示不得在戰鬥中強制 reload；只在安全畫面讓玩家確認更新。

## Delivery Plan

### Phase 0 - Asset cache versioning

- 新增 Pages deployment workflow 與 `version.json`。
- 為所有 runtime/fallback 圖片 URL 接入 build ID。
- 新增版本偵測與安全 reload 提示。
- 擴充 verifier：禁止未經 `versionedAssetUrl()` 的 raster runtime 載入。

### Phase 1 - SaveRepository abstraction

- 先寫 contract tests，再將現有 localStorage 實作包進 `LocalSaveStore`。
- 所有遊戲保存入口改走 repository，保持 schema v3 行為與匯入/匯出相容。
- 加入 raw backup、validator 與逐版 migration fixtures。

### Phase 2 - Supabase foundation

- 建立 migration SQL、RLS policies、revision RPC 與最近 10 版 history 清理。
- 接入 Auth 與 session lifecycle。
- 新增 `CloudSaveStore`，禁止 client secret。

### Phase 3 - Offline sync and conflict UI

- IndexedDB pending queue、重試/退避、離線狀態。
- 首次登入導入、跨裝置下載、revision conflict UI。
- 新版本 schema 阻擋舊 client 覆寫。

### Phase 4 - QA and staged rollout

- 先對測試帳號開啟 cloud save feature flag。
- 驗證 migration、兩分頁、兩裝置、離線、錯誤資料與回復歷史。
- 通過後才對全部玩家顯示登入與雲端同步。

## Acceptance Criteria

### Asset update

- 同名 WebP/PNG 更新並部署後，不清除網站資料即可載入新圖。
- 舊分頁能偵測不同 build ID，提示更新後取得新 `index.html` 與 raster 資產。
- 更新流程不呼叫 `localStorage.clear()`、`indexedDB.deleteDatabase()` 或清除 Auth/Save keys。
- WebP 失敗後的 PNG fallback 使用同一 build ID。

### Save durability

- 現有 v1/v2/v3 本機存檔升級後，關卡、星數、貼紙、徽章、碎片與 7 種文具等級完全保留。
- 未登入玩家仍可離線遊玩與手動匯出。
- 登入玩家在另一裝置登入後可恢復同一存檔。
- 清除網站資料後重新登入，雲端進度可完整恢復。
- 離線完成關卡後重新上線能同步，不能遺失新進度。
- 兩裝置同時修改時產生可見衝突，不靜默 last-write-wins。
- 任一 migration/validation/cloud write 失敗都不覆寫最後正常版本。
- 玩家可從最近 10 個雲端 snapshot 恢復。

### Security

- `game_saves` / `game_save_history` 全面啟用 RLS。
- 玩家不能讀寫其他 user id 的存檔；需有自動化負向測試。
- repository 與 GitHub Pages 產物中不得出現 Supabase secret/service-role key。
- payload 大小、collection 數量、數值範圍與 schema version 都有 server/client validation。

## Required Tests

- Unit：v1/v2/v3 migration、損壞 JSON、未知欄位、數值 clamp、checksum。
- Contract：Local/Cloud repository 共用測試、revision compare-and-swap、RLS deny-other-user。
- Integration：首次登入、雲端覆原、離線 queue、衝突選擇、history restore。
- Browser：圖片同名更新但 build ID 改變、WebP fallback、更新提示不清存檔。
- E2E：裝置 A 完成關卡 -> 裝置 B 登入恢復；清網站資料 -> 重新登入恢復。
- Regression：現有 `node scripts/verify_game_contracts.js` 與 `git diff --check` 持續通過。

## Decisions Needed Before Phase 2

1. 登入方式：A. **家長 Email Magic Link（推薦）**；B. Google 登入；C. 無帳號恢復碼（需另做 client-side encryption 與恢復密鑰流程）。
2. 第一版是否只提供單一 slot（推薦），之後再擴充多存檔。
3. Supabase project 的建立者、region、正式 URL 與 allowed redirect URLs。

## Handoff

另一台機器接手時：

1. `git pull --ff-only origin main`
2. 閱讀本票與 `.vibemgmt/MEMORY.md`
3. 確認基準 `git log -1 --oneline`
4. Phase 0 先寫 RED contract tests，再改 asset loader；不要一開始同時引入 Service Worker
5. Phase 1 必須先保持 schema v3 round trip，再導入 cloud provider
6. 未取得上方 Auth 決策與 Supabase project 設定前，Phase 2 不可開始，更不可把 secret key 寫進前端

## References

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase JSONB: https://supabase.com/docs/guides/database/json
- Supabase transaction guidance: https://supabase.com/docs/reference/javascript/using-modifiers-rollback
- MDN Storage clear: https://developer.mozilla.org/en-US/docs/Web/API/Storage/clear
- MDN StorageManager.persist: https://developer.mozilla.org/docs/Web/API/StorageManager/persist
