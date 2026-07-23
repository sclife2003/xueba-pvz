---
id: FIX-20260723-001
status: done
resolution: fixed
owner: DEV
priority: high
created: 2026-07-23
completed: 2026-07-23
---

# Fix: 大學部橡皮盾無法選取

## Problem

大學部關卡解鎖七件文具後，橫向手機的左側文具盒內容超出可視高度，
導致靠近底部的橡皮盾無法到達或選取。BOSS 明確要求文具列不得依賴捲動。

## Root Cause

`renderTowerBar()` 把 HUD、班主任技能、印章按鈕與所有文具卡放在同一條
單欄容器。大學部七件文具加進來後，最小卡片高度與固定控制項總高度超出
橫向手機可視區；`overflowY: auto` 只是隱藏問題，且不符合固定 seed bank
的戰鬥操作原則。

## Acceptance Criteria

- 大學部七件文具在橫向手機不需捲動即可同時看見。
- 文具卡採固定雙欄槽位，七件文具最多使用 2×4 格。
- 橡皮盾按鈕可正常選取及取消選取。
- 文具槽不得設定 `overflowY: auto/scroll`，也不得以觸控捲動作為可達性前提。
- 早期少量文具關卡與直向版文具列行為不退化。
- 新增自動化回歸測試並通過現有遊戲與手機互動測試。

## Resolution

橫向戰鬥文具盒改為固定雙欄 `2×4` seed bank，七件文具不需捲動即可同時看見。
知識星／專注值改為緊湊橫列；班主任技能與印章大招共用固定雙欄 action row，
避免額外控制項擠壓文具槽。568×320 短螢幕下每個文具槽仍保留至少 44px 高度，
橡皮盾可正常選取及取消。

Verification:

- `node scripts/verify_mobile_interactions.js`
- `node scripts/verify_game_contracts.js`
- `node scripts/verify_account_client.js`
- `git diff --check`
- Chromium 568×320 / 844×390 landscape visual and pointer verification
