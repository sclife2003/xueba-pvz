---
type: ticket
status: done
resolution: fixed
owner: dev-agent
created: 2026-07-15
priority: high
decision: approved-option-b
reopened: 2026-07-15
completed: 2026-07-16
takeover_plan: HANDOFF-20260715-001
---

# Ticket: 我方文具大招範圍攻擊重設計

> 2026-07-15 接手稽核：重開，並保留已核准的 Option B。跨關殘留 `pendingUltimate` 可在印章歸零後確認並扣成負數；高傷 AoE 亦會暴露 Boss 跳階問題。詳見 `HANDOFF-20260715-001`。

## Context

目前印章大招已涵蓋 7 種文具，但多數是立即套用全場數值效果，缺少瞄準、範圍形狀、命中節奏與戰術取捨。結果雖然有效，玩家卻不容易感受到「這件文具真的放出了專屬大招」。

本票提出三種方案，待 BOSS 拍板後實作。

## Options

| 方案 | 說明 | 優點 | 代價 |
|---|---|---|---|
| A. 全場強化版 | 保留現有一鍵全場效果，只增加傷害與美術 | 工期最短、操作簡單 | 關卡策略仍偏薄，技能彼此相似 |
| B. 指定範圍攻擊（推薦） | 點擊戰場選定目標格，每件文具有不同 AoE 形狀與殘留效果 | 手感清楚、可救急、能製造操作上限 | 需新增觸控瞄準、範圍預覽與取消流程 |
| C. 文具連鎖技 | 兩件文具大招可組合成額外效果 | 深度最高、重玩性強 | 規則量與平衡成本最高，不適合本輪直接上 |

## Recommendation

採用方案 B。保留「擊敗 10 隻怪獲得 1 枚印章、最多 3 枚」的簡單資源規則，但按下大招後先進入瞄準狀態，顯示攻擊範圍；再次點擊確認，取消則不消耗印章。這比單純全場清屏更像塔防技能，也能兼顧滑鼠與觸控。

## Proposed Ultimates

| 文具 | 大招 | 範圍與效果 | 五級成長方向 |
|---|---|---|---|
| 知識課本 | 知識暴雨 | 選定 3x3 區域，書頁連續落下造成 5 段傷害；每命中一波掉落少量陽光 | 段數、傷害、陽光上限增加 |
| 鉛筆射手 | 萬筆齊發 | 選定 3 條相鄰路線，從左至右進行多輪穿透掃射 | 穿透數、輪數、Boss 傷害係數增加 |
| 噴壺 | 暴雨水幕 | 選定 2x3 區域形成持續水幕，造成範圍傷害並降低怪物攻速 | 持續時間、tick 傷害、攻速削弱增加 |
| 強力膠水 | 膠海封鎖 | 選定 2x3 區域形成黏著地帶，持續傷害、強減速並打斷一次衝刺 | 區域寬度、持續時間、控制強度增加 |
| 直尺穿線 | 十字裁線 | 點選一格，同時斬擊整行與整列；交叉點造成額外爆擊 | 行列傷害、交叉倍率、二次回彈增加 |
| 橡皮盾 | 橡皮震波 | 所有橡皮盾向周圍 3x3 釋放震波，造成傷害、擊退與短暫暈眩，同時修復護盾 | 震波傷害、擊退、回血比例增加 |
| 劉老師 | 黑板總複習 | 全場先定身，再以黑板題目標記 3 個高威脅區域爆破；Boss 進入短暫易傷窗口 | 爆破數、易傷比例、定身時間增加 |

## Balance Rules

- 大招必須是「救場與創造窗口」，不可常態取代普通塔輸出。
- Boss 不吃完整硬控時間；改為較短停頓或破防窗口，但仍要明顯有效。
- AoE 傷害需依 `toolLevels` 成長，不能只升級特效外觀。
- 同一大招對一般怪、精英怪、Boss 使用不同傷害係數，避免後期不是秒殺就是無感。
- 場上沒有合法目標時不得消耗印章。
- 大招瞄準期間戰場可短暫慢速，但不可讓音效、投射物或輸入狀態卡死。

## Scope

- 擴充 `TOOL_ULTIMATES` 為資料驅動的範圍、段數、持續時間、控制與等級 scaling。
- 新增大招瞄準狀態、範圍 preview、確認與取消操作，支援滑鼠與觸控。
- 橫式塔防的大招 preview 只使用橫式格線座標；未來若直式玩法接入大招，必須使用獨立直式 layout profile，不得旋轉橫式 hitbox。
- 新增 `ultimateFx` 點陣特效物件；正式資產走 WebP runtime + PNG source/fallback，不使用 SVG。
- 讓每件文具 Lv1-Lv5 的大招都有實質成長，並在裝備工坊顯示下一級變化。
- 補上 Boss 控制衰減、易傷與多段傷害的共用規則。

## Acceptance Criteria

- 7/7 文具大招均能造成直接範圍傷害或由範圍效果造成持續傷害。
- 7 種大招具有不同範圍形狀、戰術用途與點陣美術，不是同一個全場爆炸換色。
- 滑鼠與觸控均可完成「按大招 -> 預覽 -> 選格 -> 確認/取消」。
- 橫式畫面中範圍遮罩不覆蓋技能按鈕或波次 HUD；直式非塔防畫面不顯示橫式大招格線。
- 取消、無合法目標或離開戰鬥不消耗印章。
- Lv1-Lv5 至少有兩項可量化戰鬥參數成長，且成長值可由 verifier 讀取。
- 大招與怪物投射物、污染區、Boss 階段切換同時發生時不重複結算、不跳過死亡清理。
- 早期關不因大招變成無腦清屏，後期 Boss 戰也能明顯感受到大招創造的反擊窗口。

## Verification

- 合約測試：7 種大招、5 級 scaling、AoE shape、印章消耗與取消路徑完整覆蓋。
- Runtime smoke：逐一觸發 7 種大招，驗證命中格、傷害次數、控制時間與 Boss 衰減。
- 輸入測試：桌面滑鼠、PointerEvent 觸控模擬與手機真機各跑一次瞄準/取消流程。
- 平衡真機清單：1-2 群怪、2-3 陽光怪、3-3 支援混合波、4-1 監考官、4-2 紫晶魔鎧王。

## Decision Needed

- BOSS 是否核准推薦方案 B「指定範圍攻擊」作為實作基準。

## Implementation

- 已依 BOSS 指示採用方案 B，7 種文具改為指定範圍大招：3x3、三路、2x3、十字等不同 AoE 形狀。
- 每種大招具備 Lv1-Lv5 五階數值，至少兩項戰鬥參數成長；傷害、段數、持續、減速、擊退、護盾、破綻等參數均接入 runtime。
- 新增滑鼠/觸控預覽與確認、固定取消按鈕，以及方向鍵 + Enter/Space + Escape 的鍵盤等價操作；無目標或取消不消耗印章。
- 大招命中使用 raster VFX，預覽只覆蓋實際命中格，不在非塔防直式畫面顯示。

## Implementation Verification

- 合約與 runtime probe 已逐一覆蓋 7 種大招、5 級 scaling、範圍格、傷害/控制/資源效果、Boss 衰減與取消路徑。
- Chrome 鍵盤 smoke：方向鍵可移動瞄準，Escape 取消後印章保持 1；固定 `X 取消` 按鈕與 ARIA live 訊息可見。
- 最終複審報告：`.vibemgmt/reviews/QA_2026-07-15_four-tickets-final.md`、`.vibemgmt/reviews/UX_2026-07-15_four-tickets-final.md`。

## BOSS Gesture Decision (2026-07-16)

沿用已核准的 Option B，並將觸控操作固定為：

1. 手指按住大招 icon 後拖入戰場，範圍框跟隨手指並即時顯示有效／無效目標。
2. 放手只鎖定範圍，不立即施放；玩家可再次拖曳調整。
3. 再點同一個大招 icon 才正式發動並扣除一枚印章。
4. 拖回 icon、點取消、離開戰鬥、死亡、切關或技能失效皆取消，且不得扣印章。
5. 滑鼠採相同「按住拖曳 -> 再點 icon」流程；鍵盤保留方向鍵／WASD、Enter／同快捷鍵確認、Escape 取消。
6. 高傷 AoE 命中 Boss 時必須逐一處理 phase threshold，不得跨階跳過 transition。

驗收時必須覆蓋 Android 與 iPhone 裝置模擬、多點觸控誤觸、pointer cancel、跨關 pending 清理、印章單次扣除與 Boss threshold concurrency。

## Gesture Implementation and QA (2026-07-16)

- 已實作 `Idle -> dragging -> locked -> cast`：按住 icon 拖曳，放手只鎖定，再點同 icon 才施放。
- 拖曳期間暫緩全量 UI render，避免 captured icon 被替換；pointerup 會先釋放 UI pointer state 再執行 lock callback。
- Pixel 7 / Chromium landscape 與 iPhone 13 / WebKit landscape 的 browser device emulation 均 PASS：preview 跟手、鎖定不扣章、確認只扣一章且只結算一次。
- `pointercancel`、拖回 icon、切關／迷宮／小遊戲／死亡均清除 pending 且不扣章；Boss threshold 依序排隊，不會被高傷 AoE 跳階。
- 三支 verifier 與 `git diff --check` 全數通過；OS-level 真機手感仍留待 BOSS 後續驗證。
