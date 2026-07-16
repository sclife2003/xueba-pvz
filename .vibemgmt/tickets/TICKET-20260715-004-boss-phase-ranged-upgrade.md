---
type: ticket
status: open
owner: Codex QA
created: 2026-07-15
priority: high
reopened: 2026-07-15
takeover_plan: HANDOFF-20260715-001
---

# Ticket: BOSS 多階段與遠程壓迫強化

> 2026-07-15 接手稽核：重開。Boss vulnerability 目前與攻擊同時開啟、`titanSlam` 沒有獨立預警／恢復期，跨 threshold 可跳階，且多條攻擊路徑缺少統一 scheduler；詳見 `HANDOFF-20260715-001`。

## Context

現有陽光怪、截止鈴怪、監考官與紫晶魔鎧王已具備高血量、偷陽光、紅筆拆防、護盾、重擊與低血暴走，但多數行為仍由固定週期與血量倍率驅動。需要把 BOSS 戰提升成有階段、有預警、有場景互動、有遠程威脅，也有可掌握反擊窗口的獨立關卡體驗。

參考 PvZ 的設計原則而非角色或素材：PvZ1 Dr. Zomboss 以火球/冰球迫使玩家及時回應；PvZ2 的 Sphinx-inator 與 Tomorrow-tron 使用預警飛彈、跨路衝鋒與召喚；Dark Dragon 會改變可攻擊路線並留下火焰危險；Multi-stage Masher 則以生命階段切換攻擊組合與場景節奏。

## Design Principles

- BOSS 強度來自攻擊組合與決策壓力，不只來自 HP 膨脹。
- 每個重招必須先有 0.8-1.5 秒可讀預警，再造成設施傷害或場地改變。
- 每個 BOSS 至少有 3 個血量階段；階段切換只觸發一次，並改變招式池、召喚物或位置。
- 強招後提供短暫破綻窗口，讓玩家可用印章大招反擊。
- 不設單一文具硬對策；任何合理陣容都可透過輸出、控制、補防與時機處理。

## Boss Proposals

### 陽光怪（操場 BOSS）

- Phase 1（100%-70%）：保留搶陽光；新增「陽光球投擲」，預警後攻擊後排產能設施。
- Phase 2（70%-35%）：每吃到 5 個陽光仍提升攻擊與速度 20%；新增「集合哨令」，召喚跳繩怪/遲到怪從相鄰路線進場。
- Phase 3（35%-0%）：觸發「體育老師衝線」，鎖定一條路短暫蓄力後高速衝鋒；結束後疲勞 3 秒並進入易傷。
- 場景互動：記分牌顯示已搶陽光數與下一層強化，避免玩家不知道為何突然變強。

### 監考官（考場 BOSS）

- Phase 1（100%-65%）：紅筆點名改為實體遠程投射物，地面先顯示目標格與倒數圈。
- Phase 2（65%-30%）：新增「卷面轟炸」，在 2x2 區域落下試卷，造成傷害並留下短期停擺區；召喚卷面風暴怪。
- Phase 3（30%-0%）：維持 5 秒暴走，攻擊與速度 +30%；暴走前先鳴鐘並標示衝鋒路線，結束後進入 2.5 秒破綻。
- 武力強化：近戰啃咬與紅筆命中使用不同 cooldown，避免同幀雙重傷害無法理解。

### 截止鈴怪（考場小 BOSS）

- 以倒數為核心：每次倒數結束向全路釋放一次可見聲波，延遲文具 cooldown。
- 低血量暴走時提高聲波頻率，但降低單次傷害，形成節奏壓力而非突然秒塔。
- 被範圍大招命中時可打斷一次倒數，給玩家明確操作收益。

### 紫晶魔鎧王（最終 BOSS）

- Phase 1（100%-72%）：紫晶護盾減傷；新增「晶炮齊射」，向後排發射 3 枚有落點預警的濺射彈。
- Phase 2（72%-38%）：護盾間歇關閉；巨劍重擊改為 2 路扇形攻擊，並召喚可被擊破的紫晶護衛。
- Phase 3（38%-0%）：保留暴走與速度/攻擊強化；新增跨路位移與「晶刺封路」危險區，但每輪連招後暴露核心 3 秒。
- 外觀隨階段破損：護盾完整、裝甲裂紋、核心外露三套 painted 狀態；正式資產為 WebP + PNG，不使用 SVG。

## PvZ Reference Notes

- [Dr. Zomboss (PvZ1)](https://plantsvszombies.wiki.gg/wiki/Dr._Zomboss_%28PvZ%29)：遠程火球/冰球與召喚共同施壓，玩家可針對預警反應。
- [Zombot Sphinx-inator](https://plantsvszombies.fandom.com/wiki/Zombot_Sphinx-inator)：預警飛彈、召喚障礙與跨兩路衝鋒形成不同威脅層次。
- [Zombot Dark Dragon](https://plantsvszombies.fandom.com/wiki/Zombot_Dark_Dragon)：火球召喚、火焰殘留與兩路吐息讓場景本身成為戰鬥機制。
- [Zombot Multi-stage Masher](https://plantsvszombies.fandom.com/wiki/Zombot_Multi-stage_Masher)：多生命階段切換攻擊模式、召喚組合與環境節奏。

## Scope

- 將 `BOSS_MECHANICS` 擴充為資料驅動 phase table、招式權重、預警時間、破綻時間與召喚表。
- 新增通用 Boss phase transition、ranged volley、summon group、lane charge、hazard zone、vulnerability window。
- Boss 遠程攻擊沿用 `enemyProjectile` 生命週期，但支援多彈、落點預警、濺射與可打斷狀態。
- Boss HUD 顯示名稱、階段、當前招式預警與特殊資源（例如陽光層數、紫晶護盾）。
- Boss 預警、投射物與 HUD 需遵守玩法方向 profile：橫式塔防沿左右路線構圖；直式小遊戲只使用專用上下方向構圖，不共用旋轉後的橫式資產。
- Phase 轉換與大招效果需可共存，避免在死亡幀或轉階段時重複召喚/重複傷害。

## Acceptance Criteria

- 4 個 Boss/小 Boss 均有明確 phase table；陽光怪、監考官、紫晶魔鎧王至少 3 階段。
- 陽光怪、監考官與紫晶魔鎧王均有正式遠程攻擊，且可看到發射、飛行、落點與命中。
- 每個主要 Boss 至少具備遠程、召喚/場地、近戰/衝鋒三類中的兩類，最終 Boss 三類全具備。
- 每個會大量破壞設施的技能都有可讀預警與攻後破綻，不出現無預警整排清除。
- 階段切換不只增加數值，至少會改變招式池、召喚物、位置或場景狀態。
- Boss threatTier、關卡 difficulty 與永久文具 Lv1-Lv5 共同納入 scaling，但 Boss 有倍率上限，避免純磨血。
- 4-1/4-2 不因多套攻擊同時觸發形成不可避免的連續清場；同一目標的特殊攻擊與啃咬需有可控 cadence。
- Boss 圖片與招式特效正式資產使用 WebP runtime + PNG source/fallback，不使用 SVG。
- 高密度 Boss 連招時，橫式五路中央與直式瞄準中央都保留清楚操作區，不以背景或粒子遮蔽目標。

## Verification

- 合約測試：phase 只切換一次、HP 閾值正確、遠程投射、召喚數、危險區與破綻窗口可重現。
- 模擬測試：高傷大招跨越 phase threshold 時不跳階、不重複 transition、不在死亡後施放。
- Playwright/Chrome smoke：2-3、4-1、4-2 各完整跑一輪 Boss 招式，截圖確認預警與 HUD。
- 真機平衡：記錄 Boss 戰時長、設施損失、印章使用數、死亡原因與是否看懂最後一次受擊來源。

## Implementation

- 陽光怪、截止鈴怪、監考官、紫晶魔鎧王均新增 phase table；主要 Boss 具備三階段招式組合。
- 階段攻擊整合遠程投射、召喚、危險區、衝鋒與攻後破綻，所有重招先經 0.8-1.5 秒 `bossAction` 預警。
- 蓄力期間鎖住 BOSS 移動、普攻、特殊技、重擊、衝鋒與資源效果；延遲結束後才執行技能並開啟 vulnerability window。
- 紫晶魔鎧王新增 3 套 WebP/PNG 階段 sprite，隨 phase 切換，不使用 SVG。

## Implementation Verification

- 合約與 runtime probe 已覆蓋四類 BOSS 的三階段閾值、投射/召喚/場地/衝鋒、延遲執行與破綻窗口。
- 原阻斷案例重測：BOSS 與塔重疊後連續 10 幀蓄力，塔 HP、BOSS 位置與 special cooldown 均不變，且沒有投射物或提前破綻。
- 最終複審報告：`.vibemgmt/reviews/QA_2026-07-15_four-tickets-final.md`、`.vibemgmt/reviews/UX_2026-07-15_four-tickets-final.md`。
