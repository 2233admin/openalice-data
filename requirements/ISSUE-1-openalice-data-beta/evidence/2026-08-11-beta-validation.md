# OpenAlice Data 0.1.0 Beta 1 验收证据

验收时间：2026-08-11（Asia/Shanghai）

## 自动化契约

同一套 24 项测试分别在 Python 3.11、3.12、3.13 通过：

```text
Python 3.11: 24 passed in 1.84s
Python 3.12: 24 passed in 1.67s
Python 3.13: 24 passed in 1.85s
```

测试范围包括双语 Catalog、PIT 防未来数据、Parquet/DuckDB、Facade、REST/MCP、中文数据屏、健康检查、部署契约和 GitHub CI 契约。

## 静态检查与构建

```text
ruff check --no-fix: All checks passed
node --check dashboard.js: passed
uv build: sdist + wheel built
docker compose config -q: passed
docker compose build: passed
```

构建镜像：`openalice-data:0.1.0-beta.1`

- 运行用户：`openalice`（非 root）
- 镜像 ID：`sha256:449d70661a38bb91e5ca4827f66a3f5e7ade595d55f38d09bf9cb71c5871bd90`

## 容器运行与真实数据

执行：

```bash
docker compose up -d
python scripts/verify_openalice_beta.py
```

结果：

```json
{
  "status": "passed",
  "checked_at": "2026-08-11T11:27:46.554162+00:00",
  "health": {
    "status": "ok",
    "product": "OpenAlice Data",
    "version": "0.1.0-beta.1",
    "catalog": "ready",
    "dashboard": "ready"
  },
  "dashboard": {
    "language": "zh-CN",
    "bytes": 8671
  },
  "real_data": {
    "provider": "yfinance",
    "parameters": {
      "symbol": "AAPL",
      "start_date": "2024-01-02",
      "end_date": "2024-01-05"
    },
    "result_count": 4,
    "first_date": "2024-01-02",
    "error_category": null
  }
}
```

Compose 状态为 `healthy`，页面与 API 通过宿主机 `6900` 端口访问。验收后已执行 `docker compose down` 清理测试容器和网络；镜像保留以便复验。

## 远端 CI 与发布

- GitHub 仓库：<https://github.com/2233admin/openalice-data>
- 发布提交：`d4eecda6ac177c2a9da9d9d32d4d28f8aeb4a033`
- GitHub Actions：<https://github.com/2233admin/openalice-data/actions/runs/31491320115>
- 远端结果：Python 3.11、3.12、3.13 契约与 Compose 镜像任务全部成功。
- 标签：`v0.1.0-beta.1`
- GitHub Prerelease：<https://github.com/2233admin/openalice-data/releases/tag/v0.1.0-beta.1>

## 未覆盖

- 未做逐像素浏览器截图审查；页面契约、静态资源、JavaScript 语法与实际 HTTP 返回已验证。
- 未验证需要凭据的第三方 Provider。
- 完整 OpenBB 上游依赖树仍有 GitHub Dependabot 告警，未在本 Beta 中批量升级，避免未经验证地改变上游兼容性。
