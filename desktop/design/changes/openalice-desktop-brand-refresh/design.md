# Change Design: Alice 控制台

项目设计基础：[`../../../DESIGN.md`](../../../DESIGN.md)
选定方向：`directions.md#A-Alice-控制台--选定`
OpenSpec 兼容关系：[`openspec-compatibility.md`](openspec-compatibility.md)

## Requirements Map

| 需求 | 设计后果 |
| --- | --- |
| OpenAlice 主品牌 | 左侧产品锁定标志统一名称；窗口标题、HTML title、可见文案和图标资产有明确清单 |
| 右上角 Alice 标志 | 以 32px 数据花结 A 替换 OpenBB 主图形；同区展示环境、API 状态和版本，不伪装账户 |
| 真实连接 | 全局状态区显示当前运行环境与 API 状态；数据页展示实际发现与测试时间 |
| 保留官方功能 | 服务、环境、凭证、扩展和日志进入“系统/支持”分组，路由和能力不删除 |
| 中文优先 | 中文作为主标签，provider id、API route、Python package 作为二级 monospace 文本 |
| 最小窗可用 | 900px 以下侧栏折叠为 64px，列表隐藏次要列，操作进入菜单；不横向挤九个 tab |
| OpenBB attribution | 页脚/关于页显示 `Powered by OpenBB`、许可证和第三方许可；不继续占主品牌位 |

## App Frame

- 顶栏 48px，左侧侧栏宽 208px；标题栏与侧栏使用 `alice.surface`，内容使用 `alice.canvas`。
- 左上锁定标志：32px Alice mark；文字 `OpenAlice` 15/20 600；副行 `DATA PLATFORM` 10/14、0.12em 字距。
- 右上状态区从左到右：环境名称、API 状态点和文本、版本 `v1.0.2`、32px Alice mark。状态区不得使用 OpenBB 图形。
- 若窗口原生 title bar 可见，标题改为 `OpenAlice Data Platform`；不在未评估时修改 bundle identifier。
- 侧栏导航组：
  - 工作台：首页
  - 数据：数据源、数据目录、查询工作台
  - 系统：服务、运行环境、凭证、扩展
  - 支持：日志与诊断、设置与关于
- 页脚不做常驻粘底条。关于页和可选的内容页底部显示：`OpenAlice Data Platform · Powered by OpenBB`，链接 `LICENSE` 与 `THIRD_PARTY_LICENSES_STUDIO.md`。

## Core Screens

### 首页

- 首屏先给一句状态结论，如“research 环境已连接，可以查询 14 个数据源”。
- 三步流程为水平进度带或紧凑列表：服务 → 数据源 → 查询；不再做三张同质卡片。
- 运行状态以单条 status strip 呈现；待处理项是列表，按“阻塞查询 / 影响部分数据 / 建议”排序。
- 文案不能说系统工具“都收在高级设置”，因为它们是正式一级分组。

### 数据源

- 使用有列标题的 operation table：数据源、状态、能力、最近验证、操作。
- 名称保留原始大小写（如 `BLS`、`CBOE`），不得自动变成 `Bls`、`Cboe`；provider id/版本置于次行。
- `配置` 为次操作，`测试` 为主行操作；更多操作使用菜单。状态 chip 同时包含图标与文本。
- 900px 以下隐藏“最近验证”，740–899px 隐藏“能力”，保留名称、状态和操作。
- 搜索与筛选同排：搜索、状态筛选、是否需要凭证；右侧“管理扩展”。

### 数据目录与查询

- 目录保持表格形态，但让数据集名称、说明、provider 覆盖和入口形成清晰列；技术路径折叠到详情。
- 查询页把“数据集与 provider 选择 / 参数 / 运行”放在左或上方稳定控制区，结果占最大面积。
- 查询中的运行、取消、失败、空结果和部分数据状态必须有明确文案；不使用假数据填充。

### 系统与支持

- 官方页面不删除，先由共同 `PageHeader`、状态 chip、按钮等级和表格表面统一外框。
- 运行环境创建/删除、凭证保存、扩展安装/卸载均保留确认、进度、错误详情与恢复入口。
- “高级设置”改为“设置与关于”；诊断、日志和危险操作分区，不能再重复列出全部系统页面。

## Brand Asset Contract

- `AliceMark`: 原创矢量，视图框方形，16/24/32/64/128/256px 可辨识；单色填充/描边；没有细于 1.5px（24px 画布）的线。
- 几何：A 的两侧轨迹在中心节点相交，上方形成开放顶点；三个节点象征 source/model/query。不得使用 OpenBB 路径变形。
- 可访问名称：主锁定标志为 `OpenAlice Data Platform`；纯装饰重复标志 `aria-hidden=true`。
- 图标交付需包含 SVG、Windows/macOS/Linux/Tauri 尺寸映射和浅/深背景测试。品牌资产在商标确认前标注 `provisional`。

## Tokens and Component Mapping

- 在现有 Tailwind preset 之上增加 `alice.*` CSS variables，并把 `theme-primary/secondary/outline/accent` 逐步映射；不一次性破坏所有官方组件。
- 优先建立 `AppShell`、`SideNav`、`RuntimeStatus`、`PageHeader`、`StatusChip`、`OperationalTable` 和 `Attribution` 组合组件。
- `@openbb/ui-pro` 的 Button/Tooltip 等继续使用，通过语义 variant 和外层布局统一；不 fork 包。

### Beta2 design-system route

- 工具链：`toolchain-plan.json`，React + Tailwind CSS + `uiLibrary: none`；这里的 `none` 表示不引入 registry UI library，现有 `@openbb/ui-pro` 仍是项目拥有的组件层。
- 能力分解：`capability-inventory.json`；直接长查询无结果，但 capability search 找到 461 个独立条目，因此记录为 zero-result-inconclusive，不能据此声称 catalog 空白。
- 组件路由：`component-routes.json`。App shell、navigation、data table、dialog 和 text input 选用 project-owned app UI；`side-nav` 没有精确 catalog route，作为 AppShell/Navigation 的项目内组合实现；不引入 SmoothUI tooltip 或 React Bits typography。
- 决策：`design-system-decision.json` 采用 custom/project-owned 模式。Astryx、SmoothUI、React Bits 和 MengTo 条目均不得成为运行依赖或复制源。

## CJK Typography and Plain Language

- UI 字体栈：`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`。Windows 实机优先命中 Segoe UI / Microsoft YaHei；可用字重 400、600，禁止合成中文斜体。
- 密集 UI 正文 14px/22px；说明性阅读文字 16px/26px；控件可用 14px/20px，但目标高度不得低于 32px。正文 `letter-spacing: 0`，`line-break: strict`、`word-break: normal`。
- 中文句子统一全角标点；中文与 Latin 技术名/ASCII 数字之间保留一个可见空格，但 `%`、`°` 与全角标点前不加空格。数据列使用 tabular numerals。
- 不使用 CJK webfont 或装饰字体子集，故没有网络字体、授权、字形缺失或 font-load shift 风险；以系统 fallback 截图作为 QA 证据。
- 页面标题命名最小准确范围；第一句先说当前影响或可执行动作。错误文案区分“环境未发现”“API 未运行”“数据源缺凭证”和“查询失败”，不得统称“暂时无法使用”。按钮只写当前界面真实能做的动作。

## Accessibility

- 侧栏使用 `<nav aria-label="主导航">`，分组标题不进入 tab 交互模型；当前路由使用 `aria-current="page"`。
- 折叠侧栏的图标按钮必须有中文 accessible name 和 tooltip。
- 键盘顺序：产品标志 → 主导航 → 顶部状态/设置 → 页面标题操作 → 内容。
- 所有图标按钮最小 32px，主要触控目标建议 40px；焦点环 2px + 2px offset。
- 表格响应式隐藏列需在详情/菜单中仍可获取；状态不只靠颜色。
- 动画与 reduced motion 按项目 `MOTION.md`。

## Anti-template Decisions

- 不做大面积 hero、渐变光斑、玻璃层和 nested cards。
- 不把每项状态做成胶囊；仅过滤条件与短状态允许 chip。
- 保留操作台常见的侧栏和表格，因为真实路由数、重复工作和中文宽度需要它们。
- 品牌识别来自专有 Alice mark、信息架构和连接状态，不来自通用 AI 插画。

## Evidence Adoption Matrix

| 来源 | 观察 | 决定 | 理由/目标 |
| --- | --- | --- | --- |
| 当前 1250×811 运行截图 | 暗色、高密度桌面工具 | 部分采用 | 保留长期操作的密度，重做层级与节奏 |
| 当前截图 | ODP 左字标 + OpenBB 右图形 | 拒绝 | 双重品牌冲突；改 OpenAlice + Alice mark |
| 当前截图 | 九项顶部 tab | 拒绝 | 中等窗口拥挤且无业务/系统分组；改侧栏 |
| 当前截图 | provider 五列无标题列表 | 拒绝 | 可扫读性和响应式差；改 operation table |
| 现有源码 | `@openbb/ui-pro` 与 theme classes | 采用 | 保护官方组件和实现成本；做 token/组合层 |
| 现有源码 | 官方功能路由 | 采用并提升 | 真实连接依赖这些能力，不得隐藏或删除 |

## Implementation Priority

1. **P0 品牌与连接可信度**：产品名、Alice mark/右上角、窗口标题、attribution、全局环境/API 状态。
2. **P0 信息架构**：侧栏分组，保留全部官方路由，消除“高级设置”重复语义。
3. **P1 核心业务**：首页状态结论、数据源 operation table、目录和查询控制区。
4. **P1 系统一致性**：官方页面接入 PageHeader/StatusChip/按钮层级和中文规则。
5. **P2 资产与发行**：应用图标、安装包 metadata、publisher/updater/identifier 的迁移与法务评估；`co.openbb.platform` 不能顺手更改。

## Spec Reconciliation

本截图是现状证据而非 primary target，因此不启用精确重建/graybox 测量。首次实现后仍需用实际 Tauri 截图把偏差补记到本节。

| Value | Specified | Implemented | Cause |
| --- | --- | --- | --- |
| — | 尚未实施 | 尚未实施 | 当前阶段仅完成设计 artifacts |
