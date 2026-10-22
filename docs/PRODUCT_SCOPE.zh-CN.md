# OpenAlice 产品范围与 Provider 契约

状态：生效；决策者：仓库维护者；生效日期：2026-08-10；适用范围：本仓库、`openalice_data` 扩展、所有自有 Provider 与接入方。

本文规定当前产品边界：OpenAlice 是完整 OpenBB Fork，主要增量为中国及亚洲市场
Provider 和必要中文本地化。`openalice_data` Data Hub 是可选扩展，不是默认产品
入口。字段与第三方条款入口见 [PROVIDER_COMPLIANCE.md](PROVIDER_COMPLIANCE.md)。

## 主产品验收条款

| 条款 | 强制等级 | 约束 | 校验点 |
|---|---|---|---|
| P1 | MUST | 默认安装提供 OpenBB 全部公开 Provider、扩展、REST 与 Python 能力，而非自建精简替代品。 | 根包 `openbb[all]` 安装；上游兼容测试 |
| P2 | MUST | 中国及亚洲市场能力以 OpenBB Provider 和标准模型接入，不建立平行 API。 | Provider 注册表；REST coverage；widget 生成 |
| P3 | MUST | 首个 A 股 Provider 注册为 `ashare`，行情快照实现标准 `EquityQuote` 模型。 | `openbb_ashare` 合同测试 |
| P4 | SHOULD | 增量尽量留在自有 Provider、本地化和品牌层，降低 OpenBB Core 的同步冲突。 | Fork 差异审查 |
| P5 | MUST | 每个数据源单独记录授权、来源、新鲜度、覆盖率与缺失语义。 | Provider 合同与合规清单 |

以下 C 条款仅约束可选的 `openalice_data` Data Hub；它们不定义 OpenAlice
默认入口，也不要求默认部署携带本地数据目录。

## 术语

- **source request**：调用外部 Provider 发起即时只读请求。
- **dataset query**：查询已经存在的本地或远程数据资产。
- **cache**：可丢弃的请求结果缓存，不构成数据资产或 PIT 版本。
- **PIT 数据集**：同时携带 `event_time`、`available_at`、`source_updated_at`，且可按 `as_of` 截止查询的数据集。
- **完整性**：按请求标识集合核对返回、定价、缺失和冲突后的语义结论；HTTP 200 不是完整性证据。

## 约束条款

| 条款 | 强制等级 | 约束 | 校验点 |
|---|---|---|---|
| C1 | MUST | 产品只提供数据发现与只读访问，不得提供账户、持仓、下单或交易执行入口。 | REST/MCP 路由测试；人工接口审查 |
| C2 | MUST | Hub 不得接管 Provider 定时采集、k-atana PIT 生产或湖写入。 | `query.py` 只读适配器；部署审查 |
| C3 | MUST NOT | 系统不得从 `event_time`、接收时间或其他列推导、补写 `available_at`。 | `test_pit_query.py` |
| C4 | MUST | PIT 查询必须显式提供固定 `version` 与 `as_of`，并只返回 `available_at <= as_of` 的记录。 | `test_pit_query.py` |
| C5 | MUST | Parquet 与 DuckDB 数据源必须以只读方式打开；查询结果必须分页且单页不超过 100 行。 | `DatasetQuery` schema；数据源测试 |
| C6 | MUST | Python、REST 和 MCP 必须共用 `Catalog`、`DatasetQuery`、`QueryPage` 与 `DataHub` 契约。 | `test_api.py`、`test_facade.py` |
| C7 | MUST | Agent 面只暴露 `search_catalog`、`describe_dataset`、`query_dataset`、`source_status` 四个 Hub 工具。 | `test_api.py` |
| C8 | MUST | 凭据只能由 OpenBB Provider 环境或本地配置管理；目录、日志和响应不得包含凭据值。 | `test_manifest.py`；secrets scan |
| C9 | MUST | Provider 响应必须携带或可解释来源、新鲜度、覆盖、缺失和 `complete`；HTTP 成功不得自动设为完整。 | Provider 合同测试与验收样板 |
| C10 | MUST | OpenBB `OBBject` 与原有全球市场返回契约必须保留；短领域入口不得包装成新的行情返回对象。 | `test_facade.py`；上游兼容测试 |
| C11 | MUST | AxData 只能作为可选 SDK Provider 接入，不得复制其接口实现；数据授权由使用者依据源端条款取得。 | 依赖与许可证审查 |
| C12 | MUST | Python 支持范围为 3.11–3.13；正式品牌确定前包名保持 `openalice_data` 且不得发布到 PyPI。 | 包元数据与 CI matrix |

## 市场与首期验收

首期目录必须覆盖 A 股全市场快照、美股历史行情、数字货币 K 线、国内期货 K 线和一个 k-atana PIT 数据集。验收输出必须包含来源、新鲜度、覆盖率、缺失项、完整性和 PIT 版本；目录登记不等于 Provider 已安装或数据已获授权。

## 执行点与冲突处理

- 扩展单测、OpenBB 上游兼容测试和 Python 3.11–3.13 matrix 共同执行 C3–C12。
- 第三方条款无法自动判定时，`review_status` 必须保持 `required`，不得自动放行商用。
- 本文与代码 schema 冲突时，已发布 schema 与通过的合同测试优先；必须在同一变更中修正文档。
- 豁免 C1–C8 需要仓库维护者书面批准，并新增带到期日的例外记录；C3 不接受豁免。

## 变更治理

边界变更必须通过文件 diff、合同测试和维护者批准。新增 Provider 时必须同步 `datasets.json`、`providers.json`、测试和归属说明；新增 PIT 后端时必须复用 `DatasetQuery`，不得建立平行契约。
