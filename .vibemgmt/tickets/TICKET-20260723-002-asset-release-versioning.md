---
type: ticket
status: done
owner: DEV
created: 2026-07-23
priority: high
split_from: TICKET-20260715-005
architecture_decision: DECISION-20260715-001
resolution: completed
closed: 2026-07-24
---

# Ticket: 素材發行版本化與安全更新提示

## Context

跨裝置帳號與雲端存檔已依 `DECISION-20260715-001` 正式部署，但圖片仍使用
固定 URL。部署同名 WebP/PNG 後，瀏覽器或 CDN 可能繼續使用舊快取，玩家必須
清除網站資料才看得到新素材，並可能連帶失去本機 session 或未同步進度。

## Scope

- 建立可由部署流程更新的 build ID／`version.json`。
- build ID 來源必須是 immutable deployment commit SHA，或具同等不可變性的
  發行識別；`version.json` 必須使用 `cache: 'no-store'` 取得。
- 所有 runtime WebP 與 PNG fallback URL 使用同一 build ID。
- 舊分頁低頻檢查新版本，提供明確更新提示與安全 reload。
- 戰鬥、迷宮、答題與章間小遊戲期間不得顯示更新提示或 reload；只在主選單、
  世界地圖、備戰、收藏館或工坊等安全 phase 提示。
- reload 必須保留 GitHub Pages `/xueba-pvz/` base path，不得導向網域根目錄。
- 更新流程不得呼叫 `localStorage.clear()`、`sessionStorage.clear()`、
  `indexedDB.deleteDatabase()`，也不得刪除任何 save/auth key。
- GitHub Pages artifact 採公開 allowlist，只發布遊戲 runtime、必要設定與素材；
  不發布 `.vibemgmt/`、測試、scripts source、local config 或其他內部文件。
- 保留 GitHub Pages 靜態部署與單檔遊戲架構，不引入 Service Worker。

## Acceptance Criteria

- 同名 WebP/PNG 更新並部署後，不清除網站資料即可取得新素材。
- `version.json` 以 `cache: 'no-store'` 取得，內容可追溯至 immutable deployment
  SHA；舊分頁偵測 build ID 改變後只在安全 phase 顯示更新提示。
- 玩家確認更新才 reload，且 reload 保留目前 GitHub Pages base path。
- WebP 失敗後的 PNG fallback 保留相同 build ID。
- 首次載入與版本檢查失敗時 fail-soft，不阻塞離線遊玩。
- 更新前後 `xueba_pvz_save_v1`、設定與帳號 session 均保持不變。
- repo 與 GitHub Pages 產物不含任何 Worker/GitHub secret。
- Pages artifact 不包含 `.vibemgmt/`、tests、scripts source 或 local-only config。

## Verification

- Contract：build ID 套用至 runtime 與 fallback URL。
- Contract：`version.json` no-store fetch、安全 phase gate、immutable build
  provenance、Pages base path 與 artifact allowlist。
- Browser：模擬舊／新 build ID，驗證安全 phase 提示、延後提示、確認 reload
  與網路失敗路徑。
- Regression：圖片 fallback、存檔 migration、帳號 client 與遊戲合約持續通過。
- `git diff --check`

## Phase 4.7 Follow-up

- `QA-20260723-003` found that dismissing an update permanently suppresses the same build.
- `UX-20260723-001` and `UX-20260723-002` found narrow-screen overlap and insufficient CTA contrast.
- Linked fix: `FIX-20260723-005-release-update-reminder-layout`.

## Implementation

- 新增 deployment build token、`version.json` 與 release monitor；版本檢查使用 `cache: 'no-store'`，五個安全 phase 才顯示更新提示，玩家確認後才以 `window.location.reload()` 更新。
- raster asset loader 對 WebP 與 PNG fallback 套用同一 build query；本機使用 `development`，Pages artifact 在部署時以 immutable `github.sha` 取代。
- 新增 GitHub Pages custom workflow，公開 artifact allowlist 僅含 `index.html`、`assets/**`、`account-service.json` 與部署時生成的 `version.json`，不含管理、測試、Worker 或本機設定。
- 未加入 Service Worker，未修改或清除 save、settings、account session、sessionStorage 或 IndexedDB。

## Implementation Verification

- `node scripts/verify_release_contracts.js`：SHA provenance、artifact allowlist、same-build fallback、no-store、safe/unsafe phase、延後提示、確認 reload、network fail-soft 與 storage preservation 全部通過。
- GitHub 官方 current custom Pages workflow 對照：`actions/checkout@v6`、`actions/configure-pages@v5`、`actions/upload-pages-artifact@v4`、`actions/deploy-pages@v4`。
- 2026-07-23 fresh verification：release/game/mobile/account contracts、120,000 frame long-battle soak、release scope secret scan 與 `git diff --check` 全部通過。

## Closeout

- `FIX-20260723-005` closes the snooze/rearm, modal layout, contrast, keyboard focus ownership, Escape, and focus-restore regressions.
- `node scripts/verify_release_contracts.js` and `python scripts/verify_update_modal_a11y.py` pass; the browser regression proves the canvas remains inert until the dialog closes.
- Final review: `.vibemgmt/reviews/QA_2026-07-24_closeout-final.md` and `.vibemgmt/reviews/UX_2026-07-24_closeout-final.md` are PASS.
