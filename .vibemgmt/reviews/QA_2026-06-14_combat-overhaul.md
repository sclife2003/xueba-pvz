---
date: 2026-06-14
reviewer: Claude (QA / Testing Specialist)
author: BOSS (core combat overhaul, hand-authored)
scope:
  - index.html （核心戰鬥重整 + 2 個 QA 修正）
status: PASS
loop: 初審 NEEDS_FIX (2 WARN) → 修正 → 終審 PASS（有界 1 fix cycle，已閉環）
---

# QA Review — 核心戰鬥趣味重整（漸進解鎖 + 敵人特色 + 值日生救場）

## 範圍
BOSS 主導手改 `index.html`，共 +142 / -63 行。Author 為 BOSS，reviewer 為 Claude（author 不自評）。
本檔僅 review `index.html`；Phase A/B/C 既有系統列入 regression 檢查。

## 驗證方法
- inline script 語法檢查（`new Function` 解析）：**ok**；`<script>` 數 = **1**
- `git diff --check`：**通過**（無空白錯誤）
- Node DOM-stub runtime 斷言：新機制 + loadout/敵人一致性稽核 + Phase A/B/C regression

## 初審發現（NEEDS_FIX）
### [WARN-1 · gameplay] 3-1 無膠水卻有 10 隻衝刺迟到怪
- 3-1 `mainlineLoadout` 原為 `[课本,铅笔,喷壶,橡皮]`（移除膠水），但 3-1 波次含 10 隻 bat（迟到怪，fast + schoolRush 1.75x）。
- 第 2 關才教「迟到怪先鋪膠水」，第 3 關卻收走膠水；與「逐步加入工具」語感不符。
- 自動稽核輸出：`3-1 fast=true glue=false  <-- FAST ENEMY, NO SLOW TOOL`。
- 提供 3 選項；BOSS 採**選項 1**。

### [WARN-2 · minor UX] 無 teacher 的關卡仍累積班主任充能
- 1-1/2-1/3-1 不含 teacher、技能槽不顯示，但 `chargeTeacher` 仍累積，滿了跳「班主任技能就绪！」浮字——有提示卻無按鈕，違背「首關不顯示班主任避免資訊過載」。

## 修正（BOSS 處理）
- **WARN-1**：3-1 → `['textbook','pencil','glue','watering','eraser']`（保留膠水 + 加噴壺）。
- **WARN-2**：新增 `canUseTeacherSkill()`（檢查 `activeLoadout.includes('teacher')`）；`chargeTeacher()` 與 `releaseTeacherSkill()` 皆以其守門——未解鎖老師時不充能、不就緒、不可釋放。

## 終審（PASS）— 獨立驗證結果
- **WARN-1**：loadout vs 敵人稽核全綠（1-1 no-fast/no-glue ok；2-1/3-1/4-1 fast+glue）。
- **WARN-2**：1-1 連灌 `chargeTeacher` 60 次 → 充能維持 0、無就緒浮字、`releaseTeacherSkill` 不誤觸定身；4-1 充能/就緒正常。
- **新機制驗證**：schoolRush 衝刺、paperShield 前半血減傷 55%、值日生救場（每路一次、推回+減速+420 傷、忽略 elf）、漸進 loadout、波次特殊敵人提示、`damageEnemy` 集中化（子彈/炸彈/粉筆/救場一致走 paperShield）。
- **Regression**：收藏館、存檔 schema v2、世界地圖、敵人貼紙 id 映射（id 未變、僅顯示名改）皆完好。

## 殘留（非 blocker · INFO）
- `focusDrain` 為宣告式標籤（驅動波次提示文字），無實際「點名拆防線」機制 → 未來 TODO。
- `getLevelPreview.recommendedTools` 已不再被 renderPrep 使用（無害殘留資料）。

## 結論
核心戰鬥重整品質佳、可玩性方向正確、無技術風險；2 個 WARN 已修正並獨立複驗。**PASS，可交付。**
