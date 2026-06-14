---
date: 2026-06-14
reviewer: Claude (QA / Testing Specialist)
author: Codex / BOSS（內容擴充，手改 index.html）
scope:
  - index.html （主線 4→11 關、2 新怪、世界節點真實子關卡化、存檔遷移、3-1 推薦落差修正）
status: PASS
---

# QA Review — 核心內容擴充（11 關 + 2 新怪 + 存檔遷移）

## 驗證方法
inline 語法檢查（`new Function`）= ok；`<script>`=1；`git diff --check` 乾淨；Node DOM-stub + 計數 context 跑結構/能力/不變式/回歸斷言（全綠）。

## 結果（全部 PASS）
| 項目 | 結果 |
|---|---|
| 主線 4→11 關 + 挑戰關 | CAMPAIGN_COUNT=11、LEVELS=12（[11]=挑戰關） |
| 世界真實節點分布 | 小學:3 / 初中:3 / 高中:3 / 大學:2 / 研究所:0 |
| 世界節點 levelIdx | 全部解析、連續 0..10 無斷層（用 `levelIndexById` id-based） |
| 传纸条 `laneHop` | 換路時 r 與 y 同步更新、邊界判斷、一次性（runtime 實測通過） |
| 涂鸦怪 `doodleHeal` | 每 ~2s 補同排受傷怪、封頂 maxHp（runtime 實測通過） |
| 存檔遷移 | `reconcileUnlockedLevelFromResults` 用 id-keyed results 反推解鎖；插關不打回前面（實測清 3-1 → 解鎖 ≥ 新 index） |
| 3-1 推薦落差修正 | 加跑「11 關不變式」：每關 intro 小訣竅 tool 都在該關 loadout 內（11/11 通過） |
| 回歸 A/B/C/D | 收藏館敵人卡=6（排除 elf、+2 新怪）、教室美術涵蓋 1-1/1-2/1-3、選單/世界地圖 11 關正常 |

## 設計亮點
- 世界節點改 `levelIndexById`、存檔用 id 反推解鎖 → 正確避免「插關把人打回前面」。

## INFO（非 blocker）
1. **Phase 4 之前的舊存檔（無 results 欄位）** 無法精準重對位 → 退回用舊數字索引當下限，可能少解鎖幾關（方向安全、不破壞、頂多重玩一兩關）。有 results 的存檔不受影響。
2. 波次危險提示一次只顯示第一個特殊敵人（一波多種特殊怪時）。
3. 已知 TODO（非缺陷）：數值平衡、研究所世界延伸、其他世界完整美術 slice、真機重測。

## 結論
內容擴充技術品質達標，無功能/回歸問題。**PASS，可交付。**
