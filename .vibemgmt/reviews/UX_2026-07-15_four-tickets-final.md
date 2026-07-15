# UX 修正處置驗證：TICKET-20260715-001..004

日期：2026-07-15  
角色：整合協調 / 瀏覽器驗證  
前置獨立審查：`UX_2026-07-15_four-tickets.md`（Phase 4.7 uiux-reviewer，CONDITIONAL PASS）  
結論：**PASS**

> 本文件不是另一份獨立 UX 審查。終局 uiux-reviewer 因工具流程未產出報告，因此本文件逐項處置前置獨立審查的 findings，並記錄修正後的實際瀏覽器證據；未將無產出的代理執行列為通過證據。

## 前置 Findings 處置

| 原 finding | 修正 | 修正後證據 | 結果 |
|---|---|---|---|
| Severe：Canvas 無鍵盤等價操作與語意 | Canvas 設為 `tabIndex=0`、`role=application`，新增方向鍵、Enter/Space、Escape；關鍵狀態輸出 assertive ARIA live | Chrome 844x390：Canvas 可聚焦，ArrowRight 將瞄準格由 c=5 移至 c=6；Escape 成功取消且印章維持 1；live region 顯示「已取消大招，印章未消耗」 | **RESOLVED** |
| Severe：大招取消不可發現 | 瞄準期間顯示固定 `X 取消` 按鈕與操作提示 | Chrome DOM smoke 實際取得 `X 取消`；按鈕為可聚焦原生 button，並走同一 `cancelStampUltimate()` 路徑 | **RESOLVED** |
| Moderate：窄橫式 BOSS 預警裁切 | 預警文字 X 位置以戰場左界與右側 safe-area 夾限 | 844x390 source/runtime 檢查：`bossTextX` 由 `Math.max/Math.min` 限制在可視區；合約 verifier 通過 | **RESOLVED** |
| Moderate：無目標缺少恢復提示 | 無目標時保留瞄準狀態與印章，並輸出可讀提示 | `confirmStampUltimate()` 宣告「沒有目標，印章未消耗。請移動瞄準位置或取消。」；ARIA 合約通過 | **RESOLVED** |
| Minor：窄橫式頂部資訊密度 | 大招提示移至固定緊湊控制列；BOSS 預警貼近 BOSS 並受 safe-area 限制 | 844x390 smoke 未出現控制重疊或 console error | **RESOLVED** |

## 方向與場景可讀性

- `td + landscape -> landscape`；`td + portrait -> gate`。
- `minigame + landscape -> landscape`；`minigame + portrait -> portrait`。
- 14 個 TD 場景只提供橫式 raster profile；4 個章間小遊戲各有獨立 landscape/portrait WebP + PNG 構圖。
- 代表性橫式考場、橫式小遊戲與直式小遊戲素材已視覺檢查：高細節集中於邊緣，中央戰場或瞄準路徑保留低細節區，不以裝飾粒子填滿操作區。
- 390x844 TD 使用方向 gate，不會把橫式塔防壓縮或誤載直式 TD 圖；390x844 小遊戲才載入直式 raster。

## Nielsen / WCAG 結論

- 前置獨立審查 Nielsen 平均為 **3.6/5**，已達 3.5 門檻；本輪未發現修正造成分數下降。
- 前置審查已量測主要文字組合均達 WCAG 4.5:1。
- 修正後補齊 H3 使用者控制、H5 錯誤預防、H9 錯誤恢復，以及 WCAG 2.1.1 鍵盤操作與關鍵 Canvas 狀態的 ARIA 等價輸出。
- 背景為裝飾性 raster，不需要逐張 alt；瞄準、無目標、取消、BOSS 預警與破綻均透過 live region 提供文字狀態。

## 瀏覽器與合約證據

- `node scripts/verify_game_contracts.js`：Canvas 鍵盤、取消控制、ARIA live、BOSS safe X、方向矩陣與 raster 場景契約全部通過。
- Chrome 844x390 runtime probe：BOSS 蓄力 10 幀內塔 HP 1000 -> 1000、BOSS x 274 -> 274、specialCd 0 -> 0，且零投射、零提前破綻。
- Chrome console：0 errors / 0 warnings。
- 資產完整性：22 組場景、7 組 VFX、3 組 BOSS 階段圖均具備 PNG/WebP 配對；正式場景/VFX/階段圖無 SVG runtime 路徑。

## 剩餘風險

- 仍需 BOSS 在實體 iOS/Android 裝置確認瀏覽器動態工具列、safe-area、觸控手感與長時間效能；這是既有真機驗收項，不是本輪桌面瀏覽器 Blocking。
- 本輪未以螢幕閱讀器做 VoiceOver/TalkBack 端到端操作；已驗證必要 DOM role、焦點與 live region 輸出存在。

## 最終判定

**PASS**。前置獨立 UX 審查的兩項 Severe、兩項 Moderate 與一項 Minor 均有對應修正與瀏覽器/合約證據；四張 ticket 的橫/直式方向、場景可讀性、大招控制與 BOSS 預警可進入關票流程。
