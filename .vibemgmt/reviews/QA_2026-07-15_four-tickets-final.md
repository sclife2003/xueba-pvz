# 終局 QA 複審：TICKET-20260715-001..004

日期：2026-07-15
角色：Phase 4.7 QA Reviewer（唯讀 source）
結論：**PASS**

## Exploratory Testing Charter

- 目標：在終局收束中重驗四張 ticket 的核心契約，並確認先前 Blocking `QA-001` 已修正。
- 時間：5 分鐘定向複審。
- 範圍：既有 `QA_2026-07-15_four-tickets.md`、`scripts/verify_game_contracts.js`、`index.html`，以及 TICKET-20260715-001..004 的核心驗收契約。
- 重點：BOSS `bossAction` 蓄力期間必須零移動、零啃咬、零 special、零重擊、零衝鋒、零資源效果；verifier 必須具備 executable probe。
- 排除：本輪不重跑完整瀏覽器旅程、手機真機、全關卡 Boss 實戰或效能基線。

## 執行結果與證據

### Gate 1：遊戲契約 verifier

```powershell
node scripts\verify_game_contracts.js
```

- 結果：**PASS，exit 0**；輸出結尾為 `Game contracts verified.`。
- QA-001 專項輸出：
  - `[OK] executable probe detects a pending boss telegraph`
  - `[OK] executable probe releases the boss when telegraph countdown ends`
  - `[OK] pending boss telegraph exits before movement, bite, special, slam, charge, and resource effects`

### Gate 2：diff whitespace 檢查

```powershell
git diff --check
```

- 結果：**PASS，exit 0**；無 whitespace error。
- 僅出現 `index.html` 與 `scripts/verify_game_contracts.js` 的 CRLF 將於 Git 下次處理時轉 LF 警告，不影響本 gate 結論。

## QA-001 修正複審

### Source 控制流證據

- `index.html:1699-1703`：`hasPendingBossTelegraph(objects, enemy)` 僅在同一 enemy 存在 `type === 'bossAction'` 且 `delay > 0` 時回傳 true。
- `index.html:3246-3253`：enemy update 先執行 phase transition，再立即檢查 pending telegraph；命中時重設 `isEating`、`eatCd`、`dmg` 後 `continue`。
- early `continue` 位於所有指定副作用之前：
  - 資源效果 `sunSteal`：`index.html:3256-3280`
  - 最終 BOSS 重擊 `titanOverdrive` / `titanSlam`：`index.html:3302-3324`
  - 暴走與衝鋒 timer：`index.html:3325-3368`
  - special cooldown 與 special attack：`index.html:3370-3382`
  - 啃咬：`index.html:3383-3395`
  - 位移：`index.html:3396-3397`

判定：pending telegraph frame 會在上述路徑前退出，故蓄力期間符合零移動、零啃咬、零 special、零重擊、零衝鋒、零資源效果。`delay === 0` 時 helper 解除鎖定，允許預警結束後執行招式，時序契約正確。

### Verifier 覆蓋證據

- verifier 以 `loadTopLevelFunction('hasPendingBossTelegraph')` 載入並實際呼叫 helper，分別驗證 `delay: 30` 鎖定與 `delay: 0` 解除，屬 executable probe。
- verifier 另擷取 enemy update body，確認 lock 出現在 `sunSteal`、`titanOverdrive`、`specialCd`、啃咬與移動等第一個副作用之前，且 lock branch 含 `continue`。

## 四張 ticket 核心契約覆蓋

| Ticket | 核心契約 | 結果與 verifier 證據 |
|---|---|---|
| TICKET-001 | 18 種非 elf 敵人 VFX、telegraph/cast/travel/impact 四階段、7 個視覺 family、WebP runtime + PNG fallback、無 SVG runtime | **PASS**；manifest 數量、敵人對應、四階段、七 family、資產存在與 runtime helper 均通過。 |
| TICKET-002 | 14 關獨立場景、4 組小遊戲橫/直式 raster、TD/minigame 四條方向矩陣 | **PASS**；14 scene profiles、4 組雙方向資產、四條 orientation matrix 與 resolver 均通過。 |
| TICKET-003 | 7 種指定範圍大招、5 級 scaling、至少兩項戰鬥參數成長、aim/confirm/cancel、空目標/取消不扣印章、移動敵人欄位推導 | **PASS**；所有核心契約與 runtime wiring assertion 均通過。 |
| TICKET-004 | 4 類 BOSS phase table、0.8-1.5 秒預警、遠程/召喚/場地/衝鋒、破綻窗口、延遲後施放，以及 QA-001 蓄力隔離 | **PASS**；phase、telegraph、攻擊類型、vulnerability、delayed action 與 QA-001 probe/assertion 均通過。 |

## Findings

- 本輪無 Blocking、Severe、Moderate 或 Minor 新缺陷。
- 先前 `QA-001` Blocking：**已重驗關閉**。

## 未做的真機／整合風險

- 本輪未在手機真機重跑滑鼠/觸控等價流程、方向切換、Canvas DPR 或 WebP/PNG fallback；沿用既有 QA 報告的瀏覽器 smoke 證據。
- 本輪未以正常玩家存檔完整跑 2-3、4-1、4-2 的所有 BOSS 階段，未視覺確認每次預警、投射、命中與破綻 HUD。
- executable probe 直接執行 telegraph predicate；enemy update 的六類副作用隔離由 verifier 對實際 update body 做控制流順序 assertion，未另啟瀏覽器執行完整 GameEngine 多 frame probe。
- 本輪未建立啟動時間、CPU、RAM、操作延遲或長時間 soak baseline。

## 結論

**PASS**。兩個指定 gate 均通過，四張 ticket 核心契約均有 verifier 覆蓋；QA-001 的 source 控制流與 executable probe 證據足以確認蓄力期間不會發生指定的 BOSS 副作用。本輪未做的真機與完整關卡風險已明列，不構成本次定向終局複審的 Blocking。
