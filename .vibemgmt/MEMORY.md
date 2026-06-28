# Vibe Project Memory: xueba-pvz（学霸校园大冒险）

**Last Updated**: 2026-06-28

---

## Context
- **Project Root**: `%USERPROFILE%\VibeProjects\xueba-pvz`
- **形态**: 单档 `index.html`（HTML5 Canvas，无框架、无构建、无外部素材）；GitHub Pages 部署 `https://sclife2003.github.io/xueba-pvz/`
- **定位**: 小学生友善、原创校园主题 PvZ-like 5 路塔防 + 答题转战斗 + 世界地图 + 收集。**不抄 PvZ 素材/角色/名称**。
- **唯一设计书**: `.vibemgmt/GDD_ADDENDUM_2026-06-13_strategy-depth.md`（§0.0 Document Status 标 active；§0.1 儿童化转向；§0.1.1 永久升级逆转决策）
- **协作模式**: BOSS 真机手感验收者；Claude 实作 + 独立 QA（reviewer subagent / DOM-stub smoke）+ commit/push。

---

## Current Objectives
- [x] Phase A/B 儿童友善简化 + 学校世界地图
- [x] Phase C 收藏馆 + 今天我学会了 + 错题回顾
- [x] 核心战斗趣味重整（渐进解锁 / 敌人特色 / 值日生救场）
- [x] Phase D 美术：教室 + 操场 + 图书馆 + 考场（offscreen cache）
- [x] 主线扩充 11 关 + 2 新怪（传纸条 laneHop / 涂鸦怪 doodleHeal）+ 存档迁移
- [x] 知识碎片 → 永久装备升级（装备工坊）
- [x] P0 音效 + 语音朗读 + 答错不惩罚
- [x] 研究所进阶区（通关大学部解锁 + 重启 deferred 进阶系统）
- [x] 数值平衡首轮（铲平 2-1/3-1 世界开场陡坡）
- [x] 原创概念题包 +24
- [x] 存档 schema v3 + 文具 5 级资料模型 + 新文具「直尺穿线」+ 怪物 threatTier scaling
- [x] 每关 signature 新怪 + 场景怪物表 + 阳光怪/监考官 BOSS 机制 + 新怪 SVG sprite
- [ ] **真机** fullscreen/orientation 硬件测试（只有 BOSS 能做）
- [ ] 平衡手感调校（4-1/4-2 偏高、2-2 偏低、3-x 涂鸦怪回血）— 待真机反馈
- [ ] 占位节点 → 真关（各世界约 9 个 placeholder）— 待平衡基准 + 设计
- [ ] cosmetic 教室装饰系统 — 待 BOSS 定（换什么/用什么货币/在哪展示）

---

## Knowledge Graph

### 架构 / 关键系统（都在 index.html 内分区）
- **世界地图**: `WORLDS`（小学/初中/高中/大学/研究所）；节点用 `levelIndexById(id)` 解析（id-based，插关稳健）。主线世界按 `unlockedLevel` 解锁；研究所 `advanced:true`，`isCampaignCleared(results)`（通关 4-2）解锁。
- **关卡**: `LEVELS` = 11 campaign（id `1-1`..`4-2`）+ `challenge-speed` + 研究所 `r-1`/`r-2`（共 14）。`CAMPAIGN_COUNT=11`。
- **敌人 / 场景怪物表**: `SCENE_MONSTER_TABLE` 依 classroom/playground/library/exam/research/challenge 组织怪物池；11 个主线关卡均有 `signatureEnemy`，并实际写入 waves。新怪包含 erasercrumb/hallpass/quizpaper/whistle/jump_rope/sunshine/quiet/bookstack/bookmark/paperstorm/deadline，均有 `assets/sprites/enemy_*.svg`。
- **BOSS 机制**: `BOSS_MECHANICS` 管理 sunshine/deadline/boss。阳光怪(sunSteal)会抢场上 orb，每 5 个阳光叠 1 层，攻击与速度 +20%；监考官(boss)高血量，保留 focusDrain 红笔点名，并在低血量触发 rageRush 暴走 5 秒，攻击与速度 +30%；deadline 复用 rageRush 作为考场压迫型小 Boss。
- **进阶系统（deferred → 仅研究所 advanced 关）**: 备战自选 4/6 文具、关卡内升级（selectField/UPGRADES）、提前上课（callNextWaveEarly）、挑战规则（rule:'speed'）。由关卡 `advanced` 旗标驱动 `advancedMode`（主线恒 false）。
- **装备工坊 / 文具等级**: schema v3 使用 `toolLevels{id:1..5}` 作为正本；旧 `toolUpgrades:true` 自动迁移为 Lv2。`TOOL_LEVELS` 定义每件文具 5 级实战加成（伤害、攻速、产能、血量、穿透数、冷却等），包含新文具「直尺穿线」（直线穿透输出）。碎片 `shards` 逐级购买；`toolUpgrades` 仅保留为 legacy display compatibility。
- **收藏馆**: 关卡贴纸 / 敌人贴纸(遇到即收集,排除 elf) / 世界徽章。
- **音效/语音**: `SOUND`(WebAudio 振荡器) + `VOICE`(speechSynthesis)，全 feature-detect + try/catch；首手势解锁 AudioContext；开关存 `xueba_pvz_settings`（独立 localStorage，不动存档 schema）。
- **美术**: 每章 offscreen-cache 舞台（`getStageCacheKey` 含 chapterId；`paintTiles` 共用；稳态每帧仅 1 drawImage + 轻量动画 overlay）。

### 存档 schema（`xueba_pvz_save_v1`，payload schemaVersion:3）
`{ schemaVersion, unlockedLevel, hp, results{id:{stars,bestHp,bestWrong}}, stickers{}, badges{}, worldProgress{}, shards, toolLevels{}, toolUpgrades{} }`
- 迁移 `migrateSave` + `reconcileUnlockedLevelFromResults`（用 id-keyed results 反推解锁，插关不打回前面）。
- `toolLevels` 是 v3 正本；`toolUpgrades` 是旧版相容字段，旧 true 值会迁移成对应文具 Lv2。
- export/import：`b64encodeUtf8`/`b64decodeUtf8`（UTF-8 安全，修过 btoa CJK 崩溃）；import 白名单**必须**含所有新字段（否则往返丢失）。全程 ASCII（显示文字即时取，不入档）。

### 不可破坏的硬约束
单档不拆、不引框架、不用 PvZ 素材；橫屏锁定/safe-area/visualViewport；存档导入导出向后相容（新字段必须同步 4 处：loadGameSave 默认 + migrate + export + import 白名单）。怪物强度现在由 `difficulty + threatTier` 共同 scaling，新增文具/等级时需同步检查关卡强度。验证三件套：inline script syntax、`<script>`=1、`git diff --check`。

### Tech Debt / 已知
- 平衡：4-1/4-2 effHP 偏高（28-30k，但有班主任炸弹+升级抵消，待真机）；2-2 偏低；3-x 涂鸦怪回血可能拖关。详见 `.vibemgmt/reviews/BALANCE_2026-06-14_audit-tuning.md`。
- iOS Safari 不支援 orientation lock → 用「请横放手机」遮罩 fallback（预期行为，非 bug）。

---

## 提交历史（关键里程碑）
```
55ec9e7 原创概念题包 +24
49c9dc9 研究所进阶区 + 重启 deferred 进阶系统
269fec4 Phase D 美术扩到操场/图书馆/考场（通用离屏舞台）
ea4ada6 P0 音效 + 语音朗读 + 答错不惩罚
45e81cd 数值平衡：铲平 2-1/3-1 世界开场陡坡
31caa95 知识碎片 → 永久装备升级（装备工坊）
217a7ba 主线扩充 11 关 + 2 新怪 + 存档迁移
6604341 Phase D 教室 vertical slice + offscreen cache
713f7bc 核心战斗趣味重整
d6fab79 Phase C 收集系统
d6cd4f4 Phase A+B 儿童友善 + 世界地图
d6ce574 GDD 修订（Document Status + 存档 schema + 世界映射）
```

## 审查报告（`.vibemgmt/reviews/`）
phaseAB-worldmap / phaseC-collection / combat-overhaul / phaseD-classroom-vertical-slice / content-expansion / shard-equipment-upgrade（皆 PASS）、BALANCE 审计、landscape-viewport cross review。

---

## 下一步建议（BOSS 选）
(a) 先真机跑一轮（11 关 + 研究所 + 工坊 + 音效）回报手感 → 据此调平衡再填 placeholder 真关；
(b) 现在就把 9 个 placeholder 填成真关（保守难度，之后再调）；
(c) 先做 cosmetic 教室装饰系统（需 BOSS 定换什么/货币/展示位）。
