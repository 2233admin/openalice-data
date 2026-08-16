# OpenAlice

**完整 OpenBB Fork + 中国及亚洲市场 Provider + 必要的中文本地化。**

OpenAlice 保留 OpenBB Open Data Platform 的标准模型、Provider、Python、CLI、
REST、MCP、Charting、Jupyter 和 ODP Desktop，不建立另一套行情 Core。我们的主要
增量是中国及亚洲市场 Provider；上游能力默认完整保留。

## 当前组成

- `openbb_platform/`：完整 OpenBB 4.7.3 Fork。
- `desktop/`：基于上游 ODP Desktop 的本地环境和服务控制面。
- `openbb_platform/providers/ashare/`：OpenAlice A 股 Provider。
- `openbb_platform/extensions/openalice_data/`：可选的只读数据集/PIT 扩展，
  不属于默认运行时，也不替代 OpenBB Provider。

## 一条命令启动完整 OpenBB

需要 Docker Desktop 或 Docker Engine + Compose：

```bash
git clone https://github.com/2233admin/openalice-data.git
cd openalice-data
docker compose up --build -d
```

启动后访问：

- OpenBB API 文档：<http://localhost:6900/docs>
- OpenBB Provider 覆盖：<http://localhost:6900/api/v1/coverage/providers>
- Workspace 后端清单：<http://localhost:6900/widgets.json>

镜像安装当前 Fork 的 `openbb[all]` 和本地 A 股 Provider，不再裁剪成只有
Equity/yfinance 的最小环境。

停止服务：

```bash
docker compose down
```

端口可通过 `.env` 中的 `OPENALICE_PORT` 调整。

## A 股 Provider

A 股 Provider 实现 OpenBB 标准 `EquityQuote` 模型，安装后复用原有 Python、
REST、MCP 和 `widgets.json` 路径：

```python
from openbb import obb

quote = obb.equity.price.quote("000001.SZ", provider="ashare")
```

首个内置 adapter 使用无需密钥的 yfinance 沪深市场代码，提供开箱可运行的真实
数据路径。Provider 保留 adapter 边界，后续 AKShare、Tushare、QMT/XtData、
efinance 等数据源按各自授权独立接入，不修改 OpenBB Core。

规划中的中国及亚洲市场 Provider 包括：

- A 股搜索、实时行情、历史行情和公司资料；
- 沪深北指数、ETF、基金、可转债和国内期货；
- 港股，以及日本、韩国、新加坡和印度等亚洲市场。

## OpenAlice Desktop

`desktop/` 是 OpenBB 官方开源 ODP Desktop 的 Fork，负责：

- 安装和管理隔离的 Python 环境；
- Provider 与扩展管理；
- API Keys；
- REST、MCP 和自定义 Backend；
- JupyterLab 与日志。

默认环境从本仓 `main` 分支安装完整 `openbb[all]` Fork 和 A 股 Provider，而不是
重新实现 OpenBB。开发和 Windows 构建要求见
[`desktop/README.md`](desktop/README.md)。

## 可选 Data Hub 扩展

`openalice_data` 保留为可选扩展，用于只读查询已有 Parquet/DuckDB/PIT 研究数据。
它不参与默认 Docker 或 Desktop 安装，不负责行情采集、调度、湖写入或交易执行。
确有这类需求时可单独安装：

```bash
pip install ./openbb_platform/extensions/openalice_data
```

## 开发验证

A 股 Provider：

```bash
uv run --python 3.12 \
  --with-editable openbb_platform/core \
  --with-editable openbb_platform/providers/ashare \
  --with pytest --with pytest-asyncio \
  python -m pytest openbb_platform/providers/ashare/tests -q
```

可选 Data Hub 契约：

```bash
uv run --python 3.12 \
  --with-editable openbb_platform/core \
  --with-editable openbb_platform/extensions/openalice_data \
  --with pytest --with httpx2 \
  python -m pytest openbb_platform/extensions/openalice_data/tests -q
```

## 上游与许可证

本仓是完整 OpenBB Fork，上游基线与同步方式见 [UPSTREAM.md](UPSTREAM.md) 和
[docs/UPSTREAM_SYNC.md](docs/UPSTREAM_SYNC.md)。项目继续遵循 AGPL-3.0，并保留
OpenBB 版权、许可证和第三方归属。

OpenAlice 是独立项目，与 OpenBB 官方不存在赞助、背书或隶属关系。第三方数据的
使用权不随代码自动获得，请阅读 [DISCLAIMER.md](DISCLAIMER.md) 和
[Provider 合规说明](docs/PROVIDER_COMPLIANCE.md)。
