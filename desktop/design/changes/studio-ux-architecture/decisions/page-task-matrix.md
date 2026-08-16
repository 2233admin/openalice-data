# Page task matrix

| Surface | User question | Primary action | Contextual routes | Must not require |
|---|---|---|---|---|
| 首页 | 这次要启动什么？ | 选择环境、方案、数据源并 Start | 环境与扩展、数据源、服务日志 | Provider/Conda/端口/命令知识 |
| 数据源 | 我有哪些原生数据源，如何组织？ | 查看、编辑凭证、加入工作区 | 环境与扩展、原生详情 | Provider × API 能力矩阵、第二 Catalog |
| 环境与扩展 | 如何管理这个环境的运行能力？ | 维护启动方案、服务和可识别扩展 | 原生 Conda/Backends/Jupyter/日志 URL | Advanced、模板、外部 Python 环境 |

## Invariants

- 正常导航只有三项；旧 ODP 页面仍可深链但不出现在导航。
- Start 只执行最终启动项，先服务后前端；部分服务失败不阻止其他项。
- 运行中的选中服务复用，停止本次不停止复用服务。
- 启动方案不保存服务配置、数据源或工作区。
- 原生数据源 identity、凭证状态、实时/缓存/陈旧/失败证据来自 ODP 或持久化状态。
- 工作区成员关系和批量/路由策略保留；不新增 Query、Catalog、映射引擎或通用协议。
