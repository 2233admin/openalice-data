# OpenBB 两个官方集成仓库功能调研

调研日期：2026-08-13
调研对象固定版本：

- `OpenBB-finance/backends-for-openbb@a6293707576e16edda8305adda95b07b6a4b968b`
- `OpenBB-finance/agents-for-openbb@aa1073d2b098ae6cf597dabf0635822aa808dd81`
- 当前 OpenAlice 对照版本：`e15632390ee770aba36bf2fd47a9eac145690222`（工作树另有用户未提交修改，本报告未改应用代码）

## 结论

用户所说的“GitHub 那两个仓库”最可信、且由 OpenBB 官方明确成对列出的对象是：

1. [`backends-for-openbb`](https://github.com/OpenBB-finance/backends-for-openbb)：把自有数据接入 OpenBB Workspace 的后端协议、参考实现与 widget 示例。
2. [`agents-for-openbb`](https://github.com/OpenBB-finance/agents-for-openbb)：把自定义 AI Agent 接入 OpenBB Workspace 的协议与渐进式示例。

这个判断不是按仓库名称猜测。OpenBB 主仓把产品拆成两条官方集成路径：Data integration 指向 `backends-for-openbb`，AI Agents integration 指向 `agents-for-openbb`；同时明确说明 Workspace 是用于可视化数据集和使用 AI agents 的企业 UI，而开源 ODP 是数据集成基础层。[OpenBB 主仓说明](https://github.com/OpenBB-finance/OpenBB#openbb-workspace)

最关键的产品判断是：这两个仓库都**不是 Workspace 前端源码**，也不是一个可直接 fork 成桌面终端的完整 UI。它们公开的是 Workspace 的两个扩展契约和示例。OpenAlice 目前拥有 ODP、ODP Desktop 和自己的数据扩展，但尚未实现消费这两种契约的 Workspace 式宿主体验。因此当前桌面端与用户心中的“原版”差距大，不是因为两仓库的 UI 被删掉，而是因为那套宿主 UI 从未包含在两仓库内。

## 两仓库之间的关系

```text
数据后端（backends-for-openbb） ── widgets.json + JSON endpoints ──┐
                                                                  ├─ Workspace 宿主 UI
自定义 Agent（agents-for-openbb） ── OpenBB AI SDK 事件/结果流 ─────┘
                                      │
                                      ├─ 读取 dashboard/widget context
                                      ├─ 返回 citations/reasoning
                                      └─ 生成 chart/table/PDF/HTML/widget
```

前者定义“有哪些可呈现的数据组件、怎样取数”；后者定义“Agent 怎样理解当前工作区并把富结果送回 UI”。两者最终都由 Workspace 宿主消费，而不是彼此替代。[后端仓 README](https://github.com/OpenBB-finance/backends-for-openbb/blob/a6293707576e16edda8305adda95b07b6a4b968b/README.md)；[Agent 仓 README](https://github.com/OpenBB-finance/agents-for-openbb/blob/aa1073d2b098ae6cf597dabf0635822aa808dd81/README.md)

## 实际功能矩阵

| 能力 | `backends-for-openbb` | `agents-for-openbb` | 当前 OpenAlice Desktop |
|---|---|---|---|
| 自定义数据接入 | JSON 数据 endpoint；`widgets.json` 描述名称、类别、类型、endpoint 等；CORS；可选 header/query auth | 可把 widget 原始数据和 dashboard 上下文交给 Agent | 能启动 REST/MCP/自定义进程，但没有读取 `widgets.json` 并渲染 widget 的宿主 |
| Widget 工作区 | 提供 hello-world、reference backend 和 widget examples；包含 iframe/HtmlViewer 与 Workspace 参数同步示例 | Agent 可读取 dashboard widgets，也可产出 dashboard widgets | 没有 dashboard、grid、widget library、参数联动或上下文选择 |
| Agent 对话 | 无 | prompt 改写、reasoning steps、引用、反馈与自定义 feature 示例 | 能启动 MCP server，但没有聊天会话或 Agent 事件流 UI |
| 富结果 | 数据由 Workspace widget 呈现 | chart、table、PDF、PDF citations、HTML artifacts、dashboard widgets | 没有统一 artifact renderer |
| 工具使用 | 数据 endpoint 是 Workspace 的外部数据接口 | MCP tools 示例 | 仅管理 MCP 后端进程；没有工具授权、执行状态和结果展示 |
| 本机开发运行 | 参考实现多用 FastAPI，但协议不限定语言 | 示例依赖 OpenBB AI SDK | 优势项：Tauri 本地安装、Conda 环境、扩展、API Keys、REST/MCP、Jupyter 与日志管理 |

后端仓 README 明确要求 JSON 数据、`widgets.json` endpoint、CORS，并支持可选认证；它把 `widgets.json` 定义为 widget 名称、描述、类别、类型和 endpoint 等属性的声明文件。[协议说明](https://github.com/OpenBB-finance/backends-for-openbb/blob/a6293707576e16edda8305adda95b07b6a4b968b/README.md#introduction)

Agent 仓明确依赖 [OpenBB AI SDK](https://github.com/OpenBB-finance/openbb-ai)，并列出 raw widget data、reasoning、citations、charts、tables、PDF、dashboard widgets、MCP tools 等示例。这些是 Agent 集成能力，不是 Workspace React UI 组件源码。[示例目录说明](https://github.com/OpenBB-finance/agents-for-openbb/blob/aa1073d2b098ae6cf597dabf0635822aa808dd81/README.md#examples)

## 当前 Desktop 到底是什么

当前仓的 `desktop/` 来源是 OpenBB 主仓中的 ODP Desktop。上游自身将它描述为 Tauri + React 的系统托盘/后台服务 GUI，是操作系统与命令行工具的 wrapper；首次环境提供 REST API、MCP、NodeJS 与 JupyterLab。其目标是降低本地开发工具安装和管理门槛，而不是复刻 Workspace。[当前导入的 Desktop README](../../desktop/README.md)

代码层面的主导航也只有 `Backends`、`Environments`、`API Keys`，另有安装、卸载、backend/Jupyter logs 等路由（见 `desktop/src/routes/__root.tsx` 与 `desktop/src/routes/`）。它已经做好的是本机 control plane；两仓库需要的 data/agent presentation plane 尚不存在。

OpenAlice 自有 `openalice_data` 扩展已有四个只读 MCP/REST 工具：catalog search、dataset query、dataset describe、source status，并有一个 API 同进程的最小数据屏。这些可作为未来 widget/agent 数据源，但当前 Desktop 没有消费它们。

## 两个仓库所服务的实际 Workspace UX

两个仓库本身没有宿主前端，所以 UX 不能仅从它们的 Python 示例反推。OpenBB 官方 Workspace 文档给出了这些协议最终落地的交互模型：

- **Dashboard 是主工作面**：用户在空白画布上添加、拖动、缩放 widgets；dashboard 可以重命名、移动、复制、另开窗口、分享、删除、整体刷新，并能导出为 `apps.json`。[Dashboards 官方文档](https://docs.openbb.co/workspace/analysts/dashboards)
- **Widget Library 是数据发现入口**：可通过搜索框、`Cmd/Ctrl+K`、画布加号或 Add Widget 打开；widgets 按类别组织，元数据包含标题、描述、来源、类别和参数。[Widgets Overview](https://docs.openbb.co/workspace/analysts/widgets/overview)
- **Widget 是数据、视觉和交互的统一单元**：官方公开类型包括 table、chart、markdown、metric、PDF、multi-file viewer、live grid、newsfeed、iframe 等；表格支持排序、筛选、列控制及图表转换。[Widgets JSON Reference](https://docs.openbb.co/workspace/developers/json-specs/widgets-json-reference)
- **参数联动构成分析工作流**：多个 widgets 可以共享 ticker、日期等参数；一处改变后，同组 widgets 同步刷新。Widget 还能配置自动刷新、手动 Run，以及 CSV/JSON/Excel 导出。[Widgets Overview](https://docs.openbb.co/workspace/analysts/widgets/overview)
- **Apps 是预配置工作区**：`apps.json` 描述一组已布局、已联动的 widgets，并可附带 Agent 与场景 prompts，不只是一个后端服务入口。[Workspace Overview](https://docs.openbb.co/workspace)
- **Copilot 与 Dashboard 同屏**：AI 是可调整宽度、可全屏、也可隐藏的侧边面板；聊天区呈现流式答案、reasoning、chart/table/code 等 artifacts，底部负责选择 dashboard/widget context、Agent 和 prompt library。[Copilot Basics](https://docs.openbb.co/workspace/analysts/ai-features/copilot-basics)
- **Agent 使用结构化上下文而非截屏**：Agent 通过 dashboard/widget metadata、参数及数据请求理解当前分析内容，能返回引用和 artifacts，并可把生成的 widget 放回 dashboard。[Agents Integration](https://docs.openbb.co/workspace/developers/agents-integration)

因此 OpenAlice 要恢复的 UX 主循环不是“搜索股票后进入固定详情页”，而是：

```text
连接 backend -> 搜索 widget -> 加入 dashboard -> 联动参数/刷新数据
       -> 选择 widget 作为 Agent 上下文 -> 流式分析 -> artifact 回到 dashboard
```

这也给出了桌面端信息架构的硬边界：Dashboard/Apps、Widget Library 和 Copilot 是主产品面；现有 Environments、Backends、API Keys、Jupyter 和 Logs 是支撑它们的本机控制面。

## 为什么“原版功能”不能通过合并两个仓库直接得到

1. OpenBB 官方把 ODP 与 Workspace 明确区分：ODP 是开源数据基础层，Workspace 是企业 UI。[官方说明](https://github.com/OpenBB-finance/OpenBB#openbb-workspace)
2. `backends-for-openbb` 是“bring your own data”的模板，产出 Workspace 能读取的协议，不含 Workspace shell、dashboard renderer 或完整 widget UI。[仓库定位](https://github.com/OpenBB-finance/backends-for-openbb)
3. `agents-for-openbb` 是“bring your own agent”的示例，产出 Workspace 能消费的 Agent 流，不含聊天宿主的完整前端。[仓库定位](https://github.com/OpenBB-finance/agents-for-openbb)
4. OpenAlice 当前 fork 了 OpenBB 主仓，因此继承 ODP Desktop；它没有拿到商业 Workspace UI 源码。这就是产品形态差异的根因。

## 对 OpenAlice 的可执行实现阶段

### Phase 0：冻结兼容目标

- 以本报告两个 commit 固定首版兼容样本，避免追随 main 漂移。
- 从两个仓库选择最小 conformance fixtures：hello-world/reference backend；Agent 的 reasoning、chart、table、citation、MCP tool、dashboard context 示例。
- 把“兼容 OpenBB 的公开集成协议”与“复制 OpenBB 商业 UI”明确分开。

### Phase 1：桌面 Workspace 宿主骨架

- 在现有 Tauri 应用新增工作区 shell、可保存/恢复的 dashboard grid、widget catalog 和全局参数/context。
- 保留现有 Backends、Environments、API Keys、Jupyter、Logs，迁入本机设置/开发工具区，不删除其能力。
- 第一条端到端验收：Desktop 连接本机 backend，读取 `widgets.json`，添加 widget，调用 JSON endpoint 并渲染表格/图表。

### Phase 2：Backend 协议兼容

- 实现 backend connection registry、health/test、CORS/认证配置、`widgets.json` 校验和 widget 类型 registry。
- 支持 iframe/HtmlViewer 参数 bridge 与同组 widget 参数同步。
- 将 OpenAlice catalog/query/status endpoint 映射为内置 widgets，同时允许第三方 backend。

### Phase 3：Agent 宿主兼容

- 实现会话、流式消息、reasoning、citations、feedback、tool-call 状态。
- 实现统一 artifacts：chart、table、PDF、HTML、dashboard widget。
- 将当前 dashboard/widget context 安全传入 Agent；先用固定版本示例做协议测试，再接真实模型与 MCP。

### Phase 4：桌面整合与产品化

- 一键启动/连接本机 ODP REST、MCP、OpenAlice 数据服务，并把进程错误转化为用户可行动的连接诊断。
- 凭据继续由现有本机 API Keys/Provider 环境管理；widget/agent 响应不得泄露密钥。
- 加入离线/重连、窗口恢复、后台服务生命周期、升级迁移和 Windows 安装包验收。

## 建议的首个垂直切片

不要先制作静态“像 OpenBB”的首页。首个切片应同时证明两仓库的核心价值：

1. Desktop 自动连接 OpenAlice 本机 backend。
2. 从兼容 `widgets.json` 的 manifest 展示“数据目录搜索”和“历史行情”两个 widgets。
3. 用户把 widget 加入 dashboard，参数变化能联动刷新。
4. 右侧 Agent 能读取所选 widget 数据，通过 MCP 查询，并返回带引用的 table/chart artifact。
5. Backend、MCP、环境和凭据仍可在本机设置中诊断。

完成这条链路后，OpenAlice 才是在实现两个官方仓库公开出来的真实能力，而不仅是换皮或模仿截图。
