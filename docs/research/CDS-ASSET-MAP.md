# CDS 资产调用清单

本文件记录 `open-claude-ui`（commit `c1f923a`）的文档与代码资产，哪些被移植进 `dsh-ui-polish`、如何适配、为什么有些资产**故意不用**。

原则不变：只借光学、物理、密度与交互思路，不搬 Claude 品牌色、字体、布局或信息架构；所有落地值必须回到 dsh 自己的 `--dsw-*` / `--ds-*` 令牌体系。

## 1. 资产来源

| 来源 | 关键内容 |
|---|---|
| `docs/v1/01-设计哲学与设计令牌体系.md` | 表面阶梯、发丝边、双层阴影、7 档渐隐、排版阶梯、动效曲线 |
| `docs/v1/02-基础原子组件与交互控件.md` | 按钮 15 阶 `linear()` 弹簧、状态灯、骨架扫光、附件磁贴 |
| `docs/v1/03-会话核心流与指令交互引擎.md` | 消息气泡、思考时间轴、输入法守卫、滚动图钉 |
| `docs/v1/04-动效物理学、着色器与环境光影.md` | 关键帧、Framer Motion 弹簧、`wl-glow`、7 档 mask、scroll-driven |
| `docs/v1/05-视听多媒体与产物交互物理学.md` | 音频、Lightbox、View Transitions、双栏拖拽、Diff |
| `docs/v1/06-系统级桌面架构与协作拓扑.md` | 桌面标题栏、拖拽死区、容器查询 |
| `docs/v1/07-工程配置与资产代码库总览.md` | `cds-theme.css`、Tailwind 配置、宿主桥接 |
| `docs/v1/08-AI-Agent-前端-UI-与动效开发指南.md` | Agent 质量门禁、弹簧决策树、字体/精度规范 |
| `docs/v2/Claude-Desktop-2.0-全量分析.full.md` | 2.0 令牌、纯 CSS 合成器化、`sibling-index()`、触控负边距 |
| `code-examples/cds-theme.css` | 986 行生产级令牌、关键帧、7 档 mask |
| `code-examples/ClaudeMotionPresets.ts` | 4 套弹簧、CSS easing 常量 |
| `code-examples/ReasoningAmbientGlow.tsx` | `wl-glow` / `shimmer` / `epitaxy-sweep` |
| `code-examples/ScrollFadeContainer.tsx` | 7 档 mask 的 React 实现 |
| `code-examples/ChatMessageBubbles.tsx` / `ThinkingAccordion.tsx` / `ChatComposer.tsx` | 消息、思考、输入区细节 |

## 2. 已采用资产

| 资产 | 来源 | 本插件落地 | 位置 | 运行时证据 |
|---|---|---|---|---|
| **28px 7 档非线性渐隐** | `v1/01 §1.4.4`、`v1/04 §4.3`、`Codex ScrollFadeContainer` | 渐变停止点 `15/30/45/60/75/87/100%`，Alpha `#0000000d/26/4d/80/b3/d9/000`，宽度 28px | `src/client/styles.ts` | 计算值：`4.2 / 8.4 / 12.6 / 16.8 / 21 / 24.36 / 28px` |
| **渐隐滚动留白** | `v1/04 §4.3.1` 的 `scroll-padding` 思路 | `scroll-padding-block: var(--polish-fade-top) var(--polish-fade-bottom)` | `styles.ts` | 插件面板 `scrollPaddingBottom: 28px` |
| **5 阶响应时长** | `v1/01 §1.6`、`v2/04 §4.3` | `--polish-dur-fast/snap/base/sheet/slow = 60/120/200/300/450ms`，作为资产保留；可见动效由弹簧档位驱动 | `motion/spring.ts`、`styles.ts` | 弹簧档位 0.22–0.58s |
| **easeSwift 缓动** | `v1/01 §1.6`、`v2/04 §4.3` | `--ds-ease-in-out: cubic-bezier(0.16, 1, 0.3, 1)`（替换 easeOutCubic） | `motion/spring.ts` | `<body>` 内联令牌可读 |
| **easeEnter 淡入** | `v1/01 §1.6`、`cds-theme.css` | 光晕 opacity 过渡曲线；消息入场改由弹簧档位驱动 | `styles.ts` | 规则已注入 |
| **4 档 Framer 弹簧** | `v1/04 §4.1.3`、`code-examples/ClaudeMotionPresets.ts` | 用二阶阻尼振子采样为 CSS `linear()`：轻快 600/30/1（0.22s）、从容 320/28/1（0.35s）、弹性 380/18/1（0.58s）、咬合 1200/80/0.1（0.32s）；作用于消息入场、开关、光晕 | `motion/spring.ts`、`styles.ts` | `data-polish-spring=bouncy` 时开关 0.58s、曲线峰值 1.1926 |
| **Web Audio 交互音效** | `v1/05 §5.1.2`、`code-examples/ClaudeAudioPlayer.ts` | 3 声合成提示：发送 440→660Hz、完成 660→440Hz、出错 320→240Hz；Oscillator + Gain 包络，无外部文件；默认关闭，首次手势解锁 | `src/audio/sfx.ts`、`components.ts` | `AudioContext=running`；发送/完成振荡器计数 1→2 |
| **触控负边距补偿（输入区）** | `v2/02 §2.8` | `[data-composer-seat] button::after` 外扩 `-5px -2px`，视觉尺寸不变 | `styles.ts` | 28×28 添加按钮上方 4px：开命中按钮、关命中父容器 |
| **`wl-glow` 呼吸光场** | `v1/04 §4.2.1` | 输入框下方 120×2px 光晕，1.8s 呼吸，带 accent 弥散阴影 | `styles.ts` | 流式中 `animationName=polish-glow-breathe` |
| **`epitaxy-linear-sweep` 扫光** | `v1/04 §4.2.1` | 光晕内 42% 宽白色高光，1.1s `cubic-bezier(.45,0,.55,1)` 循环 | `styles.ts` | `::after` 动画 1.1s，transform 实时推进 |
| **`cds-dot-pulse` / 推理氛围** | `v1/04 §4.2.1`、`v2/02 §2.5` | 推理分隔点 `[data-shimmer-decoration]` 加 1.8s accent 环脉冲 | `styles.ts` | 流式中 `animationName=polish-reasoning-pulse` |
| **CDS 4 层环境光阴影** | `v1/01 §1.4.2`、`v2/02 §2.7` | 每级近距遮蔽 + 远距扩散两层；深色加 `inset` 顶光倒角 | `src/client/palette.ts` | `--dsw-shadow-lv1/2/3` 内联新值 |
| **10%/9% 发丝描边** | `v1/01 §1.4.1` | `--dsw-elevation-stroke-color` 光 `#00000012` / 暗 `#ffffff14` | `palette.ts` | 设置卡片计算阴影含 0.5px 内环 |
| **`text-wrap: pretty`** | `v1/01 §1.5.4`、`v1/08` | 助手回复与思考正文的 `p/li/dd/blockquote` | `styles.ts` | 计算值 `textWrap=pretty` |
| **`text-wrap: balance`** | 同上 | 助手回复与思考正文的 `h1–h6` | `styles.ts` | 规则已注入 |
| **`tabular-nums`** | `v1/01 §1.5.5` | 时间、轮次状态、用量、composer 统计、代码/键盘字 | `styles.ts` | `[data-clock]` 计算值 `tabular-nums` |
| **暗色光学字重补偿** | `v1/01 §1.5.3` | 仅暗色、仅可变字体：正文 `font-weight 390`（CDS 360 的温和版） | `styles.ts` | `body[data-ds-dark-theme]` 下 `fontWeight=390` |
| **`font-optical-sizing`** | `v1/01 §1.5.1` | 对话滚动容器 `auto`，可变字体自动选光学尺寸 | `styles.ts` | 规则已注入 |
| **链接排版光学** | `v1/01 §1.5` | 下划线偏移 0.18em、厚度 0.06em | `styles.ts` | 规则已注入 |
| **触控负边距补偿** | `v2/02 §2.8` | 开关 `::before` 向外扩 10/8px，视觉仍 36×20，命中区 52×40 | `styles.ts` | `::before` 计算尺寸 52×40 |
| **减少动态偏好** | `v1/08 §8.5` | 所有新增动画在 `prefers-reduced-motion` 下降级为静态 | `styles.ts` | 规则已注入 |

## 3. 适配性调整（不是原值照搬）

| CDS 原值 | 本插件值 | 原因 |
|---|---|---|
| Clay `#d97757` / 品牌橙 | dsh `--dsw-alias-state-business-primary`（蓝）/ `--dsw-alias-state-error-primary` | 硬约束：不引入品牌色，光晕跟随 dsh 强调色 |
| 深色阴影 40%–65% 黑 | 12%–30% 黑 + 5%–8% 白色内环 | CDS 深色表面比 dsh 更黑；按 dsh 黑曜石表面压回可读范围 |
| Composer 20px / 12px 圆角、控件 24–32px、侧栏 28px 行高 | 不改 | 属于布局/密度/信息架构，硬约束禁止 |
| 全站按钮按压弹簧 | 只用于本插件自有动效（消息、开关、光晕） | 宿主按钮已有自己的 `transition` 简写，追加 `transition: scale` 会覆盖其背景/颜色过渡；不冒险 |
| 7 档渐隐用 `animation-timeline: scroll(self)` | 属性驱动 + 7 档静态 mask | 宿主 Chromium 146 / Electron 41 解析 `scroll(self)` 但不求值（已验证） |
| `scroll-state()` 容器查询 | 未用 | 宿主解析但查询不求值（已验证） |
| CSS 自定义属性过渡 | 已移除 | 后台窗口下注册属性过渡会停在 0，导致 mask 消失；改为属性切换，保留 7 档本体 |
| 暗色 `wght 360` | `font-weight 390` | Windows 系统字体栈更脆弱；390 是温和补偿，静态字体自动忽略 |
| 105° 骨架扫光 | 未接 | 没有稳定的宿主骨架选择器，且 dsh 自带加载态 |
| 三层陶土焦点环 | 未接 | dsh `focus.css` 已有可访问性焦点令牌，覆盖会破坏原生行为 |

## 4. 评估后未采用的资产

| 资产 | 原因 |
|---|---|
| 35 阶灰/橙标尺、Surface 0–3、serif 问候语、Anthropic 字体 | 品牌皮肤与字体资产，硬约束禁止；dsh 有自己的色阶与字体 |
| Composer 20px→12px、控件密度、侧栏 28px 行高、单闭合边框重排 | 布局/信息架构/组件所有权，不属于视觉打磨 |
| AudioWorklet（流式 PCM / 语音） | 短提示音不需要音频线程环形缓冲；AudioWorklet 需要独立模块与持续音频流，收益为零、复杂度高。改用主线程 Oscillator + Gain 包络 |
| 语音/听写/TTS、外部音效文件 | 不在 UI 打磨范围；音效已用纯代码合成，避免分发版权资产 |
| Lightbox、75vw 画廊、光标锚点缩放、View Transitions | dsh 没有对应产物/画廊表面；全局接管风险高 |
| 双栏拖拽、抽屉、多窗口、macOS 标题栏 | 宿主窗口架构与功能，插件无权改动 |
| Artifacts 沙箱、MCP 决策卡、Diff 查看器、附件磁贴 | 属于宿主组件功能，不是可注入的视觉层 |
| `sibling-index()` 级联入场 | 需要插件自己控制子节点；宿主列表由 dsh 渲染，无法安全注入 |
| `content-visibility` / 自建虚拟化 | dsh 已有 chunked list；强行改会破坏流式锚点与滚动高度 |
| 横向渐隐（本轮调研） | 当前对话/设置/上下文视图中没有非代码/表格的横向滚动容器；代码/表格横向渐隐可能遮住选中文本。需 opt-in 设计，暂缓 |
| 骨架屏 105° 扫光（本轮调研） | 宿主只有 CSS Module 哈希类名（`skeletonBar`/`skeletonFill` 等），没有 `data-skeleton` 稳定标记；按类名子串匹配跨版本脆弱，暂缓 |
| 选中文本配色 | dsh 默认选择色可接受，避免无谓覆盖 |
| 图标基线 `-0.125em` | 无法稳定区分 dsh 的图标与文本节点，易误伤 |

## 5. 运行时验证摘要（隔离环境，v0.4.0）

- 八组门控：`motion / elevation / fades / glow / plugins / optics / targets` 为 `on`，`sound` 默认 `off`；`data-polish-spring` 默认 `gentle`。
- 对话容器：`--polish-fade-top: 28px`，七档停止点位置 `4.2 / 8.4 / 12.6 / 16.8 / 21 / 24.36 / 28px`；离开顶部时顶部 28px、触底时底部 0px。
- dsh-context 面板：`scope=plugin`，底部 28px 七档 mask；影子表 `0.144s/0.18s` 重定时仍生效。
- 流式：`polish-glow-breathe`（1.8s）+ `polish-glow-sweep`（1.1s）+ `polish-reasoning-pulse`（1.8s）同时运行；结束后全部回到 `none`。
- 光学：`textWrap=pretty`、`[data-clock]` 与代码 `fontVariantNumeric=tabular-nums`、暗色正文 `fontWeight=390`；关闭 optics 后分别回到 `wrap/normal/400`。
- 弹簧：切到「弹性」后 `data-polish-spring=bouncy`，开关 `transition-duration=0.58s`、timing 含峰值 `1.1926`；选项写入 localStorage。
- 音效：开启后 `AudioContext.state=running`；发送/完成各调度一次振荡器（计数 1→2），关闭后不再调度。
- 命中区：28×28 添加按钮上方 4px 的 `elementFromPoint`，开启 `targets` 命中按钮本身，关闭命中父容器；`::after` inset `-5px -2px`。
- 总开关：八门控 `off`、渐隐目标 0、mask `none`、影子表 0、令牌内联样式撤回；重新开启后全部恢复。
- 设置卡片：`inset 0 0 0 1px rgba(255,255,255,.05)` + 双层暗色阴影。
- 单元测试 55/55；`tsc --noEmit` 通过；构建约 51.7 KB（gzip 15.9 KB）；npm pack 12 文件 32.9 KB。

## 6. 后续候选

1. 横向渐隐：本轮调研的对话/设置/上下文视图没有非代码/表格横向滚动容器，暂缓；若做，需 opt-in 并排除 `pre/code/table`。
2. 命中区：已覆盖输入区 `[data-composer-seat] button` 与本插件开关；dsh 其它零散图标按钮仍需稳定选择器。
3. 骨架屏 105° 扫光：宿主只有 CSS Module 哈希类名，等 `data-*` 稳定标记。
4. 音效：若 dsh 暴露审批/工具授权事件，可补 `tool_approval_needed` 双音；当前只接发送/完成/出错。
5. 0.4.0 截图已补齐 6 张（会话浅/暗、设置浅/暗、弹簧档位、dsh-context 面板）；0.3.0 未单独保留，已被 0.4.0 覆盖。