---
review_type: UX
date: 2026-07-23
reviewer: Codex UI/UX Reviewer
status: FAIL
head: 67be5b0e454523742f43040f72f70f330aecd76e
work_item_ids:
  - TICKET-20260715-001
  - TICKET-20260715-002
  - TICKET-20260715-004
  - TICKET-20260723-002
---

# Phase 4.7 UX Closeout — Current Head

## Findings

### UX-20260723-001 — Severe — 窄螢幕更新提示遮蔽底層可操作控制

- Ticket: `TICKET-20260723-002`
- Source: `index.html:6316`、`index.html:6319`、`index.html:6321`、`index.html:6363`、`index.html:6371`、`index.html:6379`、`index.html:6387`、`index.html:6395`
- 現象：更新提示以 `position:absolute`、底部固定、`zIndex:120`、`pointerEvents:auto` 疊在各 safe-phase UI 上，但底層捲動容器沒有保留等高空間。
- 844×390 browser probe：
  - 提示框為 `x=162, y=306, w=520, h=68`。
  - 捲動頂端遮住「小學部」卡片 `26,398 px²`；中段遮住「大學部」卡片 `22,805 px²`。
  - 捲動底端遮住音效、朗讀、匯出、匯入及全螢幕按鈕，各 `2,481–7,714 px²`。
- 390×844 browser probe：
  - 提示框為 `x=12, y=711, w=366, h=117`。
  - 捲動頂端遮住「研究所」卡片 `35,722 px²`；底端仍遮住音效、朗讀與存檔控制。
- 影響：提示存在時，玩家無法可靠閱讀或點擊被覆蓋的 safe-phase 控制；這直接違反票面「update prompt layout / no overlap」要求。
- 建議：由 Root 建立一張 linked FIX，讓提示進入版面流或為每個 safe-phase 捲動容器保留提示實際高度加 safe-area 的底部空間；以 844×390、390×844 的 top/middle/bottom 捲動位置驗證互動元素交集為 `0 px²`。

### UX-20260723-002 — Moderate — 「立即更新」CTA 未達 WCAG 2.1 AA 對比

- Ticket: `TICKET-20260723-002`
- Source: `index.html:6345`
- 現象：13.33px 白字 `#ffffff` 配橘底 `#f59e0b`，計算對比約 `2.15:1`。
- 標準：一般文字需至少 `4.5:1`。
- 影響：低視力或高環境光下，主要更新動作不易辨識。
- 建議：由 Root 建立 linked FIX，改用可達 `4.5:1` 的深色按鈕底色（例如深琥珀色系）或改用足夠對比的深色文字，並加入可重跑的 contrast assertion。

## Verdict

**FAIL**

- 未解決 Severe finding：`UX-20260723-001`。
- Nielsen 平均：`3.2 / 5`，低於 Phase 4.7 門檻 `3.5`。
- 更新 CTA 對比 `2.15:1`，低於 WCAG 2.1 AA `4.5:1`。
- 下一位 owner：`BOSS / Root → dev-agent`。UX Reviewer 不建立或轉移 work item。

## Review Scope and Evidence

- 唯一 allowlist：`TICKET-20260715-001`、`TICKET-20260715-002`、`TICKET-20260715-004`、`TICKET-20260723-002`。
- 專案沒有 `POD-X.md`；本輪採 BOSS 明示的四票範圍。
- 已讀：root `MEMORY.md` pointer、canonical `.vibemgmt/MEMORY.md`、四張 exact ticket、current dirty diff。
- Current HEAD：`67be5b0e454523742f43040f72f70f330aecd76e`（`fix: prevent boss hazard battle freeze`）。
- Browser：本機 Chrome headless，HTTP current worktree；console `0` errors、page error `0`。
- 實際 viewport：
  - 1920×1080：主選單、更新提示、ARIA、鍵盤焦點。
  - 844×390：主選單捲動、更新提示 top/middle/bottom overlap。
  - 390×844：主選單捲動、更新提示 top/middle/bottom overlap。
- 截圖曾擷取並目視：`recon-desktop`、`recon-landscape`、`update-desktop`、`update-landscape`、`update-portrait`。依本次「repo 僅可寫 review report」與 temp hygiene 限制，截圖只作暫存證據，不納入 repo。

## Nielsen 10 Heuristics

| Heuristic | Score | Evidence |
|---|---:|---|
| H1 系統狀態可見性 | 4 | 更新狀態與兩個動作清楚；safe phase 才顯示。 |
| H2 系統與現實世界匹配 | 4 | 「稍後／立即更新」語意直接。 |
| H3 使用者控制與自由 | 3 | 可稍後或確認；Escape 不會關閉非模態 dialog。 |
| H4 一致性與標準 | 4 | 沿用既有按鈕與卡片語言。 |
| H5 錯誤預防 | 2 | 提示會遮蔽底層控制，造成誤觸與不可操作區。 |
| H6 識別而非回憶 | 4 | 更新影響與保留進度文字直接可見。 |
| H7 彈性與效率 | 3 | 更新只需一步，但窄螢幕遮蔽會打斷其他 safe-phase 工作。 |
| H8 美學與極簡 | 2 | 桌面簡潔；窄螢幕形成大面積視覺與操作阻擋。 |
| H9 錯誤辨識與恢復 | 3 | 可選稍後；未提供額外錯誤狀態，但網路失敗採 fail-soft。 |
| H10 幫助與文件 | 3 | 有「不會清除進度或帳號」說明；本輪未驗證更多輔助說明。 |
| **平均** | **3.2** | **未達 3.5 gate** |

## Visual Consistency

- 字體：更新提示沿用 app 預設字體與粗體層級，資訊層級清楚。
- 色彩：白色資訊卡與琥珀邊框符合既有亮色 CTA 語言；主要 CTA 對比不合格。
- 間距：桌面 520px 版面緊湊；390px 時按鈕換行合理，但提示高度增加後未同步保留底層空間。
- Iconography：更新提示沒有額外圖示，不造成圖示風格漂移。

## WCAG 2.1 AA / Keyboard / ARIA

| Check | Result | Evidence |
|---|---|---|
| 一般文字對比 ≥ 4.5:1 | **FAIL** | 「立即更新」約 `2.15:1`。 |
| 鍵盤到達 | PASS（提示範圍） | Tab 可由「稍後」移至「立即更新」。 |
| Focus 樣式 | PASS（最低限度） | Chrome 原生 `auto 1px` outline 可見。 |
| ARIA | PASS（提示範圍） | `role="dialog"`、`aria-modal="false"`、`aria-label="遊戲更新提示"`，見 `index.html:6323-6325`。 |
| Safe phase | PASS | `td` probe 的 dialog count 為 `0`；gate 見 `index.html:6317`。 |
| No overlap | **FAIL** | 見 `UX-20260723-001`。 |
| Canvas alt / 完整遊戲鍵盤流程 | NOT CERTIFIED | BOSS 指示立即停止；本輪未完成戰鬥 Canvas 的 current-head browser accessibility pass。 |

## Round 2 — Interaction/Data Flow Trace

- 更新流程已追蹤：
  - `fetchVersionManifest(..., {cache:'no-store'})` → `createReleaseMonitor()` → `onUpdateAvailable` → `ui.update({updateBuildId})`
  - `renderUpdatePrompt()` → `onDismissUpdate` 或 `onConfirmUpdate`
  - confirm → `releaseMonitor.confirmUpdate()` → safe-phase recheck → `window.location.reload()`
  - Runtime wiring：`index.html:6622-6631`。
- safe/unsafe phase browser probe：`menu` 顯示；`td` 不顯示。
- 鍵盤 probe：兩個 action button 可依序 Tab 到達；Escape 保留 dialog，玩家仍可用「稍後」關閉。

## Ticket-specific Current-Head Coverage

### TICKET-20260715-001 — VFX readability / non-obstruction

- Source/data-flow 已讀：`VFX_MANIFEST`（`index.html:541`）、`spawnVfxPhase()`（`index.html:3364`）、`drawRasterFx()`（`index.html:3394`）。
- BOSS 指示立即停止前，未完成 current-head 戰鬥密集 VFX browser screenshot；本輪不宣告視覺通過。

### TICKET-20260715-002 — Scene contrast / orientation / cache

- Source/data-flow 已讀：`SCENE_MANIFEST`（`index.html:569`）、`MINIGAME_SCENE_MANIFEST`（`index.html:577`）、`resolveSceneVariant()`（`index.html:585`）、stage cache level/DPR key（`index.html:4423-4504`）。
- 1920×1080、844×390、390×844 的 current-head 戰鬥/小遊戲 scene browser matrix 未完成；本輪不宣告視覺通過。

### TICKET-20260715-004 — Boss telegraph / execute / recovery / vulnerability

- Source/data-flow 已讀：`BOSS_MECHANICS`（`index.html:462`）、telegraph scheduler（`index.html:3183`）、execute/recovery/vulnerability（`index.html:3191-3244`）、draw labels（`index.html:4631-4649`）。
- current-head 2-3／4-1／4-2 的四階段 browser screenshot 未完成；本輪不宣告可讀性通過。

### TICKET-20260723-002 — Update prompt / release safety

- Browser 覆蓋完成：layout、safe phase、keyboard、ARIA、contrast、三種 viewport。
- 結果：一個 Severe、一个 Moderate finding。

## Residual Physical-device Risks

- iOS Safari 的 visual viewport、browser chrome、safe-area inset 可能讓提示遮蔽範圍比 headless Chrome 更大。
- 844×390 的實機觸控命中區、縮放字體與動態工具列尚未驗證。
- 390×844 章間小遊戲的 portrait scene、VFX 瞄準區與 HUD 疊層尚未在本輪 current-head browser/真機驗證。
- 高 DPR／高密度 VFX 的實機可讀性、掉幀與觸控不攔截仍需實機確認。
- Boss telegraph、execute、recovery、vulnerability 的實際節奏辨識與設施受擊來源仍需完整 2-3／4-1／4-2 真機戰鬥驗證。

## Required Follow-up

1. Root 為 `UX-20260723-001`、`UX-20260723-002` 建立 linked FIX 或取得 BOSS 明示 disposition。
2. Dev 修復後，以同一 current-head 重跑 844×390、390×844 update prompt overlap 與 contrast。
3. 重新派發 Phase 4.7 UX，補完 VFX、scene、Boss 的 current-head browser screenshots 與實機殘餘風險。
