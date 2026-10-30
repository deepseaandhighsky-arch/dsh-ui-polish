# 研究报告：其它 dsh 插件的 UI 实现方式，以及 dsh-ui-polish 的拓展可行性

> 日期：2026-10-30 · 环境：隔离实例（`.testenv`，dsh 0.2.1-rc.5，端口 3311）
> 研究对象：[dsh-context](https://github.com/bowenliang123/dsh-context) 0.78.0、[DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) 0.28.2（均已实际安装进隔离 profile）
> 方法：两份 client bundle 静态模式扫描 + 三插件共存运行时 A/B 实证

## 一、两个插件各自怎么做 UI

两者与 dsh-ui-polish 走**完全相同的官方集成契约**：`package.json` 声明 `dsh.client.inject`（宿主模块依赖）+ `exports["./client"]`（浏览器 bundle）+ `cordis.patch.yml`（bundle 挂载行）。样式通道也相同：`<style data-plugin-css>` 标签注入，由 dsh 模块系统按包认领/卸载（dsh-context 5 个样式块、better-sidebar 5 个）。差异在 UI 的组织方式：

| 维度 | dsh-context（消费者型） | dsh-better-sidebar（平台型） |
|---|---|---|
| Slot 使用 | `conversation.view` ×3、`sidebar.right.pane.tab(.title)`、`sidebar.panellist`、`main`、`conversation.input.overlay`（/context 模态）、`plugins.bundle.config`（自有配置卡） | `conversation.session.header.utilities`、`sidebar.right.pane.tab(.title)`、`shell.overlay`、`settings.section` |
| 自己暴露的扩展点 | 无（纯消费官方 Slot） | **有**：`ctx.get("betterSidebar")` 服务（`registerTab` / `registerFileViewer` / `openTab` / `updateTab`），30+ 生态插件经它注册侧栏页面；另有 `/sidebar/api/*` 主机路由 |
| 令牌消费 | 749 处 `var(--dsw-*)`（其中 alias 735 处）；硬编码色几乎只存在于 SVG 图标 fill；过渡 78 处写死 `.2s`，但 **25 处用 `var(--ds-transition-duration,.2s)`** | 1033 处 `var(--dsw-*)`；CSS 色值全是令牌兜底写法 `var(--dsw-alias-x,#hex)`；**动效自管**：自有 keyframes（`dsh-row-in .15s`、`dsh-card-in`、sweep 系列），时长硬编码 .1s/.15s |
| 滚动容器 | 15 处 `overflow-y:auto`，Context 面板根节点即滚动容器（类名 `lc-root`，**无稳定 data 标记**） | 13 处 `overflow-y:auto`，**自带稳定 data 标记**：`data-git-scroll`、`data-graph-scroll` |
| overrideTokens | 不调用 | 不调用 |

运行时截图（见本目录）：better-sidebar 的“开始”启动器与底部工作台（Git 页）+ dsh-context 的“上下文”标签页三方同屏共存，191 个样式块启动无错。

## 二、dsh-ui-polish 的四组优化能否拓展到它们

### 1. 令牌层（运动学 + 高度）：**已经自动生效，零改动**

- **运动组 — 已运行时实锤**：三插件共存下开启总开关时，dsh-context 的 `lc-jump` 按钮 computed `transition-duration` 为 **0.24s（我们的基准值）**；总开关关闭并重载后回退 **0.2s（原生值）**。全页 A/B 扫描：14 个元素随开关翻转（0.24s↔0.2s ×6、0.36s↔0.3s ×8，含 0.12s×5 的硬编码元素不受影响）。关键在于我们的运动组覆写了**基础令牌** `--ds-transition-duration`，正好命中 dsh-context 那 25 处 `var(--ds-transition-duration,.2s)`。
- **高度组 — 部分触达**：两个插件各 7 处消费 `var(--dsw-shadow-lv1/2/3)`，我们软化这组令牌即自动作用于它们真正走令牌的卡片/弹层；但当前可见的卡片阴影（如 better-sidebar/dsh-context 的自绘 `0 0 0 0.5px` 描边卡）走的是自己的值，不经过我们覆写的令牌——令牌层只能覆盖“消费者”，这是机制边界。
- 两者都不调用 `overrideTokens`，与我们的覆写无冲突；总开关关闭时它们的 UI 完整回退原生观感（已实测）。

### 2. 渐隐层：**可以低成本拓展，需要一个小改动**

fade 桥目前只认 `[data-conversation-scroll]`。共存实测我们的桥工作正常（`data-polish-fade-top/bottom=true` 已挂上对话滚动容器），但：

- dsh-context 的 Context 面板滚动容器是 `div.lc-root`——类名稳定但**不是官方契约**，跟随它有上游改名风险；
- better-sidebar **自带稳定 data 标记**（`data-git-scroll`、`data-graph-scroll`），可直接内置为目标。

**拓展方案**：把 fade 桥的测量目标从单一选择器改为“目标注册表”（内置对话容器 + `data-git-scroll` + `data-graph-scroll`，另开配置项允许追加选择器），CSS 端渐隐伪元素同步泛化到 `[data-polish-fade-target]` 标记。改动局限在 apply.ts 的桥与 styles.ts 的选择器，架构不变。

### 3. 辉光层：**无需拓展，共存已验证**

glow 挂在 `conversation.composer.dock`，两个插件都不占用该座位（better-sidebar 挂 `session.header.utilities`，dsh-context 挂 `conversation.input.overlay`），`dsh-polish-glow` 元素在共存环境下正常挂载。辉光是 composer 专属效果，对侧栏面板本身没有意义。

### 4. 无法拓展的（机制边界，不建议强行 patch）

better-sidebar 的自管动效（硬编码时长 + 自有 keyframes）不消费任何运动令牌，我们的运动组碰不到它。除非上游改用令牌，唯一途径是运行时改写它的 CSS——这会跨包 patch 他插件样式，违背“优化而非侵入”的边界，**不做**。

## 三、附带发现

- **插件间服务模式**：better-sidebar 展示了 dsh 插件生态的第三种扩展面——插件通过 client ctx 互相提供服务（`ctx.get("betterSidebar")`，调用方全程可选链防御）。dsh-ui-polish 未来可对称地暴露 `ctx.get("uiPolish")` 服务，让其它插件**主动**把自己的滚动容器注册进 fade 注册表（比配置项更优雅，但需要对方配合）。
- dsh-context 是“令牌好公民”样板：色彩 100% 令牌化，意味着任何令牌层优化对它几乎全额生效；这也是对其它插件作者的范式示范。
- better-sidebar 对 dsh-context 做了**防御式插件感知**（检测对方 Context 页是否注册再显示跳转入口），生态内已有互操作先例。

## 四、结论与建议

**结论：可以拓展，且一半已经自动生效。** 令牌层（运动+高度）靠 dsh 的主题机制天然覆盖一切令牌消费者，已实测作用于 dsh-context；渐隐层需要一次小改动（目标注册表）即可覆盖两个插件的滚动面板；辉光无需拓展；better-sidebar 自管动效属于不可达边界。

若要实施，建议按此顺序（均为 v0.1.x 兼容性小版本）：
1. fade 目标注册表（内置 + 配置项追加选择器）——收益最大、改动最小；
2. README 增补“第三方插件兼容性”一节（本报告结论的用户版）；
3. （可选，需讨论）暴露 `uiPolish` 服务作为插件间协作面。

> 复现：`.testenv` 内 `dsh plugin --profile web add dsh-context` / `add dsh-better-sidebar` 后 `dsh web --port 3311 --no-open`；静态扫描命令见会话记录（对两包 `lib/client.js` 做 token/slot/keyframes 模式统计）。

## 五、实施状态（v0.4.0 沿用）

> v0.3.0 起插件适配架构稳定；v0.4.0 只新增弹簧档位、合成音效与输入区命中区，未改变 `plugin` 作用域的发现/重定时。28px 七档 mask 仍作用于 dsh-context `.lc-ov-pagescroll`（实测底部 28px），重定时 A/B 仍为 `.144s/.18s`。测试总数 55。

实际落地比本报告最初的建议更彻底，采用**泛用机制**而非按插件维护目标注册表：

1. **渐隐**：`mask-image` 直贴 scrollport（与原生 TurnNavigator / ChatGroupSeat / Trajectory 同款），运行时按几何 + 计算样式发现任意滚动容器；对话容器走 `native` 作用域，其余面板走 `plugin` 作用域。编辑器/终端按类排除，任意元素可用 `data-polish-fade="off"` 退出。dsh-context 的 `.lc-root` 与对话容器均实测打标，0.3.0 起统一为 28px 七档羽化。
2. **动效**：**影子覆盖样式表**——只读取第三方插件 `style[data-plugin-css]` 的声明（不修改其 CSSOM），生成我们自己的样式表，复制选择器与 `@media/@supports/@container/@layer` 上下文，把 `transition-duration` 按 1.2× 缩放；含 `var()`（令牌驱动，已由令牌层接管）、`0s`、`calc()`、>1.2s 的声明跳过。better-sidebar 实测 `.12s/.15s → .144s/.18s`，关闭第 5 组后回原生；dsh-context 令牌过渡保持 `0.24s`（未二次缩放）。`animation-*` 不处理。
3. **设置**：新增第 5 组「插件界面适配」，并把全部开关迁到 `settings.section` 注册的独立「界面打磨」分区（与「通用设置」并列），不再占用通用设置行；0.3.0 增加第 6 组「排版光学微调」，0.4.0 增加第 7/8 组「输入区命中区」「轻量交互音效」并加入弹簧档位。
4. **验证**：单元测试 55/55；隔离环境（dsh 0.2.1-rc.5 + dsh-context 0.78.0 + dsh-better-sidebar 0.28.2）完成启动、分区、发现、28px 七档 mask、重定时 A/B、optics 开/关、弹簧档位、音效计数、命中区探针、总开关回退/恢复的 DOM 级实测。0.3.0/0.4.0 视觉截图因宿主内嵌浏览器 webview 的截图表面故障暂缺，待恢复后补拍。

边界更新：本方案只对第三方样式表做**只读解析 + 自有影子表**，不 patch 他插件 CSSOM，也不改 `@deepseek-ai/*` 原生样式；这既兑现了「主动性在我方」，也没有越过插件边界。
