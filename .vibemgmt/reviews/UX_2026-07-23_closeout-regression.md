---
review_type: UX
phase: "4.7 closeout regression"
reviewed_at: 2026-07-24
reviewer: Codex UI/UX Reviewer
status: FAIL
head: 67be5b0e454523742f43040f72f70f330aecd76e
worktree_index_sha256: 80D17D6451573DCC5770C090ADA630119815021835877073E091368A37E3A56E
work_item_ids:
  - TICKET-20260715-001
  - TICKET-20260715-002
  - TICKET-20260715-004
  - TICKET-20260723-002
linked_fix:
  - FIX-20260723-005
finding_ids:
  - UX-20260724-001
  - UX-20260724-002
  - UX-20260724-003
---

# Phase 4.7 UI/UX Closeout Regression

## Verdict

**FAIL**

- `FIX-20260723-005` 修正了舊更新提示的視覺重疊與 CTA 對比，但新增的
  `aria-modal="true"` dialog 沒有真正的鍵盤模態行為；`UX-20260724-001`
  為未解決 **Severe / P1** gate finding。
- Boss 三套階段圖已載入且彼此不同，但實際 renderer 不讀取
  `spriteAssetId`；`TICKET-20260715-004` 的階段外觀驗收條件未成立。
- Nielsen 平均 `3.2 / 5`，低於 Phase 4.7 門檻 `3.5`。
- CTA 對比已達 `7.307:1`；本輪沒有 P0，但 Severe finding 仍阻擋 closeout。
- 本報告是 UX evidence，不具 PM 核准或 work-item 狀態變更權。

## Scope and Current-worktree Identity

- Scope：
  - `TICKET-20260715-001`
  - `TICKET-20260715-002`
  - `TICKET-20260715-004`
  - `TICKET-20260723-002`
  - linked `FIX-20260723-005-release-update-reminder-layout`
- 專案 `.vibemgmt/pods/` 沒有 `POD-X.md`，只有 `PM_SOP.md`；因此本輪
  allowlist 以 BOSS 明示的四張 ticket 與一張 FIX 為準。
- Current HEAD：`67be5b0e454523742f43040f72f70f330aecd76e`。
- 受測 `index.html` worktree SHA-256：
  `80D17D6451573DCC5770C090ADA630119815021835877073E091368A37E3A56E`。
- 只測目前 dirty worktree；未 checkout、未 revert、未修改 implementation、
  tickets、FIX、MEMORY、assets 或既有報告。

## Prior Finding Re-test

### UX-20260723-001 — original visual/pointer overlap: RESOLVED

更新提示已改成全 viewport dimmed modal layer，不再表現成「仍可操作底層」的
底部浮條。

| Viewport | Panel rect | Clipping / internal overlap | Pointer hit |
|---|---|---|---|
| 844×390 | `x=146, y=161, w=552, h=68` | panel 完整在 viewport；兩 CTA 交集 `0 px²`；無內部 scroll overflow | 兩 CTA 中心 hit-test 均命中自身 |
| 390×844 | `x=16, y=363.5, w=358, h=117` | panel 完整在 viewport；兩 CTA 交集 `0 px²`；無內部 scroll overflow | 兩 CTA 中心 hit-test 均命中自身 |

此 disposition 只代表原本「視覺／pointer 歧義重疊」已排除；鍵盤背景仍可操作，
另記為 successor finding `UX-20260724-001`。

### UX-20260723-002 — CTA contrast: RESOLVED

- 「立即更新」computed style：白字 `rgb(255,255,255)` /
  深琥珀底 `rgb(154,52,18)`。
- 實算對比：`7.307:1`，高於一般文字 `4.5:1`。
- 844×390 與 390×844 均相同。

## Findings

### UX-20260724-001 — Severe / P1 — modal 宣告與鍵盤行為不一致

- Linked：`TICKET-20260723-002`、`FIX-20260723-005`。
- Source：
  - `index.html:6408-6444` 建立 dialog 與兩個 CTA。
  - `index.html:6416` 宣告 `aria-modal="true"`。
  - `index.html:6723-6727` 接到 release monitor confirm/dismiss。
- 兩種 viewport 都可重現：
  - dialog 出現後 `document.activeElement` 仍是 `BODY`。
  - 從頁面起點按第一次 Tab，焦點到 dialog 外的 `CANVAS`。
  - 從「稍後」開始的序列為：
    `稍後（inside） → 立即更新（inside） → BODY（outside）`，沒有 focus trap。
  - dialog 外仍有 `14` 個可聚焦元素；背景 `inert` 元素數為 `0`。
  - 將焦點移到背景「收藏館」後按 Enter，phase 可由 `menu` 變為
    `collection`，而更新 dialog 仍可見。
  - Escape 不關閉或 dismiss dialog。
- 影響：
  - 螢幕閱讀器會被告知這是 modal，但鍵盤實際可離開並啟動背景功能。
  - 鍵盤使用者必須先穿越背景 Canvas／控制才到更新動作，且可能在遮罩下改變
    app 狀態；這違反 modal 的可預期控制與 WCAG 2.1 AA keyboard/focus 要求。
- 建議：
  - dialog render 後把焦點移到安全預設動作（建議「稍後」）或可聚焦標題。
  - 對背景設 `inert`（並提供相容 fallback），Tab / Shift+Tab 必須循環在兩個
    dialog action 內。
  - Escape 應等同「稍後」，dismiss 後恢復到 opener；重新提示時重建同一焦點
    契約。
  - 新增 844×390、390×844 executable regression：初始焦點、Tab wrap、
    Shift+Tab wrap、背景 Enter 不生效、dismiss 後焦點恢復。

### UX-20260724-002 — Moderate / P1 — Boss 階段 sprite 資料流中斷

- Linked：`TICKET-20260715-004`。
- Source：
  - `index.html:3194` 在 phase transition 寫入
    `enemy.spriteAssetId = enemy_super_boss_phaseN`。
  - `index.html:4353-4355` 的 `drawEnemy()` 固定讀
    `'enemy_' + o.id`，沒有讀取 `o.spriteAssetId`。
- Browser pixel probe：
  - phase 1/2/3 assets 全數成功載入。
  - phase 1 與 phase 3 原圖確實不同：
    `86,536` 個 RGBA channel 改變，absolute delta `7,588,548`。
  - 用相同 Boss state、只切換 `spriteAssetId` 經 `drawEnemy()` 繪製，
    畫面差異為 `0` changed channels / `0` delta。
- 影響：
  - 玩家看不到 ticket 承諾的「護盾完整 → 裝甲裂紋 → 核心外露」階段外觀。
  - 數值 phase 與畫面 phase 不一致，削弱辨識而非回憶及 Boss 狀態可見性。
- 建議：
  - renderer 應優先使用有效的 phase-specific asset，缺圖才回 base asset；
    同步檢查 expected-asset placeholder / fallback。
  - 增加 browser pixel regression：同一 Boss 的 phase 1 與 phase 3 戰場
    boss-region 必須產生非零 pixel diff，並確認 WebP failure 使用同 phase PNG。

### UX-20260724-003 — Minor / P2 — vulnerability cue 缺少持續的剩餘時間狀態

- Linked：`TICKET-20260715-004`。
- telegraph、execute、recovery 在 current-head browser 畫面都有不同 ring 色、
  狀態文字與秒數；起始 vulnerability 畫面也可讀到「破綻！」。
- 但 source `index.html:3251-3252` 只建立會向上漂移的單一 `floatText`；
  `vulnerabilityTimer` 沒有 boss-linked ring、HUD badge 或 countdown renderer。
- 最終 phase 可有 `180` frames vulnerability；文字與 Boss 分離後，玩家無法可靠
  判斷反擊窗口還剩多久，且高密度 VFX 時更容易遺失。
- 建議：在完整 vulnerability duration 顯示固定於 Boss 的圖形／圖示與倒數，
  不只依賴黃色或單次浮字；結束時要有明確收束。

## Browser and Visual Evidence

### Operated user flow

- 844×390：實際點擊
  `主選單 → 小學部 → 第一個可玩關卡 → 開始上課`。
- 觀察到 phase：`menu → world → prep → td`。
- 瀏覽器 page errors `0`、console errors `0`。

### TICKET-20260715-001 — raster VFX

- 七個 family 均有非透明像素：
  - corrosion `10,446`
  - impact `13,984`
  - paper `12,082`
  - doodle `12,646`
  - soundwave `8,867`
  - sunshine `8,515`
  - crystal `11,862`
- telegraph / cast / travel / impact 的 browser-drawn alpha signature 皆非空且互異：
  - telegraph `(alphaCount=3,831, alphaSum=316,963)`
  - cast `(4,885, 900,103)`
  - travel `(3,487, 455,194)`
  - impact `(8,571, 1,514,770)`
- 844×390 在 4-2 場景同時放置四階段 current-worktree raster VFX：
  中央操作區與格線仍可辨識，effect layer 不攔截 input。
- 結果：本輪 browser visual **PASS**；高 DPR／實機密集掉幀仍列 residual risk。

### TICKET-20260715-002 — level/minigame scenes

- 844×390 代表場景：
  - 1-1 教室
  - 2-1 操場
  - 3-1 圖書館
  - 4-2 紫晶終局考場
- 四張場景均載入 landscape raster，中央格線及 HUD 可讀；相鄰代表場景的
  changed-pixel ratio（threshold 20）為：
  - 1-1 vs 2-1：`0.81690`
  - 2-1 vs 3-1：`0.77941`
  - 3-1 vs 4-2：`0.79422`
- 390×844 的 4-2 TD 正確顯示「請橫放手機」gate。
- 粉筆快射 minigame：
  - 844×390 載入獨立 landscape asset。
  - 390×844 載入獨立 portrait asset。
  - 兩種方向都實際 pointer 點擊目標：`shots 0→1`、shield HP `2→1`，
    cast/travel/impact VFX 分別攜帶正確 landscape/portrait orientation。
- 結果：代表性 browser matrix **PASS**；未逐張目視 14/14 level。

### TICKET-20260715-004 — Boss lifecycle readability

- 844×390 deterministic in-browser state capture：
  - telegraph：黃 ring + `BOSS 預警` + countdown + raster cue。
  - execute：黃 ring + `BOSS 進攻` + countdown + cast/travel VFX。
  - recovery：灰 ring + `BOSS 恢復` + countdown。
  - vulnerability onset：`破綻!` 可見。
- telegraph / execute / recovery onset 的視覺語言清楚且沒有 ambiguous overlap。
- phase sprite 失效（`UX-20260724-002`）與 vulnerability 持續狀態不足
  （`UX-20260724-003`）使本 ticket **FAIL**。

### TICKET-20260723-002 / FIX-20260723-005 — update prompt

- 視覺 layout、CTA hit target、CTA contrast：**PASS**。
- ARIA role/name 存在：`role=dialog`、`aria-modal=true`、
  `aria-label=遊戲更新提示`。
- 真正 modal keyboard behavior：**FAIL**（`UX-20260724-001`）。

### Screenshot handling

曾在 `%TEMP%\xueba-ux-review-20260724\` 擷取並目視：

- prompt 844×390 / 390×844（含 CTA focus）
- 四張 landscape level scenes
- landscape / portrait minigame
- 四階段 raster VFX
- Boss telegraph / execute / recovery / vulnerability
- portrait TD orientation gate

依 BOSS 指示，截圖與 probe scripts 僅作暫存證據，報告完成後刪除，不寫入 repo。

## Nielsen 10 Heuristics

| Heuristic | Score | Evidence |
|---|---:|---|
| H1 系統狀態可見性 | 4 | 更新、安全 phase 與 Boss 三個 action state 清楚；phase sprite/vulnerability duration 仍不足。 |
| H2 系統與現實世界匹配 | 4 | 場景主題、更新文案與 Boss「預警／進攻／恢復／破綻」語意直觀。 |
| H3 使用者控制與自由 | 2 | modal 無初始焦點、無 focus trap、Escape 無 dismiss、背景仍可鍵盤啟動。 |
| H4 一致性與標準 | 3 | 視覺系統一致；`aria-modal=true` 與實際互動不一致，phase asset 也與資料狀態不一致。 |
| H5 錯誤預防 | 2 | 遮罩下仍可 Enter 啟動背景功能，可能在看不見背景狀態時改變 phase。 |
| H6 識別而非回憶 | 3 | action ring/文字良好；Boss 階段外觀未切換，破綻沒有持續倒數。 |
| H7 彈性與效率 | 3 | pointer 流程短；鍵盤需穿越 dialog 外控制且無循環。 |
| H8 美學與極簡 | 4 | modal、代表場景、橫直式小遊戲與 raster VFX 視覺完成度高。 |
| H9 錯誤辨識與恢復 | 4 | 「稍後／立即更新」明確；dismiss 已具 snooze/rearm data flow。 |
| H10 幫助與文件 | 3 | 有更新保留進度說明、方向 gate 與 Boss live announcement；完整鍵盤玩法說明未驗證。 |
| **平均** | **3.2** | **低於 3.5 gate** |

## Visual Consistency

- 字體：prompt、HUD、狀態標籤維持既有粗體層級；無新的 font drift。
- 色彩：深琥珀 CTA 與白字對比合格；Boss action ring 以黃／灰加文字區分，
  不只依賴顏色。
- 間距：兩個指定 viewport 的 prompt 均無 clipping、button overlap 或 overflow。
- Iconography：場景、文具、方向 gate 與 minigame icon style 一致。
- Raster themes：教室／操場／圖書館／紫晶考場差異明顯，中央操作區大致低雜訊；
  4-2 的紫晶 VFX 與紫晶背景在高環境光下仍有實機對比風險。

## WCAG 2.1 AA / Keyboard / Semantics

| Check | Result | Evidence |
|---|---|---|
| CTA 一般文字對比 ≥ 4.5:1 | PASS | `7.307:1`。 |
| Dialog accessible name | PASS | `role=dialog` + `aria-label=遊戲更新提示`。 |
| Modal semantics / name-role-value | **FAIL** | `aria-modal=true`，但 focus 可離開、背景可 Enter 啟動。 |
| Keyboard navigation | **FAIL** | 初始 focus 在 BODY；首次 Tab 到背景 Canvas；無 Tab/Shift+Tab containment。 |
| Focus visible | PASS（最低限度） | CTA 有 Chrome `1px auto` outline。 |
| Pointer hit / ambiguous overlap | PASS | CTA hit-test 命中自身；panel 內無交集或 clipping；背景以 dimmed modal 明確停用 pointer。 |
| Canvas alternative | PARTIAL | Canvas 有 `role=application` 與 accessible label，Boss 重要狀態有 assertive live region；完整遊戲鍵盤等價操作未證明。 |
| Raster image alt | N/A / PARTIAL | 本輪 level、minigame、VFX 為 Canvas-drawn raster，沒有獨立 DOM `<img>`；其玩法狀態需靠 Canvas label/live region 補足。 |

因 keyboard/modal semantics 失敗，本輪不能宣告 WCAG 2.1 AA 合規。

## Round 2 — Interaction/Data-flow Trace

### Update prompt

- Version fetch：
  `fetchVersionManifest(cache:no-store) → createReleaseMonitor.check()`
  → safe-phase `onUpdateAvailable` → `ui.update({updateBuildId})`
  → `renderUpdatePrompt()`。
- 「稍後」：
  button → `ui.onDismissUpdate`
  → `releaseMonitor.dismissUpdate()`
  → 清除 UI build id；monitor 清空 prompted id 並 snooze 一個 polling interval。
- 「立即更新」：
  button → `ui.onConfirmUpdate`
  → `releaseMonitor.confirmUpdate()`
  → 再檢查 safe phase / duplicate reload guard
  → `window.location.reload()`。
- 資料流具功能，但 presentation layer 沒有建立／釋放 modal focus ownership。

### Minigame pointer

- Browser pointer：
  Canvas pointerdown → `handleInput('start')`
  → `GameEngine.handleMinigameInput`
  → `shots +1`、target HP `-1`
  → cast/travel/impact raster VFX。
- Landscape / portrait 的 effect orientation 皆與 viewport 相符。

### Boss phase asset

- `transitionBossPhase()` 寫入 `enemy.spriteAssetId`
  → `draw()` 遇到 enemy
  → `drawEnemy()`
  → 固定 `ASSETS.get('enemy_' + o.id)`。
- `spriteAssetId` 在 renderer 被中斷，造成「系統實際做的」與 ticket/玩家預期不一致。

## Fresh Verification

| Command | Result |
|---|---|
| `node scripts/verify_release_contracts.js` | PASS — `Release contracts verified.` |
| `node scripts/verify_mobile_interactions.js` | PASS — `Mobile interaction regressions verified.` |
| `node scripts/verify_game_contracts.js` | PASS — `Game contracts verified.` |
| `git diff --check -- index.html scripts/verify_release_contracts.js scripts/verify_mobile_interactions.js scripts/verify_game_contracts.js` | PASS — exit 0、無輸出 |

Contract tests green 不覆蓋本輪 browser modal semantics 與 Boss renderer data-flow findings。

## Evidence Gaps

- 未在自然波次中完整遊玩 2-3、4-1、4-2 到每個 Boss lifecycle；Boss evidence
  以 current-worktree browser 內 deterministic state 觸發，適合讀性比對，但不等同完整
  battle cadence／負載驗證。
- 只目視 1-1、2-1、3-1、4-2 四張代表 level scene；14/14 manifest 與 loader
  由 current contract verifier 覆蓋，但其餘 10 張未逐張人工目視。
- 本輪 Chromium DPR=`1`；未取得 DPR 2–3 畫面、GPU frame-time 或實機掉幀數據。
- 未以 WebKit / iOS Safari 驗證 safe-area、dynamic browser chrome、VoiceOver。
- Canvas 全遊戲鍵盤等價操作不在本輪修復範圍，仍未取得完整 WCAG certification。

## Residual Physical-device Risks

- iOS Safari visual viewport、瀏海 safe-area、動態工具列可能改變 390×844 modal
  垂直空間與焦點捲動。
- 844×390 實機放大字體／OS font scaling 可能讓 prompt panel 需要 scroll；
  本輪預設字級下無 overflow。
- 4-2 紫晶背景與紫晶 VFX 在戶外高環境光、低亮度或色覺差異下可能降低辨識。
- 高 DPR + 多枚 Boss projectile + VFX 疊加時的 frame pacing、觸控延遲與熱降頻未驗證。
- Boss 完整實戰中的視線分配、最後受擊來源與 vulnerability 結束感仍需真機 playtest。

## Required Follow-up

1. BOSS / Root 將 `UX-20260724-001` 交回 `FIX-20260723-005` 的 DEV scope，
   補 modal focus ownership 與雙 viewport keyboard regressions。
2. BOSS / Root 為 `UX-20260724-002`、`UX-20260724-003` 指派 DEV，連回
   `TICKET-20260715-004` 或建立符合單一 root-cause 的 FIX；UX Reviewer 不自行
   建立或轉移 work item。
3. DEV 修復後重跑同一 current-worktree Phase 4.7 UX：
   - 844×390 / 390×844 modal focus + background inertness
   - phase 1/3 Boss region pixel difference
   - telegraph / execute / recovery / full-duration vulnerability capture

## Bounded Result Envelope

```yaml
status: FAIL
work_item_id:
  - TICKET-20260715-001
  - TICKET-20260715-002
  - TICKET-20260715-004
  - TICKET-20260723-002
  - FIX-20260723-005
finding_ids:
  - UX-20260724-001
  - UX-20260724-002
  - UX-20260724-003
artifact_refs:
  - .vibemgmt/reviews/UX_2026-07-23_closeout-regression.md
blockers:
  - UX-20260724-001 Severe/P1 modal keyboard semantics
  - Nielsen average 3.2 below 3.5
  - TICKET-20260715-004 phase sprite acceptance not met
next_owner: BOSS/Root -> DEV
```
