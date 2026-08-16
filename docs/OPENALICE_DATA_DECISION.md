# OpenAlice Data Hub 基础组件决策

> 适用性说明（2026-08-13）：本文只描述可选 `openalice_data` 扩展的内部实现。
> OpenAlice 默认产品已重新锚定为“完整 OpenBB Fork + 中国及亚洲市场 Provider
> 包 + 必要中文本地化”，Data Hub 不再是默认部署入口。

决策者：仓库维护者；日期：2026-08-10；结论：扩展完整 OpenBB Fork，采用 Arrow/DuckDB 查询本地数据，自写最小目录与 PIT 契约胶水。

## 问题与边界

需要一个公开开源、只读、多市场、Agent 优先的数据 Hub，同时保留 OpenBB 全球 Provider 和 `OBBject`，并允许只读查询 k-atana 生产的 PIT 数据。交易、采集调度和 PIT 生产不在本仓。

## 候选与取舍

| 候选 | 采用范围 | 适配度 | 主要限制 |
|---|---|---:|---|
| OpenBB | Provider、标准模型、OBBject、REST、MCP、全球市场 | 高，采用 | AGPL-3.0；必须保留上游归属并控制 Core 改动 |
| AxData | 中国市场可选 SDK Provider | 中，条件采用 | 数据条款需逐源授权；不复制 257 个接口实现 |
| AKShare | A 股/国内市场候选 Provider | 中，保留现有 OpenBB 接入方式 | 接口稳定性与数据条款逐接口评估 |
| Apache Arrow + DuckDB | Parquet/DuckDB 只读分页查询 | 高，采用 | 只负责查询，不提供业务目录或 PIT 规则 |
| Qlib | 因子研究与 A 股研究工作流 | 低，不用于 Hub Core | 不提供本计划所需的统一 Provider/MCP/双语目录契约 |

**wheels evaluated, none fit because**：没有单一 wheel 同时提供双语数据目录、`source_request`/`dataset_query`/`cache` 区分、严格 PIT 三时间列校验和四工具 Agent 契约。自写范围仅限这些薄胶水；Provider、返回对象、Parquet 执行和 MCP 投影分别复用 OpenBB、Arrow/DuckDB 与 OpenBB MCP。

## 决策与后果

- 完整 OpenBB 上游树保留，`openalice_data` 作为独立 core extension 演进。
- 短领域入口惰性委托给 `obb`，原样返回 `OBBject`。
- AxData 仅通过可选依赖适配；安装连接能力不代表授予数据使用权。
- 本地 PIT 查询强制 `version + as_of`，缺任一三时间列立即失败。
- 代价是 Fork 同步和 AGPL 合规成为持续维护事项。

## Non-Goals

- 不提供账户、持仓、交易执行或自动交易。
- 不建设第二套采集调度器或 PIT 湖写入链路。
- 不把缓存冒充版本化数据资产。
- 不在首次公开发行前发布 `openalice-data` 到 PyPI。

## Alternatives Considered

- 继续维护精简 Core：否决，会丢失全球 Provider、MCP 与上游兼容面。
- 从零实现 Provider 框架和返回对象：否决，重复 OpenBB 已有能力。
- 把 k-atana PIT 生产迁入 Hub：否决，破坏生产/查询职责分离。

## 触达资产

| asset_id | relation | change_or_usage | risk | verify | rollback |
|---|---|---|---|---|---|
| `openbb-upstream-tree` | 基线 | 合入完整 `upstream/develop` | 大仓推送与同步冲突 | code-intel、Git lineage | 保留 `backup/pre-openalice-full-baseline` |
| `openalice_data` | 新扩展 | 目录、查询、REST/MCP、Python facade | PIT 泄漏或大结果灌上下文 | 扩展测试、100 行页限 | 删除 entry point/扩展包 |
| Provider 清单 | 合规参考 | 条款与来源链接 | 条款漂移 | 人工重验源链接 | 将状态降为 `required`/禁用 Provider |

## Action items

- 仓库维护者：在有 Gitea 凭据和服务端配额确认后推送完整基线。
- Provider 维护者：实现 AxData SDK 适配前逐接口完成条款复核。
- 数据维护者：为实际 k-atana PIT 版本生成运行时 source manifest 并执行首期验收样板。
