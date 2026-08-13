---
name: OpenAlice Data Platform Design Foundation
---

## Product Context

OpenAlice Data Platform 是基于 OpenBB 官方 Desktop 源码构建的中文优先桌面数据工作台。它把真实的 OpenBB 环境、服务、凭证、扩展和日志管理，与数据源发现、数据目录和真实查询连接成一个连续流程。用户需要迅速判断系统是否可用并完成数据操作，而不是浏览一组彼此独立的设置页。

## Overview

设计方向称为 **Alice 控制台**：克制、清醒、有操作密度，但不过度技术化。界面以稳定的应用框架、分组导航和明确状态为骨架；品牌特征来自几何 Alice 数据花结、暖中性深色基底和少量青色连接信号，而不是装饰性渐变或大量卡片。

产品品牌与技术归属分层：OpenAlice 是主品牌；OpenBB 作为运行时、ProviderInterface、API 和许可证来源在相应上下文准确出现。禁止把 OpenBB 必要归属抹除，也禁止让 OpenBB 图形继续占据主产品品牌位。

## Colors

颜色采用语义角色，最终映射到现有 `@openbb/ui-pro`/Tailwind 主题变量：

| Token | Dark | Light | 用途 |
| --- | --- | --- | --- |
| `alice.canvas` | `#111413` | `#F5F6F2` | 应用底色 |
| `alice.surface` | `#181C1A` | `#FFFFFF` | 导航、工具栏、表格表面 |
| `alice.surface.raised` | `#202522` | `#ECEFEA` | 选中行、浮层、输入区域 |
| `alice.line` | `#303732` | `#D7DDD6` | 结构分隔，不做满屏亮线 |
| `alice.text` | `#F2F4EF` | `#19201C` | 主文本 |
| `alice.text.muted` | `#9BA69F` | `#5F6B64` | 辅助信息，须满足对比度 |
| `alice.signal` | `#35D6B2` | `#087F69` | 激活导航、主操作、焦点环 |
| `alice.signal.soft` | `#173B33` | `#DDF5EE` | 克制的选中/成功背景 |
| `alice.warning` | `#F1B95B` | `#8A5700` | 待处理与降级状态 |
| `alice.danger` | `#F07178` | `#B4232D` | 错误与破坏性操作 |

一屏最多一个大面积强调色区域。状态不得只靠颜色表达，需配合图标和文本。焦点环使用 `alice.signal`，2px 外框并留 2px offset。

## Typography

默认中文 UI 使用系统字体栈 `Inter, "Noto Sans SC", "Microsoft YaHei UI", sans-serif`，避免下载新字体。品牌英文和技术标识允许使用 `Inter`；provider id、路径、版本、参数和日志使用 `ui-monospace, "Cascadia Code", monospace`。

- 页面标题：24/32，600；不全大写。
- 区块标题：16/24，600。
- 主体与表格：14/22，400 或 500。
- 辅助/元数据：12/18。
- 品牌副行可用 10/14、0.12em 字距，但普通导航和正文禁止宽字距。
- 中英文之间自动或手工保留可读空格；中文标点优先，技术标识不强制翻译。

## Layout

桌面框架由 48px 标题/状态栏、可折叠分组侧栏和内容工作区组成。宽屏侧栏 208px；740–899px 使用 64px 图标栏并提供中文 tooltip；低于 740px 不作为 Tauri 支持目标。

导航分为：

1. 工作台：首页。
2. 数据：数据源、数据目录、查询工作台。
3. 系统：服务、运行环境、凭证、扩展。
4. 支持：日志与诊断、设置与关于。

“高级设置”不再与上述官方能力重复；它成为支持组的设置/诊断聚合页。现有官方路由全部保留。

内容区最大可读宽度按页面类型变化：设置/详情 960px，列表与目录 1280px，日志与查询结果占满。页面标题栏固定 64–72px，主操作位于右侧。表格/列表使用单层表面、48–56px 行高、弱分隔；避免卡片里再嵌卡片。

## Components

- **App frame**：左侧主锁定标志显示 Alice mark、`OpenAlice` 与 `DATA PLATFORM`；右上角状态区显示当前环境、API 状态、版本与独立 Alice mark。Alice mark 不是账户头像。
- **Navigation item**：图标、中文标签、可选状态徽点；当前项使用 3px 左侧信号条和轻背景，不用网页 tab 下划线模拟桌面全局导航。
- **Page header**：面包屑可选，标题、单行说明、一个主操作与至多一个次操作。
- **Status strip**：服务、环境、数据源和待处理数使用连续的紧凑指标，不拆成四张卡片。
- **Operational list/table**：列必须有标题；provider 名称与 id 同列，状态、能力、最近验证和操作独立列。窄窗收起低优先级列，操作进入行菜单。
- **Status chip**：图标 + 文本；成功、警告、错误、未知四种语义。避免胶囊滥用，仅状态和过滤条件可用。
- **Primary action**：实心 signal；**secondary** 为中性轮廓；文本链接只用于低风险跳转。
- **Empty/error/loading**：说明原因、影响、恢复操作和技术详情入口。加载使用静态骨架或小型进度指示，不做全屏品牌动画。
- **Attribution footer/about**：`OpenAlice Data Platform · Powered by OpenBB`，链接许可证、第三方许可与版本信息；不以粘底版权条压缩主内容。

## Do's and Don'ts

### Do

- 让运行环境与 API 状态在所有核心页面可见。
- 保留 OpenBB 官方功能的清晰入口和原始技术名称。
- 中文先讲用户任务，二级文本再展示 provider id、Python path 或 API route。
- 让表格列、筛选、批量/行操作和响应式收起规则明确。
- 让 Alice 品牌在 16px、32px 和产品锁定标志三个尺度都可识别。

### Don't

- 不使用 ODP 作为用户可见产品名，不写 OpenAlice Date Platform。
- 不删除或再次隐藏服务、运行环境、凭证、扩展和日志。
- 不做九项横向一级标签，不以“高级设置”复制全部系统入口。
- 不使用泛化蓝紫渐变、发光球、毛玻璃、营销 hero、嵌套卡片或到处圆角胶囊。
- 不把 OpenBB 技术归属替换成模糊措辞，也不未经迁移评估更改 `co.openbb.platform`、publisher、updater 或签名相关 metadata。

## Source Decisions

- 变更来源：`design/changes/openalice-desktop-brand-refresh/`。
- 采用现有系统：Tauri 2、React、TanStack Router、Tailwind 与 `@openbb/ui-pro`；现有官方路由和真实 OpenBB 集成是结构约束。
- 采用当前运行截图中“暗色高密度桌面工具”的基本姿态，但拒绝其双重品牌、九项平铺 tab、过亮分隔线和一维列表布局。
- 采用用户明确要求的 Alice 主品牌、中文体验和右上角 Alice 标志；Alice 标志的几何“数据花结 A”是本项目原创方向，尚需矢量资产制作与商标审查。
- 保留 OpenBB 技术/许可证 attribution；拒绝把 OpenBB 主图形继续作为应用主品牌。
- 未采用外部模板、网页参考或新增组件库；没有复制外部品牌资产或实现代码。

