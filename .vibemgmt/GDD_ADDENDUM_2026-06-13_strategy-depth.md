# xueba-pvz Unified GDD and Claude Implementation Plan

**Date:** 2026-06-13  
**Audience:** Claude Code / game design implementation agent  
**Project:** `VibeProjects/xueba-pvz`
**Primary file:** `index.html`
**Maintained document:** This file only
**Supersedes:** `.vibemgmt/CLAUDE_HANDOFF_2026-06-13_game-optimization.md`
**Purpose:** Single source for product direction, technical constraints, visual direction, phase plan, strategy depth, and Claude implementation prompts

---

## 0. Unified Document Policy

Future planning and Claude implementation handoff should use this file as the source of truth.

Do not maintain a separate `CLAUDE_HANDOFF_2026-06-13_game-optimization.md`. If the project direction changes, update this document instead.

---

## 1. Product Direction

### Implementation goal

Upgrade `xueba-pvz` from a playable prototype into a polished school-themed lane tower defense game.

The target experience is:

- PvZ-like lane defense clarity and pacing.
- Original school / learning theme.
- Mobile landscape first.
- Clear strategy, visible enemy waves, readable UI.
- More polished visual language without using PvZ assets, names, audio, character designs, or UI copies.

The goal is not to copy PvZ art. The goal is to reach a similar level of gameplay readability, role clarity, animation feedback, charm, and UI polish using original school-themed concepts.

### Product positioning

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

## 2. Non-Negotiable Constraints

Do not break existing:

- Landscape orientation gate.
- Safe-area handling.
- `visualViewport` battlefield sizing fix.
- Save import / export.
- Existing basic level progression.

Do not:

- Use Plants vs. Zombies original assets, names, audio, sprites, plant designs, zombie designs, or UI copies.
- Introduce React / Vue / Vite / npm build system in this phase.
- Split into multiple files unless explicitly approved by BOSS.
- Add external image assets in Phase 1.
- Place management docs outside `.vibemgmt/`.

After gameplay code changes, run at minimum:

```powershell
node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const m=html.match(/<script>([\s\S]*)<\/script>/); if(!m) throw new Error('script not found'); new Function(m[1]); console.log('inline script syntax: ok');"
```

---

## 3. Technical Architecture Decision

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
- CSS / Layout / Animation
- Constants / Data
  - TOWERS
  - ENEMIES
  - LEVELS
  - QUIZ_POOL
- Utils
- Save System
- GameEngine
  - state
  - waves
  - economy
  - collision
  - quiz rewards
  - orientation / viewport
- Drawing Helpers
  - towers
  - enemies
  - effects
  - battlefield
- UIManager
  - menu
  - HUD
  - tower bar
  - wave preview
  - quiz modal
  - reward picker
- Input Handling
- Main App Wiring
```

### When to propose splitting files

Only propose splitting if one of these becomes true:

- `index.html` exceeds roughly 3000 lines and edits become error-prone.
- Level data grows beyond 10-20 levels.
- External sprites, audio, fonts, or background assets are introduced.
- Multiple agents / humans begin editing in parallel and merge conflicts become frequent.
- A formal build, cache-busting, or asset pipeline becomes necessary.

If splitting becomes necessary later, propose a small static structure first:

```text
xueba-pvz/
- index.html
- src/
  - data.js
  - engine.js
  - drawing.js
  - ui.js
  - input.js
  - save.js
- assets/
  - sprites/
  - audio/
  - fonts/
```

Do not perform that split without BOSS approval.

---

## 4. Core Game Design

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

## 5. Learning / Quiz Design

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

## 6. Visual Design Direction

### PvZ-quality benchmark

The target quality bar is not "a nicer prototype UI." The target is closer to the production polish of classic lane tower defense games such as Plants vs. Zombies:

- Strong style guide discipline: consistent badges, patterns, iconography, packaging-like UI language, and reusable visual rules.
- Caricature-style characters: exaggerated shapes, readable faces, humorous proportions, and distinct silhouettes.
- Slick animation: idle motion, attack anticipation, hit reactions, death effects, and UI transitions must feel authored.
- Vivid but controlled colors: bright enough to feel playful, but with strong contrast between battlefield, units, enemies, and UI.
- Charm over raw resolution: HD or clean graphics are not enough if the result loses personality, visual rhythm, or hand-crafted appeal.
- Half-second readability: every defender and enemy should communicate role and threat immediately.

Implementation implication:

```text
Do not merely recolor the current UI.
Do not rely on emoji as final art.
Do not treat Phase 3 as minor polish.
Phase 3 must be a full original art direction pass with a small but complete production-quality vertical slice first.
```

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

## 7. UI Design Direction

### Main menu

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

## 8. Animation and Feedback

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

## 9. Master Phase Plan

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

### Phase 2.5: Strategy depth upgrade

Deliverables:

1. Level-start enemy preview.
2. Limited tool loadout.
3. Head teacher active skill meter.
4. Early next-wave call button.
5. Lightweight in-level upgrades.

Acceptance:

- Player prepares before the level starts.
- Loadout choices matter.
- Combat has at least one timing-based active skill.
- Advanced players can trade risk for reward.

### Phase 3: PvZ-level original school art pass

Goal:

```text
Reach PvZ-like production readability, charm, animation feedback, and visual consistency while staying fully original to the school learning theme.
```

This phase happens after Phase 2. Do not start it until gameplay clarity and quiz-to-combat integration are complete.

Phase 3 is not just cleanup. It is a proper art direction and implementation phase.

#### Phase 3A: Art direction vertical slice

Deliver a high-quality slice before replacing all art:

1. Redraw Chapter 1 classroom battlefield:
   - Desk-grid lanes.
   - Chalkboard background elements.
   - Window / chalk tray / wood trim details.
   - Clear safe battlefield area on mobile landscape.
2. Redraw the left tower bar as a polished pencil box:
   - Not generic buttons.
   - Sticker-card defenders.
   - Clear cost, cooldown, selected state, disabled state.
3. Redraw 3 defenders in original Canvas art:
   - 課本發電站
   - 鉛筆投手
   - 橡皮堡壘
4. Redraw 2 enemies in original Canvas art:
   - 懶惰怪
   - 抄作業怪
5. Add production-style feedback:
   - Idle animation.
   - Attack anticipation.
   - Hit flash.
   - Death paper scraps / chalk dust.
   - Placement bounce.

#### Phase 3B: Full art replacement

After the vertical slice is approved:

1. Replace most emoji-like UI with original drawn UI or Canvas shapes.
2. Redraw all defenders with a consistent school-stationery style.
3. Redraw all enemies with clear silhouettes and school-pressure themes.
4. Add scene backgrounds for all chapters:
   - Classroom.
   - Playground.
   - Library / study room.
   - Exam hall.
5. Add combat effects:
   - Projectile trails.
   - Slow / glue state.
   - Armor / tank state.
   - Boss arrival warning.
   - Reward skill effects.
6. Add a small internal style guide section inside the code or `.vibemgmt/`:
   - Color tokens.
   - Stroke widths.
   - Shadow rules.
   - Character shape language.
   - UI card rules.

Acceptance:

- Each defender and enemy is readable without text within half a second.
- Enemy threat type is readable by silhouette.
- Fast enemies look light, small, sharp, and mobile.
- Tank enemies look thick, heavy, and slow.
- Defender units look stable, friendly, and clearly school-themed.
- UI looks like a complete school fantasy game, not a prototype overlay.
- Animation feedback exists for placement, attack, hit, and death.
- The result remains original and does not copy PvZ assets, names, silhouettes, or character designs.
- If Canvas-only art cannot reach the target bar, propose an asset pipeline instead of continuing low-quality hand drawing.

### Phase 4: Strategic level design and long-term progression

Deliverables:

1. Rebalance waves around chapter strategy.
2. Add chapter-specific battlefield backgrounds.
3. Add score / star rating.
4. Add long-term progression and challenge variants.

Acceptance:

- Each chapter feels different.
- Player changes strategy based on enemy composition.
- The game no longer feels like repeatedly placing the same best attacker.

---

## 10. Immediate Claude Task: Phase 1 Only

Claude should implement Phase 1 only unless BOSS explicitly asks for a later phase.

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

### Pasteable prompt for Claude Phase 1

```text
請閱讀 VibeProjects/xueba-pvz/.vibemgmt/GDD_ADDENDUM_2026-06-13_strategy-depth.md，然後只實作 Phase 1。

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

---

## 11. Strategy Depth Design Intent

This section extends the master design with the strategy-depth systems for Phase 2.5 and Phase 4.

The game should not only become visually closer to a polished lane-defense game; it must also become more strategically interesting. The player should feel that they are:

- Reading enemy threats before the wave starts.
- Choosing a limited tool kit for the level.
- Making active decisions during combat.
- Managing risk by deciding whether to accelerate waves.
- Improving tools during a run.

The goal is not to copy any specific game. The goal is to learn from why similar tower defense games work.

---

## 12. Comparable Game Lessons

### Plants vs. Zombies

What to learn:

- Lane-based pressure is instantly readable.
- Enemy preview creates strategy before combat.
- Limited plant selection creates meaningful trade-offs.
- Every plant and enemy has a clear role.
- Units and enemies share the lane space, creating direct pressure when enemies reach defenders.

Application to `xueba-pvz`:

- Keep the 5-lane right-to-left defense.
- Add level-start enemy preview.
- Restrict loadout selection after early tutorial levels.
- Make each school tool counter a specific enemy type.

### Kingdom Rush

What to learn:

- Active skills create timing decisions.
- Hero / commander actions keep the player involved after placing towers.
- Wave pacing matters as much as tower stats.

Application to `xueba-pvz`:

- Add a `班主任技能槽` as a player-controlled active skill meter.
- Charge the meter through quiz success, enemy defeats, or wave survival.
- Let the player choose when to use a powerful classroom skill.

### Bloons TD

What to learn:

- Upgrade paths create long-term attachment to towers.
- Simple towers become interesting when they branch into different roles.
- Power fantasy grows over the course of a run.

Application to `xueba-pvz`:

- Add lightweight in-level upgrades first.
- Do not build a complex permanent meta system yet.
- Give each school tool one simple upgrade decision before adding full branches.

### GemCraft

What to learn:

- Wave manipulation creates high-skill risk/reward.
- Advanced players enjoy choosing when to increase pressure.
- Resource rewards can compensate for taking extra risk.

Application to `xueba-pvz`:

- Add an `提前上課` button to call the next wave early.
- Reward early wave calls with bonus energy.
- Let new players ignore the feature while skilled players use it to accelerate.

---

## 13. New Phase Order

Update the master roadmap to:

```text
Phase 1: Gameplay clarity
Phase 2: Quiz-to-combat integration
Phase 2.5: Strategy depth upgrade
Phase 3: PvZ-level original school art pass
Phase 4: Strategic level design and long-term progression
```

Rationale:

- Phase 1 makes the current game understandable.
- Phase 2 makes learning affect combat.
- Phase 2.5 makes the game worth replaying and thinking about.
- Phase 3 makes the visual presentation match the gameplay ambition.
- Phase 4 expands levels after the core systems are stronger.

Do not jump directly from Phase 2 to full art production if the strategy skeleton still feels shallow.

---

## 14. Phase 2.5: Strategy Depth Upgrade

### Goal

Make `xueba-pvz` feel less like a prototype where the player always uses the same best tools, and more like a strategic lane-defense game where each level asks a different question.

### Core deliverables

1. Level-start enemy preview.
2. Limited tool loadout.
3. Head teacher active skill meter.
4. Early next-wave call button.
5. Lightweight in-level upgrades.

---

## 15. System 1: Level-Start Enemy Preview

### Problem

The player currently reacts after enemies appear. This weakens strategy because the player cannot prepare intelligently.

### Design

Before a level starts, show a compact preparation panel:

```text
本關敵人
- 懶惰怪 x12
- 抄作業怪 x8
- 鐵桶考生 x2

推薦策略
- 用膠水陷阱拖住快速敵人
- 用橡皮堡壘擋住鐵桶考生
```

### Implementation notes

- Compute the preview from `LEVELS[levelIdx].waves`.
- Aggregate enemy counts across all waves.
- Sort by threat category or first appearance order.
- Use existing `ENEMIES` metadata, but add fields if needed:

```js
role: 'normal' | 'fast' | 'tank' | 'boss' | 'splitter'
hint: '用膠水陷阱拖住它'
```

### Acceptance

- Player can see the main threats before starting combat.
- Preview does not block the game after combat begins.
- Preview works on iPhone 12-15 landscape.

---

## 16. System 2: Limited Tool Loadout

### Problem

If every tool is always available, there is little strategic commitment. The player can simply use the same strongest setup every level.

### Design

After the tutorial chapter, the player may bring only 4 tools into a level.

Recommended progression:

```text
Chapter 1: fixed loadout, tutorial-friendly
Chapter 2: choose 4 of 6 tools
Chapter 3+: choose 4 tools, enemy preview shown first
```

### UI concept

Preparation screen:

```text
選擇 4 個文具上場
[課本發電站] [鉛筆投手] [墨水噴射器]
[膠水陷阱] [橡皮堡壘] [班主任指令]

已選: 3/4
```

### Implementation notes

- Add `activeLoadout` to game state.
- `renderTowerBar()` should render only tools in `activeLoadout`.
- Chapter 1 can auto-fill `activeLoadout` to avoid new-player friction.
- Save permanent unlocks separately from per-level loadout.

### Acceptance

- Player cannot start non-tutorial levels without the required loadout count.
- Tower bar only shows selected tools.
- Locked / unavailable tools remain visually clear.

---

## 17. System 3: Head Teacher Active Skill Meter

### Problem

The current game is mostly placement-driven. Once defenders are placed, the player needs more timing-based involvement.

### Design

Add a `班主任技能槽`.

The meter charges from:

- Correct quiz answers.
- Enemy defeats.
- Surviving a wave.

When full, the player can trigger one active skill.

### Initial active skills

Start with one or two skills only:

| Skill | Effect | Use case |
|---|---|---|
| 全班安靜 | Freeze or heavily slow all enemies for 3 seconds | Emergency control |
| 粉筆風暴 | Damage one selected lane | Lane collapse prevention |

Do not add a large skill tree yet.

### UI concept

```text
班主任技能
[ 72% ] 全班安靜
```

When full:

```text
班主任技能已準備
點擊釋放
```

### Implementation notes

- Add `teacherSkillCharge`.
- Add `teacherSkillReady`.
- Add a function such as `chargeTeacherSkill(amount)`.
- Correct quiz answers should provide a meaningful charge boost.
- Skill activation must show visible feedback.

### Acceptance

- Player understands when the skill is ready.
- Skill has immediate visible battlefield impact.
- Skill cannot be spammed.

---

## 18. System 4: Early Wave Call - `提前上課`

### Problem

Wave pacing is currently controlled mostly by the system. Skilled players need a way to trade risk for reward.

### Design

Add an `提前上課` button when the game is waiting for the next wave.

Effect:

- Starts the next wave immediately.
- Grants a small energy reward.
- If used repeatedly, creates overlapping pressure.

Suggested first tuning:

```text
提前上課 reward: +50 energy
Only available during wave wait / cleanup period
```

### UI copy

```text
提前上課
立刻開始下一波，獲得 +50 靈感值
```

### Implementation notes

- Expose `waitNextWave` status to UI.
- Add handler `callNextWaveEarly()`.
- If clicked:
  - Add energy.
  - Clear wait timer.
  - Start maze / next wave according to current flow.

Important: Current game inserts maze/quiz between waves. Decide whether early call skips cleanup only, or also skips maze. Recommended first version:

```text
提前上課 only shortens the wait timer before the existing between-wave flow.
Do not remove maze/quiz flow yet unless Phase 2 changes it.
```

### Acceptance

- Button only appears when meaningful.
- New players can ignore it.
- Skilled players can speed up runs.

---

## 19. System 5: Lightweight In-Level Upgrades

### Problem

Defenders do not currently create enough attachment or build variety across a level.

### Design

Add a simple in-level upgrade for each tool. First version should be lightweight: one upgrade per tool, no full upgrade tree yet.

Suggested upgrades:

| Tool | Upgrade | Effect |
|---|---|---|
| 課本發電站 | 高效筆記 | Produces energy faster |
| 鉛筆投手 | 削尖鉛筆 | Increased damage |
| 墨水噴射器 | 連續墨滴 | Increased attack rate |
| 膠水陷阱 | 黏性加強 | Longer slow duration |
| 橡皮堡壘 | 厚橡皮 | More HP |
| 班主任指令 | 重點提醒 | Larger burst radius or shorter cooldown |

### Upgrade trigger options

Recommended first version:

- Spend energy to upgrade an existing placed defender.
- Tap/select a placed defender to show an upgrade button.

Alternative:

- Award upgrade tokens after correct quiz answers.

Use energy first because it reuses existing economy.

### Acceptance

- Upgrade action is visible and understandable.
- Upgraded unit has a clear visual marker.
- Upgrade changes gameplay enough to feel worthwhile.

---

## 20. Priority Matrix

Use this order for Phase 2.5 implementation:

| Priority | Feature | Value | Effort | Reason |
|---|---|---:|---:|---|
| P0 | Level-start enemy preview | High | Low | Strategy begins before combat |
| P0 | Limited tool loadout | High | Medium | Creates real trade-offs |
| P1 | Head teacher active skill | High | Medium | Adds timing and excitement |
| P1 | Early wave call | Medium | Low | Adds skill expression |
| P2 | In-level upgrades | High | High | Adds depth but needs UI care |

Recommended build sequence:

1. Enemy preview.
2. Loadout selection.
3. Active skill meter.
4. Early wave call.
5. In-level upgrades.

---

## 21. Interaction With Existing Phases

### Phase 1 dependency

Phase 2.5 assumes Phase 1 already provides:

- Wave preview UI.
- Defender info cards.
- Lane warnings.
- Level tips.

### Phase 2 dependency

Phase 2.5 assumes Phase 2 already provides:

- Knowledge star / quiz integration.
- Correct-answer reward flow.
- At least some combat reward effects.

### Phase 3 dependency

Phase 3 art pass should take Phase 2.5 systems into account:

- Loadout screen needs polished art.
- Teacher skill meter needs its own identity.
- Upgrade states need visual markers.
- Early wave call needs strong but unobtrusive UI.

Do not make Phase 3 art before the strategy UI surfaces are known.

---

## 22. Phase 4: Strategic Level Design and Long-Term Progression

### Goal

Turn the improved systems from Phase 1, Phase 2, Phase 2.5, and Phase 3 into a real campaign structure.

Phase 4 is not another isolated feature pass. It should answer these questions:

- What makes each chapter feel different?
- Why should the player change loadout between levels?
- What does the player work toward after clearing one level?
- How does the game create replay value without becoming grindy?
- How can boss and challenge stages use the school-learning theme?

The target experience is a polished lane-defense campaign where every level teaches a new strategic idea, then combines it with previous ideas.

### Phase 4 entry criteria

Do not begin Phase 4 until:

- Phase 1 clarity features are stable.
- Phase 2 quiz-to-combat rewards are implemented.
- Phase 2.5 strategy systems are implemented or explicitly scoped down.
- Phase 3 art direction is approved enough that chapter identity can be planned around the visual style.

If Phase 3 is not approved, Phase 4 can still draft data tables, but should avoid large UI/art implementation.

---

### Pillar 1: Chapter Identity

Each chapter needs a different strategic identity, not only a different background.

Recommended chapter plan:

| Chapter | Theme | Strategic lesson | New pressure | Example enemies | Example unlock |
|---|---|---|---|---|---|
| Chapter 1 | Classroom Basics | Economy and basic lane defense | Slow mixed waves | Lazy Monster, Homework Drifter | Pencil Thrower |
| Chapter 2 | Playground Rush | Speed control and lane recovery | Fast enemies and split lanes | Copycat Runner, Snack Break Sprinter | Glue Trap |
| Chapter 3 | Library Focus | Tank handling and burst timing | High HP enemies and shielded waves | Sleepy Tank, Bucket Exam Student | Ink Sprayer upgrade |
| Chapter 4 | Exam Hall | Mixed threats and boss pressure | Combined waves, telegraphs, boss attacks | Final Exam Mob, Invigilator Boss | Head Teacher ultimate |

Design rule:

- A chapter should introduce one new pressure type.
- The next chapter should combine that pressure with earlier ones.
- Do not add many enemies at once. Add one readable enemy role, then reuse it in new combinations.

Acceptance:

- The player can describe each chapter in one sentence.
- The player naturally changes loadout because chapter threats change.
- The art pass can express the chapter through background, props, UI trims, and enemy silhouettes.

---

### Pillar 2: Level Archetypes

Phase 4 should convert raw levels into named strategic archetypes.

Use these archetypes when designing levels:

| Archetype | Purpose | Player question | Required systems |
|---|---|---|---|
| Tutorial | Teach one rule safely | Do I understand this tool? | Tips, fixed loadout |
| Economy Check | Test resource planning | Can I build enough before pressure arrives? | Energy economy, preview |
| Speed Check | Test control tools | Can I slow or block fast lanes? | Fast enemies, slow tools |
| Tank Check | Test focus fire and upgrades | Can I break high HP threats? | Tank enemies, upgrades |
| Mixed-Wave Exam | Combine two learned pressures | Can I pick the right loadout? | Enemy preview, limited loadout |
| Quiz-Heavy Stage | Make learning drive combat | Can I use answers as tactical rewards? | Quiz rewards, teacher skill |
| Resource-Starved Challenge | Force efficiency | Can I win with fewer resources? | Restricted energy, upgrades |
| Boss Stage | Create a memorable climax | Can I respond to telegraphed danger? | Boss, active skill, lane alerts |

Level design rule:

- Every level should have one primary archetype and one secondary twist.
- Do not make every level a random mixed wave.
- The preparation screen should explain the primary threat without spoiling the full solution.

Example level table:

| Level | Chapter | Archetype | Main threat | Loadout rule | Reward |
|---|---|---|---|---|---|
| 1-1 | Classroom | Tutorial | Basic lane enemy | Fixed | Pencil Thrower |
| 1-3 | Classroom | Economy Check | Wider lane spread | Fixed | Energy upgrade hint |
| 2-1 | Playground | Speed Check | Fast enemies | Choose 4 of 6 | Glue Trap |
| 2-4 | Playground | Mixed-Wave Exam | Fast + normal | Choose 4 of 6 | Challenge unlock |
| 3-2 | Library | Tank Check | High HP enemies | Choose 4 | Upgrade tutorial |
| 4-5 | Exam Hall | Boss Stage | Boss + mixed waves | Choose 4 | Campaign clear badge |

---

### Pillar 3: Boss Encounters

Boss stages should feel special, but still use the existing lane-defense rules.

Do not make bosses simply large HP enemies. Each boss needs:

- Telegraph: clear warning before the attack.
- Lane pressure: the boss changes the battlefield in one or more lanes.
- Counterplay: the player can respond with placement, active skill, quiz reward, or upgrade timing.
- Phase change: at least one behavior change after HP threshold.

Recommended first boss: `Invigilator Boss`

Theme:

- A strict exam supervisor who creates panic during the final exam.

Mechanics:

| Mechanic | Telegraph | Effect | Counterplay |
|---|---|---|---|
| Red Pen Mark | Target lane flashes red | Damages or disables one defender | Use shield/blocker or teacher skill |
| Silence Bell | Bell icon appears | Slows player energy gain briefly | Trigger quiz reward or early upgrade before it lands |
| Pop Quiz Pressure | Question card appears | Spawns extra small enemies if ignored | Answer quiz correctly for lane clear bonus |
| Final Sprint | Boss HP below 35% | Faster mixed waves | Save active skill for this window |

Acceptance:

- Boss attacks are readable before they happen.
- The player loses because of missed decisions, not invisible damage.
- Boss stage can be replayed with a different loadout strategy.

---

### Pillar 4: Star Rating and Replay Goals

Add a lightweight post-level rating system.

The goal is replay motivation, not punishment.

Suggested scoring:

| Star | Condition |
|---|---|
| 1 star | Clear the level |
| 2 stars | Clear with classroom HP above threshold, or fewer than N leaked enemies |
| 3 stars | Clear with strong performance: high HP, limited wrong answers, or optional early-wave bonus |

Optional bonus tags:

- `No Wrong Answers`
- `Fast Clear`
- `Perfect Defense`
- `Early Class Bonus`

Reward design:

- Stars unlock cosmetic classroom decorations, stickers, challenge levels, or minor upgrade points.
- Avoid large raw stat boosts that make old levels trivial.
- Low-star players should still progress through the main campaign.

Implementation notes:

- Add per-level result data:

```js
{
  levelId: '2-4',
  cleared: true,
  stars: 2,
  bestHp: 4,
  bestWrongAnswers: 1,
  bestTimeMs: 185000
}
```

- Save best result only when it improves.
- Show star goals before level start and final result after level clear.

Acceptance:

- Player understands how to earn more stars.
- Replay goals do not block main progression.
- Save/export continues to preserve progress.

---

### Pillar 5: Long-Term Progression

Keep long-term progression light at first.

Recommended progression layers:

1. Tool unlocks: new defenders appear through chapters.
2. Challenge unlocks: special variants unlock after star thresholds.
3. Cosmetic rewards: classroom stickers, desk skins, notebook badges.
4. Minor mastery upgrades: small upgrades tied to tool usage or star spending.

Avoid for the first version:

- Deep RPG gear systems.
- Random loot.
- Gacha-like mechanics.
- Large permanent stat inflation.
- Daily task pressure.

The game should feel like a skillful premium web game, not a retention treadmill.

Suggested mastery upgrade examples:

| Tool | Mastery upgrade | Limit |
|---|---|---|
| Pencil Thrower | +5% projectile speed | One level only |
| Book Generator | Starts with 10% charge | One level only |
| Glue Trap | Slightly longer slow | One level only |
| Eraser Wall | Small HP increase | One level only |

Acceptance:

- Progression gives goals between levels.
- A new player can understand the system in under 30 seconds.
- Permanent upgrades do not replace tactical play.

---

### Pillar 6: Challenge and Mini-Game Variants

PvZ-like games stay interesting because not every stage uses the exact same rules.

Add challenge variants only after the core campaign is stable.

Recommended variants:

| Variant | Rule | Why it is useful |
|---|---|---|
| Fixed Loadout Exam | Player must use a preset tool kit | Teaches underused tools |
| No Generator Challenge | Energy comes only from quiz rewards | Makes learning system central |
| One-Lane Crisis | Heavy pressure on one lane | Teaches emergency response |
| Speed Class | Faster wave timer | Rewards early-wave and active skill mastery |
| Boss Rematch | Stronger boss with changed pattern | Extends boss value |
| Quiz Marathon | More frequent quiz events | Links learning and survival |

Acceptance:

- Challenges reuse existing systems instead of creating a second game.
- Each challenge has one clear rule change.
- Rewards are desirable but not mandatory for campaign completion.

---

### Phase 4 Data Model Suggestions

Add level metadata before building new UI.

Recommended structure:

```js
const CHAPTERS = [
  {
    id: 'classroom',
    name: 'Classroom Basics',
    theme: 'classroom',
    strategicLesson: 'Economy and basic lane defense',
    levels: ['1-1', '1-2', '1-3', '1-4']
  }
];

const LEVELS = [
  {
    id: '2-4',
    chapterId: 'playground',
    name: 'Playground Mixed Drill',
    archetype: 'mixed-wave-exam',
    secondaryTwist: 'fast enemies arrive after normal pressure',
    enemyPreviewHint: 'Bring at least one slow or blocker tool.',
    loadoutSize: 4,
    starGoals: {
      twoStar: { minHp: 3 },
      threeStar: { minHp: 4, maxWrongAnswers: 1 }
    },
    reward: { type: 'challenge', id: 'speed-class-1' }
  }
];
```

Implementation order:

1. Create chapter and level metadata tables.
2. Map current levels into the new structure without changing balance.
3. Add star result calculation.
4. Add chapter/level select progression.
5. Add one boss stage.
6. Add one challenge variant only after the campaign loop works.

---

### Phase 4 Acceptance Criteria

Phase 4 is complete when:

- The game has a clear chapter map or level selection flow.
- Each chapter has a distinct strategic identity.
- Each level has an archetype and a readable preparation goal.
- Star ratings are saved and shown.
- At least one boss stage exists with telegraphed counterplay.
- At least one optional challenge variant exists.
- The player is encouraged to replay levels without being blocked by low-star clears.
- The implementation still preserves landscape lock, safe-area fixes, visualViewport sizing, and save import/export.

---

### Claude Implementation Prompt for Phase 4

Use this prompt after Phase 3 art direction is approved:

```text
Please read:
VibeProjects/xueba-pvz/.vibemgmt/GDD_ADDENDUM_2026-06-13_strategy-depth.md

Then implement Phase 4: Strategic level design and long-term progression.

Important sequencing:
- Do this only after Phase 1, Phase 2, Phase 2.5, and the Phase 3 art direction are approved.
- Before changing gameplay balance, first create the level/chapter data structure and a clear level table.
- Preserve the existing single-file index.html approach unless BOSS explicitly approves a split.

Implement in this order:
1. Add chapter and level metadata: chapter identity, level archetype, enemy preview hint, star goals, rewards.
2. Convert the current level flow to use level IDs and chapter IDs.
3. Add a simple chapter/level select screen suitable for mobile landscape.
4. Add star rating calculation and best-result saving.
5. Add one boss stage with telegraphed attacks and counterplay.
6. Add one optional challenge variant after the campaign loop works.
7. Add clear final result UI: stars, performance tags, reward, retry/next level.

Constraints:
- Keep the game as a single index.html for this phase.
- Do not use Plants vs. Zombies assets, character names, audio, images, or copied UI.
- Keep the school-learning theme original.
- Do not break landscape lock, safe-area handling, visualViewport sizing, or save import/export.
- Do not add permanent upgrades that make tactical play irrelevant.
- Do not add random loot or gacha-like mechanics.

Report back with:
1. Changed files
2. New data structures
3. Implemented Phase 4 features
4. Verification results
5. Remaining risks
```

---

## 23. Claude Implementation Prompt for Phase 2.5

Use this prompt after Phase 2 is complete:

```text
請閱讀：
VibeProjects/xueba-pvz/.vibemgmt/GDD_ADDENDUM_2026-06-13_strategy-depth.md

然後實作 Phase 2.5：策略深度升級。

目標：
讓 xueba-pvz 不只是可玩，而是具備 PvZ-like 的進關前策略、有限選擇、主動技能、風險收益與關卡內成長。

請依序實作：
1. 關卡前敵人預告：統計本關敵人名稱與數量，顯示推薦策略。
2. 有限工具 loadout：第一章固定，第二章起玩家選 4 個工具上場。
3. 班主任主動技能槽：答題/擊殺/過波充能，滿後可釋放 1 個主動技能。
4. 提前上課：等待下一波時可提前開始，給少量能量獎勵。
5. 簡易關卡內升級：每個工具先做 1 個升級效果。

限制：
- 維持單檔 index.html。
- 不引入框架。
- 不拆檔。
- 不使用 PvZ 原素材、角色名、音效或圖片。
- 不破壞橫屏鎖定、safe-area、visualViewport 修正。
- 不破壞存檔匯入/匯出。
- 不做 Phase 3 美術替換。
- 新功能必須放在 index.html 對應區塊，不要散落插入。
- 完成後執行 inline script syntax check。

回報：
1. 修改範圍
2. Phase 2.5 每項如何完成
3. 驗證結果
4. 剩餘風險
5. 建議的下一步
```
