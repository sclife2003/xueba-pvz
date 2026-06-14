---
date: 2026-06-14
reviewer: Reviewer Agent (QA mode, independent)
scope:
  - index.html (Phase A 小學生友善化 + Phase B 學校世界地圖；對 bd8606c 的工作區 diff)
charter: 驗證 GDD §23 驗收標準、存檔向後相容、硬約束 regression、邊界/錯誤路徑
status: PASS
acceptance_gate: 無 CRITICAL（PASS 條件已滿足）；列出 WARN/INFO 供修正
---

# QA 報告：Phase A + Phase B（小學生友善化 + 學校世界地圖）

## 探索性測試 Charter

- 目標：以獨立 reviewer 身分驗證作者自述的 6 項實作是否屬實，並逐項對照 GDD §23 驗收清單。
- 範圍限定：僅 `index.html`（唯一改動檔），不審查範圍外檔案。
- 手法：讀 diff 聚焦 + 靜態追蹤呼叫鏈 + 用 Node 模擬存檔遷移/匯入匯出/邊界 clamp/UTF-8 round-trip。
- 因專案為純前端單檔遊戲，無自動化測試套件；改以「函式抽出 + Node 重現」取代 pytest。

## 必跑驗證結果

| 驗證 | 指令/方法 | 結果 |
|---|---|:--:|
| inline script 語法 | `new Function(scriptBody)` | ✅ ok |
| script 標籤數 | `grep -c "<script"` | ✅ 1（regex 前提成立） |
| 檔案行數 | `wc -l` | 2714 行（未拆檔） |

## GDD §23 驗收標準逐項判定

| # | 驗收項 | 判定 | 佐證 |
|---|---|:--:|---|
| 1 | 主選單是世界地圖，不是列表 | ✅ PASS | `renderMenu` 重寫為 5 個 world 卡片（index.html:1671-1714），舊 `makeCard`/`starsFor` 已刪 |
| 2 | 小學部可直接點關卡開始（地圖→世界→intro→開始） | ✅ PASS | world 卡 `onOpenWorld`(1693) → `renderWorld` 節點 `onOpenPrep`(1796) → 友善 intro → 開始(1916) |
| 3 | 主線無 loadout 必選流程 | ✅ PASS | `renderPrep` 改為純展示推薦文具（1862-1888），`onConfirmPrep` 一律 `Object.keys(TOWERS)`(1916, 2647) |
| 4 | 主線無升級按鈕 | ✅ PASS | `renderFieldInfo` 開頭 `if(!this.advancedMode) return null`(2216)，`advancedMode` 恆 false |
| 5 | 主線無提前上課按鈕 | ✅ PASS | `renderEarlyCall` 開頭 `if(!this.advancedMode) return null`(2198) |
| 6 | 通關 1 星可前進（星星不卡進度） | ✅ PASS | 解鎖只看 `unlockedLevel`(worldStat 1688 / 節點 1789)；`syncSave({unlockedLevel: idx+1})`(1042) 不檢查星數 |
| 7 | 匯出/匯入可用 + 向後相容舊存檔 + 收集不丟 | ✅ PASS | 見下方「存檔相容性」全綠 |

**結論：7/7 驗收標準通過，無 CRITICAL。** 但仍有若干 WARN/INFO 須修正（見下）。

## 存檔相容性驗證（最高風險區，已實測全綠）

以 Node 抽出 `emptySave/migrateSave/b64*/sanitizeCollection/importSave` 邏輯實測：

- 舊 v1 存檔（無 schemaVersion、無 stickers/badges）→ `migrateSave` → unlockedLevel/results 完整保留、補空 stickers/badges、不報錯 ✅
- v2 含收集 → export → import round-trip：stickers/badges/worldProgress **完整保留**（白名單已明確複製）✅
- 舊 ASCII 匯出碼（舊 `btoa`）與新 `b64encodeUtf8` 對純 ASCII **位元相同**，舊碼可被新 decoder 讀入 ✅
- 惡意 5000-key 存檔 → `sanitizeCollection` clamp 至 300 筆；超長 key/val clamp 至 48/80 ✅
- CJK sticker key → 新 UTF-8 safe base64 round-trip 正確 ✅
- 垃圾匯入碼 → 丟 `URIError`，被 `importSave` 的 try/catch 接住，顯示「存檔碼無效」✅

## 硬約束 Regression 檢查

| 約束 | 狀態 | 說明 |
|---|:--:|---|
| 單檔 / 未引框架 / 未拆檔 / 未用 PvZ 素材 | ✅ | 仍單一 `<script>`，無 import/框架 |
| 橫屏鎖定 `isOrientationBlocked` | ✅ | 仍只 gate `td`/`maze`+portrait（127-129）；menu/world/prep 不被擋 |
| safe-area / visualViewport resize | ✅ | resize 監聽未動(618-619)；新畫面 padding 含 `env(safe-area-inset-*)` |
| 世界地圖/詳情/intro 手機橫屏可用且可捲動 | ✅ | wrap 用 `overflowY:'auto'` + `hide-scrollbar`；prep card `maxHeight:100% overflowY:auto` |

## Issues（依嚴重度）

### [WARN] W1 — 戰鬥內 HUD 仍洩漏壓迫詞「困难 / 炼狱」
- 位置：`index.html:2051`（頂部 lvlBadge）、`index.html:2068`（橫屏 lInfo badge）
- 現象：兩處用 `(this.stats.levelName||'').split('：')[1]`，渲染出 `"期末大考 (困难)"`、`"毕业典礼 (炼狱)"`。GDD §0.1/§23.7 明文要求小學生主線「避免困難、煉獄這類壓迫詞」。作者已寫 `friendlyLevelName()` 去括號，卻**未套用到戰鬥 HUD**，只套在地圖/intro。
- 影響：地圖/intro 乾淨，但一進關卡 HUD 又出現 (困难)/(炼狱)，違反本次改版的核心 UX 訴求；屬內容/UX 缺陷，非崩潰。
- 修復建議：HUD 兩處改用 `friendlyLevelName(LEVELS[this.levelIdx])` 或同等去括號邏輯；或直接修改 `LEVELS[].name` 資料移除難度括號（注意：`renderLevelComplete` 用 `LEVELS.findIndex(l=>l.name===this.stats.levelName)` 比對全名，若改名須同步，否則「重玩/下一章」失效 → 改名時務必兩端一致）。

### [WARN] W2 — 主線點擊已放置單位會「選取但無回饋」的死互動
- 位置：tap 流程 `index.html:828-834` → `selectField`(1160) → `onFieldSelect`(2611) → `renderFieldInfo` 因 `advancedMode=false` 回 null(2216)；但選取環仍會畫出(1522)
- 現象：主線中未選道具時點場上單位，會設 `selectedField` 並畫出黃色虛線選取框，卻**沒有任何面板/可執行動作**（升級面板被隱藏）。小朋友點了單位、看到框、什麼都沒發生。
- 影響：非崩潰、不卡進度，但對目標族群是困惑的 dead-end。作者「隱藏面板 UI」但未停用「餵給面板的選取觸發」。
- 修復建議：`advancedMode=false` 時讓 `selectField` 直接 no-op（或 tap 已放置單位不進入選取分支）；避免畫出無作用的選取環。

### [INFO] I1 — 死碼：`ARCHETYPES` 已成孤兒
- 位置：定義於 `index.html:235`；全檔已無任何 `ARCHETYPES[...]` 讀取（renderMenu/renderPrep 兩處用法皆於本次刪除）。
- 影響：無功能影響，僅殘留死碼。建議移除或標註保留原因。

### [INFO] I2 — 死碼/孤兒常數：`DEFAULT_LOADOUT`、`LOADOUT_SIZE`、`prepLoadout`
- `DEFAULT_LOADOUT`(314)：本次移除 `onOpenPrep` 內唯一用處後成孤兒。
- `LOADOUT_SIZE`(313) / `getLevelPreview` 仍輸出 `isFixed/loadoutSize/strategies`(1121-1123)，但 `renderPrep` 已不再讀取。
- `this.prepLoadout`(1628)：主線不再讀寫，僅注釋「進階模式用」。
- 影響：無功能影響；屬 deferred 進階系統的殘留欄位。可保留（未來研究所要用），但建議集中注釋說明，避免後續誤判為 live code。

### [INFO] I3 — 研究所空 realNodes 安全性（主動排查項）— 已正確處理
- `worldStat`(1680-1681) 以 `realNodes.length ? Math.min.apply(...) : 999` 防護空陣列，研究所(無真實節點)不會踩到 `Math.min.apply(null,[])`；且 `locked:true` 使 `unlocked` 恆 false，UI 不可點(1693 `if(playable...)`）。安全。
- `renderPrep` 返回鈕 findIndex fallback：level 0-3 正確回各自 world，challenge(idx4) 因研究所鎖定不可達，fallback 至 `onRestart` 為安全死路。

## 邊界/錯誤路徑覆蓋摘要

- 舊存檔無 schemaVersion/stickers：✅ 不報錯、進度不掉（W 無）
- export→import 收集不丟：✅
- 惡意/超大存檔碼：✅ clamp 300 筆、key48/val80
- 垃圾匯入碼：✅ 友善錯誤、不 crash
- 研究所 locked 進入：✅ 真正不可點
- 「下一章/重玩」改動後流程：✅ 仍正確進入下一關 intro（2408/2419 經 `onOpenPrep`）
  - 隱性前提：依賴 `LEVELS[].name` 唯一性（findIndex 用全名比對）。目前 4 關名稱唯一，安全；但若 W1 採「改名移除括號」修法，須同步 HUD 與此處比對基準。

## 總結

- **Status：NEEDS_FIX**（無 CRITICAL，§23 七項驗收全過、存檔相容性全綠、硬約束無 regression）
- 需修正：WARN×2（HUD 壓迫詞、死互動選取），INFO×3（死碼清理為主，無功能風險）
- 退回層級：W1/W2 屬 UX 友善化缺漏，與本次改版主訴求直接相關，建議交 Dev 修正後即可進交付；非 Blocking。


## 終審（2026-06-14, Final Review）

> 有界 review 迴圈第二輪（terminal）。範圍限定 ，僅驗證首輪 2 個 WARN 的修正是否到位、INFO 清理、以及本輪 diff 是否引入新 regression。

### 必跑驗證結果

| 驗證 | 指令/方法 | 結果 |
|---|---|:--:|
| inline script 語法 |  | ✅ ok |
| script 標籤數 |  | ✅ 1 |
|  引用 |  | ✅ 0（孤兒已移除） |
|  引用 |  | ✅ 定義(297)+friendlyLevelName(301)+renderPrep(1839)+HUD 直屏(2052)+HUD 橫屏(2069) |

### W1（戰鬥 HUD 洩漏壓迫詞）— ✅ RESOLVED

- 新增全域 （index.html:297-300）：先去「第N章：」前綴，再以 regex  去除半形/全形難度括號；(301) 改為呼叫它。
-  直屏 lvlBadge(2052) 與  橫屏 📚 標籤(2069) 兩處皆改用 。
- 全檔唯一殘留的  位於  內部(298)，戰鬥 HUD 已無任何直接拿 split 結果顯示的程式碼。
- 概念驗證（Node 重現）： → （無括號難度詞）；另測 、全形 、無冒號、null 皆安全去除/不報錯。
- 回歸安全：2409/2421 仍以原始  對  做  比對（重玩/下一章導航），因採「函式去括號」而非「改資料名」，比對基準未變，導航不破。首輪 W1 修復建議中的改名風險已被作者規避。

### W2（主線點已放置單位的死互動）— ✅ RESOLVED

- 引擎 constructor 新增 （index.html:589）。
-  選取分支改為 （835）；advancedMode=false 時跳過此分支，落到 ， 不被設值。
- 選取環只在  時繪製(1524)；主線  恆 null → 不畫虛線框、不開面板，死互動消除。
- 向後相容：(1162) 與升級面板邏輯保留；advancedMode=true 仍可正常選取升級。靜態追蹤確認全檔無任何程式碼把「引擎實例」的 advancedMode 設為 true（2694 的  作用於 UIRenderer 而非 Engine），故主線該分支不可能觸發。

### INFO 清理

- I2 ：已移除，grep 0 命中。✅
-  /  / ：作為 deferred 進階模式（研究所）scaffolding 保留，GDD §23 允許，非 blocker。維持 INFO，不退回。

### 本輪 diff regression 檢查（硬約束）

| 約束 | 狀態 | 說明 |
|---|:--:|---|
| 橫屏鎖定  | ✅ 未動 | 定義(127)、引用(1220/2093) 不在本輪 diff 中 |
| safe-area / visualViewport / resize | ✅ 未破壞 | resize/visualViewport 監聽(619/621/650-652/2709) 不在 diff；新畫面 padding 仍含  |
| 存檔匯入匯出 / 向後相容 | ✅ 未動 | migrateSave / sanitizeCollection / b64*UTF-8 自首輪綠後未再變更 |
| 單檔 / 未引框架 / 未拆檔 | ✅ | 仍單一 ， 通過 |

### 新發現

- 無。本輪未發現任何新 WARN / CRITICAL。

### 最終判定

- **Status：PASS（終審通過）**
- W1 ✅ RESOLVED、W2 ✅ RESOLVED；INFO 清理到位（DEFAULT_LOADOUT 已除，其餘為許可的 deferred scaffolding）。
- 本輪 diff 未觸碰或破壞任何硬約束（landscape lock / safe-area / visualViewport / 存檔相容）。
- 有界 review 迴圈在第二輪以 PASS 終結，無需再退回 Dev。
