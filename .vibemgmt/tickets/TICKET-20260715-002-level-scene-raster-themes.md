---
type: ticket
status: done
owner: dev-agent
created: 2026-07-15
priority: high
---

# Ticket: 各關卡主題化點陣場景

## Context

目前 `renderStageCache()` 依 `chapterId` 產生教室、操場、圖書館與考場場景，但主要由漸層、矩形、線條與簡單裝飾組成；同章關卡共用同一視覺，因此玩家容易感覺每關只是換怪物與數值。

目標是讓 11 個主線關、課外挑戰與 2 個研究所關卡都能從第一眼辨識其主題、時間、氣氛與事件，同時保持五路格線與戰鬥物件清楚。

## Scope

- 將場景選擇由僅看 `chapterId` 擴充為 `level.sceneAsset` / `level.sceneProfile`。
- 建立明確方向契約：`td` / `maze` 只允許 `orientation: 'landscape'` 的 16:9 場景；只有支援直式操作的 `minigame` 才可在直式 viewport 載入 9:16 場景。
- 禁止用 CSS rotate、非等比拉伸或把橫式主圖硬裁成直式主圖；橫式與直式必須是各自設計的構圖與 safe area。
- 每一個現有可玩關卡均指定獨立場景資產或獨立主題組合，共 14 組：

| 關卡 | 場景方向 |
|---|---|
| 1-1 | 清晨教室、整齊課桌、入學氣氛 |
| 1-2 | 課間教室、紙條與走廊動態 |
| 1-3 | 班會小測、黑板題目與緊張鐘聲 |
| 2-1 | 操場晨練、跑道與集合旗 |
| 2-2 | 正午陽光、球場與資源爭奪感 |
| 2-3 | 運動會決賽、看台、記分牌與 Boss 登場區 |
| 3-1 | 圖書館入口、借閱台與明亮書架 |
| 3-2 | 深層書庫、密集書架與安靜壓力 |
| 3-3 | 閉館前夜、閱讀燈與禁區書櫃 |
| 4-1 | 正式考場、時鐘、監考台與整齊座位 |
| 4-2 | 被紫晶侵蝕的終局考場、破損牆面與魔王舞台 |
| challenge-speed | 課外競速場、計時牌與動態標線 |
| r-1 | 研究所混合實驗室、分析儀器與危險燈 |
| r-2 | 研究所壓力測試場、模組化訓練空間 |

- 背景正式資產使用高解析 PNG 原圖與 WebP runtime，不新增 SVG 場景。
- 建議來源尺寸至少 2048x1152，保留中央戰場 safe area；桌面與手機橫屏採可控裁切，不拉伸人物或建築。
- 4 個章間小遊戲各提供兩個獨立版本：`*_landscape` 至少 2048x1152、`*_portrait` 至少 1152x2048；只有小遊戲依 viewport 方向選擇版本。
- 橫式圖將主要裝飾放在上下與遠端邊緣，中央五路及左右進攻方向保持低細節；直式圖將主要裝飾放在左右與頂端，中央瞄準區及上下飛行路徑保持低細節。
- 格線、可放置格、危險區與角色陰影維持程式層，背景負責氣氛與空間，不把互動資訊烘焙進圖片。
- 每關可有少量低成本動態 overlay，例如旗幟、時鐘、窗外光線、螢幕警示或紫晶脈動；overlay 不得使用 SVG。
- 建立 scene manifest 與資產 preload/fallback 規則，切關時 cache key 必須包含 level id。

## Acceptance Criteria

- 14/14 現有可玩關卡都有獨立 `sceneProfile`，同章連續關卡不可只換色。
- 14 個塔防關卡全部標記並實際載入橫式資產；直式 viewport 會先顯示方向門檻，絕不載入直式塔防背景。
- 4 個章間小遊戲都有橫式/直式兩套獨立 raster 資產，選擇器依玩法與 viewport 同時判斷，不能只看螢幕比例。
- 所有正式場景資產均為 WebP runtime + PNG source/fallback；不使用 SVG 場景。
- 玩家不看 HUD 也能從背景辨識教室、操場、圖書館、考場、研究所與關卡階段。
- 五路戰場、塔、怪物、陽光、預警與範圍技能在每張背景上都有足夠對比。
- 切換關卡、重玩與 DPR 改變時不串場、不閃舊圖、不出現透明或低解析 fallback。
- 1920x1080、1366x768、常見手機橫屏皆無關鍵物件被裁掉，文字與格線不與背景主體打架。
- 直式小遊戲以 1080x1920 與常見手機直屏檢查：目標、準星、計時與獎勵 HUD 不與背景高對比物件重疊。
- 場景 preload 不阻塞 UI；首場戰鬥開始前只等待該關必要資產。

## Verification

- 靜態驗證：14 個 level id 均有 scene manifest entry，WebP/PNG 路徑存在且無 SVG runtime 路徑。
- 視覺回歸：每關桌面與手機橫屏各一張截圖，檢查裁切、對比、格線與主題差異。
- 方向矩陣：`td + landscape -> landscape`、`td + portrait -> gate`、`minigame + landscape -> landscape`、`minigame + portrait -> portrait`，四條路徑均須自動驗證。
- 重玩/切關 smoke：1-1 -> 2-1 -> 3-1 -> 4-2 -> 1-1，確認 offscreen cache 不殘留上一場景。
- Canvas pixel check：每張背景在 safe area 與外圍裝飾區都有非空像素，但戰場中央不過暗或過度雜亂。

## Implementation

- 新增 14 個 level-specific `SCENE_MANIFEST` profile，全部使用獨立橫式 WebP/PNG 場景。
- 4 個章間小遊戲各自提供獨立 landscape/portrait WebP/PNG，共 8 套構圖；不是旋轉、拉伸或硬裁同一張圖。
- `ORIENTATION_MATRIX` 與 `resolveSceneVariant()` 明確限制：`td/maze + portrait -> gate`，只有 `minigame + portrait -> portrait`。
- 場景以清晰 contain 主圖加低對比邊緣延伸繪製，中央戰區保留低細節 safe area，程式格線與遊戲物件保持可讀。

## Implementation Verification

- `node scripts/verify_game_contracts.js`：14 個場景、4 組雙方向小遊戲與四條方向矩陣契約通過。
- 實測 1920x1080、844x390、390x844：橫式 TD 正常、直式 TD 顯示方向 gate、橫/直式小遊戲分別載入對應 raster 資產。
- 最終複審報告：`.vibemgmt/reviews/QA_2026-07-15_four-tickets-final.md`、`.vibemgmt/reviews/UX_2026-07-15_four-tickets-final.md`。
