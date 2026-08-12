# OpenAlice Data

**基于 OpenBB 的中文、多市场、易部署开源数据平台。**

## OpenAlice Desktop

OpenAlice 的主软件形态是基于 OpenBB Desktop 的桌面应用，用于管理隔离的
Python 环境、数据 Provider、API Keys、REST/MCP 后端和 JupyterLab。当前源码位于
[`desktop/`](desktop/)，不是 `/api/v1/data/` 下的 Beta 数据屏。

Windows x64 测试安装包通过 GitHub Actions 构建，并发布到本仓库的
[Releases](https://github.com/2233admin/openalice-data/releases)。首个测试版尚未使用
商业代码签名证书，文件名会明确包含 `unsigned`，下载后应使用随附的
`SHA256SUMS.txt` 校验。

本地开发需要 Node.js 22、Rust stable 和 OpenSSL 3。完整开发说明见
[`desktop/README.md`](desktop/README.md)。桌面代码源自 OpenBB，继续遵循 AGPL-3.0，
并保留上游版权与归属。

OpenAlice Data 保留 OpenBB 的标准模型、全球 Provider、REST 与 MCP 能力，补上中国市场习惯、双语数据目录、自定义市场入口和一条命令部署。首个 Beta 的目标很直接：只装 Docker，就能打开中文数据屏并拿到第一条真实数据。

## 一条命令启动

前置条件只有 [Docker Desktop](https://www.docker.com/products/docker-desktop/) 或 Docker Engine + Compose。

```bash
git clone https://github.com/2233admin/openalice-data.git
cd openalice-data
docker compose up --build -d
```

等待容器健康后打开：

- 中文数据屏：<http://localhost:6900/api/v1/data/>
- OpenBB API 文档：<http://localhost:6900/docs>
- 健康检查：<http://localhost:6900/api/v1/data/health>

数据屏可以搜索内置数据目录、检查数据源状态、查看数据集字段，并通过 OpenBB yfinance Provider 请求一段真实历史行情。

停止服务：

```bash
docker compose down
```

修改端口时，复制 `.env.example` 为 `.env` 并调整 `OPENALICE_PORT`。

## Beta 能做什么

- 中文优先的数据屏、加载状态和错误诊断。
- 统一搜索 A 股、美股、数字货币、期货和本地 PIT 数据集。
- 通过 OpenBB Provider 使用标准化市场数据。
- 只读挂载 Parquet/DuckDB 研究数据，保留版本、PIT 和 lineage。
- 同一套能力暴露给 Python、REST、MCP 和 Web。
- 数据源状态不泄露凭据。

## 接入自定义市场

OpenAlice Data 提供两条扩展路径，均不要求修改 OpenBB Core。

### 1. OpenBB Provider：实时或按需数据

适合交易所行情、公开网站接口和需要参数/字段转换的自定义市场。仓库内的最小 A 股 Provider 可作为起点：

- Provider 包：`openbb_platform/providers/ashare/`
- 标准化示例：`openbb_platform/providers/ashare/openbb_ashare/models/snapshot.py`
- OpenBB Provider 接口：沿用上游 `openbb_core.provider` 契约

Provider 安装后可复用 OpenBB 的标准模型、Python、REST 和 Agent 接口。

### 2. 只读数据集：版本化研究数据

适合已有 Parquet 或 DuckDB 数据。复制示例配置：

```bash
cp data/sources.example.json data/sources.json
```

然后在 `.env` 中启用：

```dotenv
OPENALICE_DATA_SOURCES=/data/sources.json
```

把对应数据文件放进 `data/` 后重启：

```bash
docker compose up -d
```

PIT 数据必须显式提供版本与 `as_of`；Hub 不写入数据、不补造时间戳。

## 本地开发

运行 OpenAlice Data 契约测试：

```bash
uv run --python 3.12 \
  --with-editable openbb_platform/core \
  --with-editable openbb_platform/extensions/openalice_data \
  --with pytest --with httpx2 \
  python -m pytest openbb_platform/extensions/openalice_data/tests -q
```

联网验证 OpenBB yfinance Provider：

```text
GET /api/v1/equity/price/historical
    ?symbol=AAPL
    &provider=yfinance
    &start_date=2024-01-02
    &end_date=2024-01-05
```

## Beta 已知限制

- 当前数据屏是最小单页，不包含账户、权限或在线凭据保存。
- 自定义 Provider 仍需编写 Python 适配代码；后续版本会提供脚手架向导。
- 本项目不负责采集调度，不提供交易、持仓或下单功能。
- 第三方数据的使用权不随开源代码自动获得，使用者需遵守各数据源条款。

## OpenBB 上游与许可证

本仓库是完整 OpenBB Fork。自有能力集中在 `openalice_data` 扩展与独立 Provider，尽量不修改 OpenBB Core；上游同步策略见 [UPSTREAM.md](UPSTREAM.md)。

仓库保留 OpenBB 的 AGPL-3.0 许可证、版权与第三方归属信息。OpenAlice Data 与 OpenBB 官方没有赞助、背书或隶属关系；OpenBB 名称仅用于说明兼容基础。

使用前请阅读完整的 [免责声明](DISCLAIMER.md)。

- 产品边界：[docs/PRODUCT_SCOPE.zh-CN.md](docs/PRODUCT_SCOPE.zh-CN.md)
- 架构决策：[docs/OPENALICE_DATA_DECISION.md](docs/OPENALICE_DATA_DECISION.md)
- Provider 合规：[docs/PROVIDER_COMPLIANCE.md](docs/PROVIDER_COMPLIANCE.md)
