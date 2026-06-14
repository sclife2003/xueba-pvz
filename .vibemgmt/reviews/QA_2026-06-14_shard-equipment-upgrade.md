---
date: 2026-06-14
reviewer: QA Reviewer (reviewer subagent, qa-testing skill)
scope:
  - index.html (working-tree 未提交變更：知識碎片 + 永久裝備升級系統)
  - .vibemgmt/GDD_ADDENDUM_2026-06-13_strategy-depth.md (§0.1.1 決策逆轉)
baseline_commit: 217a7ba
status: PASS (CONDITIONAL — 0 CRITICAL, 0 WARN, 3 INFO)
---

# QA 測試報告：知識碎片 → 永久裝備升級系統

## 測試範圍與環境

- 受測模組：未提交的 `index.html` working-tree diff（+182 / -21 行）+ GDD §0.1.1
- 基準 commit：`217a7ba`（11 關擴充）
- 環境：Windows 11、Node v24.14.0（DOM-stub harness 黑箱實測 save/earn/deploy/round-trip）
- 方法：靜態審查 + 自製 Node harness 34 條斷言（用後即刪，Leave No Trace）+ 全檔交叉引用追蹤

## 必跑檢查結果

| 檢查 | 結果 |
|:---|:---|
| inline `new Function(script)` 語法 | ✅ ok |
| `grep -c "<script"` | ✅ 1（單檔未拆） |
| `git diff --check`（空白/衝突標記） | ✅ clean |
| Node harness 34 斷言 | ✅ 34 passed / 0 failed |

## 通過項目 ✅

### 存檔相容與 round-trip（先前 whitelist 丟欄位 bug class — 已實測無復發）
- `emptySave()` 含 `shards:0` / `toolUpgrades:{}`（index.html:514）。
- 舊存檔（無 shards/toolUpgrades）`migrateSave` 不報錯，補齊預設且舊進度（unlockedLevel/results）完整保留（index.html:526-527）。
- **export → import round-trip 保留 shards + toolUpgrades**：harness 實測 shards=42、pencil/eraser 升級旗標、unlockedLevel=5 全部存活（importSave whitelist index.html:613-614 已正確補上兩欄位）。
- **無 CJK 寫入存檔**：toolUpgrades key = ASCII 工具 id、value = boolean `true`；升級顯示文字（百科全书等）即時從 `TOOL_UPGRADES` 取、不入檔。harness 解碼存檔 JSON 確認零 CJK 字元 → `b64encodeUtf8` 的 CJK 風險不會被觸發。
- 防惡意存檔：shards `clamp(0, 999999)`、NaN→0、負數→0；toolUpgrades 經 `sanitizeCollection`（物件值塌成 `true`、key 截斷 ≤48、限量 300）。

### 賺取數值
- 答對一題 `addShards(1)`（index.html:1186）；通關 `addShards(1 + stars)`（index.html:1324）— 數值正確。
- `addShards` 每次即時 `writeGameSave`（index.html:1281）→ 碎片即時寫盤。
- 「答對但輸掉關卡」：每題碎片在答對當下已寫盤，敗北走 `phase='over'`（index.html:1527）不呼叫 `computeAndSaveStars`，故無通關 bonus 但**逐題碎片保留** — 符合設計。
- `computeAndSaveStars` 每關只在 `nextLevel` 最終波呼叫一次（index.html:1332）→ 通關 bonus 無重複計算。

### 部署套用（戰鬥 override）
- 升級後放塔：`save.toolUpgrades[id]` → `TOOL_UPGRADES[id].apply(tw)` + `upgradedPermanent` 旗標 + recharge 乘數（index.html:1057-1060）。
- harness 驗證 apply 效果全部變強：pencil atk↑/rate↓、textbook rate↓、watering rate↓+atk↑、glue slowDur=360+atk↑、eraser maxHp+hp↑。
- **teacher（炸彈）**：傷害走 `o.data.dmg`（index.html:1614）不吃 atkOverride；升級 `apply` 為 no-op，只設 `recharge:0.6`。放塔 recharge `Math.round(900*0.6)=540` — 校長升級**確實縮短冷卻**（harness 驗證），作者自述屬實。
- 未升級則無 mark、屬性不變（permUp=null 時不套 apply，recharge ×1）— harness 驗證 pencil 無 recharge 欄位時冷卻不變。
- 戰場 ✨ 角標（index.html:2028）、道具欄升級後名稱/圖示 + ✨（index.html:2648-2680）。

### 工坊交易
- `onUpgradeTool`（index.html:3363）順序安全：load fresh → 已升級擋下（3367）→ 碎片不足擋下（3368）→ 扣碎片 → 設旗標 → 寫盤 → `engine.save=save` → 刷新 UI。
- 雙重防扣：buy 按鈕 `disabled=!afford` + handler 內再驗 `afford`；重複點擊由 `save.toolUpgrades[toolId]` 旗標擋下（每次重讀磁碟）。
- 升級永久（寫存檔）；`engine.save = save` 使「下一關即生效」。

### 護欄 3（最重要）— 成立 ✅
- 全檔追蹤 `shards`/`toolUpgrades` 所有引用：僅出現在 [存檔 schema]、[賺取]、[戰鬥 override/換皮]、[工坊 UI/交易]、[UI state sync]。
- 解鎖判定唯一來源 `reconcileUnlockedLevelFromResults`（index.html:531-542）與 `onLevelComplete`（index.html:3299）— **只看 `results[id].stars > 0`**，從不讀 shards/toolUpgrades。
- 星級 `computeAndSaveStars` 由 hp/wrong 算出，`addShards(1+stars)` 在星級**決定之後**才呼叫 — 升級不可能反向影響星級或解鎖。
- 結論：**升級純加成，零升級每關仍可 1 星通關並解鎖下一關。護欄 3 完全成立。**

### 主動找問題（皆已釐清，無 bug）
- **mid-level 開工坊**：工坊入口僅在 `renderMenu`（index.html:2224），UI 為 `phase` 互斥渲染（render() 3149-3171），開工坊時 engine 必在 menu 狀態，無 mid-level 入口 → `engine.save=save` 無 race。
- **engine.save 重指派遺失記憶體變更**：所有 `this.save` 變更（838/1241/1281/1319）後均立即 `writeGameSave`，磁碟 == 記憶體，`engine.save=loadGameSave()` 不丟資料。
- **ui.update 部分更新丟 state**：`update(patch)` 為 `Object.assign(this, patch)` 合併（index.html:2166），部分更新不清空其他欄位。

### Regression（未破壞）
- 單檔未拆（`<script` 計數=1）、未引用 PvZ 素材、橫屏/orientation/visualViewport 邏輯零改動。
- safe-area 唯一新增處為工坊畫面 padding（additive，沿用既有畫面模式）。
- Phase A/B/C/D + 11 關 + 世界地圖 + 收藏館 + 存檔遷移：diff 對既有 save 欄位純加法，未動 results/stickers/badges/worldProgress 清洗與遷移邏輯。

### GDD §0.1.1
- 正確以 `~~刪除線~~` 標記原「移除永久升級」決策，新增 §0.1.1 記錄 2026-06-14 逆轉，三護欄與 6 件工具映射與實作完全一致，並註明效果復用 `UPGRADES` override 欄位。文件與程式一致。

## 問題 ⚠️

無 CRITICAL、無 WARN。以下為 INFO（不阻擋交付，供後續打磨）：

| # | 嚴重度 | 描述 | file:line | 建議 |
|---|--------|------|-----------|------|
| 1 | INFO | 工坊返回鈕標籤為「‹ 地图」，但 `onRestart` 實際回 `phase='menu'`（學校選單），非 `phase='world'`。menu 即為世界選擇頁，語意可接受但略不精確。 | index.html:2434, 3403-3412 | 可改標籤為「‹ 返回」或「‹ 主选单」以更精確；非必要。 |
| 2 | INFO | `eraser` 為 `type:'wall'`（rate=0、不射擊），其升級僅加 maxHp/hp，純防禦正確；但工坊 blurb「血量大幅提升的肉盾」未提示它不輸出，低齡玩家或誤期待攻擊強化。 | index.html:495 | 文案可加「更耐打」字眼強化「盾」定位；非必要。 |
| 3 | INFO | shards 上限 999999 僅在 import 時 clamp；遊戲內 `addShards` 累加無上限（正常遊玩極難觸及）。 | index.html:1276-1281 | 若日後新增大量關卡，可在 addShards 亦加 clamp 防呆；目前無實際風險。 |

## 效能備註

- 純前端單檔、無新增網路/重型迴圈；`addShards` 寫盤頻率低（答題/通關），`writeGameSave` 為單次 `localStorage.setItem`，無效能疑慮。
- 工坊為 on-demand DOM 渲染，6 張卡片，無重繪壓力。

## 結論

**✅ PASS（CONDITIONAL）— 0 CRITICAL / 0 WARN / 3 INFO**

- 三條兒童友善護欄全部實作正確，**護欄 3（純加成、不卡進度）經全檔交叉引用驗證成立**。
- 作者所有自述（存檔 sanitizer、賺取數值、部署套用、teacher recharge、CJK 不入檔、round-trip 保欄位）經 Node harness 34 斷言實測為真。
- 先前抓過的 whitelist 丟欄位 bug class **未復發**。
- 3 項 INFO 為文案/打磨層級，不阻擋交付，可由 BOSS 決定是否轉 Dev 處理。
