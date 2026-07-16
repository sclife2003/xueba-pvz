---
type: fix
status: done
owner: qa-reviewer
created: 2026-07-16
completed: 2026-07-16
priority: moderate
source: qa-reviewer
---

# Fix: 行動鍵盤方向誤判與大招 pointer capture 殘留

## Findings

### Moderate - 鍵盤縮放跨越長寬比時誤判旋轉

目前 resize handler 直接使用 `window.innerWidth > window.innerHeight` 推導方向。
直向手機叫出軟鍵盤後，viewport 高度可能縮到小於寬度，程式會誤認為橫向，
觸發完整 UI render，重新建立帳號 input，造成 focus、輸入值與鍵盤遺失。

既有 regression 只測試縮小高度後仍維持直向長寬比，因此沒有攔住此邊界。

### Minor - 缺少 lostpointercapture 清理

大招 icon 已處理 `pointerup` 與 `pointercancel`，但未處理
`lostpointercapture`。若 capture 遺失且沒有後續 cancel/up，
`ultimatePointer` 可能持續存在，使 TD 狀態更新長期暫緩 render。

## Required RCA / Design Constraints

- 不得再以軟鍵盤造成的單次 viewport 長寬比翻轉直接判定裝置旋轉。
- 真實 portrait/landscape 切換仍須更新 UI layout。
- 優先使用穩定的 orientation signal；必須提供不支援相關 API 時的明確 fallback。
- `lostpointercapture` 必須安全清除 pointer lifecycle 與 pending gesture，
  不扣印章、不重複取消、不影響正常 pointerup。
- 不得修改既有帳號服務、傷害公式或其他票據範圍。

## TDD Acceptance Criteria

1. RED regression：直向裝置在鍵盤縮放後高度小於寬度，仍不得 render 或替換 focused input。
2. RED regression：真實 orientation change 仍只觸發一次相應 UI update。
3. RED regression：`lostpointercapture` 清除 `ultimatePointer` 與瞄準狀態，印章不變。
4. 正常 drag -> lock -> second icon cast 仍只扣一枚印章、只結算一次。
5. `pointercancel`、拖回 icon 與跨 phase cleanup 不退步。
6. Pixel 7 Chromium 與 iPhone 13 WebKit browser device emulation：
   - portrait 登入時模擬鍵盤縮到 `height < width` 後，node/focus/value 保留；
   - 真實寬高交換仍更新方向；
   - landscape 大招 `lostpointercapture` 後可重新操作，無 UI freeze。
7. `verify_account_client.js`、`verify_game_contracts.js`、
   `verify_mobile_interactions.js` 與 `git diff --check` 全數通過。

## Role Boundary

- DEV：只修改 implementation 與 verifier，提交 RED/GREEN evidence。
- QA reviewer：唯讀重驗並回報 PASS/FAIL，不修改程式。

## Implementation

- 新增穩定方向判定：觸控裝置優先使用 legacy `window.orientation`
  或 Screen Orientation API；缺少 API 時，普通 resize 保持既有方向，
  僅在 orientation event 才採樣 viewport。
- 真實 orientation event 透過同一 refresh path 更新，
  `syncUiOrientation()` 保證相同方向不重複 render。
- 新增冪等 `lostpointercapture` 清理；只處理匹配中的 active pointer，
  清除 UI 與 engine gesture state，不扣印章、不重複取消。

## Final QA (2026-07-16)

- Pixel 7 Chromium、iPhone 13 WebKit 共 4/4 browser device smoke PASS。
- 直向 viewport 縮至 `height < width` 後，帳號／密碼 input 的 node、
  focus、`isConnected`、value 與 token 均保留，且不誤切 landscape。
- 真實方向事件只更新一次 landscape layout。
- 實際 `releasePointerCapture` 後 gesture state 清除、印章不變、
  UI 可繼續 render；重新拖曳施放只扣一章並只結算一次。
- 三支 verifier 與 `git diff --check` PASS；console/page errors 為 0。
- QA reviewer 最終簽核：PASS，Blocking／Severe／Moderate／Minor 均為 0。
- 本次為 Playwright browser device emulation，非 OS-level Android／iOS simulator。
