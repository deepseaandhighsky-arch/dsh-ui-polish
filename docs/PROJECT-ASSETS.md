# 项目资产盘点（2026-10-30）

> 包：`dsh-ui-polish@0.4.1` · tag `v0.4.1`（功能同 0.4.0，修复 GitHub 仓库安装）· CDS 资产调用矩阵见 `docs/research/CDS-ASSET-MAP.md` · 体验差异见 `docs/research/UX-DIFF-REPORT.md`
> 定位：dsh UI 的**视觉 / 交互 / 性能**优化插件；不改变 UI 分布与信息架构。

## 1. 状态快照

| 项目 | 当前值 | 证据 |
|---|---|---|
| 版本 | 0.4.1 | `package.json`、`package-lock.json`（本轮已同步） |
| Git | `v0.4.1` 发布提交 | `git status` / `git tag -n` |
| 单元测试 | 55/55（10 个文件） | 2026-10-30 22:16 `vitest run` |
| 类型检查 | 通过 | `npx tsc --noEmit` |
| 构建产物 | `lib/client.js` 51,740 B（51.7 KB，gzip 15.9 KB）；**已纳入版本控制** | `npm run build` |
| npm 包 | 12 个文件，33.5 KB（unpacked 94.6 KB；含 LICENSE/README.en/THIRD_PARTY_NOTICES） | `npm pack --dry-run` |
| 隔离运行 | dsh 0.2.1-rc.5 @ 127.0.0.1:3311 | `.testenv/web.log` |

## 2. 源码资产

| 模块 | 作用 | 状态 |
|---|---|---|
| `src/client.ts` | 模块加载器入口；运行时取 React；返回 `{ inject, apply }` | 接线 |
| `src/client/apply.ts` | 样式表、偏好门、令牌覆盖、双引擎、音效门、Slot、清理 | 接线 |
| `src/client/prefs.ts` | 8 组偏好 + 弹簧档位 + 总开关（localStorage `dsh-ui-polish.v1`；sound 默认关） | 接线 |
| `src/client/components.ts` | `SettingsSection`（含弹簧分段控件）、`ComposerGlow`、快照选择器、音效状态机 | 接线 |
| `src/client/styles.ts` | 28px 7 档 mask、排版光学、命中区、光晕/扫光、4 档弹簧变量、消息入场、设置分区/卡片/行 | 接线 |
| `src/client/scrollFade.ts` | 泛用滚动发现、边缘状态、生命周期 | 接线 |
| `src/client/retime.ts` | 第三方样式表只读解析、影子样式表 | 接线 |
| `src/client/palette.ts` | 高度组令牌（10%/9% 发丝边 + CDS 双层三级阴影，明暗成对） | 接线 |
| `src/client/types.ts` | dsh ctx 最小结构类型 | 接线 |
| `src/audio/sfx.ts` | 3 声合成 cue、AudioContext 懒创建/手势解锁/卸载关闭 | 接线（默认关） |
| `src/motion/spring.ts` | 运动资产：dsh 时长、CDS 5 阶时长/easing、`sampleSpring`、4 档 `SPRING_PROFILES` | 接线 |
| `src/motion/createHooks.ts` | 2 个 hook：`useScrollPinning`（保留库，4 项测试）+ `useAmbientGlow`（接线） | 部分接线 |
| `index.js` | 主机半部 no-op Cordis 插件 | 必要占位 |
| `locale/{zh,en}.json` | 插件管理器展示元数据（`dsh-app-boot` 读取） | 元数据已接线；设置页 UI 文案未 i18n |

测试资产：

| 文件 | 覆盖 | 用例数 |
|---|---|---|
| `src/client/apply.test.ts` | 8 组门控、section 注册、双引擎+音效同步、卸载清理 | 6 |
| `src/client/scrollFade.test.ts` | 谓词分支、打标/测量、节点替换、清理 | 7 |
| `src/client/retime.test.ts` | s/ms 缩放、规则收集、at-rule 镜像、影子表、引擎 | 10 |
| `src/client/styles.test.ts` | 7 档 mask/28px、光学、光晕、4 档弹簧、命中区、无品牌色 | 8 |
| `src/client/prefs.test.ts` | 默认值（sound 关）、弹簧持久化、非法值回退、总开关 | 4 |
| `src/audio/sfx.test.ts` | cue 定义、频率/增益包络、静音、无 AudioContext | 4 |
| `src/client/components.test.tsx` | 音效 send/done/error 状态机、弹簧档位持久化 | 3 |
| `src/client/palette.test.ts` | 明暗成对 + 中性色 | 2 |
| `src/motion/spring.test.ts` | 采样端点/过冲、4 档参数、CDS 曲线/时长 | 6 |
| `src/motion/createHooks.test.tsx` | 钉住/光晕 hook | 5 |

## 3. 文档资产与新鲜度

| 文档 | 内容 | 新鲜度 |
|---|---|---|
| `README.md` | 功能、安装、三通道设计、验证表、已知限制 | ✅ 0.4.0（8 组、弹簧、音效、命中区、55 测试） |
| `CHANGELOG.md` | 0.4.0 / 0.3.0 / 0.2.0 / 0.1.0 | ✅ 0.4.0 条目完整 |
| `AGENTS.md` | 项目工作指南、硬约束、架构、验证流程、参考资料 | ✅ 0.4.0 |
| `docs/README.md` | 文档与截图索引 | ✅ 0.4.0（新增体验报告） |
| `docs/PROJECT-ASSETS.md` | 本文件：资产盘点 | ✅ 0.4.0 |
| `docs/research/CDS-ASSET-MAP.md` | open-claude-ui 资产采用/适配/不采用矩阵 | ✅ 0.4.0（弹簧/音效/命中区） |
| `docs/research/UX-DIFF-REPORT.md` | 有无插件的使用体验差异报告 | ✅ **本轮新建** |
| `docs/research/PLUGIN-UI-RESEARCH.md` | dsh-context / better-sidebar 的 UI 实现与泛用适配研究 | ✅ 含 v0.2.0 实施状态 |
| `docs/research/UI-GAP-VS-CLAUDE-CODE.md` | Claude 桌面端 UI 差距评估与优先级 | ✅ 基于 open-claude-ui |
| `docs/screenshots/after-*.png` | 0.1.0 历史截图（6 张，本地保留） | **未随公开仓库发布**：含本地路径；视觉变化已被 0.4.0 覆盖 |
| `docs/screenshots/v020-*.png` | 0.2.0 截图（4 张） | 历史 |
| `docs/screenshots/v040-*.png` | 0.4.0 截图（6 张：会话浅/暗、设置浅/暗、弹簧档位、dsh-context 面板） | ✅ 隔离环境 |
| `docs/research/coexist-*.png` | 三插件共存截图（3 张） | ✅ 隔离环境 |

## 4. 参考资料资产

| 资料 | 位置 | 版本/提交 | 说明 |
|---|---|---|---|
| open-claude-ui | `.testenv/open-claude-ui`（gitignored） | `c1f923a`（depth 1） | 社区逆向，非官方；v1 组件/动效/桌面架构，v2 Claude Desktop 2.0 全量分析 |
| CDS 资产调用矩阵 | `docs/research/CDS-ASSET-MAP.md` | v0.4.0 | 逐项“采用/适配/不采用”、运行时证据、未来候选 |
| 有无插件体验差异 | `docs/research/UX-DIFF-REPORT.md` | v0.4.0 | 总开关 A/B、场景化差异、主观评估与局限 |
| dsh 核心 UI 包 | `.testenv/node_modules/@deepseek-ai/dsh-client-ui-*` | 0.2.1-rc.5（53 包） | slot、快捷键、主题、设置契约 |
| dsh 主题/设置契约 | 同上，`lib/types/client/contract/*.d.ts` | 0.2.1-rc.5 | `settings.section`、`overrideTokens` 等 |
| dsh-context | `.testenv/dsh-home/profiles/web/node_modules/dsh-context` | 0.78.0 | 令牌消费者样板、右栏 Context |
| dsh-better-sidebar | 同上 | 0.28.2 | 插件底座、Git/文件/编辑器、影子重定时验证对象 |
| 隔离环境 | `.testenv`（1.1 GB，gitignored） | — | `node_modules`、`dsh-home`、`open-claude-ui`、`web.log` |

> 生产环境**不在**资产范围内，也禁止用于任何验证或截图。

## 5. 发布资产

| 资产 | 状态 |
|---|---|
| `lib/client.js` | 已构建并纳入版本控制（GitHub 安装无需构建脚本）；npm 包含 |
| `cordis.patch.yml` | `insert: dsh-ui-polish` |
| `index.js` | 主机 no-op |
| `icon.svg` | 插件图标 |
| `locale/zh.json`、`locale/en.json` | 仅 meta；**未接线** |
| `package-lock.json` | 本轮从 0.4.0 同步到 0.4.1 |
| Git tag | `v0.4.1` → 本次发布提交 |

## 6. 本轮整理动作（0.4.0/0.4.1）

0. **0.4.1 GitHub 安装修复**：提交 `lib/client.js`、移除 `prepare`，`.gitignore` 只忽略临时构建文件；插件页可直接用仓库地址安装，无需 `allowBuilds`。

1. **4 档 Framer 弹簧**：用二阶阻尼振子采样为 CSS `linear()`（轻快/从容/弹性/咬合），设置页新增分段控件；作用于消息入场、开关、光晕。
2. **合成音效**：`src/audio/sfx.ts` 三声 cue（发送/完成/出错），默认关闭，手势解锁，卸载关闭；AudioWorklet 经评估不采用。
3. **输入区命中区**：第 7 组 `targets`，`[data-composer-seat] button::after` 外扩 5/2px，视觉尺寸不变；`elementFromPoint` 验证开/关。
4. **音效状态机**：`ComposerGlow` 根据 status 前后值播放 send/done/error；新增 `components.test.tsx`。
5. **偏好模型**：8 组 + `spring` 字段；`sound` 默认关、`targets` 默认开；弹簧档位双写（偏好 + 本地 state）。
6. **研究结论**：横向渐隐（无非代码/表格横向容器）、骨架扫光（无稳定 `data-*`）记录在 CDS 资产矩阵，暂缓；截图通道已恢复并补拍 6 张。
7. **体验报告**：新增 `docs/research/UX-DIFF-REPORT.md`，总开关 on/off 量化 A/B + 场景化差异 + 主观评估。
8. **验证**：55/55、tsc 通过；总开关 on→off→on、弹簧 bouncy、音效计数 1→2、命中区探针、重定时 A/B、光晕三动画。
9. **截图**：按“导航→等待 DOM→截图；超时 reload 重试一次；仍失败换新标签”的流程补拍 6 张（会话浅/暗、设置浅/暗、弹簧档位、dsh-context 面板）；未使用任何系统级截图。

## 7. 待决策 / 技术债

| 项 | 说明 | 建议 |
|---|---|---|
| 设置页 UI 文案未 i18n | `locale/*.json` 只是插件管理器元数据（宿主已读取），设置页文案硬编码中文 | 若要英文界面：`ctx.locale.register` + 组件用 `t()`；否则在 README 标注当前仅中文 |
| `useScrollPinning` 仅作库 | 原生已有 ScrollFollow，接线会与原生行为打架 | 保持保留并在注释中说明；不要为接线而越界改原生 |
| 横向渐隐未启用 | 本轮未发现非代码/表格横向滚动容器；代码/表格渐隐可能遮住选中文本 | 需要 opt-in 设计（如 `data-polish-fade-x`）并排除 `pre/code/table` |
| 骨架扫光未启用 | 宿主只有 CSS Module 哈希类名（`skeletonBar`/`skeletonFill`），无稳定标记 | 等 `data-skeleton` 或稳定属性 |
| 音效默认关闭 | 避免用户不知情发声；AudioContext 需手势解锁 | 保持默认关；审批事件稳定后可补 `tool_approval_needed` |
| 命中区范围有限 | 只覆盖 `[data-composer-seat] button` | 弹层/菜单需要单独作用域，避免重叠 |
| 0.3.0 未单独保留截图 | 其视觉变化已被 0.4.0 六张截图覆盖 | 无需补拍 0.3.0；后续视觉变更再补 |
| 暗色字重补偿依赖可变字体 | Windows 静态系统字体忽略 `font-weight 390` | 保持温和值；不要改成布局级字号调整 |
| open-claude-ui 不在仓库内 | 1.1 GB 且非本项目代码 | 保持 gitignored，按需 clone（命令见 AGENTS.md） |

## 8. 当前功能成果（v0.4.1）

- **8 组优化**：运动、阴影、滚动渐隐、状态光晕、插件适配、排版光学、输入区命中区、交互音效；另有 4 档弹簧手感。
- **独立设置分区**：`设置 → 界面打磨`，与「通用设置」并列；总开关 + 8 组 + 弹簧档位。
- **泛用滚动渐隐**：任意可见纵向滚动容器自动发现；28px 7 档羽化；编辑器/终端排除；`data-polish-fade="off"` 可退出。
- **插件过渡重定时**：只读第三方样式表 → 1.2× 影子表；实测 better-sidebar `.12s/.15s → .144s/.18s`，dsh-context 令牌过渡保持 `0.24s`。
- **状态光晕**：1.8s 呼吸 + 1.1s 扫光 + 推理点光环；完成/出错自动复位。
- **排版光学**：pretty/balance、tabular-nums、暗色字重补偿、链接光学。
- **弹簧手感**：4 档 CSS `linear()`，可持久化，仅作用于插件自有动效。
- **音效**：3 声纯合成提示，默认关闭，无外部文件。
- **命中区**：输入区小按钮隐形扩展，视觉不变。
- **完整回退**：总开关/组开关关闭后目标清零、影子表移除、令牌回退原生；重新开启全部恢复。
- **验证与文档**：55 测试、CDS 资产矩阵、体验差异报告、6 张 0.4.0 截图、AGENTS.md、本盘点。