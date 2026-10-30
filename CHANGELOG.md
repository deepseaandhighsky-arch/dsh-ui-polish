# 更新日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.4.1] - 2026-10-30

GitHub 仓库安装修复版本。

### 修复

- 修复在 dsh 插件页用 GitHub 仓库地址安装时报 `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` 的问题：将构建好的 `lib/client.js` 纳入版本控制，并移除 `prepare` 构建脚本。安装 GitHub 仓库时不再需要 `allowBuilds` 或构建脚本授权。
- 新增 `dist` 分支/tag `v0.4.1-dist`：只含发布包（约 33 KB），GitHub 安装使用 `#v0.4.1-dist`，不再下载整仓库的源码/截图/文档。
- `.gitignore` 只忽略临时构建文件（`lib/client.iife.js`、source map），不再忽略 `lib/client.js`。

### 变更

- 版本 0.4.1；README 增加「从 GitHub 仓库安装」步骤（UI 与 CLI）。

### 验证

- `npm test` 55/55；`tsc --noEmit` 通过；`npm run build` 生成 51.7 KB 客户端；仓库包含 `lib/client.js` 与 `cordis.patch.yml`。

## [0.4.0] - 2026-10-30

交互手感与反馈版本。把 Framer Motion 的四套弹簧预设翻译为 CSS `linear()`，补上可选的合成音效与输入区命中区，并交付有无插件的体验差异报告。

### 新增

- **4 档弹簧手感**：轻快 600/30/1（0.22s，+8.8%）、从容 320/28/1（0.35s，+1.8%，默认）、弹性 380/18/1（0.58s，+19.4%）、咬合 1200/80/0.1（0.32s，零过冲）；用二阶阻尼振子采样为 CSS `linear()`，作用于消息入场、设置开关、光晕入场；设置页新增分段控件并持久化。
- **第 7 组「输入区命中区」**：`[data-composer-seat] button::after` 外扩 5px/2px，视觉尺寸不变；28×28 添加按钮上方 4px 实测开命中按钮、关命中父容器。
- **第 8 组「轻量交互音效」**：发送 440→660Hz、完成 660→440Hz、出错 320→240Hz 三声合成提示；Oscillator + Gain 包络，无外部音频文件；默认关闭，首次手势解锁 AudioContext，卸载关闭。
- **体验差异报告**：`docs/research/UX-DIFF-REPORT.md`，总开关 on/off 量化 A/B、场景化差异、主观评估与局限。
- **测试**：新增 `prefs.test.ts`、`sfx.test.ts`、`components.test.tsx`，覆盖默认值、持久化、cue 调度、音效状态机。

### 变更

- 消息入场从固定 `easeEnter 0.3s` 改为当前弹簧档位；设置开关从 15 阶 CDS 弹簧改为 4 档 Framer 弹簧。
- GROUPS 从 6 组扩到 8 组（`targets`、`sound`）；`sound` 默认关闭，其余默认开启。
- 设置页 10 行（总开关 + 8 组 + 弹簧档位）。

### 修复

- 弹簧档位只改组件本地 state、未写入偏好的接线错误；修正为 `setSpringProfile` + 本地 state 双写，`data-polish-spring` 与 localStorage 同步。

### 验证

- 隔离环境：8 门控、开关 on→off→on 完整回退/恢复、28px 七档 mask、重定时 `.144s/.18s`、光晕三动画、弹簧 bouncy `0.58s`/峰值 `1.1926`、音效 `AudioContext=running` 且发送/完成振荡器计数 1→2、命中区 `elementFromPoint` 开/关。
- 单元测试 55/55；`tsc --noEmit` 通过；构建 51.7 KB（gzip 15.9 KB）；npm pack 12 文件 32.9 KB。
- 横向渐隐、骨架扫光经调研暂缓；0.4.0 截图已补 6 张（会话浅/暗、设置浅/暗、弹簧档位、dsh-context 面板），未使用系统级截图。

### 文档

- 新增 `docs/research/UX-DIFF-REPORT.md`；同步 README、AGENTS.md、docs/README.md、docs/PROJECT-ASSETS.md、CDS-ASSET-MAP.md 与 UI 差距报告；补拍 6 张 0.4.0 截图。

## [0.3.0] - 2026-10-30

CDS 资产落地版本。把 open-claude-ui 中可迁移的**光学、物理与密度**资产逐项适配到 dsh 原生令牌与 DOM 标记上；不引入品牌色、字体或布局。逐项对照见 `docs/research/CDS-ASSET-MAP.md`。

### 新增

- **排版光学组 `optics`**（第 6 组）：助手回复/思考正文 `text-wrap: pretty`，标题 `text-wrap: balance`，时间/轮次/用量/composer 统计/代码 `tabular-nums`，对话容器 `font-optical-sizing: auto`，链接下划线光学偏移；暗色可变字体正文 `font-weight 390` 补偿视网膜光渗。
- **28px 7 档非线性滚动渐隐**：采用 CDS 的 15/30/45/60/75/87/100% 停止点与 `#0000000d/26/4d/80/b3/d9/000` Alpha 阶梯，替换原 3 段 24px mask；`scroll-padding-block` 跟随渐隐深度。
- **CDS 双层环境光阴影**：`--dsw-shadow-lv1/2/3` 改为“近距遮蔽 + 远距扩散”双层；深色阴影前置 `inset` 白色倒角；发丝描边对齐 10%/9%。
- **状态光晕升级**：1.8s 呼吸 + 1.1s `epitaxy` 扫光；推理分隔点 `[data-shimmer-decoration]` 同步 1.8s 光环。
- **消息入场**：0.3s `easeEnter` 消融，仅作用于最后 12 个 flow 节点，翻页不重播。
- **设置开关弹簧**：15 阶 `linear()`（+9.15% 过冲、1.0004 收敛），450ms 释放 / 60ms 按压；`::before` 命中区扩展到 52×40。
- **运动资产导出**：`EASE_ENTER`、`EASE_SWEEP`、`SPRING_LINEAR`、`CDS_DURATION`，以及 `styles.test.ts` 的资产回归断言。

### 变更

- `--ds-ease-in-out` 从 easeOutCubic 换为 CDS `easeSwift`（`cubic-bezier(.16,1,.3,1)`）；时长仍为 0.12/0.24/0.36s。
- 清理未接线/重复代码：删除 `src/motion/reducedMotion.ts`、`useScrollFade`（已被 `scrollFade` 引擎取代）、`useRovingFocus`、`useReducedMotion`；`useScrollPinning` 保留为测试库。
- 单元测试 30 → 39，构建 32 KB → 41.8 KB（gzip 13.0 KB），npm 包 18.3 KB → 23.2 KB。

### 修复

- 移除 `--polish-fade-*` 上的 CSS 过渡：注册属性过渡在宿主后台窗口会停在 0，导致 mask 消失；改为属性切换，保留 7 档本体。

### 验证

- 隔离环境（dsh 0.2.1-rc.5 + dsh-context 0.78.0 + dsh-better-sidebar 0.28.2）：六门控、28px 16 停止点、插件面板 28px、optics 开/关可逆、总开关完整回退/恢复、光晕三动画与复位、开关弹簧/命中区、重定时 A/B 全部通过。
- `tsc --noEmit` 通过；`npm pack` 9 文件 23.2 KB。
- 0.3.0 截图待补：宿主 IAB 截图通道 `surface preparation timed out`，未使用系统级截图。

### 文档

- 新增 `docs/research/CDS-ASSET-MAP.md`（采用/适配/不采用矩阵）；同步 README、AGENTS.md、docs/README.md、docs/PROJECT-ASSETS.md。
- 修正 locale 说明：`locale/*.json` 是插件管理器展示元数据（由 `dsh-app-boot` 读取），不是运行时 UI 字典；设置页文案仍为中文。

## [0.2.0] - 2026-10-30

泛用型插件适配版本。优化从「dsh 自身界面」扩展到「任何第三方插件界面」，且不需要插件作者配合；设置项独立为一个与通用设置并列的分区。针对 dsh 0.2.1-rc.5 在隔离环境（dsh-context 0.78.0 + dsh-better-sidebar 0.28.2 共存）实测。

### 新增

- **独立设置分区「界面打磨」**：通过官方 `settings.section` 注册，与「通用设置」并列；总开关与 5 组开关移入该分区，通用设置内不再出现打磨行。
- **第 5 组「插件界面适配」**：统一控制两个运行时机制——插件面板滚动渐隐、插件样式表过渡重定时。
- **泛用滚动渐隐**：运行时发现任意可见、面板尺寸、纵向溢出的滚动容器并打标；编辑器和终端（CodeMirror / Monaco / xterm / textarea / contenteditable）按类排除，任意元素可用 `data-polish-fade="off"` 单点退出。
- **泛用过渡重定时**：读取第三方插件注入的样式表（`data-plugin-css`，排除本插件与 `@deepseek-ai/*`），生成我们自己的影子样式表，复制选择器与 `@media/@supports/@container/@layer` 上下文，把 `transition-duration` 按 1.2× 缩放。不改插件 CSSOM，关闭即整表移除；含 `var()`（令牌驱动）、`0s`、`calc()`、>1.2s 的声明跳过，避免二次缩放；整表包裹 `prefers-reduced-motion: no-preference`。

### 变更

- 滚动渐隐技术由 sticky 伪元素改为与原生 dsh 同款的 `mask-image` 直贴 scrollport（24px），对话流一并迁移。mask 不参与布局，flex/grid 滚动容器与插件的 `::before/::after` 均不受影响。
- 渐隐状态桥接由固定 `[data-conversation-scroll]` + 500ms 轮询升级为泛用引擎（1000ms 轮询 + 400ms DOM 变更防抖 + resize），节点替换后自动重扫。
- 设置注册从 `settings.general.item`（5 行）改为 `settings.section`（1 个分区）。

### 验证

- 单元测试 31/31（新增泛用发现谓词/引擎、时长缩放/规则收集/影子表生成、apply 层 section 注册与双引擎同步矩阵）。
- 运行时：插件元素过渡 `.12s/.15s → .144s/.18s`，关闭第 5 组后回原生；dsh-context 令牌过渡保持 `0.24s`（未被二次缩放）；对话流与 `.lc-root` 的 mask 三态正确；总开关关闭后目标属性清零、影子表移除、令牌回退。

## [0.1.0] - 2026-10-30

首个可用版本。针对 dsh 0.2.1-rc.5 开发并完成隔离环境实测。

### 新增

- **更顺滑的过渡动效**：基础过渡时长放慢（0.1/0.2/0.3s → 0.12/0.24/0.36s）并切换缓出曲线，经 `ctx.theme.overrideTokens` 官方通道下发。
- **更柔和的阴影层次**：发丝描边减淡、三级阴影拉长稀释（明暗各自调校），不引入任何新色相。
- **滚动边缘渐隐**：对话流滚动离开边界时上下边缘 32px 背景色渐隐（sticky 伪元素 + 500ms 自愈状态桥接）。
- **会话状态光晕**：回复生成中输入框下方呼吸细线光晕，出错转错误色；状态源自 dsh `useChat` 快照。
- **设置开关**：五组开关（总开关 + 四组）经官方 `settings.general.item` 席位注入 通用设置，偏好持久化于浏览器本地。

### 技术说明

- 双通道注入：令牌层（`ctx.theme.overrideTokens`）+ Slot 组件层（`conversation.composer.dock` / `settings.general.item`）。
- 动效库移植自 open-claude-ui 交互物理并重写为 dsh 风格；滚动钉住未接入 UI（dsh 原生已内置 ScrollFollow 与回底按钮）。
- 全部资源经 `ctx.effect` 注册，卸载/热重载自动清理；卸载时撤除样式表、令牌覆盖、Slot 注册与 html 门属性。

### 兼容性

- `engines.dsh: >=0.2.0 <0.3.0`（dsh 处于 developer preview，破坏性变更频繁）。
