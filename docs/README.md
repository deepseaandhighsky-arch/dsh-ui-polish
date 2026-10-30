# 文档索引

> `dsh-ui-polish` 的文档、研究与截图入口。项目工作指南见根目录 `AGENTS.md`。

## 项目文档

| 文档 | 用途 |
|---|---|
| [../README.md](../README.md) | 功能、安装、三通道设计、验证结果、已知限制 |
| [../CHANGELOG.md](../CHANGELOG.md) | 版本变更（Keep a Changelog） |
| [../AGENTS.md](../AGENTS.md) | 后续 agent/协作者的工作指南与硬约束 |
| [PROJECT-ASSETS.md](PROJECT-ASSETS.md) | 项目资产盘点、文档新鲜度、技术债 |

## 研究

| 文档 | 内容 |
|---|---|
| [research/PLUGIN-UI-RESEARCH.md](research/PLUGIN-UI-RESEARCH.md) | dsh-context / dsh-better-sidebar 的 UI 实现方式，以及 dsh-ui-polish 的泛用适配方案与 v0.2.0 实施状态 |
| [research/CDS-ASSET-MAP.md](research/CDS-ASSET-MAP.md) | open-claude-ui 资产的采用/适配/不采用矩阵、运行时证据与后续候选 |
| [research/UX-DIFF-REPORT.md](research/UX-DIFF-REPORT.md) | 有无插件的使用体验差异报告（总开关 A/B、场景化差异、主观评估与局限） |
| [research/UI-GAP-VS-CLAUDE-CODE.md](research/UI-GAP-VS-CLAUDE-CODE.md) | 基于 open-claude-ui 的 Claude Code 桌面端 UI 体验差距评估（含 P0/P1/P2 与归属） |

## 截图

### v0.4.0（当前）

| 场景 | 文件 |
|---|---|
| 会话流（浅色） | [screenshots/v040-conversation-light.png](screenshots/v040-conversation-light.png) |
| 会话流（暗色） | [screenshots/v040-conversation-dark.png](screenshots/v040-conversation-dark.png) |
| 设置分区（浅色，总开关 + 8 组） | [screenshots/v040-settings-section-light.png](screenshots/v040-settings-section-light.png) |
| 设置分区（暗色） | [screenshots/v040-settings-section-dark.png](screenshots/v040-settings-section-dark.png) |
| 设置页底部：音效 + 弹簧档位（展示「弹性」+ 音效开启） | [screenshots/v040-settings-spring-light.png](screenshots/v040-settings-spring-light.png) |
| dsh-context 面板（plugin scope） | [screenshots/v040-context-panel-dark.png](screenshots/v040-context-panel-dark.png) |

### v0.3.0（历史）

0.3.0 的 28px 七档渐隐、CDS 双层阴影、呼吸+扫光、推理点光环、六组设置与排版光学已验证；未单独保留截图，其视觉变化已被 v0.4.0 截图覆盖。

### v0.2.0（历史）

| 场景 | 文件 |
|---|---|
| 独立设置分区（浅色） | [screenshots/v020-settings-section-light.png](screenshots/v020-settings-section-light.png) |
| 独立设置分区（暗色） | [screenshots/v020-settings-section-dark.png](screenshots/v020-settings-section-dark.png) |
| 对话流滚动渐隐 | [screenshots/v020-conversation-fades-light.png](screenshots/v020-conversation-fades-light.png) |
| dsh-context 面板滚动渐隐 | [screenshots/v020-context-panel-fades-light.png](screenshots/v020-context-panel-fades-light.png) |

### 三插件共存（隔离环境）

| 场景 | 文件 |
|---|---|
| 右侧栏启动器 | [research/coexist-start-launcher.png](research/coexist-start-launcher.png) |
| dsh-context 上下文页 | [research/coexist-dsh-context-tab.png](research/coexist-dsh-context-tab.png) |
| better-sidebar Git 页 | [research/coexist-better-sidebar-git.png](research/coexist-better-sidebar-git.png) |

### v0.1.0（本地保留，未随公开仓库发布）

历史截图包含本地路径，已从公开树移除；本地 `prepublic-history` 分支与 `dsh-ui-polish-prepublic.bundle` 保留完整历史。其视觉变化已被 v0.4.0 截图覆盖。

## 外部参考

- [open-claude-ui](https://github.com/Caho1/open-claude-ui) — 社区逆向研究，非官方；本地 clone 在 `.testenv/open-claude-ui`（gitignored）。
- dsh 核心 UI 包 — `.testenv/node_modules/@deepseek-ai/dsh-client-ui-*`（0.2.1-rc.5）。

> 所有验证只在 `.testenv` + `DSH_HOME` 隔离环境进行；不要触碰生产环境。