【Cross Review Request】
Author: Claude
Prepared By: Claude
Source: Author CLI request, not BOSS directive
Tier: Recommended (VibeProject 源码，非全域 SSOT trigger path)

Repo: VibeProjects/xueba-pvz
Commit under review: 883149f  (parent: c335c4d)
对照命令: git diff c335c4d 883149f -- index.html

Scope:
- index.html
  - GameEngine.resize() 横向分支
  - GameEngine.mount() 事件监听
  - 顶层 isOrientationBlocked(phase)

Intent:
- BOSS 实测反馈：横屏时「战场格子右/下被切」。根因判断为移动浏览器的动态工具栏 /
  刘海吃掉 window.innerHeight，但布局用 innerHeight 计算，导致底部格子落入工具栏区被遮。
- 本次改动在保留 Codex 的「横屏锁定 + 竖屏遮罩 + update 暂停」fallback 前提下，
  改用真实可视区计算战场范围。

Changed:
1. resize() 横向：用 window.visualViewport.width/height（排除动态工具栏）取代 this.w/this.h
   计算 availW/availH/OY/OX/C；topM/bottomM 纳入 env(safe-area-inset top/bottom)；
   C 改用 vw 计算并 Math.max(1, ...) 保底。
2. mount()：新增 orientationchange 与 visualViewport 'resize' 监听，旋转/工具栏伸缩时即时重算。
3. isOrientationBlocked(phase)：由 `phase !== 'menu'` 收窄为 `phase === 'td' || phase === 'maze'`，
   使竖屏下的 结算/过关/救援 弹窗不再被「请横放」遮罩盖住（修 Codex 版小瑕疵）。

Validation Run:
- node vm.Script(inline <script>)  : SYNTAX OK
- 迷宫可达性 3000 次随机测试（前次）: unreachable exits = 0
- 已部署线上供真机测试: https://sclife2003.github.io/xueba-pvz/

Known Risks:
1. visualViewport 在极旧浏览器不支持 → 回退 innerHeight，行为等同改动前（安全降级，不会更糟）。
2. iOS Safari 横屏底部半透明工具栏是否被 visualViewport 完全排除，尚未在真实 iPhone 验证。
3. readSafeAreaInset() 每次 resize 创建/移除一个 probe div；高频 resize 有极小开销（可接受）。
4. mount() 新增的事件监听在 unmount() 中未解绑（目前 unmount 仅 cancelAnimationFrame）。
   本游戏 engine 仅 mount 一次，无实际泄漏，但若未来支持重挂载需补 removeEventListener。

Review Focus:
- A. visualViewport vh/vw 推导是否正确保证整片 5×C 战场落在可视区内、底/右不被切。
- B. C = Math.floor((vw - OX - rightM) / G) 是否确保最右列敌人 spawn(x = OX + C*G) 不超出 vw - rightM。
- C. isOrientationBlocked 收窄后是否漏掉任何「需要横屏完整 UI」的阶段。
- D. 是否认为需要在 unmount 解绑新增监听（Risk 4），还是当前单例足够。

Decision Needed:
- approve / request changes / question
