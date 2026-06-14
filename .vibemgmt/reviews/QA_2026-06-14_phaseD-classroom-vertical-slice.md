---
date: 2026-06-14
reviewer: Claude (QA / Testing Specialist)
author: BOSS (Phase D vertical slice, hand-authored)
scope:
  - index.html （1-1 教室戰場美術 vertical slice + 文具盒質感 + offscreen cache 效能修正）
status: PASS
loop: 初審 PASS (1 WARN 效能) → BOSS 採選項 2 做 offscreen cache → 終審 PASS（有界 1 fix cycle，已閉環）
---

# QA Review — Phase D：1-1 教室戰場 vertical slice

## 範圍
BOSS 主導手改 `index.html`。本輪只做 **Chapter 1（classroom / 小學部 1-1）** 戰場美術升級，其餘關卡維持原綠格背景（避免一次改太大）。Author 為 BOSS，reviewer 為 Claude（author 不自評）。

## 驗證方法
- inline script 語法檢查（`new Function` 解析）：**ok**；`<script>` 數 = **1**
- `git diff --check`：**通過**
- Node DOM-stub + 計數 Canvas context：量化每幀繪圖成本、驗證快取失效、scope gating、regression

## 功能正確性（PASS）
- **範圍隔離成立**：`drawClassroomStage` 只在 `chapterId === 'classroom'` 呼叫；其餘章節走原 `(r+c)%2` 綠格。儀器化證實操場幀 0 漸層、教室幀才有重繪 → gating 確實生效。
- **不遮擋 gameplay**：背景在 `draw()` 最前段繪製，單位/敵人/子彈/預警/Boss 點名都在其後疊上 → 純背景層。
- **格線對齊**：用同一組 `OX/OY/C/R/G`，桌格與單位放置座標一致。
- **CSS 文具盒質感**：只改顏色/陰影/邊框，`SIDEBAR_WIDTH`、padding 不變 → safe-area / 觸控區不受影響。
- 原創程序化 Canvas 繪圖（非 PvZ 素材）。

## 初審 WARN（效能）→ 已修
### [WARN · 效能] 教室背景每幀整張重繪（初版）
儀器化（5×10=50 格，每幀）：`createLinearGradient ×51`、`fill ×54`、`stroke ×71`、`shadowBlur` 開啟、`fillRect ×104`。
- 背景靜態卻每幀重建 50 個 per-cell 漸層 + 開 `shadowBlur` 畫 50 圓角桌（shadowBlur 為 Canvas 最貴操作之一）→ 中低階 Android 掉幀風險；GDD §2 要求 iPhone 12-15 / 主流 Android 橫屏穩定。
- 建議：靜態舞台一次性畫到 offscreen canvas，每幀只 `drawImage` 貼上；動態粉筆線當 overlay。

### 修正（BOSS 採選項 2：offscreen cache）
- 新增 `classroomStageCache`、`getClassroomStageCacheKey(G)`、`renderClassroomStageCache(G)`。
- `drawClassroomStage` 比對 key，未命中才重建；命中則 `drawImage` 貼圖，再把動態粉筆線（`sin(frame)`）疊在外。
- cache key = `[w, h, OX, OY, C, R, round(G*100)]` — 涵蓋所有版面維度。

## 終審（PASS）— 獨立驗證
| 指標 | 修正前 | 修正後（steady-state，主畫布） |
|---|---|---|
| createLinearGradient | 51 / 幀 | **0** |
| 帶陰影圓角矩形 | ~50 / 幀 | **0**（移入快取） |
| 每幀操作 | 全圖重繪 | **1 drawImage + 3 粉筆線** |

- **快取失效正確**：OX 改變 → key 改變；維度改變 → 下一次 draw 重建快取物件（resize 不用髒快取）。
- **粉筆線動畫保留**：黑板底圖進快取、粉筆線 overlay 在外，`sin(frame)` 仍動。
- **Regression**：操場章節不受影響、收藏館/選單正常渲染。

## 殘留（非 blocker · INFO）
- 真機 FPS（特別是中低階 Android）仍建議實測一輪確認順暢。
- 等 Phase 3B 把美術擴到全部 4 章時，沿用本 offscreen cache 模式即可（per-chapter 各自 cache）。

## 結論
教室 vertical slice 美術品質、整合、效能皆達標；初審效能 WARN 已以 offscreen cache 修正並獨立複驗（51 漸層/幀 → 0）。**PASS，可交付。**
