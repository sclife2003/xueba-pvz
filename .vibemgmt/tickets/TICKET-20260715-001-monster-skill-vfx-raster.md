---
type: ticket
status: open
owner: Codex QA
created: 2026-07-15
priority: high
reopened: 2026-07-15
takeover_plan: HANDOFF-20260715-001
---

# Ticket: 怪物招式高質感點陣特效

> 2026-07-15 接手稽核：重開。結構 verifier 通過，但 phase-aware raster runtime、部分招式的 raster coverage、雙方向 safe area、連續施放與真機效能證據仍未滿足；詳見 `HANDOFF-20260715-001`。

## Context

目前怪物招式雖已具備 `skillFx`、`enemyProjectile`、`dirtyZone` 與文字提示，但主要視覺仍由 Canvas 光束、圓點、色塊與文字即時繪製，和 painted WebP 怪物本體存在明顯質感落差。玩家需要在高密度波次中一眼看懂「誰正在蓄力、攻擊哪裡、何時命中、留下什麼危險區域」。

本票只處理怪物招式視覺與資產管線，不改技能傷害、冷卻或波次平衡。

## Scope

- 建立 `VFX_MANIFEST`，將所有非 `elf` 怪物映射至點陣 VFX profile。
- Runtime 特效使用透明背景 WebP；同名 PNG 保留為高品質來源與載入失敗 fallback。
- 不以 SVG 作為正式特效資產，也不以純幾何 Canvas 特效作為正常顯示結果。
- 每個招式至少具備四個可讀階段：
  - `telegraph`：攻擊範圍與倒數預警。
  - `cast`：怪物出手動作或發射瞬間。
  - `travel`：投射物、衝刺軌跡或範圍擴散。
  - `impact/aftermath`：命中、破壞、污染或殘留區。
- 建立至少 7 組可共用的風格家族：腐蝕、衝撞、紙張、塗鴉、聲波、陽光、紫晶；Boss 另有專屬效果。
- 點陣 VFX 須配合 DPR Canvas、透明邊緣、正確 premultiplied alpha 與高品質縮放，避免模糊、黑邊或整張透明。
- 多個效果同時出現時，以 layer/z-index 規則確保預警在地面、角色在中層、命中特效與文字在上層。
- VFX atlas 需標示 `landscapeSafeArea` 與 `portraitSafeArea`；橫式戰場優先保留左右飛行方向，直式小遊戲優先保留上下飛行方向，不能靠旋轉整張圖共用。
- 延續現有資產等待機制；缺圖時顯示中性 placeholder 並記錄失敗，不可退回舊 SVG。

## Art Direction

- 與現有 painted 怪物一致：厚塗、清晰剪影、明確高光、兒童可接受但有壓迫感。
- 特效顏色可辨識但不只依賴顏色；危險範圍需同時有形狀、節奏或圖示差異。
- 禁止以大面積不透明特效遮住整條路線；命中後 0.5-1.0 秒內恢復戰場可讀性。
- Boss 技能允許更強烈的屏幕震動、光暈與殘影，但不得讓玩家看不見塔與投射物。

## Acceptance Criteria

- 18/18 非 `elf` 怪物均有有效 VFX profile，驗證器可檢查完整覆蓋。
- 所有正式招式資產均為 `.webp` runtime + `.png` source/fallback；新增內容沒有 `.svg` 依賴。
- 遠程攻擊可清楚辨識發射者、飛行方向、目標格與命中時點。
- 衝刺、越障、召喚、污染、靜音、偷陽光與 Boss 招式各有不同視覺語言。
- 連續施放時不出現透明圖、資產降級、錯誤縮放、閃爍或上一關殘影。
- 桌面滑鼠與觸控裝置上，VFX 不攔截放置、點擊陽光或大招操作。
- 同一招式在橫式塔防與直式小遊戲中均保持清楚剪影；特效只覆蓋命中區，不以裝飾粒子填滿中央操作區。
- 以 1920x1080 與常見手機橫屏實測，正常戰鬥維持可玩幀率，效果峰值不造成明顯長卡頓。

## Verification

- 擴充 `scripts/verify_game_contracts.js`：檢查 VFX manifest 覆蓋、WebP/PNG 檔案存在、禁止 SVG runtime 路徑。
- Playwright/Chrome smoke：逐一觸發遠程、衝刺、召喚、污染與 Boss 技能，截圖確認四階段可見。
- Canvas pixel check：每個載入完成的 VFX 資產在實際繪製區域內必須含非透明像素。
- 真機檢查：技能密集波次仍能看懂攻擊來源、目標與命中順序。

## Implementation

- `VFX_MANIFEST` 已覆蓋 18/18 非 `elf` 怪物，統一提供 `telegraph`、`cast`、`travel`、`impact` 四階段。
- 新增腐蝕、衝擊、紙張、塗鴉、聲波、陽光、紫晶 7 組透明 raster VFX；每組均為 WebP runtime + PNG fallback，沒有正式 SVG 路徑。
- `spawnVfxPhase()`、`rasterFx` 與既有投射物/污染區流程已整合，載入失敗維持中性 placeholder，不降級成舊 SVG。

## Implementation Verification

- `node scripts/verify_game_contracts.js`：VFX 覆蓋、四階段、7 家族、WebP/PNG 路徑與非 SVG 契約通過。
- Chrome smoke：所有資產載入成功，`ASSETS.failed` 為空，console 0 errors / 0 warnings。
- 最終複審報告：`.vibemgmt/reviews/QA_2026-07-15_four-tickets-final.md`、`.vibemgmt/reviews/UX_2026-07-15_four-tickets-final.md`。
