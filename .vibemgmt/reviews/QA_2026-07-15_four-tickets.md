# QA 測試報告：TICKET-20260715-001..004

日期：2026-07-15  
角色：Phase 4.7 QA Reviewer（唯讀）  
結論：**FAIL**

## 審查範圍

- TICKET-20260715-001：怪物點陣 VFX 與 raster 資產管線。
- TICKET-20260715-002：14 關主題場景、4 組小遊戲橫／直式場景與方向矩陣。
- TICKET-20260715-003：7 種指定範圍五級印章大招。
- TICKET-20260715-004：4 種 BOSS 三階段遠程／召喚／場地／衝鋒／破綻機制。
- 實際讀取：四張 ticket、`index.html`、`scripts/verify_game_contracts.js`。
- `.vibemgmt/pods/` 無 POD 交付清單檔案；依使用者指定的四張 ticket Scope 與 Acceptance Criteria 建立本次白名單。

## Exploratory Testing Charter

- 目標：驗證 raster 資產載入、場景方向矩陣、指定範圍大招的輸入／目標邊界，以及 BOSS 預警到施放的行為隔離。
- 時間：2026-07-15，約 45 分鐘。
- 範圍：本輪四張 ticket 及目前工作樹；不審查其他功能。
- 重點：移動敵人未帶 `c` 欄位、空目標／取消、BOSS 預警、PNG/WebP 正式路徑、資產載入、橫直式矩陣。

## 實際命令與證據

```powershell
node scripts/verify_game_contracts.js
```

結果：exit 0，全部合約檢查通過，包括 18/18 VFX profile、14 場景、4 組小遊戲雙方向場景、四條方向矩陣、7 種大招／五級 scaling、移動敵人欄位推導、4 個 BOSS phase table 與預警時間。

```powershell
@' ... GameEngine.prototype 最小運行探針 ... '@ | node -
```

AoE／印章邊界輸出：

```json
{"movingEnemyWithoutC":{"result":true,"stamps":0,"hp":374},"emptyTarget":{"result":false,"stamps":1,"pending":true},"cancel":{"armed":true,"result":true,"stamps":1,"pending":false}}
```

BOSS 預警探針輸出：

```json
{"telegraphRemaining":53,"towerHitsDuringTelegraph":1}
```

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

瀏覽器 smoke（本機 `http://127.0.0.1:8080/index.html`）：

- 1280x720、DPR 1.5：選擇「小學部 -> 初入校園 -> 開始上課」，成功進入 TD；未見遊戲程式的 console error。
- 720x1280：TD 顯示「請橫放手機」方向閘門，未載入直式 TD 戰場。
- 已觀察 103 個 image resources；包含 14 張 TD WebP 場景、8 張小遊戲 WebP 變體、7 張 VFX WebP、最終 BOSS 3 張 phase WebP。資產盤點 `inlineSvgCount: 0`。

```powershell
Get-ChildItem assets/vfx, assets/scenes
Invoke-WebRequest -Method Head http://127.0.0.1:8080/assets/vfx/<asset>
```

結果：VFX 為 7 PNG + 7 WebP；場景為 22 PNG + 22 WebP。全部 14 個 VFX HTTP HEAD 回應為 200，Content-Type 分別為 `image/png`／`image/webp`。`VFX_MANIFEST`、`SCENE_MANIFEST` 與 `MINIGAME_SCENE_MANIFEST` 的正式 runtime/fallback 路徑均為 WebP/PNG，未指向 SVG。

## 通過項目

- 移動中的敵人即使沒有 `c` 欄位，AoE 仍由即時 `x` 座標推導欄位並命中。
- 空目標確認不扣印章；取消瞄準不扣印章。
- 7 種大招均有 target/confirm/cancel、可讀範圍與五級資料 scaling；合約測試通過。
- TD 橫／直式與小遊戲橫／直式四條方向矩陣合約通過；TD 直式瀏覽器實測顯示方向閘門。
- VFX、場景與最終 BOSS phase raster 資產存在、可載入，且正式 manifest 路徑沒有 SVG。
- 合約測試的 inline script compile、DPR canvas 與資產 fallback 檢查皆通過。

## 問題

| # | 嚴重度 | 問題 | 重現步驟 | 證據與影響 |
|---|---|---|---|---|
| QA-001 | **Blocking** | BOSS 預警期間仍可進行本體攻擊。`transitionBossPhase()` 將 `bossAction` 倒數物件加入場上，但未讓對應 BOSS 暫停；同一更新迴圈仍會執行特殊攻擊、啃咬、移動，以及最終 BOSS 的既有重擊。 | 1. 使 BOSS 進入 phase，且與塔重疊。 2. 觀察 `bossAction.delay > 0` 的預警期間。 3. 推進一個更新 frame。 | 最小運行探針確認預警由 54 倒數至 53 時，`towerHitsDuringTelegraph` 已為 1。這違反 TICKET-004「每個重招先有可讀預警，再造成傷害」及本輪指定的「BOSS 預警期間不攻擊」。玩家在預警中仍受傷，破壞預警的可反應性；必須退回 Dev 經 BOSS 路由修正。 |

## 未列為缺陷的限制

- 目前瀏覽器存檔僅開放 1-1，無法以正常玩家流程進入 2-3／4-1／4-2 逐輪觀看所有 BOSS 招式；已用實際 `GameEngine` 最小運行探針補測 BOSS 預警行為。
- 瀏覽器介面未提供可讀取的 renderer CPU／RAM／Navigation Timing API；本次記錄資產已完整載入與 TD 進場 smoke，不將未取得的數值冒充效能基線。

## 結論與交接

**FAIL**。QA-001 為 Blocking，未符合 Phase 4.7「BOSS 預警期間不攻擊」的重點驗證與 TICKET-004 可讀預警驗收條件。

請 BOSS 將 QA-001 退回 dev-agent：在 BOSS `bossAction` 預警存在期間，阻止同一 BOSS 的啃咬、普通 special、既有重擊／衝鋒與其他傷害性行為；修正後需重跑本報告列出的 BOSS 預警探針、合約測試及 4-1／4-2 瀏覽器 smoke。
