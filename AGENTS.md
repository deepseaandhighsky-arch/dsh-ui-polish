# AGENTS.md — dsh-ui-polish 项目工作指南

> 面向后续 AI agent 与协作者的入口文档。最后更新：2026-10-30（v0.4.0）。
> 资产清单见 `docs/PROJECT-ASSETS.md`，文档索引见 `docs/README.md`，CDS 资产调用矩阵见 `docs/research/CDS-ASSET-MAP.md`，体验差异报告见 `docs/research/UX-DIFF-REPORT.md`。

## 0. 项目定位与硬约束

本插件**只做 dsh UI 的视觉、交互与性能优化**，在 dsh 原生设计语言之上打磨：

- ✅ 允许：动效节奏、阴影/描边、滚动边缘渐隐、状态光晕、排版光学、命中区、第三方插件界面的观感适配。
- ❌ 禁止：改变 UI 分布、信息架构、导航结构、面板位置；新增/删除功能区；克隆 Claude/ChatGPT 等第三方品牌皮肤或布局。
- ✅ 只用官方通道：`ctx.theme.overrideTokens`、官方 Slot、dsh 公开的 DOM 标记、dsh 样式表所有权约定。
- ❌ 不修改 dsh 核心包或其它插件的源码/CSSOM；不读写用户生产环境。
- ❌ 不做"为了对齐某个产品"的布局级改造。参考竞品只借思路（光学、物理、密度），不搬皮肤。

判断标准：一个改动如果会让用户"找不到原来的东西"，就不属于本插件。

## 1. 当前状态（v0.4.0）

- npm 包 `dsh-ui-polish@0.4.0`；annotated tag `v0.4.0`。
- 设置：`设置 → 界面打磨`（独立 `settings.section` 分区），总开关 + 8 组：
  `motion` / `elevation` / `fades` / `glow` / `plugins` / `optics` / `targets` / `sound`；卡片底部另有 4 档「弹簧手感」选择。
- 运行时机制：`scrollFade`（泛用滚动渐隐）+ `retime`（第三方插件过渡重定时影子样式表）+ `sfx`（可选合成音效）。
- 视觉机制：28px 7 档非线性 mask、CDS 双层阴影/深色倒角、1.8s 呼吸 + 1.1s 扫光 + 推理点光环、排版光学、输入区命中区、4 档 Framer 弹簧。
- 验证：55/55 单元测试、`tsc --noEmit` 通过、`lib/client.js` 约 51.7 KB（gzip 15.9 KB）、`npm pack` 12 个文件约 32.9 KB。
- 截图：0.4.0 六张（会话浅/暗、设置浅/暗、弹簧档位、dsh-context 面板）+ 0.2.0 四张；0.1.0 六张仅本地保留（含本地路径，未随公开仓库发布）；0.3.0 未单独保留，其变化已被 0.4.0 覆盖。

## 2. 快速命令

```bash
npm install
npm test            # vitest，55 项
npx tsc --noEmit    # 类型检查
npm run build       # tsdown → lib/client.js（IIFE，dsh 客户端模块格式）
npm run pack:check  # 检查 npm 包内容
```

## 3. 架构地图

| 文件 | 角色 | 状态 |
|---|---|---|
| `src/client.ts` | 客户端入口：`window.__ModuleLoader__.load`，运行时 `require('react')`，返回 `{ inject, apply }` | 接线 |
| `src/client/apply.ts` | 编排：样式表、偏好门、令牌覆盖、两个引擎、音效门、Slot 注册、卸载清理 | 接线 |
| `src/client/prefs.ts` | localStorage `dsh-ui-polish.v1`：8 组偏好 + 弹簧档位（`sound` 默认关） | 接线 |
| `src/client/components.ts` | 独立设置分区 `SettingsSection`（含弹簧档位分段控件）、光晕 `ComposerGlow`、音效状态接线 | 接线 |
| `src/client/styles.ts` | 单条 `POLISH_CSS`：7 档 mask、排版光学、命中区、光晕/扫光、4 档弹簧变量、消息入场、设置分区/卡片/行 | 接线 |
| `src/client/scrollFade.ts` | 泛用滚动发现 + 边缘测量 + 清理 | 接线 |
| `src/client/retime.ts` | 第三方样式表只读解析 + 影子样式表生成 | 接线 |
| `src/client/palette.ts` | 高度组令牌覆盖（发丝描边 + CDS 双层三级阴影，明暗成对） | 接线 |
| `src/client/types.ts` | dsh client ctx 的结构化最小类型 | 接线 |
| `src/audio/sfx.ts` | 合成音效：3 声 cue、AudioContext 懒创建/手势解锁/卸载关闭 | 接线（默认关） |
| `src/motion/createHooks.ts` | 动效 hook 工厂：`useScrollPinning`（保留库，4 项测试）+ `useAmbientGlow`（接线） | 仅 `useAmbientGlow` 接线 |
| `src/motion/spring.ts` | 运动资产：dsh 时长、CDS 5 阶时长/easing、`sampleSpring`、4 档 `SPRING_PROFILES` | 接线 |
| `index.js` | 主机半部 no-op Cordis 插件 | 必要占位 |
| `locale/*.json` | 插件管理器展示元数据（`dsh-app-boot` 读取 `locale/{zh,en}.json`） | 元数据已接线；设置页 UI 文案未 i18n（硬编码中文） |

测试：`apply.test.ts`（注册/8 组门控/引擎+音效同步矩阵/清理）、`scrollFade.test.ts`（谓词/引擎）、`retime.test.ts`（缩放/规则收集/影子表）、`styles.test.ts`（7 档 mask/光学/光晕/弹簧档位/命中区断言）、`palette.test.ts`、`spring.test.ts`（采样/4 档参数）、`prefs.test.ts`（默认值/持久化/回退）、`sfx.test.ts`（cue 定义/调度/静音/无 AudioContext）、`components.test.tsx`（音效状态机/弹簧持久化）、`createHooks.test.tsx`。

## 4. dsh 集成契约（改代码前先读）

- `package.json` 的 `dsh` 字段：
  - `bundle.patch: ./cordis.patch.yml`（`insert` 一行 `dsh-ui-polish`）；
  - `client: { platform: "web", immediately: true, inject: ["@deepseek-ai/dsh-client-ui-conversation", "@deepseek-ai/dsh-client-ui-settings"] }`；
  - `exports["./client"] → lib/client.js`。
- 客户端 bundle 是 **classic script IIFE**，不能出现 `import`；React 通过 `require('react')` 从宿主模块表取得。
- Slot：`conversation.composer.dock`（光晕，order 40）、`settings.section`（独立分区，id `ui-polish`，order 30）。**不要**再往 `settings.general.item` 加行。
- 主题：`ctx.theme.overrideTokens(source, { token: { light, dark } })`；ThemePresenter 写到 `<body>` 内联属性，卸载时自动撤回。
- 样式：`<style data-plugin="dsh-ui-polish" data-plugin-css="...">`，由 `ctx.effect` 负责创建/移除。
- html 门属性：`data-polish`、`data-polish-<group>`（8 组）、`data-polish-spring`（4 档）、`data-polish-glow-*`；CSS 只读这些属性切换。
- 音效不依赖 dsh API：`window.AudioContext` 懒创建，`syncSound(on)` 在用户手势内调用 `resume()`，卸载时 `close()`；**默认关闭**，无外部音频文件。
- 弹簧档位写入 localStorage 的 `spring` 字段，`setSpringProfile` 必须同时更新偏好与组件状态（v0.4.0 踩过只改本地 state 的坑）。

## 5. 运行时机制要点

### 滚动渐隐（scrollFade）
- 发现谓词：`overflowY` 为 auto/scroll、纵向溢出 > 4px、尺寸 ≥ 96×96、可见；排除 html/body/textarea/input/select、contenteditable、`[role=textbox]`、CodeMirror/Monaco/xterm、`[data-polish-fade="off"]`。
- 对话容器写 `scope="native"`（受 `fades` 组），其它面板写 `scope="plugin"`（受 `plugins` 组）。
- 1000ms 轮询 + 400ms DOM 变更防抖 + resize；节点替换自动重扫；卸载移除全部监听/属性。
- CSS 用 `mask-image` 直贴 scrollport（与原生 TurnNavigator/ChatGroupSeat 同款），**28px、7 档非线性**（15/30/45/60/75/87/100%）。mask 由 `--polish-fade-top/bottom` 驱动，`@property` 注册类型；边沿切换是即时的，**不要给注册属性加 transition**（后台窗口会停在 0，导致 mask 消失，已复现）。
- `scroll-padding-block` 跟随渐隐深度，键盘/锚点滚动不会把内容停在遮罩下。

### 排版光学（optics）
- 只打稳定标记：`[data-chat-flow-kind='assistant-step'][data-chat-group-part='response']`、`[data-step-process-body]`、`[data-clock]`、`[data-turn-process]`、`[data-turn-tail]`、`[data-composer-stat]`。
- 规则：标题 `text-wrap: balance`、段落 `text-wrap: pretty`、链接下划线偏移、数字 `tabular-nums`、对话容器 `font-optical-sizing: auto`、暗色可变字体 `font-weight 390`。
- 不改变字号、行高、间距、宽度；关闭 optics 后所有计算值回到宿主原值。

### 阴影与发丝边（elevation）
- 只覆盖 `--dsw-elevation-stroke-color` 与 `--dsw-shadow-lv1/2/3`；三级阴影均为“近距接触 + 远距扩散”双层。
- 深色模式在阴影列表前加 `inset 0 0 0 1px rgba(255,255,255,0.05–0.08)` 模拟倒角顶光；仍然是中性黑/白 alpha，不引入色相。
- 宿主以 `box-shadow` 消费这些 token（已核对），不要改成 `filter: drop-shadow` 假设。

### 状态光晕（glow）
- `ComposerGlow` 仍挂在 `conversation.composer.dock` order 40，`useChat` 选择器推导 idle/streaming/error。
- 流式中：光晕 1.8s 呼吸 + `::after` 1.1s 扫光；`[data-step-process] [data-shimmer-decoration]` 1.8s 推理点光环。
- 全部动画在 `prefers-reduced-motion: reduce` 下降级为静态；错误态只显示静态错误色、不扫光。

### 弹簧档位（spring）
- `sampleSpring(k,c,m,duration,samples=30)` 用二阶阻尼振子生成 CSS `linear()`；**最后一点必须钉到 1**，否则截断的弹簧会留下 1.02–1.05 的残余偏移。
- 4 档参数：轻快 600/30/1（0.22s）、从容 320/28/1（0.35s，默认）、弹性 380/18/1（0.58s）、咬合 1200/80/0.1（0.32s）。咬合采样延长到 320ms 以真正收敛。
- 档位写入 `data-polish-spring`，CSS 只生成 `--polish-spring` / `--polish-spring-dur` 两个变量；消息入场、开关、光晕共用。
- 只作用于插件自有动效；不要把它套到宿主按钮的 `transition` 上（会覆盖背景/颜色过渡）。

### 合成音效（sound）
- `src/audio/sfx.ts`：3 声 cue（发送 440→660、完成 660→440、出错 320→240Hz），Oscillator + Gain 包络，单声 160–240ms，峰值增益 ≤0.12。
- 默认关闭（`GROUP_DEFAULTS.sound=false`）；`syncSound(on)` 在用户手势内创建/resume AudioContext，并安装一次性 `pointerdown/keydown` 解锁；`disposeAudio()` 卸载时关闭。
- `ComposerGlow` 用 `status` 前后值播放 send/done/error；`playCue` 在未启用、无 AudioContext 或未 running 时静默返回 false。
- 不采用 AudioWorklet：短提示音没有持续 PCM 流，AudioWorklet 的环形缓冲/音频线程复杂度无收益。

### 输入区命中区（targets）
- 只作用于 `[data-composer-seat] button`，`::after { inset: -5px -2px; }`，视觉尺寸不变；不要再扩大，避免相邻控件命中区重叠。
- 验证：28×28 添加按钮上方 4px 的 `elementFromPoint`，targets on 命中按钮、off 命中父容器。

### 插件过渡重定时（retime）
- 只读 `style[data-plugin-css]` 且 `data-plugin` 非本插件、非 `@deepseek-ai/*`。
- 生成我们自己的影子样式表：复制选择器与 `@media/@supports/@container/@layer` 上下文，`transition-duration × 1.2`。
- 跳过：含 `var()`（令牌已接管）、`0s/0ms`、`calc()`、>1.2s；只改 transition，不改 animation。
- 整表包裹 `@media (prefers-reduced-motion: no-preference)`；追加到 `<head>` 末尾以保证同特异性后序胜出；不用 `!important`。
- 关闭第 5 组或总开关时整表移除；**绝不改写插件 CSSOM**。

### 设置分区
- `settings.section` 注册 `{ id: 'ui-polish', order: 30, label: '界面打磨' }`；组件收到 `close`，页面自绘简介 + 卡片 + 10 行（总开关 + 8 组 + 弹簧档位）。
- 导航图标由壳按内置 id 白名单决定，第三方分区是通用齿轮；**不要**做 DOM 换图标 hack。

## 6. 隔离验证流程（必须）

```bash
cd .testenv
DSH_HOME="$PWD/dsh-home" npx dsh web --port 3311 --no-open
# token 在 .testenv/web.log 第一行
```

- 测试 profile 已 link 本仓库：`.testenv/dsh-home/profiles/web` 的 `dsh-ui-polish: "link:<repo-root>"`；build 后重启即可。
- 共存插件：dsh-context 0.78.0、dsh-better-sidebar 0.28.2。
- 必查：八门控属性、发现目标数/scope、28px 七档 mask（顶部 4.2/8.4/12.6/16.8/21/24.36/28px）、重定时 A/B（`.12s/.15s → .144s/.18s`）、令牌过渡保持 `0.24s`、optics 开/关（`pretty/wrap`、`tabular-nums/normal`、`390/400`）、流式光晕三动画、弹簧档位（bouncy → `0.58s` 且曲线含 `1.1926`）、音效（context running、发送/完成振荡器计数 1→2）、命中区（`elementFromPoint` 开/关）、设置 10 行、总开关关闭后目标清零/影子表移除/令牌回退/重新开启恢复。
- **截图只允许用内嵌浏览器 `tab.screenshot()`**；宿主 webview 偶发 `surface preparation timed out` / `guest not attached`。截图前必须先 `tab.goto(目标URL)` 并 `waitForLoadState({state:"domcontentloaded"})`；超时先 `tab.reload()` 等约 1 秒重试一次，仍失败再关闭标签、新建、导航后截。**绝不使用系统级/窗口级截图**（会误抓用户生产环境）。0.4.0 六张已按此流程补齐。
- **绝不安装、修改或重启用户的生产 dsh**；所有实验只在 `.testenv` + `DSH_HOME`。

## 7. 参考资料

| 资料 | 位置 | 说明 |
|---|---|---|
| 第三方插件 UI 实现研究 | `docs/research/PLUGIN-UI-RESEARCH.md` | dsh-context / better-sidebar 的 slot、令牌、样式表、服务模式；含 v0.2.0 实施状态 |
| CDS 资产调用矩阵 | `docs/research/CDS-ASSET-MAP.md` | open-claude-ui 资产逐项“采用/适配/不采用”、运行时证据、后续候选 |
| 有无插件体验差异 | `docs/research/UX-DIFF-REPORT.md` | v0.4.0 总开关开/关的量化 A/B、场景化差异、主观评估与局限 |
| Claude 桌面端 UI 差距评估 | `docs/research/UI-GAP-VS-CLAUDE-CODE.md` | 基于 open-claude-ui 的体验对比、优先级、归属 |
| open-claude-ui 研究仓库 | `.testenv/open-claude-ui`（gitignored，commit `c1f923a`） | 社区逆向，非官方；v1/v2 文档 + code-examples |
| dsh 核心 UI 包 | `.testenv/node_modules/@deepseek-ai/dsh-client-ui-*` | 0.2.1-rc.5；slot/快捷键/样式契约 |
| dsh 设置契约 | `dsh-client-ui-settings/lib/types/client/contract/slots.d.ts` | `settings.section` 等 |
| 截图 | `docs/screenshots/`、`docs/research/coexist-*.png` | 0.4.0 六张 + 0.2.0 四张 + 共存三张；0.1.0 六张仅本地（含路径，未发布） |

重新获取 open-claude-ui：

```bash
git clone --depth 1 https://github.com/Caho1/open-claude-ui .testenv/open-claude-ui
```

## 8. 已知限制 / 技术债

- `locale/*.json` 是插件管理器展示元数据（`dsh-app-boot` 读取 `locale/{zh,en}.json`），**不是**运行时 UI 字典；设置页文案目前硬编码中文。若要英文界面，需 `ctx.locale.register` 并在组件里使用 `t()`。
- `useScrollPinning` 仅作库保留（原生已有 ScrollFollow，接线会打架）；`reducedMotion.ts`、`useScrollFade`、`useRovingFocus`、`useReducedMotion` 已于 2026-10-30 清理删除。
- 渐隐已是 28px 7 档；`scroll-state` 容器查询与 `scroll(self)` 时间线在宿主 Chromium 146/Electron 41 不生效，属性驱动是刻意选择。**不要**给 `--polish-fade-*` 加 transition（后台窗口会停在 0）。
- 横向渐隐暂未启用：当前视图没有非代码/表格的横向滚动容器；代码/表格渐隐可能遮住选中文本，需 opt-in 设计。
- 骨架扫光暂未启用：宿主只有 CSS Module 哈希类名（`skeletonBar`/`skeletonFill`），没有稳定 `data-skeleton` 标记。
- 暗色 `font-weight 390` 只在可变字体生效；Windows 静态系统字体忽略，属预期。
- 音效默认关闭；未使用 AudioWorklet（短提示音不需要音频线程）。若宿主策略拦截 AudioContext，`playCue` 静默返回 false。
- 命中区只覆盖 `[data-composer-seat] button`；弹层/菜单内控件未覆盖。
- 重定时只覆盖 transition；未知 at-rule 子树跳过；`@deepseek-ai/*` 原生样式表不重定时。
- 0.3.0 未单独保留截图；其视觉变化已被 0.4.0 六张截图覆盖。
- 设置分区图标为通用齿轮（契约无 icon 字段）。
- `engines.dsh: >=0.2.0 <0.3.0`；dsh 处于 developer preview，升级需重新验证。
- `lib/`、`.testenv/`、`.zcode/`、`node_modules/` 均被 gitignore；发布包靠 build 产物。

## 9. 编辑规范与踩坑

- `POLISH_CSS` 是模板字符串：**注释里不能出现反引号**（会截断字符串；v0.4.0 又踩过一次，TS 报 `TS1005 ',' expected`）。
- 客户端 hook 必须在 render 期间按稳定顺序调用（React #321）；`useChat` 是快照选择器，不能放进 effect。`ComposerGlow` 里 `useRef` → `useAmbientGlow` → `useEffect` 的顺序必须保持稳定。
- 测试环境是 jsdom，没有布局：几何用 `Object.defineProperty` 脚本化；`vitest.setup.ts` 只 stub 了 matchMedia（scroll pinning 的 reduced-motion 分支需要）。
- 不要在 sticky 伪元素上加 CSS transition（会永久挂起 opacity）；这也是改用 mask 的原因之一。
- CSS 选择器不要依赖 CSS Module 哈希类名；第三方定位只靠几何 + 计算样式 + 样式表所有权。可用的 dsh 稳定标记：`[data-conversation-scroll]`、`[data-chat-flow-kind]`、`[data-chat-group-part]`、`[data-step-process]`、`[data-shimmer-decoration]`、`[data-clock]`、`[data-composer-input]`、`[data-composer-stat]`、`[data-composer-dock]`、`[data-composer-seat]`；暗色主题是 `body[data-ds-dark-theme]`。
- 深色主题不要用 `.dark` / `prefers-color-scheme` 猜测：dsh 在 `<body>` 写 `data-ds-dark-theme`，`<html>` 写 `data-ds-theme-source`。
- 新增运行时机制必须提供 `sync(enabled)` 与 `dispose()`，并在 `apply.ts` 的 groups effect 里接线、在 cleanup 里释放。
- 注册自定义属性的 transition 在宿主后台窗口可能停在 0；不要用它驱动 mask/透明度等关键可见状态。`styles.test.ts` 对 7 档停止点、28px、光学/光晕/弹簧档位/命中区有字符串断言，改 CSS 时同步更新。
- `sampleSpring` 必须把最后一个采样钉到 1；截断弹簧（如 snappy 0.22s、heavy 0.32s）否则会留下 1–5% 的残余偏移。
- 弹簧档位是“偏好 + 本地 state”双写：`setSpringProfile` 负责持久化并触发 apply，组件再用 `setValue` 更新选中态。只改 state 会出现“UI 选中但 `data-polish-spring` 不变”的假生效。
- `window.AudioContext` 在 TS 的 `Window` 类型上不直接可用；用结构化 cast `{ AudioContext?: typeof AudioContext; webkitAudioContext?: ... }`。
- 测试里 fake AudioContext 的 `close()` 必须返回 Promise（代码里有 `.catch`）；AudioContext 缺失时 `syncSound`/`playCue` 不得抛错。
- 提交前：`npm test` + `npx tsc --noEmit` + `npm run build`；文档改动同步 README/CHANGELOG。

## 10. 版本与发布

- 语义化版本；CHANGELOG 用 Keep a Changelog（中文）；新功能升 minor，修复升 patch。
- 提交信息：`feat: / fix: / test: / docs: / chore:` + 中文摘要。
- 发布：build → `npm run pack:check` → commit → `git tag -a vX.Y.Z`。
- 不要提交 `.testenv/`、`.zcode/`、`lib/`、`node_modules/`、`*.log`。

## 11. 下一步（v0.4.0 后的候选）

`docs/research/UI-GAP-VS-CLAUDE-CODE.md` 的 P0 已完成，v0.4.0 又补了弹簧档位、音效与输入区命中区：

1. ✅ 7 档非线性渐隐 mask（28px）；
2. ✅ 推理环境光晕（推理分隔点 + composer 光晕）；
3. ✅ 数字等宽、暗色字重补偿、设置开关 + 输入区命中区；
4. ✅ 4 档 Framer 弹簧（CSS `linear()` 采样）；
5. ✅ 发送/完成/出错合成音效（默认关闭，AudioWorklet 不采用）；
6. 待评估：横向渐隐（需 opt-in）、骨架屏扫光（需 `data-*` 稳定标记）、审批音效（需审批事件）；0.3.0 无独立截图，已被 0.4.0 覆盖。

多窗口、会话行密度、Always Allow、离线队列、内置编辑/Git、沙箱产物、语音/TTS 属于核心或第三方插件，不在本插件范围。