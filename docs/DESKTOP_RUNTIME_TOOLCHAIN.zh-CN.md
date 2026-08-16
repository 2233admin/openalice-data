# Desktop 运行工具链

状态：实现中；适用范围：OpenAlice Desktop 创建和管理的 Python 环境。

## 同一环境原则

Desktop 的 CLI、Python、REST API、MCP 和 Jupyter 必须从用户所选的同一个 Conda 环境启动。API Keys、Provider、Python 包和版本因此保持一致，不能各自维护一套隐藏环境。

默认 `openbb` 环境交付以下入口：

| 能力 | Python 包 | 可执行命令 |
|---|---|---|
| 交互命令行 | `openbb-cli` | `openbb` |
| REST API | `openbb-platform-api` | `openbb-api` |
| MCP | `openbb-mcp-server` | `openbb-mcp` |
| Notebook | `jupyterlab` | `jupyter lab` |
| 首个真实美股数据源 | `openbb-yfinance` | 通过 OpenBB Provider 接口调用 |

Desktop 使用其私有 Conda 可执行文件运行 `conda run -n <environment>`，或先激活同一个环境后启动交互终端。不能回退到系统 Python 或官方 OpenBB 安装目录中的可执行文件。

## 当前启动链

1. Desktop 在安装目录下创建私有 Conda。
2. `generate_environment_yaml` 生成基础环境，安装上表组件。
3. Environments 页面检查所选环境实际安装的包，只在入口可用时显示 CLI/Jupyter 操作。
4. CLI/Python/IPython 在激活所选环境的系统终端中运行。
5. Jupyter 通过该私有 Conda 的 `conda run -n <environment>` 启动。
6. Backends 中的 REST/MCP 服务记录环境名，并通过同一个 Conda 环境启动。

## PR 验收

- 新安装生成的 YAML 同时包含 CLI、API、MCP、Jupyter 和 yfinance Provider。
- Rust 单测验证上述基础组件，不能仅验证 Python 版本。
- 在 Desktop 创建的 Windows 环境中确认五个包来自同一 `sys.executable` 前缀。
- `openbb`、`openbb-api`、`openbb-mcp`、`jupyter` 四个入口均存在。
- 用 yfinance Provider 返回至少一条真实历史行情。

Windows 验收命令：

```powershell
powershell -File scripts/verify-desktop-runtime.ps1 -InstallDirectory "$env:USERPROFILE\OpenBB"
```

只验证离线运行时归属可追加 `-SkipRealData`。真实数据失败（包括供应商限流）必须按失败报告，不能由离线检查替代。

本文件描述技术启动链，不改变面向用户的最终 OpenAlice 品牌名称。
