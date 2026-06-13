# xueba-pvz Claude Implementation Handoff

**Date:** 2026-06-13  
**Audience:** Claude Code / implementation agent  
**Project:** `VibeProjects/xueba-pvz`  
**Primary file:** `index.html`  
**Current direction:** Mobile landscape PvZ-like school learning tower defense  

---

## 1. Implementation Goal

Upgrade `xueba-pvz` from a playable prototype into a more polished school-themed lane tower defense game.

The target experience is:

- PvZ-like lane defense clarity and pacing.
- Original school / learning theme.
- Mobile landscape first.
- Clear strategy, visible enemy waves, readable UI.
- More polished visual language without using PvZ assets, names, audio, or character designs.

The goal is not to copy PvZ art. The goal is to reach a similar level of gameplay readability, role clarity, animation feedback, and UI polish using original school-themed concepts.

---

## 2. Product Positioning

Working title:

```text
學霸守衛戰
```

One-line pitch:

```text
在校園異世界中，玩家用課本、鉛筆、橡皮、膠水與老師技能，抵抗懶惰、瞌睡、抄作業和考試壓力怪物。
```

Core product pillars:

1. **Lane defense:** Enemies advance from right to left across fixed rows.
2. **Resource economy:** Player collects knowledge / inspiration energy to deploy school tools.
3. **Counterplay:** Each enemy type should push a specific defensive choice.
4. **Learning integration:** Quiz answers should affect combat directly.
5. **Mobile landscape:** Combat must be stable on iPhone 12-15 and mainstream Android landscape screens.

---

## 3. Non-Negotiable Constraints

Do not break existing:

- Landscape orientation gate.
- Safe-area handling.
- `visualViewport` battlefield sizing fix.
- Save import / export.
- Existing basic level progression.

Do not:

- Use PvZ original assets, names, audio, sprites, plant designs, zombie designs, or UI copies.
- Introduce React / Vue / Vite / npm build system in this phase.
- Split into multiple files unless explicitly approved by BOSS.
- Add external image assets in Phase 1.
- Place management docs outside `.vibemgmt/`.

After changes, run at minimum:

```powershell
node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const m=html.match(/<script>([\s\S]*)<\/script>/); if(!m) throw new Error('script not found'); new Function(m[1]); console.log('inline script syntax: ok');"
```

---

## 4. Technical Architecture Decision

### Decision

Keep the game as a single `index.html` for now.

This is appropriate because:

- The game is still in fast gameplay iteration.
- There is no large asset pipeline yet.
- GitHub Pages / local file testing / mobile browser testing are simple.
- Claude and Codex can modify one file efficiently.
- Small HTML5 Canvas games are commonly prototyped this way.

### Single-file discipline

The file may stay single-file, but new code must be placed in the correct section:

```text
index.html
├── CSS / Layout / Animation
├── Constants / Data
│   ├── TOWERS
│   ├── ENEMIES
│   ├── LEVELS
│   └── QUIZ_POOL
├── Utils
├── Save System
├── GameEngine
│   ├── state
│   ├── waves
│   ├── economy
│   ├── collision
│   ├── quiz rewards
│   └── orientation / viewport
├── Drawing Helpers
│   ├── towers
│   ├── enemies
│   ├── effects
│   └── battlefield
├── UIManager
│   ├── menu
│   ├── HUD
│   ├── tower bar
│   ├── wave preview
│   ├── quiz modal
│   └── reward picker
├── Input Handling
└── Main App Wiring
```

### When to propose splitting files

Only propose splitting if one of these becomes true:

- `index.html` exceeds roughly 3000 lines and edits become error-prone.
- Level data grows beyond 10-20 levels.
- External sprites, audio, fonts, or background assets are introduced.
- Multiple agents / humans begin editing in parallel and merge conflicts become frequent.
- A formal build, cache-busting, or asset pipeline becomes necessary.

If splitting becomes necessary later, propose:

```text
xueba-pvz/
├── index.html
├── src/
│   ├── data.js
│   ├── engine.js
│   ├── drawing.js
│   ├── ui.js
│   ├── input.js
│   └── save.js
├── assets/
│   ├── sprites/
│   ├── audio/
│   └── fonts/
└── README.md
```

Do not perform that split without approval.

---

## 5. Game Design Document

### Core loop

One level should flow like this:

1. Player selects a chapter / level.
2. Game shows level theme, enemy preview, and strategy tip.
3. Player enters landscape battlefield.
4. Player receives starting energy.
5. Player deploys school-themed defenders.
6. Enemies attack in waves from right to left.
7. Knowledge stars / inspiration orbs appear during combat.
8. Player taps an orb to answer a quiz.
9. Correct answer triggers a combat reward choice.
10. Player survives all waves.
11. Level ends with score / star evaluation.

### Battlefield

- 5 horizontal lanes.
- Enemies spawn on the right.
- Player defends the left.
- Left side contains a school pencil-box style tool menu.
- Battlefield must stay inside `visualViewport` and safe areas.
- Combat phase is landscape only.

### Defender units

Current units should be reframed with original school identities:

| Current | New identity | Role | Counterplay |
|---|---|---|---|
| 知識課本 | 課本發電站 | Produces energy | Economy |
| 鉛筆射手 | 鉛筆投手 | Basic single-lane DPS | Normal enemies |
| 噴壺 | 墨水噴射器 | High-rate low-damage DPS | Small groups |
| 強力膠水 | 膠水陷阱 | Slows enemies | Fast enemies |
| 橡皮盾 | 橡皮堡壘 | High HP blocker | Tanks / boss pressure |
| 劉老師 | 班主任指令 | One-use area burst | Groups / boss emergency |

Potential future units:

| Unit | Role |
|---|---|
| 尺子砲台 | Line-piercing attack |
| 計算機助手 | Buffs nearby attack speed |
| 黑板擦煙霧 | Brief enemy stun / blind |
| 書包堡壘 | Tank, drops energy when destroyed |
| 獎狀光環 | Buffs one lane |

### Enemy units

Enemy design should express bad habits / school pressure:

| Enemy | Behavior | Player response |
|---|---|---|
| 懶惰怪 | Normal slow enemy | Basic firepower |
| 瞌睡怪 | Slow but high HP | Sustained DPS |
| 抄作業怪 | Fast and fragile | Glue / slow |
| 考卷怪 | Splits after death | Area damage |
| 鐵桶考生 | Armored tank | Burst / pierce |
| 監考魔王 | Boss lane pressure | Blocker + burst |

Rules:

- Each enemy must have a distinct silhouette.
- Fast enemies should look small and sharp.
- Tank enemies should look large and heavy.
- Boss should feel threatening but not horror-themed.
- Slow / hit / death states must be readable.

### Chapter structure

| Chapter | Scene | Strategy lesson | Main enemies |
|---|---|---|---|
| Chapter 1 | Classroom | Economy + basic defense | 懶惰怪 |
| Chapter 2 | Playground | Fast enemies + slow control | 抄作業怪 |
| Chapter 3 | Library / study room | Tank enemies + burst | 瞌睡怪, 鐵桶考生 |
| Chapter 4 | Exam hall | Mixed waves + boss pressure | 監考魔王, mixed enemies |

Each chapter should introduce one major strategic idea. Avoid adding too many new enemies at once.

---

## 6. Learning / Quiz Design

The quiz system should become a combat system, not a detached minigame.

### Trigger

During combat, spawn a `knowledge star` or `inspiration orb`. When tapped, the quiz modal opens.

### Correct answer reward

After a correct answer, show three reward cards and let the player choose one:

| Reward | Effect |
|---|---|
| 靈感爆發 | Gain 150 energy immediately |
| 全班專注 | Slow all enemies for 5 seconds |
| 粉筆風暴 | Deal area damage to one selected lane |
| 緊急補課 | Heal all defenders |
| 免費佈置 | Next defender placement is free |

### Wrong answer

Wrong answer should be a light penalty:

- Lose a small amount of energy.
- Show a short explanation.
- Avoid heavy HP punishment unless in high difficulty.

Design principle:

```text
Correct answers should feel like tactical power moments.
Wrong answers should teach, not abruptly end the run.
```

---

## 7. Visual Design Direction

### Target style

```text
可愛校園幻想塔防
```

The game should feel like an animated school notebook:

- Chalkboard hints.
- Notebook paper cards.
- Sticker-like UI.
- Pencil-box tool bar.
- Desk / playground / library / exam-room battlefields.
- Cute original monsters based on school pressure and bad habits.

### Visual keywords

- School
- Learning
- Chalkboard
- Chalk
- Desk
- Notebook
- Stickers
- Stationery
- Friendly monsters
- Bright
- Low pressure
- Child-friendly

Avoid:

- Dark horror.
- Overly realistic art.
- Asset collage.
- Overdependence on emoji.
- Visual similarity to PvZ plants / zombies.

### Palette

| Token | Color | Use |
|---|---|---|
| Chalkboard green | `#2F6B4F` | Main surfaces, hint boards |
| Book yellow | `#F6D365` | Energy, rewards, highlights |
| School blue | `#4A90E2` | UI highlights |
| Red pen | `#E85D5D` | Warnings, damage |
| Chalk white | `#F7F3E8` | Text, outlines |
| Desk brown | `#B9825B` | Battlefield, borders |

Avoid one-note palettes. Do not let the entire UI become purple, dark blue, or brown.

### Scene art

| Scene | Visual elements |
|---|---|
| Classroom | Desks, chalkboard, window, chalk tray |
| Playground | Track lanes, grass, flag, ball frame |
| Library | Bookshelves, reading lamps, book stacks |
| Exam hall | Desks, clock, test papers, proctor platform |

Battlefield tiles should match the scene:

- Classroom: desk grid.
- Playground: track lanes.
- Library: aisle lanes.
- Exam hall: seat rows.

---

## 8. UI Design Direction

### Main menu

Theme:

- School gate or chalkboard background.
- Title should feel like chalk writing / textbook cover.
- Level buttons should resemble timetable cards or chapter cards.
- Save import / export buttons can look like small sticker buttons.

### Combat HUD

Rename or visually reframe:

- Energy: `知識星` or `靈感值`.
- HP: `專注值` or `校門耐久`.
- Wave: `第 N 堂課` or `第 N 波`.
- Tip banner: sticky note or mini chalkboard.
- Next wave preview: chalkboard side card.

### Tower bar

The landscape left-side menu should become a pencil box:

- Container looks like a stationery box.
- Defender buttons look like sticker cards.
- Available: bright.
- Unavailable: desaturated / grey.
- Cooldown: ink overlay or semi-transparent shade.
- Selected: slight pop-out + book-yellow outline.

### Selected defender info

When a defender is selected, show a compact sticker card:

- Name.
- Cost.
- Role.
- Best use.
- Counters.

Example:

```text
膠水陷阱
消耗: 75
用途: 緩速一路敵人
推薦: 對付抄作業怪
```

### Quiz UI

The quiz modal should look like a mini chalkboard:

- Question in the center.
- Options as chalk cards.
- Correct: green check + star burst.
- Wrong: red-pen circle + short explanation.
- Hint: teacher hint.
- SOS: classmate hint.

Correct-answer reward cards should look like award certificates:

- Icon.
- Reward name.
- Short effect.
- Stamp animation when selected.

---

## 9. Animation and Feedback

Phase 1 should not overbuild animation, but all new UI should be designed with feedback in mind.

Required eventually:

- Unit placement: bounce-in.
- Energy collection: star flies to energy counter.
- Attack: clear projectile trajectory.
- Enemy hit: white flash.
- Enemy death: paper scraps / chalk dust.
- Lane warning: red flash at the right side of the lane.
- Boss arrival: blackboard shake / school bell cue.

Avoid:

- Long animations that block play.
- Effects covering the grid.
- Overly intense flashing.
- Tiny text on mobile.

---

## 10. Phase Plan

### Phase 1: Gameplay clarity and UI readability

Goal:

```text
Make the player understand the strategy before and during combat.
```

Deliverables:

1. Level tip banner using `LEVELS.tip`.
2. Next-wave preview with enemy names and counts.
3. Lane warning 1-2 seconds before enemies spawn.
4. Selected defender info card with role and counters.
5. First pass school-themed UI styling:
   - Pencil-box tower bar.
   - Chalkboard / sticky-note info panels.
   - Clearer combat HUD.

Acceptance:

- Within 5 seconds of entering a level, player knows the strategy focus.
- Before each wave, player sees what enemy types are coming.
- Player can identify what each defender is for.
- UI does not cover battlefield on iPhone 12-15 landscape.
- Existing orientation / safe-area behavior remains intact.

### Phase 2: Quiz-to-combat integration

Deliverables:

1. Knowledge star / inspiration orb trigger.
2. Correct answer reward picker.
3. At least 4 reward effects.
4. Wrong answer explanation and light penalty.

Acceptance:

- Quiz feels like a combat advantage system.
- Correct answer changes the battlefield within 1 second.
- Wrong answer teaches without feeling too punishing.

### Phase 3: Art unification

Deliverables:

1. Replace most emoji-like UI with original drawn shapes.
2. Improve Canvas defender drawings.
3. Improve Canvas enemy drawings.
4. Add hit / attack / death effects.

Acceptance:

- Units are readable without text.
- Enemy threat type is readable by silhouette.
- Visual style feels like one coherent game.

### Phase 4: Strategic level design

Deliverables:

1. Rebalance waves around chapter strategy.
2. Add chapter-specific battlefield backgrounds.
3. Add score / star rating.
4. Prepare optional upgrade system.

Acceptance:

- Each chapter feels different.
- Player changes strategy based on enemy composition.
- The game no longer feels like repeatedly placing the same best attacker.

---

## 11. Immediate Claude Task

Claude should implement **Phase 1 only**.

Do not implement Phase 2-4 yet.

### Required Phase 1 tasks

1. Display `LEVELS.tip` as a level tip banner.
2. Display next-wave preview:
   - Enemy names.
   - Enemy counts.
   - Optional short countdown.
3. Add lane warning before enemy spawn:
   - Flash the target lane for 1-2 seconds.
   - Must be visible but not obscure units.
4. Add selected defender info card:
   - Name.
   - Cost.
   - Function.
   - Recommended use.
   - Countered enemy type.
5. Apply first-pass school UI styling:
   - Left tower bar as pencil box.
   - Tip / wave cards as chalkboard or sticky-note UI.
   - Keep touch targets usable on mobile landscape.

### Must preserve

- `requestLandscapeMode`.
- `isOrientationBlocked`.
- `visualViewport` resize behavior.
- Safe-area handling.
- Save import / export.
- Existing level unlock flow.

### Required validation

Run:

```powershell
node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const m=html.match(/<script>([\s\S]*)<\/script>/); if(!m) throw new Error('script not found'); new Function(m[1]); console.log('inline script syntax: ok');"
```

Also report:

- Files changed.
- Main implementation points.
- How Phase 1 requirements were satisfied.
- Any mobile layout risks.

---

## 12. Pasteable Prompt for Claude

```text
請閱讀 VibeProjects/xueba-pvz/.vibemgmt/CLAUDE_HANDOFF_2026-06-13_game-optimization.md，然後只實作 Phase 1。

目標：
把目前 xueba-pvz 的可玩性清晰化，讓玩家在手機橫屏下更像玩一款完整的校園學習 PvZ-like 分路塔防。

請只做 Phase 1：
1. 顯示 LEVELS.tip 作為關卡提示 Banner。
2. 顯示下一波敵人預告，包含敵人名稱與數量。
3. 敵人出現前，在對應路線做 1-2 秒警告效果。
4. 道具被選中後，顯示名稱、消耗、功能、推薦用途、剋制敵人。
5. 做第一版校園 UI 視覺：文具盒道具欄、黑板/便條紙提示卡、清楚的手機橫屏 HUD。

限制：
- 維持單檔 index.html，不引入框架，不拆檔。
- 不使用 PvZ 原素材、角色名、音效或圖片。
- 不破壞橫屏鎖定、safe-area、visualViewport 修正。
- 不破壞存檔匯入/匯出。
- 手機橫屏仍要支援 iPhone 12-15。
- 新功能必須放在 index.html 對應區塊，不要散落插入。
- 完成後執行 inline script syntax check。

回報：
- 修改範圍
- 驗證結果
- Phase 1 每一項如何完成
- 剩餘風險
```

