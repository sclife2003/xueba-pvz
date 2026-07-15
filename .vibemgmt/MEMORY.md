# Vibe Project Memory: xueba-pvz（学霸校园大冒险）

**Last Updated**: 2026-07-15

---

## Context
- **Project Root**: `%USERPROFILE%\VibeProjects\xueba-pvz`
- **形态**: 单档 `index.html`（HTML5 Canvas，无框架、无构建；自带 painted raster 素材）；GitHub Pages 部署 `https://sclife2003.github.io/xueba-pvz/`
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
- [x] 超级大魔王「紫晶魔铠王」：4-2 最终 Boss、超大 SVG sprite、紫晶护盾、巨剑重击、低血量暴走
- [x] PvZ 式关卡节奏强化：主线每关 5-6 波、旗帜大波提示、压力波自动补齐、后期过波等待缩短
- [x] 超级大魔王美术升级：改用精致厚涂 sprite（透明背景、紫晶金属装甲风格），替换手写 SVG 作为游戏内显示资产
- [x] 全敌人美术批量升级：所有 `ENEMIES` 均有 `enemy_*_painted.png` 源图与 `enemy_*_painted.webp` runtime 图，`SPRITE_MANIFEST` 已全量切到精致 WebP；旧 SVG 保留为 fallback 资产
- [x] 我方文具与徽章美术升级：7 个 `TOWERS` 均有 `tower_*_painted.webp`，10 个成就/世界徽章接入 `assets/badges/*.webp`，收藏馆正式显示徽章图
- [x] 文具 5 级外观升级：7 个 `TOWERS` 均有 `tower_*_lv1..lv5.webp`，战斗场上、道具栏、装备工坊会按永久等级显示不同外观；`teacher` 明确重画为短发、些许花白、约 40 岁的「刘老师」
- [x] 高清 Canvas + 怪物设施破坏强化：主画布与离屏场景缓存改为 DPR backing store，输入坐标维持 CSS 像素；所有非友方怪物都有 `SPECIAL_ATTACKS` 特色攻击，可伤害、停摆、延迟或破坏我方文具设施
- [x] PvZ 式波段与怪物攻击规划：`MONSTER_ATTACK_PLAN` 覆盖非 elf 怪物 archetype，`WAVE_BEATS` 让 opener/swarm/support/siege/flag/finale 形成可读波段；每组怪通过 `laneMode` 形成 focus/split/sweep 路线压力
- [x] PvZ 式存活压力调校：`SCENE_BEAT_PROFILES` 让各场景使用不同波段顺序，`MIN_SURVIVAL_SECONDS` + `getWavePressureMultiplier()` 让怪物按角色、场景波段、pressureLevel 保底存活，避免小怪一出场就被秒杀
- [x] 收藏馆贴纸/徽章美化：关卡贴纸与敌人贴纸复用 painted enemy WebP，徽章走金属奖章框与红色缎带；已收集/未收集状态有专用卡片、光泽、锁定剪影与稀有度标
- [x] 印章大招与章间小游戏首轮：每击败 10 只怪获得 1 枚印章，文具可触发专属大招；`MONSTER_SKILL_DESIGN` 规划跑/远程/盾牌/毒气/抢阳光/BOSS 暴走，橡皮盾 CD 减半，章末接入正面射怪小游戏赚下一关开局阳光，题库新增小学 4-5 年级科技题
- [x] 怪物招式可视化与美术降级修正：怪物专有招式会生成 `skillFx` 光束/爆点，涂鸦怪会生成 2x2 `dirtyZone` 污染区；WebP 失败会回退 PNG，战斗开局等待 painted assets ready，避免退回旧 SVG/程序画风或透明占位
- [x] PvZ 招式模式落地：`PVZ_ZOMBIE_PATTERN_STUDY` 记录远程投射、跳跃越防线、召唤支援、破盾暴走、重击拆设施等设计参考；远程怪会生成 `enemyProjectile` 延迟命中后排，冲刺怪可 `tryVaultTower()` 跳过第一座设施，支援怪可 `summonSupportEnemies()` 增援同路/邻路压力
- [x] 怪物招式高质感点阵特效：18/18 非 elf 怪物接入四阶段 VFX profile；7 组 WebP runtime + PNG fallback，不使用正式 SVG 特效
- [x] 14 个可玩关卡独立主题化点阵场景：按 level id 切换横式场景；4 个章间小游戏各有独立横/直式 raster 构图，直式 TD 只显示方向 gate
- [x] 我方 7 种文具大招范围攻击重设计：采用「指定范围攻击」方案，具备独立 AoE、Lv1-Lv5 成长、预览/确认/取消与键盘等价操作
- [x] 阳光怪/截止铃怪/监考官/紫晶魔铠王多阶段、远程攻击与破绽窗口强化；蓄力期间锁住其他攻击，延迟结束后才执行重招
- [ ] `TICKET-20260715-005` 素材版本化 + 真正的跨装置云端存档：解耦图片 cache 与游戏进度，规划 local-first repository、Supabase Auth/RLS、revision conflict、离线 queue 与存档历史；Phase 2 前需拍板登入方式
- [ ] **真机** fullscreen/orientation 硬件测试（只有 BOSS 能做）
- [ ] 平衡手感调校（4-1/4-2 偏高、2-2 偏低、3-x 涂鸦怪回血）— 待真机反馈
- [ ] 占位节点 → 真关（各世界约 9 个 placeholder）— 待平衡基准 + 设计
- [ ] cosmetic 教室装饰系统 — 待 BOSS 定（换什么/用什么货币/在哪展示）

---

## Knowledge Graph

### 架构 / 关键系统（都在 index.html 内分区）
- **世界地图**: `WORLDS`（小学/初中/高中/大学/研究所）；节点用 `levelIndexById(id)` 解析（id-based，插关稳健）。主线世界按 `unlockedLevel` 解锁；研究所 `advanced:true`，`isCampaignCleared(results)`（通关 4-2）解锁。
- **关卡**: `LEVELS` = 11 campaign（id `1-1`..`4-2`）+ `challenge-speed` + 研究所 `r-1`/`r-2`（共 14）。`CAMPAIGN_COUNT=11`。
- **关卡节奏 / 大波**: `PACING_RULES` + `WAVE_BEATS` + `applyPacingTuning()` 在 `LEVELS` 建好后执行，会复制每关 waves、补足目标波数（classroom/playground 5 波，library/exam/challenge/research 6 波）、标记 `beat`/`flagWave`/`pressureLevel`，并用 `getInterWaveDelay()` 让 threatTier 越高的关卡过波等待越短。波段按 opener/swarm/support_mix/siege/flag/finale 增压，group-level `laneMode` 让 focus/split/sweep 路线压力可读。
- **存活压力 / 场景节奏**: `SCENE_BEAT_PROFILES` 决定各 chapter 的波段顺序（操场偏 swarm、图书馆偏 support/siege、考场偏 siege/finale）。`scaleEnemyStats(enemyDef, level, challengeRule, wave)` 现在接收当前 wave，使用 `MIN_SURVIVAL_SECONDS` 与 `getWavePressureMultiplier()` 做最低存活时间保底；小怪、快怪、支援怪、坦克、Boss 分开调，Boss 倍率有上限以避免纯磨血。
- **敌人 / 场景怪物表**: `SCENE_MONSTER_TABLE` 依 classroom/playground/library/exam/research/challenge 组织怪物池；11 个主线关卡均有 `signatureEnemy`，并实际写入 waves。新怪包含 erasercrumb/hallpass/quizpaper/whistle/jump_rope/sunshine/quiet/bookstack/bookmark/paperstorm/deadline，正式 runtime 均使用 `assets/sprites/enemy_*_painted.webp`，PNG 为 fallback。
- **怪物特色攻击 / 设施破坏**: `SPECIAL_ATTACKS` 覆盖所有非 `elf` 怪物；`MONSTER_ATTACK_PLAN` 将怪物规划为 melee/rush/ranged/support/siege/economy/boss archetype；`findSpecialAttackTarget` 只锁定同路、接近防线的存活文具，`resolveSpecialAttack` 统一处理伤害、静音、射击延迟和能量扣减；`damageTower` 是设施破坏入口（啃咬、红笔点名、紫晶重击、特色攻击都走此路径），方便后续按怪物或关卡调难度。
- **印章大招 / 文具爆发**: `STAMP_KILLS_REQUIRED = 10`，非友方怪物死亡会通过 `registerEnemyDefeat()` 累积印章（上限 3）。`TOOL_ULTIMATES` 定义 7 种指定范围 AoE 与五级 scaling；`armStampUltimate()` 进入瞄准，`confirmStampUltimate()` 依实时敌人格位结算，`cancelStampUltimate()` 保证取消不耗印章。鼠标/触控、方向键、Enter/Space、Escape 均有完整路径，UI 提供固定取消按钮与 ARIA live。
- **章间小游戏**: `chapterMinigameForCompletedLevel(levelIdx)` 会在主线 chapter 切换时返回 `CHAPTER_MINIGAMES` 配置；结算页先进入 `minigame` phase，玩家正面视角点击飞来的怪物赚 `rewardEarned`，`finishChapterMinigame()` 把结果写入 `pendingSunBonus`，下一关 `startLevel()` 自动把这笔阳光加到开局能量。
- **图片加载保护 / 招式可视化**: `ASSETS.load()` 对 WebP 失败会尝试同名 PNG，`startLevelWhenAssetsReady()` 确保进入战斗前 high-quality painted assets 已 ready。若某张预期资产仍缺失，战场使用 `drawMissingPaintedAsset()` 中性占位，不再回退旧 SVG/程序绘图。`VFX_MANIFEST` 覆盖 18/18 非 elf 怪物，7 个 raster 家族通过 `spawnVfxPhase()` 呈现 telegraph/cast/travel/impact；涂鸦类技能另有可破坏 `dirtyZone`。
- **PvZ 启发怪物招式模式**: `PVZ_ZOMBIE_PATTERN_STUDY` 保留招式研究结论；`PVZ_SPECIAL_ATTACK_UPGRADES` 把远程怪转为 `projectile + targeting:'backline'`，把 hallpass/bat/jump_rope 转为 `vault`，把 whistle 转为 `summon:'slime'`。Runtime 入口为 `spawnEnemyProjectile()` / `updateEnemyProjectile()`、`tryVaultTower()`、`summonSupportEnemies()`，分别制造延迟投射物、越过第一座阻挡设施、召唤同路/邻路支援怪。
- **BOSS 机制**: `BOSS_MECHANICS` 管理 sunshine/deadline/boss/super_boss 的 phase table。阶段重招先建立 0.8-1.5 秒 `bossAction` 预警，蓄力期间锁住移动、啃咬、特殊技、重击、冲锋与抢资源；延迟结束后才执行远程、召唤、危险区或冲锋并开启 vulnerability window。阳光怪仍保留每抢 5 个阳光攻击/速度 +20%；监考官保留低血暴走攻击/速度 +30%。
- **超级大魔王**: `super_boss` / 「紫晶魔铠王」是 4-2 signature 最终 Boss，具备远程、场地/召唤、冲锋三类压力；runtime 会依 phase 切换 `enemy_super_boss_phase1..3_painted.webp`，PNG 为 fallback，且保留紫晶护盾、巨剑重击与低血暴走。
- **怪物美术方向**: 最终品质怪物使用 `assets/sprites/enemy_*_painted.webp` 精致 runtime raster sprite（透明背景、厚涂光影、清晰剪影），PNG 源图保留在同目录，手写 SVG 只当机制占位或 fallback。`SPRITE_MANIFEST` 现在覆盖所有 `ENEMIES`（包含原本缺 manifest 的 `note` / `doodle`），并全量指向 painted WebP。
- **我方与徽章美术方向**: 7 个 `TOWERS` 使用 `assets/sprites/tower_*_painted.webp` runtime 基底图（同目录保留 PNG 源图），并扩展为 `tower_*_lv1..lv5.webp` 五阶外观；战斗场上、道具栏、装备工坊均通过 `getTowerAssetId(id, level)` 按等级取图。`teacher` 的角色设定为「刘老师」：约 40 岁、短发、两侧些许花白、严肃但不恐怖。徽章使用 `BADGE_ART` + `assets/badges/badge_*.webp`，收藏馆有「成就徽章」与「世界徽章」两区，未解锁徽章用灰阶资产展示。
- **进阶系统（deferred → 仅研究所 advanced 关）**: 备战自选 4/6 文具、关卡内升级（selectField/UPGRADES）、提前上课（callNextWaveEarly）、挑战规则（rule:'speed'）。由关卡 `advanced` 旗标驱动 `advancedMode`（主线恒 false）。
- **装备工坊 / 文具等级**: schema v3 使用 `toolLevels{id:1..5}` 作为正本；旧 `toolUpgrades:true` 自动迁移为 Lv2。`TOOL_LEVELS` 定义每件文具 5 级实战加成（伤害、攻速、产能、血量、穿透数、冷却等），包含新文具「直尺穿线」（直线穿透输出）。碎片 `shards` 逐级购买；`toolUpgrades` 仅保留为 legacy display compatibility。
- **收藏馆**: 关卡贴纸 / 敌人贴纸(遇到即收集,排除 elf) / 成就徽章 / 世界徽章。`renderCollection()` 使用 `collection-card--owned/locked`、`collection-art--sticker/badge`、`levelStickerAsset()` 与 `asset: 'enemy_' + id` 复用现有高质感 WebP；徽章使用专属金属圆框 + 缎带，未解锁显示灰阶剪影与锁定遮罩。
- **音效/语音**: `SOUND`(WebAudio 振荡器) + `VOICE`(speechSynthesis)，全 feature-detect + try/catch；首手势解锁 AudioContext；开关存 `xueba_pvz_settings`（独立 localStorage，不动存档 schema）。
- **场景美术 / 方向契约**: `SCENE_MANIFEST` 为 14 个关卡提供独立横式 WebP/PNG；`MINIGAME_SCENE_MANIFEST` 为 4 个章间小游戏各提供独立 landscape/portrait 构图。`ORIENTATION_MATRIX` 固定 `td/maze + portrait -> gate`，只有 `minigame + portrait -> portrait`；`drawRasterScene()` 以清晰 contain 主图配低对比边缘延伸，中央操作区维持低杂讯。
- **高清渲染**: `GameEngine.resize()` 使用 `window.devicePixelRatio`（上限 3）设置 canvas backing store，`draw()` 每帧重设 DPR transform；`renderStageCache()` 也用 DPR 离屏缓存并以 CSS 尺寸贴回主画布。输入换算一律用 `this.w/this.h`，避免高 DPI 下鼠标/触屏偏移。

### 存档 schema（`xueba_pvz_save_v1`，payload schemaVersion:3）
`{ schemaVersion, unlockedLevel, hp, results{id:{stars,bestHp,bestWrong}}, stickers{}, badges{}, worldProgress{}, shards, toolLevels{}, toolUpgrades{} }`
- 迁移 `migrateSave` + `reconcileUnlockedLevelFromResults`（用 id-keyed results 反推解锁，插关不打回前面）。
- `toolLevels` 是 v3 正本；`toolUpgrades` 是旧版相容字段，旧 true 值会迁移成对应文具 Lv2。
- export/import：`b64encodeUtf8`/`b64decodeUtf8`（UTF-8 安全，修过 btoa CJK 崩溃）；import 白名单**必须**含所有新字段（否则往返丢失）。全程 ASCII（显示文字即时取，不入档）。

### 不可破坏的硬约束
单档不拆、不引框架、不用 PvZ 素材；橫屏锁定/safe-area/visualViewport；存档导入导出向后相容（新字段必须同步 4 处：loadGameSave 默认 + migrate + export + import 白名单）。怪物强度现在由 `difficulty + threatTier` 共同 scaling，新增文具/等级时需同步检查关卡强度。验证三件套：inline script syntax、`<script>`=1、`git diff --check`。

### Tech Debt / 已知
- 平衡：4-1/4-2 effHP 偏高（28-30k，但有班主任炸弹+升级抵消，待真机）；2-2 偏低；3-x 涂鸦怪回血可能拖关。详见 `.vibemgmt/reviews/BALANCE_2026-06-14_audit-tuning.md`。
- 真机平衡重点（2026-07-03）：1-2 啃咬 DPS、2-2 阳光怪抢 orb + mpDrain、3-x 安静魔 silence 链、4-1 监考官点名 + 拆防、4-2 紫晶魔铠王 titanSlam + 紫晶斩是否叠成无解。
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
phaseAB-worldmap / phaseC-collection / combat-overhaul / phaseD-classroom-vertical-slice / content-expansion / shard-equipment-upgrade（皆 PASS）、BALANCE 审计、landscape-viewport cross review、`CROSSREVIEW_2026-07-03_monster-facility-damage.md`、`CLAUDE_PLAN_2026-07-03_pvz-wave-archetypes.md`。

---

## 下一步建议（BOSS 选）
(a) 先真机跑一轮（11 关 + 研究所 + 工坊 + 音效）回报手感 → 据此调平衡再填 placeholder 真关；
(b) 现在就把 9 个 placeholder 填成真关（保守难度，之后再调）；
(c) 先做 cosmetic 教室装饰系统（需 BOSS 定换什么/货币/展示位）。
