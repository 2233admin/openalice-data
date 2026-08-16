# OpenAlice Data shell and ODP boundary

## Scope

本设计把现有 React/TanStack Router/Tauri Desktop 收拢成 OpenAlice Data 的三项正常任务：首页、数据源、环境与扩展。它复用 ODP 的环境、服务、凭证、扩展和日志能力，不重建运行控制面。

## Product decision

```text
OpenAlice 正常任务       ODP 原生能力（旧 URL 迁移入口）
首页                    Backends / Environments / Jupyter / Logs
数据源                  API Keys / Provider 执行
环境与扩展              扩展安装 / 服务配置 / Notebook
```

环境与扩展是唯一新增的运行侧组织入口；其中唯一新增运行概念是属于环境的启动方案。工作区仍是数据源侧的组合式数据预配装，不复制进启动方案。

## Information architecture

```text
首页
数据源
环境与扩展
  启动方案
  服务
  扩展
  环境
```

`/backends`、`/environments`、`/extensions`、`/api-keys`、`/jupyter`、`/logs`、`/frontends` 等旧 URL 可深链到原生能力或迁移表面，但不参与正常导航。`Advanced`、独立 Query、Data Catalog 和单独可视化前端管理页不属于当前产品。

## Home contract

首页回答“这次要启动什么”。默认只显示环境、该环境方案、数据源/工作区三个选择器和 Start。方案摘要显示服务与前端数量；只有“调整本次启动”才展开统一启动项清单。

Start 对最终清单逐项执行：先用 ODP command 启动未运行服务，再打开选中的多个前端。运行中的所选服务只记为复用；不在清单中的运行服务保持不变。服务错误不阻断其他服务或前端。一次启动批次记录新启动、复用、失败，可停止本次新启动、停止单服务或停止全部。停止本次永远不处理复用服务。

首页持久化上次选择和临时调整，但启动不产生副作用，除非用户再次点击 Start。旧 Backend auto-start 在读取时迁入环境默认方案，并通过原生更新 command 关闭。

## Startup plan contract

启动方案记录：`environment`、名称、统一的 `{ kind: service | frontend, id }[]` 启动项和时间戳。它不记录命令、端口、环境变量、工作目录、数据源、工作区或 URL。管理页从当前环境的 ODP 服务和可启动扩展产生候选，并按类别多选。

方案不是环境启动按钮；一个环境可有多个方案。没有服务、没有前端或两者都没有都属于有效方案。默认环境、OpenBB API、OpenBB MCP 和安装初始化仍由 ODP 原生流程提供。

## Data Sources contract

数据源页是唯一数据源/API Key 管理表面。原生 Provider/API Key 数据源一行，凭证字段在编辑中展开；内置数据源排在底部。工作区在左侧作为平级分类和组合式预配装，同一来源可进入多个工作区，移除成员或删除工作区不删除原生来源。已有顺序、自动切换和批量策略保留。

实时、缓存、陈旧、不可用和失败证据必须来自 ODP 或持久化状态；未知不得伪造为可用。Provider/Router 是数据源能力，不在扩展页重复展示。

## Environment and extensions contract

页顶选择环境；启动方案、服务、扩展页签共享该环境。服务页签直接调用原版 Backends commands，提供增删改、启停、重启、重试、状态和上下文日志。环境页签复用受管 Conda 创建、导入、更新、删除流程，支持 YAML、pyproject.toml 和 requirements.txt。

扩展页按“安装单元即管理单元”展示用户能识别且主动管理的可视化前端、Python Notebook、研究/回测工具；OpenBB 标准运行组件合并为不可删除项。Provider、Router、openbb-core、依赖和内部包默认隐藏。Notebook 不进入首页服务选择；日志附着实例。

## Reuse boundary

必须保持 ODP 为以下能力的唯一 authority：凭证桥、本地存储、服务监督、环境/包操作、扩展安装、Provider registry、REST/OpenAPI、MCP、Notebook 和日志窗口。OpenAlice 不实现查询引擎、前端协议、第二服务状态机、凭证桥、模板/克隆环境或全局 Logs 产品。

## Interaction posture

使用现有 OpenBB API Keys 组件、控件、主题 token 和表格密度。文案短而可操作；状态和按钮并列显示。每个失败保留服务/扩展/来源上下文与原生日志入口。测试只验证路线和行为，不验证快照或样式像素。
