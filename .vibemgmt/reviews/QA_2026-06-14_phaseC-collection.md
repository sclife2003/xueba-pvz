---
date: 2026-06-14
reviewer: Claude Reviewer (QA mode, independent)
scope: index.html (Phase C 未提交 working tree diff：贴纸冊收集 UI + 今天我学会了 + 错题回顾)
status: PASS (no CRITICAL; 0 Blocking)
mode: qa-testing
---

# QA 報告：xueba-pvz Phase C（收集 / 學科統計 / 錯題回顧）

## 0. 測試範圍與方法

- **範圍限定**：僅審查 `index.html` 未提交的 Phase C diff（`git diff index.html`，169 insertions / 6 deletions），不審查前兩個 commit（Phase A+B、GDD doc）。
- **方法**：靜態審查 + 邏輯抽取沙盒模擬（subject 對齊、save round-trip、wrongList 去重/上限、世界徽章判定）。無瀏覽器，UI 互動以程式碼路徑追蹤替代。
- **必跑結果**：
  - inline script syntax check → `ok`
  - `grep -c "<script" index.html` → `1`（單一 inline script，未拆檔，正則檢查前提成立）

## 1. 驗收結論摘要

| 項目 | 結論 |
|---|---|
| 嚴重度統計 | CRITICAL 0 ｜ WARN 2 ｜ INFO 4 |
| Phase 4.7 QA 接受標準（no CRITICAL） | **通過** |
| BOSS 3 拍板符合度 | 全部符合（見 §2） |
| 作者自述 7 點 | 全部驗證為真（見 §3） |
| 硬約束 regression | 無 |

## 2. BOSS 3 個拍板驗證

1. **「今天我學會了」= 學科分類統計** — 符合。`renderLevelComplete` 顯示學科 chips（➗数学/📖语文/🔤英语/🔬科学），來源 `r.subjectsLearned`，於 `resolveQuiz` 答對時依 `currentQuestionObj.subject` 累計（index.html:979-981, 2519-2528）。
2. **錯題回顧 = 僅本關結算顯示、session-only、不存檔** — 符合。`wrongList` 只存在於 engine 記憶體（startLevel 重置，index.html:726）與 result 物件，**未進 save schema**（見 §3.2 證據）。
3. **貼紙冊 = 精簡三類自動收集** — 符合。收藏館三區：關卡貼紙（通關自動）、敵人貼紙（spawn 即收集）、世界徽章（+ 既有獎勵徽章）。research 鎖區排除（index.html:1899-1944）。

## 3. 作者自述逐項驗證（全部為真）

### 3.1 題庫 subject 標籤對齊 — [驗證通過]
沙盒比對 `STATIC_QUESTIONS`（33 題）vs `STATIC_SUBJECTS`（33 個），長度一致、**無 fallback**。分布精確 = 数学7 / 语文7 / 英语7 / 科学12（index.html:464-511）。BOSS 指定抽查全中：
- 古詩「橫看成嶺側成峰」= 语文（idx 7）✓
- 「Yesterday I ___」= 英语（idx 15）✓
- 「光合作用需要」= 科学（idx 25）✓
- 「125 x 8」乘法 = 数学（idx 0）✓
- MATH_POOL 150 題全標 `subject:'数学'`（index.html:459）✓

### 3.2 錯題不進存檔 — [驗證通過]（關鍵）
Save schema（`emptySave`/`migrateSave`/`importSave` clean 物件）僅含 `schemaVersion / unlockedLevel / hp / results / stickers / badges / worldProgress`（index.html:341, 418-426）。**無 `wrongList`、無 `subjectsLearned`**。兩者只在 engine instance + computeAndSaveStars 回傳的 result 物件，符合 session-only。

### 3.3 敵人貼紙「遇到即收集」+ ASCII — [驗證通過]
`collectEnemySticker(grp.e)` 在 spawn 處呼叫（index.html:1333），首次寫 `stickers['enemy:'+id]=true` 並 `writeGameSave`，以 `enemiesSeen[id]` 去重每關只寫一次（index.html:1029-1036）。沙盒 round-trip 確認 save JSON **零 CJK 字元**（key 為 `enemy:slime` 等 ASCII，value 為 boolean；顯示名稱由 ENEMIES[id].name 即時取得，不入檔）。

### 3.4 世界徽章只在「該世界全部真實關卡通關」才發 — [驗證通過]
沙盒以真實 WORLDS/LEVELS 驗證：清 1-1→`world:elementary`；清 4-1→`world:university`；清挑戰關（idx4）→**無徽章**（research locked、無 real levelIdx node）。每個真實世界目前僅 1 個 real node，故通關即發，符合設計（index.html:1064-1072）。

### 3.5 renderLevelComplete 內容 + 可捲動 — [驗證通過]
box 改 `maxHeight:'calc(100% - 8px)'; overflowY:'auto'; class='hide-scrollbar'`（index.html:2495-2496）。新增世界徽章文字、學科 chips（#ecfdf5 綠卡）、錯題卡（q/✅正解/💡解析，#fff7ed 橙卡）。`.hide-scrollbar` CSS 存在（index.html:76-77）。

### 3.6 renderCollection + 入口 + phase + onOpenCollection — [驗證通過]
- 三區渲染、進度計數 `got/total`、未解鎖灰底 ❓（opacity 0.55、灰邊）（index.html:1881-1947）。
- 主選單入口「🏅 我的收藏馆」（index.html:1753-1757）。
- render dispatcher 加 `phase==='collection'` 分支（index.html:2608-2612）。
- `onOpenCollection` 開啟時 `loadGameSave()` 取最新（含戰鬥中收集的敵人貼紙）（index.html:2787-2792）。

### 3.7 onRestart re-sync — [驗證通過]
回主選單重讀 save，合併 unlockedLevel/results/stickers/badges（index.html:2820-2826）。`{}` 為 truthy，`fresh.x || x` 不會誤回退。

## 4. 主動找到的問題

### [WARN-1] 知識精靈（elf）被當成「敵人貼紙」收集，與遊戲其他處的定義不一致
`elf`（知識精靈，dmg:0，擊殺給能量）在敵人預告（index.html:1159, 1984）與班主任充能（1390）處皆以 `id!=='elf'` **明確排除為「非敵人」**。但：
- `collectEnemySticker(grp.e)` 對所有 spawn 無差別呼叫，elf 一出現即寫 `stickers['enemy:elf']`（index.html:1333）。
- 收藏館敵人區 `Object.keys(ENEMIES)` 含 elf，會渲染一張「👾 知識精靈」敵人貼紙（index.html:1942）。
- 結果：「敵人貼紙」區把友善能量精靈列為敵人，語意矛盾。第一關（1-1）一開局就會解鎖此「敵人」貼紙。

計數本身一致（got/total 都含 elf，無數字 bug），純屬分類問題。
**修復建議（交 Dev）**：擇一 — (a) `collectEnemySticker` 開頭加 `if(ENEMIES[id] && ENEMIES[id].role==='elf') return;` 並在收藏館敵人區同樣 `.filter(id=>ENEMIES[id].role!=='elf')`；或 (b) 若有意把精靈當「夥伴貼紙」收集，則改放到獨立區塊/改 emoji（非 👾）與標籤，避免「敵人」字樣。建議採 (a) 與既有預告邏輯一致。

### [WARN-2] 「中國古代四大發明不包括」歸類為「科學」可商榷
此題（index.html:479, STATIC_SUBJECTS idx 14 = 科学）屬歷史/常識，落在两段語文/英语之間被標成科學。不影響功能，但「今天我學會了」會把它計入 🔬科學。
**修復建議（交 Dev / BOSS 定奪）**：若希望分類更準，可改標 `'常识'`（會顯示 💡常识 chip）或保留現狀（科學分布 12→11、常識 1）。低優先，純內容歸類偏好。

### [INFO-1] 老師提示（Hint）自動以「答對」結算，會計入學科統計
`onHint` 在揭示提示 2 秒後呼叫 `resolveQuiz(true)`（index.html:2840），故使用提示會讓該題學科 +1「學會」，即使孩子未真正作答。此為延續既有行為（hint 早已不計入 wrongAnswers），對鼓勵向的兒童遊戲屬可接受設計，僅記錄。

### [INFO-2] 挑戰關（challenge-speed）的關卡貼紙已收集但收藏館不顯示
`computeAndSaveStars` 對任何通關（含挑戰關）寫 `stickers[id]=true`，但收藏館關卡區只迭代 `0..CAMPAIGN_COUNT-1`（4 個主線關），故 `stickers['challenge-speed']` 收而不顯。非 bug（挑戰關屬研究所進階區，本版 locked），僅「收集但隱藏」的一致性備註。

### [INFO-3] 收藏館敵人貼紙標籤對窄螢幕的截斷風險
敵人卡名稱（如「知識精靈」「鐵桶怪」）以 11px、`lineHeight:1.25`、卡片 minmax(86px) 顯示，中文 3-4 字尚可；若未來敵人名變長可能換行擠壓。當前 5 種名稱皆短，無實際問題，僅前瞻備註。

### [INFO-4] 錯題解析 fallback 文案
答錯題若無 `visual.content`，`exp` 退回「仔細審題，下次一定行！」（index.html:984）；錯題卡 `if(w.exp)` 恆為真故必顯示一行 💡。語氣符合「不懲罰」設計，正常。

## 5. 硬約束 regression 檢查（全部無破壞）

- **單檔未拆檔**：script count = 1 ✓
- **未用 PvZ 素材**：diff 無新增外部圖檔 / PvZ 命名 ✓
- **landscape / safe-area / visualViewport**：diff 未觸碰 orientation/viewport 函式；renderCollection 採與既有畫面相同的 `env(safe-area-inset-*)` padding 模式 ✓
- **存檔匯入匯出**：未動 export/import 邏輯；沙盒 round-trip 確認 stickers/badges 保留且 payload 純 ASCII，先前 btoa CJK 崩潰風險未復現 ✓
- **舊 v1 存檔相容**：`migrateSave` 對缺 stickers/badges/worldProgress 的舊檔補空物件、保留 unlockedLevel/hp/results，不報錯不掉進度 ✓

## 6. 邊界 / 錯誤路徑覆蓋

- resolveQuiz 四分支（combat / rescue_quiz / maze / followup）皆通過函式頂部統一追蹤（index.html:977-988 在所有 return 之前），且兩個開題入口（generateQuiz / openCombatQuiz）都先設 `currentQuestionObj`，**無漏計、無重複計數**（每次作答僅一次 resolveQuiz）。
- wrongList：沙盒驗證去重（同題只收一次）+ 上限 8（第 9 題起丟棄），含正解與解析 ✓
- subjectsLearned：缺 subject 安全 fallback 至 常識，不丟例外 ✓
- 世界徽章：locked 研究所不誤發；挑戰關不誤發 ✓

## 7. 建議交付 Dev 的修復順序

1. WARN-1（elf 誤列敵人貼紙）— 一致性 bug，建議修（採方案 a）。
2. WARN-2（四大發明歸類）— 低優先，BOSS 定奪。
3. INFO 全為記錄，無需強制處理。

**整體**：Phase C 實作品質高、與設計書 §9 Phase C / §0.1 reward model 一致，存檔安全、無 CRITICAL、無 Blocking。建議在處理 WARN-1 後交付。
