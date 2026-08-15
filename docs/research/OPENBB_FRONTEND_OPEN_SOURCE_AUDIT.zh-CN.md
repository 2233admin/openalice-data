# OpenBB 前端开源状态与兼容实现边界审计

调研日期：2026-08-13（Asia/Shanghai）
调研范围：仅使用 OpenBB 第一方 GitHub 组织/仓库、官方文档、官方法律文本、npm Registry 发布元数据，以及美国版权局/USPTO 的权威说明。本文是工程与许可证风险分析，不构成法律意见。

## 一句话结论

**OpenBB 确实开源了 Open Data Platform、ODP Desktop、Workspace 数据/Agent 集成协议、Agent SDK，以及一部分 React 设计系统组件；但截至本次核验，没有发现 OpenBB Workspace 的完整 shell、dashboard/grid、widget runtime、Copilot UI、账户与协作前端源码，也不存在一套能直接 fork 后得到 Workspace 产品的官方公开仓库或 npm 包。**

所以两句话必须同时成立：

1. “OpenBB 有开源前端”——对，ODP Desktop 和部分 UI 组件是公开源码。
2. “OpenBB Workspace 完整前端已开源”——现有第一方证据不支持，且官方产品分层、公开仓库内容和法律条款共同指向相反结论。

## 固定证据版本

以下 commit 是调研时各官方仓库默认分支 HEAD；文中尽量使用固定 commit 链接，避免 `main`/`develop` 后续漂移。

| 官方仓库 | 固定 commit | 本次确认的许可证 |
|---|---|---|
| `OpenBB-finance/OpenBB` | [`3e071fcc2cd9f891cac6040ae60296dba76dab46`](https://github.com/OpenBB-finance/OpenBB/tree/3e071fcc2cd9f891cac6040ae60296dba76dab46) | 仓库根 `LICENSE` 声明全部文件 AGPL-3.0 |
| `backends-for-openbb` | [`a6293707576e16edda8305adda95b07b6a4b968b`](https://github.com/OpenBB-finance/backends-for-openbb/tree/a6293707576e16edda8305adda95b07b6a4b968b) | MIT |
| `agents-for-openbb` | [`aa1073d2b098ae6cf597dabf0635822aa808dd81`](https://github.com/OpenBB-finance/agents-for-openbb/tree/aa1073d2b098ae6cf597dabf0635822aa808dd81) | MIT |
| `openbb-ai` | [`2e54bc2fc3caef83fb592b11cc73399c7eee0c48`](https://github.com/OpenBB-finance/openbb-ai/tree/2e54bc2fc3caef83fb592b11cc73399c7eee0c48) | MIT |
| `design-system` | [`e6320a56ddca17099a416cc64b8b2c0d2ed06568`](https://github.com/OpenBB-finance/design-system/tree/e6320a56ddca17099a416cc64b8b2c0d2ed06568) | **仓库未发现 LICENSE，npm 元数据也未声明 license** |
| `widgets-library` | [`8c61f921e0c174a4677699fbbf7b3243efc2cb36`](https://github.com/OpenBB-finance/widgets-library/tree/8c61f921e0c174a4677699fbbf7b3243efc2cb36) | **未发现 LICENSE** |
| `openbb-platform-pro-backend` | [`f1c816398f7c864108772de160a886c9c8f89d54`](https://github.com/OpenBB-finance/openbb-platform-pro-backend/tree/f1c816398f7c864108772de160a886c9c8f89d54) | **未发现 LICENSE** |

许可证是逐个仓库/发布物判断，不能因为某个仓库在 OpenBB 官方组织下，就把另一个仓库的 AGPL 或 MIT 自动套上去。GitHub 公开可见和 npm 可下载安装，本身也不是复制、修改或再发布许可。

## 1. 用户所说的行情工作区 / Workspace 是否完整开源

### 结论：没有找到完整开源的 Workspace 前端

OpenBB 主仓自己把两类产品分得很清楚：Open Data Platform 是开源的数据集成基础层；Workspace 是供分析师可视化数据和使用 AI agents 的 enterprise UI，并把用户导向 `pro.openbb.co`。同一段只为 Workspace 提供“数据集成仓库”和“AI agents 集成仓库”链接，而不是 Workspace 源码链接。[OpenBB 主仓固定版本 README](https://github.com/OpenBB-finance/OpenBB/blob/3e071fcc2cd9f891cac6040ae60296dba76dab46/README.md#openbb-workspace)

官方 Workspace 文档把该产品定义为包含生产级 UI framework、widgets、dashboards、AI agent integration 和企业部署的应用。[Workspace Overview](https://docs.openbb.co/workspace) 但 OpenBB 官方 GitHub 组织当前公开仓库中，没有一个仓库包含这套应用的完整前端。公开仓库给出的只是它的外围扩展面：

- 数据后端与 widget manifest 示例；
- Agent 后端与流式消息协议；
- Agent Python SDK；
- 基础 React 组件和 Storybook；
- 历史 widget 图片、manifest、OpenAPI-to-`widgets.json` 工具。

一个很直接的第一方旁证来自官方开源 `agent-rita`：其 README 明确说 `useMcpExecutor` 和 `useWorkspaceBridgeCommandHandler` **位于 OpenBB Workspace frontend，而不在该仓库**；运行 Agent 还需要打开 Workspace 账户。[Agent Rita README](https://github.com/OpenBB-finance/agent-rita)

### “完整开源”与“浏览器能下载 JS”不是一回事

访问 SaaS 时浏览器必然接收构建后的 JavaScript、CSS 和图片，但这不自动授予复制、修改、派生或分发的权利。OpenBB 2026-07-08 生效的官方服务条款将 Workspace 服务分为 Free、Cloud、Lite、Enterprise，并称 OpenBB 保留 Platform 和相关软件的权利；除明确许可外，限制逆向、反编译、复制、修改、创建衍生作品、构建竞争产品及自动提取。[OpenBB Terms of Service，第 2、6、13 节](https://openbb.co/legal/terms-of-service/)

这与开源 ODP 的 AGPL 是两套许可关系，不能混用。官方 Evaluation License 也把 Workspace container images 定义为 evaluation materials，强调其有限许可，同时明确只有其中单独标识的 OSS components 按各自开源许可证处理。[OpenBB Evaluation License](https://openbb.co/legal/evaluation-license/)

## 2. OpenBB 主仓中的 `desktop/` 到底是什么

### 结论：它是完整开源的 ODP Desktop 控制面，不是 Workspace 行情工作台

上游 README 明确称该目录是 Open Data Platform Desktop application 和 system tray icon 的**完整源码**，官方发行二进制也由本仓构建流程产出。它采用 Tauri + React，约一半 Rust、一半 TypeScript，本质是操作系统和命令行工具的 GUI/wrapper；首装会配置 Miniforge，初始环境提供 REST API、MCP server、NodeJS 和 JupyterLab。[固定版本 `desktop/README.md`](https://github.com/OpenBB-finance/OpenBB/blob/3e071fcc2cd9f891cac6040ae60296dba76dab46/desktop/README.md)

官方安装文档同样把首次流程描述为：选择安装位置、安装 Miniforge、创建 OpenBB Python 环境，再按需添加 OpenBB 模块和 PyPI 包。[ODP Desktop Installation](https://docs.openbb.co/odp/desktop/installation)

因此它负责的是本地开发与运行控制面：环境、依赖、凭据、backend、REST/MCP/Jupyter、日志与托盘生命周期。它不是用于拖拽行情 widgets、保存 dashboards、共享 apps 和使用 Copilot 的 Workspace presentation plane。

`OpenBB` 仓根声明所有文件为 AGPL-3.0。[固定版本 LICENSE](https://github.com/OpenBB-finance/OpenBB/blob/3e071fcc2cd9f891cac6040ae60296dba76dab46/LICENSE) Fork 和修改该 Desktop 可以，但分发或作为网络服务提供时需要认真履行 AGPL（包括相应源码与适当法律声明等要求）；商业闭源发布应另行确认 OpenBB 商业许可。

## 3. 各公开部分到底包含什么

### `backends-for-openbb`

这是“把自己的数据带进 Workspace”的 MIT 参考仓库，不是前端。它包含：

- `widgets.json` / `apps.json` 声明；
- FastAPI hello-world 与 reference backend；
- table、chart、markdown、metric、PDF、news、HTML/iframe、live grid、multi-file、TradingView、Vega/Plotly/Highcharts 等数据端示例；
- 参数、分组、SSRM、数据库 connector 和 manifest/endpoint 校验脚本。

见[固定版本 README](https://github.com/OpenBB-finance/backends-for-openbb/blob/a6293707576e16edda8305adda95b07b6a4b968b/README.md)与[源码树](https://github.com/OpenBB-finance/backends-for-openbb/tree/a6293707576e16edda8305adda95b07b6a4b968b)。它定义“Workspace 怎样发现和取数据”，不实现 dashboard grid、widget renderer 宿主或 Copilot UI。

### `agents-for-openbb`

这是 MIT 的自定义 Agent 后端示例集，不是聊天前端。固定版本包含 raw widget context、reasoning、citations、chart/table/PDF/HTML artifacts、dashboard widgets、MCP tools、dynamic skills、feedback 和 prompt optimizer 等渐进式示例。[固定版本 README](https://github.com/OpenBB-finance/agents-for-openbb/blob/aa1073d2b098ae6cf597dabf0635822aa808dd81/README.md)；[源码树](https://github.com/OpenBB-finance/agents-for-openbb/tree/aa1073d2b098ae6cf597dabf0635822aa808dd81)

它输出 Workspace 能消费的事件和 artifacts，但不包含消息列表、context picker、artifact renderer、会话管理和 dashboard 回写的浏览器宿主实现。

### `openbb-ai`

这是 MIT 的 **Python SDK**，PyPI 项目名为 `openbb-ai`，代码主要是 Pydantic models、事件/结果 helper 与测试支持。其架构图也明确区分 `OpenBB Workspace (Frontend)` 与 `Agent (Backend)`，SDK位于后者。[固定版本 README](https://github.com/OpenBB-finance/openbb-ai/blob/2e54bc2fc3caef83fb592b11cc73399c7eee0c48/README.md)；[源码树](https://github.com/OpenBB-finance/openbb-ai/tree/2e54bc2fc3caef83fb592b11cc73399c7eee0c48)

它不是名为 “OpenBB AI” 的完整 Copilot Web 应用。

### `design-system`、`openbb-ui`、`@openbb/ui`

OpenBB 确实公开了 React 设计系统源码。固定版本 `design-system` 是一个 monorepo，主体为基础 atoms/molecules、dialogs、icon/font/color/Tailwind 配置和 Storybook workshop；README 还明确列出 Sidebar、loader、calendar 等当时未完成项。[固定版本 README](https://github.com/OpenBB-finance/design-system/blob/e6320a56ddca17099a416cc64b8b2c0d2ed06568/README.md)；[组件源码](https://github.com/OpenBB-finance/design-system/tree/e6320a56ddca17099a416cc64b8b2c0d2ed06568/packages/ui/src)

npm 上有两代公开包：

- [`openbb-ui@0.1.2`](https://www.npmjs.com/package/openbb-ui/v/0.1.2)，2023-09-05 发布，`gitHead=649aa0693a8d52ec9d8909da04884352edeb29fa`；
- [`@openbb/ui@0.14.17`](https://www.npmjs.com/package/@openbb/ui/v/0.14.17)，2025-01-17 发布，`gitHead=b7fadf25774cc4af2b59501a1777bbc8b5bfdf01`。

它们是组件库，不是应用 shell。更关键的是：本次核验时 GitHub 仓库没有 `LICENSE`，上述 npm package metadata 也没有 `license` 字段。**没有许可证时不能按 MIT/AGPL 自行推定可复制、修改和再发布。** 若 OpenAlice 要直接依赖或复制其代码/图标/字体，应先取得明确授权或让律师确认；最稳妥的是用有清晰许可证的通用组件自行实现 OpenAlice 视觉体系。

### `@openbb/ui-pro`

这个包确实存在，准确名称是 [`@openbb/ui-pro@0.7.10`](https://www.npmjs.com/package/@openbb/ui-pro/v/0.7.10)，而不是无 scope 的 `openbb-ui-pro`。npm 元数据固定到 `gitHead=3e029963864c322e476f2daa6725886d99d9f224`，发布日期 2024-03-05。

对官方 tarball `https://registry.npmjs.org/@openbb/ui-pro/-/ui-pro-0.7.10.tgz` 的内容核验显示，它只有约 27 个文件：基础 atoms/molecules/dialogs、样式、字体、图标 spritemap 与构建产物；不含 router、dashboard/grid、widget library/runtime、Copilot、认证或协作应用。包的 README 只有 ``# `main` ``，`package.json` 没有 `license` 字段。

因此它证明“OpenBB 曾公开发布 Pro 风格基础组件”，**不证明 Workspace/Terminal Pro 应用开源**。由于发布物未声明许可证，也不应把“npm 可下载”误判为拥有派生/再分发许可。

### `widgets-library`

这是历史 Terminal Pro widget 文档的图片与 `widgets.json` 元数据仓。README 说图片用于 widgets library documentation，并曾要求从一个 `OpenBB-finance/terminalpro` 路径复制最新 manifest。[固定版本 README](https://github.com/OpenBB-finance/widgets-library/blob/8c61f921e0c174a4677699fbbf7b3243efc2cb36/README.md)

它不包含 widget renderer 或 Terminal Pro shell，而且没有 LICENSE。截图/图片尤其不应直接拿来当 OpenAlice 产品素材。

### `openbb-platform-pro-backend`

这是把 OpenBB Platform OpenAPI schema 转为 `widgets.json` 并增加根 endpoint 的 Python wrapper。[固定版本 README](https://github.com/OpenBB-finance/openbb-platform-pro-backend/blob/f1c816398f7c864108772de160a886c9c8f89d54/README.md) 源码树只有少量 Python 文件，不含前端。[固定版本源码树](https://github.com/OpenBB-finance/openbb-platform-pro-backend/tree/f1c816398f7c864108772de160a886c9c8f89d54)

该仓同样没有 LICENSE，公开可读不等于可以直接复制进产品。

## 4. 是否存在可直接 fork 的完整 Workspace shell/dashboard/widget/Copilot 前端

### 结论：截至审计范围内，不存在

下面是容易被误认成“完整前端”的对象及其实际缺口：

| 对象 | 有什么 | 缺什么 |
|---|---|---|
| `OpenBB/desktop` | Tauri/React 本地环境与服务控制面 | Workspace dashboard/widget/Copilot 产品面 |
| `design-system`, `@openbb/ui`, `@openbb/ui-pro` | 基础 UI primitives、样式和 icons | 路由、状态、grid、widget runtime、Copilot、账户/协作 |
| `backends-for-openbb` | `widgets.json`/`apps.json`、数据 endpoint 示例 | 消费协议的前端宿主 |
| `agents-for-openbb`, `openbb-ai` | Agent 后端协议、SDK、artifacts | 消费 SSE、渲染 artifacts 和执行 bridge 的前端 |
| `widgets-library` | 图片和历史 manifest | 可运行组件与应用 |
| `openbb-platform-pro-backend` | OpenAPI 到 widget manifest 的后端转换 | 任意前端 |

严格说，无法证明世界上不存在某个未被索引的旧快照；但在官方 GitHub 组织的公开仓库、主仓历史定位、官方文档、npm 官方发布物和当前法律文本中，都没有发现可合法直接 fork 成完整 Workspace 的官方源码。若有人声称存在，应要求其提供：官方仓库 URL、固定 commit/tag、根许可证、可复现构建步骤，以及 dashboard/Copilot 源码路径。缺一不可。

## 5. OpenAlice 怎样合法实现兼容前端

### 可以做，而且建议做 clean-room 风格的独立实现

可以独立实现相同的**功能思想和公开协议**：backend connection、`widgets.json`/`apps.json`、可拖拽 dashboard、参数联动、table/chart/PDF/HTML widget、Agent SSE、citations、reasoning、artifacts、MCP tool round-trip。美国版权法明确区分 idea/method/system 与具体表达：17 U.S.C. §102(b) 不把版权扩展到 idea、procedure、process、system 或 method of operation。[17 U.S.C. §102](https://www.law.cornell.edu/uscode/text/17/102)

但应从公开文档和 MIT 仓库编写自己的规格、测试和实现，不应：

- 抓取、反编译、格式化或搬运 Workspace 的生产 bundle；
- 从受限 container image 提取代码、资源或模型；
- 复制未授权 npm 包、截图、图标、字体、文案、动画和布局细节；
- 让接触过非公开 OpenBB 代码或机密材料的人把实现细节直接带入；
- 声称 OpenAlice 是 OpenBB 官方版本或获得 OpenBB 背书。

这是因为具体代码和具有原创性的 screen display 可能受版权保护。美国版权局 Circular 61 明确说明，计算机程序登记可覆盖代码中的可版权表达及其产生的可版权 screen displays。[U.S. Copyright Office Circular 61](https://www.copyright.gov/circs/circ61.pdf) 同时，普通、功能性、标准化布局的保护范围可能较窄，但这不是“像素级照抄一定安全”的结论。

### “兼容”与“像素级复制”的风险分界

| 做法 | 风险判断 | 建议 |
|---|---|---|
| 独立实现公开 `widgets.json`/Agent 协议 | 低—中 | 写 conformance fixtures，标明兼容版本 |
| 实现 dashboard、widget library、右侧 AI panel 这类通用产品模式 | 中 | 自己设计信息层级、尺寸、视觉 token、文案和动效 |
| 依 AGPL fork ODP Desktop 并修改 | 可行但有合规义务 | 保留版权/许可证，履行 AGPL 源码与 notice 义务 |
| 复制 MIT 的 backend/agent 示例 | 可行 | 保留 MIT copyright 和 license notice |
| 直接复制无 LICENSE 的 `design-system` / npm UI 包 / widget 图片 | 高 | 先取得书面许可，否则不要复制或再发布 |
| 从 Workspace 网站 bundle/container 提取源码或资产 | 很高 | 不做；还可能违反官方服务/评估条款 |
| 逐屏按截图复刻到相同配色、间距、图标、文字、动效 | 高 | 避免；改成 OpenAlice 自有品牌和视觉表达 |
| 使用 OpenBB 名称/logo，做成像官方产品 | 很高 | 使用 OpenAlice 名称/logo，清晰写“independent / compatible with” |

商标风险不只来自完全相同的名称。USPTO 说明，如果标识在声音、外观、含义或整体商业印象上近似，并用于相关商品/服务，消费者可能误认来源，就可能构成 likelihood of confusion。[USPTO：Likelihood of confusion](https://www.uspto.gov/trademarks/search/likelihood-confusion) 因而 OpenAlice 应避免 OpenBB logo、产品图标、专有命名、官方截图和“OpenBB Workspace clone/edition”等易混淆包装；描述兼容性时使用必要、准确、非背书式表述，并加显著免责声明。

### 推荐工程边界

1. **后端保持 OpenBB fork**：基于 AGPL 的 ODP/Core/providers/ODP Desktop，明确记录上游 commit 和本地补丁。
2. **Workspace 前端独立著作**：新建 OpenAlice 自有 shell、设计 tokens、图标、布局和交互细节；功能目标可以一致，视觉表达不要像素级复制。
3. **协议优先**：以 MIT 的 `backends-for-openbb`、`agents-for-openbb`、`openbb-ai` 和官方公开 docs 为兼容规范来源。
4. **许可证白名单**：每个引入的仓库/npm 包必须有明确 SPDX/许可证文本；`design-system`、`@openbb/ui*` 在取得许可前不进入产品依赖或源码。
5. **留 clean-room 记录**：保存需求规格、来源链接、实现 PR、设计稿和资产来源；不保存/传播生产 bundle、容器提取物或非公开源码。
6. **品牌隔离**：产品只用 OpenAlice 品牌；About/文档中写明“independent project; not affiliated with or endorsed by OpenBB”，并保留依法必须保留的上游版权和许可证 notices。
7. **上线前法律复核**：特别审查 AGPL 组合方式、UI 资产来源、OpenBB 兼容性命名、数据供应商许可，以及中国/目标销售地的界面与不正当竞争规则。

## 对当前决策的直接回答

可以做一个“具有 OpenBB Workspace 同等核心工作流”的 OpenAlice 前端，而且这正好符合“完整 OpenBB fork + 中国及亚洲市场 providers + 必要中文本地化”的产品目标。**不要把目标写成“像素级复制 OpenBB Workspace”**；更安全也更可持续的表述是：

> OpenAlice Workspace：独立实现、兼容 OpenBB 公开 backend/widget/agent 协议，保留熟悉的金融研究工作流，使用 OpenAlice 自有视觉与中国/亚洲市场信息架构。

这不是退而求其次。真正需要复用的是数据与 Agent 协议和分析工作流；最容易制造许可证、商标和长期维护负担的，恰恰是对闭源产品具体视觉表达的逐像素复制。
