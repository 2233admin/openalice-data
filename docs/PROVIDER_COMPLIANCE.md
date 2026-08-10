# Provider 合规清单查阅入口

权威来源是 [`providers.json`](../openbb_platform/extensions/openalice_data/openalice_data/catalog/providers.json)；数据集到 Provider 的映射见 [`datasets.json`](../openbb_platform/extensions/openalice_data/openalice_data/catalog/datasets.json)。最近校验：2026-08-10。

| 要查什么 | 位置 |
|---|---|
| 软件许可证、数据条款、认证方式、商用限制、归属 | `providers.json` 对应 `provider_id` |
| 数据集市场、字段、PIT、查询入口 | `datasets.json` 对应 `dataset_id` |
| 运行时 Provider 是否已注册 | `source_status` MCP/REST 工具 |
| AxData 接口范围 | [AxData 接口目录](https://electkismet.github.io/AxData/interfaces/index.html) |
| AxData 项目与数据使用声明 | [AxData 项目声明](https://electkismet.github.io/AxData/index.html) |

## 当前接入状态

| Provider | 连接形态 | 默认状态 | 说明 |
|---|---|---|---|
| OpenBB 原有 Provider | 上游完整 Fork | 可安装、按各 Provider 配置 | 数据条款逐源审查 |
| `ashare` | 自有 OpenBB Provider | 基础快照已存在 | 适配器条款逐源审查 |
| AxData | 可选 SDK Provider | 目录登记，未复制接口实现 | 非商用限制与源端授权必须人工复核 |
| `katana_parquet` | 只读 Parquet/DuckDB | 需运行时 manifest | Hub 不写湖、不生产 PIT |

## 重验

```powershell
$env:PYTHONPATH='openbb_platform/extensions/openalice_data'
uv run --python 3.12 --with pytest --with pydantic --with fastapi python -m pytest openbb_platform/extensions/openalice_data/tests/test_manifest.py -q
```

清单字段只描述认证方式，不保存认证值。任何 `review_status=required` 的 Provider 都不得被文档解释为已获得商用授权。
