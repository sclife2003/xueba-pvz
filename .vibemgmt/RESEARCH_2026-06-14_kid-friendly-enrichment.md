# 研究 backlog：小學生友善 PvZ-like 可豐富的點子（2026-06-14）

> 來源：George Fan PvZ 設計（GDC 2012）、Gimkit/Blooket/Kahoot/Khan Academy Kids/Duolingo/DragonBox、NN/G 兒童 UX、FTC v. Epic / COPPA。全部點子均為**原創改編**（不抄 PvZ 美術/名稱/角色）。
> 用途：設計增益參考，非已核准範圍。實作前各項仍走 reality-check + BOSS 拍板。

## 已達標（研究驗證為最佳實踐，勿重複造輪子）
- 答對→能量→守車道 核心循環（Gimkit/Blooket-TD 模型，最安全）
- 無帳號/廣告/內購/連勝 → 天生 COPPA 安全
- 貼紙靠玩賺取、不付費、不顯示他人購買
- 答錯不擋路（值日生救場軟挫折）、下一波危險預覽、第一關即教學無 tutorial 字樣
- 今天我學會了 + 錯題複習（正向學習價值）

## 建議新增缺口（依優先級）

### 主題 A：教學節奏
- [P1] 每波/世界只引入一個新概念，數學由具象漸退到符號（concrete→abstract） — 避免一次塞爆工作記憶 — 中
- [P1] 自適應難度（敵人強度跟答題正確率走，落在心流帶） — 維持挑戰=技能平衡 — 中

### 主題 B：獎勵與收集
- [P0] 核心循環已具雛形；保持「賺取式」、不付費、不羞辱 — 小
- [P1] 每日回歸採「獲得框架」小禮、**絕不用 loss-framed 連勝/愧疚** — 留客不傷害 — 小
- [P2] 個人最佳取代即時公開排行榜 — 公開排行對低齡放大焦慮 — 中

### 主題 C：可愛度與回饋
- [P0] 每次點擊立即「誇張」多感官回饋（動畫＋**音效**＋明顯視覺變化） — 兒童察覺不到細微回饋；目前無聲音=最大缺口 — 中
- [P0] 答錯＝敵人前進一步的軟挫折、**不扣分** — 扣分讓孩子不敢嘗試 — 小
- [P1] 友善吉祥物嚮導（鼓勵語氣，糾錯時暖暖給；可複用知識精靈/班主任） — 中
- [P2] 防守工具「外型即功能」剪影（一工具=一動詞） — Phase 3B 美術 — 中

### 主題 D：可及性
- [P0] 可點擊精靈 ≥ ~2cm×2cm、只用單擊、不靠拖曳/精準計時 — 9 歲以下需 ~4× 成人點擊區 — 小-中
- [P0] 關卡長度 ~1-3 分鐘、明確停止點 — 注意力≈每歲 2-3 分鐘 — 小（調參）
- [P1] 文字標籤配圖示 + **可選語音朗讀**（speechSynthesis）— 低齡多模態遠勝純文字 — 中
- [P1] 每螢幕只一個明顯主要動作 + 漸進揭露 — 兒童工作記憶小 — 中
- [P2] 對比 ≥ 4.5:1、不靠顏色單獨傳意 — WCAG + 色盲友善 — 小

### 主題 E：家長與學習價值（COPPA 安全）
- [P0] 守住「無帳號/資料/內購/廣告/計時/連勝」 — 單檔離線天生規避黑暗模式風險 — 小（守住即可）
- [P1] 誠實「學習:遊戲」時間比，裝飾/逛店不淹沒解題 — Prodigy 失敗教訓 — 設計紀律
- [P2] 正向「休息一下」提示（對應今天我學會了） — 反沉迷 + 家長信任 — 中

### 主題 F：內容多樣性
- [P1] 下一波預覽卡 + 倒數（開戰前先推理帶誰） — 把反射搶救變可規劃的思考 — 中（部分已有危險提示）
- [P2] 開戰前「挑 4-6 個今日小幫手」精簡選角（少格=每選擇都重要） — 低齡可承受的策略 — 中

## ⚠️ 此年齡層要避免
1. 恐怖/暴力框架（PvZ 評 10+：殭屍喊 Brains、割草機輾壓）→ 反派維持「凌亂/健忘小怪」，失敗=教室變亂再試。
2. loss-aversion 連勝 + hearts 擋學習（Duolingo 對兒童製造焦慮）。
3. 付費加速/分級 + 社交炫耀羞辱（Prodigy 核心黑暗模式，同班分階級）。

## 關鍵數字
- 點擊區 ≥ 2cm×2cm；關卡 ~1-3 分鐘；螢幕文字每元素 1-3 字必配圖示可語音；回饋即時誇張視覺+音效；資料/變現全無。

## 來源 URL
- George Fan GDC 2012: https://www.gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan
- Defender's Quest（TD 認知負荷）: https://www.gamedeveloper.com/design/optimizing-tower-defense-for-focus-and-thinking---defender-s-quest
- Common Sense — PvZ 10+: https://www.commonsensemedia.org/app-reviews/plants-vs-zombies-free
- Fairplay — Prodigy 黑暗模式: https://fairplayforkids.org/pf/prodigy/
- Blooket/Gimkit/Kahoot: https://triviamaker.com/blooket-vs-gimkit-vs-kahoot/
- Khan Academy Kids: https://www.modulo.app/all-resources/khan-academy-kids-review
- Duolingo 黑暗模式: https://www.deceptive.design/brands/duolingo
- DragonBox stealth learning: https://www.edsurge.com/news/2016-03-13-enter-the-dragonbox-can-a-game-really-teach-third-graders-algebra
- NN/G 兒童認知: https://www.nngroup.com/articles/kids-cognition/
- NN/G 兒童體能/點擊區: https://www.nngroup.com/articles/children-ux-physical-development/
- FTC v. Epic: https://www.bairdholm.com/blog/ftc-fines-epic-games-for-childrens-online-privacy-violations-and-deceptive-dark-patterns/
- 注意力跨齡: https://readykids.com.au/average-attention-span-by-age/
