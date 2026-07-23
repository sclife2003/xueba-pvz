---
type: ticket
status: done
resolution: fixed
owner: DEV
created: 2026-07-23
completed: 2026-07-23
priority: high
supersedes_behavior: TICKET-20260715-003
---

# Ticket: 一鍵全軍齊射與直尺雙向穿透

## Context

既有印章大招需要按住、拖曳、放手鎖定後再點一次，真機操作成本過高。
BOSS 決定改為一鍵全軍齊射，並要求直尺普通攻擊能同時向前與向後射擊。

## Design

- 點擊印章按鈕立即施放，不進入瞄準、拖曳、鎖定或二次確認。
- 每座已部署的攻擊文具在自身路徑及上下各兩路尋找最近的前方目標，
  每路最多發射一發，形成最多五路密集火力。
- 直尺具備 `bidirectional`，普通攻擊與全軍齊射都可命中其前方及後方目標。
- 成功施放後，所有當下存活的已部署攻擊文具獲得 300 frame（約五秒）攻擊傷害 `+20%`；
  當下沒有合法首發目標的攻擊文具也獲得增傷，之後新放置的文具不繼承。
- 無已部署攻擊文具或場上無敵人時不消耗印章。

## Acceptance Criteria

- 一次 click 即施放並只扣除一枚印章。
- UI 不再註冊大招 pointer drag/capture，也不顯示瞄準取消列或格線 preview。
- 每座攻擊文具的齊射覆蓋 `tower.r - 2` 到 `tower.r + 2` 的合法路徑。
- 五秒增傷精確為 `1.2×`，倒數結束後恢復原傷害。
- 直尺每次攻擊能同時傷害同一路前方及後方敵人，兩個方向分別套用穿透上限。
- 無目標或無攻擊文具不扣印章。
- 既有文具槽、Boss threshold、帳號存檔與行動裝置互動測試維持通過。

## Verification

- `node scripts/verify_mobile_interactions.js`
- `node scripts/verify_game_contracts.js`
- `node scripts/verify_account_client.js`
- `git diff --check`
- Chromium landscape one-click interaction smoke

## Resolution

- 印章按鈕改為單次點擊立即發動 `全軍齊射`，移除瞄準、拖曳、鎖定、取消列與二次確認。
- 每座存活的已部署攻擊文具會向自身路徑及上下各兩路的最近合法目標開火；
  成功施放後所有既有攻擊文具獲得 300 frame、`1.2x` 傷害加成。
- 直尺新增 `bidirectional`，普通穿透攻擊與齊射均可分別搜尋並命中前後目標，
  兩個方向各自套用穿透數量與衰減。
- 無攻擊文具、無敵人或沒有任何合法首發目標時不消耗印章。
- TDD RED 證據：舊瞄準實作對一鍵齊射合約出現 7 項預期失敗；
  審查修正前，未參與首發的存活攻擊文具增傷測試亦如預期失敗。
- 驗證通過：
  - `node scripts/verify_mobile_interactions.js`
  - `node scripts/verify_game_contracts.js`
  - `node scripts/verify_account_client.js`
  - `git diff --check`
  - Chromium 844x390 真實 DOM click：印章 `1 -> 0`、三座既有攻擊文具皆為
    `barrageTimer = 300`、直尺前後命中、無 `pendingUltimate`、無 page error。
