---
type: fix
status: done
resolution: fixed
owner: qa-agent
created: 2026-07-16
completed: 2026-07-16
priority: blocking
---

# Fix: 行動裝置登入欄位無法維持軟鍵盤

## RCA

### Reproduce

1. 在 Android Chromium 或 iPhone WebKit 行動裝置模擬中開啟「帳號與跨裝置同步」。
2. 點擊帳號或密碼欄位。
3. 軟鍵盤造成 viewport resize 後，欄位失去 focus，鍵盤隨即關閉。

### Log Analysis

`window.resize` 會無條件呼叫 `ui.update({ isLandscape })`；`UIManager.update()` 進一步執行完整 `render()`，清空 `#ui-root` 後重建帳號表單。

### Localize

- `index.html` 的全域 resize handler。
- `UIManager.update()` / `render()` 的全量 DOM 重建。
- `renderAccountPanel()` 每次建立新的 username/password input。

### Deduce

軟鍵盤開啟造成的 resize 被誤判為需要 UI layout update，正在輸入的 DOM node 因全量重繪被刪除，導致 focus、輸入值與軟鍵盤一起消失。

## Fix Plan

- 先新增可重現「非方向 resize 不得重建 focused account input」的 RED regression。
- resize 僅在真實 orientation 狀態改變時更新 UI；鍵盤高度變化只允許 canvas/viewport resize，不得重建帳號表單。
- 保持實體旋轉的 orientation gate 與 canvas resize 行為。

## Verification

- Pixel 7 Chromium、iPhone 13 WebKit，各跑 portrait/landscape。
- username/password 均須可 tap、focus、type。
- 模擬鍵盤縮小 viewport 後，原 input node identity、`isConnected`、`activeElement` 與輸入值均保持。
- 實體方向變更仍會更新 layout；無 page/console error。

## QA Result (2026-07-16)

- Pixel 7 / Chromium：portrait、landscape 皆 PASS。
- iPhone 13 / WebKit：portrait、landscape 皆 PASS。
- 模擬軟鍵盤縮放與恢復後，username/password 的 DOM node identity、focus、`isConnected`、輸入值與測試 token 均保留。
- 真實寬高互換仍會更新 `ui.isLandscape`，帳號面板保持開啟，console/page errors 為空。
- 本次為 Playwright browser device emulation，不是 Android Emulator 或 iOS Simulator 等 OS-level simulator。
