# OpenAlice Data 首个 Beta 设计

## 决策卡

- Driver：Codex
- Approver：项目维护者
- Owner：项目维护者
- 阶段：执行
- 影响：对外 Beta、Web 入口、容器部署、GitHub 发布
- 目标仓库：`2233admin/openalice-data`

## 结论

首个 Beta 继续以完整 OpenBB Fork 为底座，在 `openalice_data` 扩展内增加一个随 API 同进程交付的中文数据屏；容器同时安装 OpenBB Equity 与 yfinance，以无需凭据的真实历史行情完成首次数据闭环。发布形态为单个 Docker Compose 服务，不新增 Node/Web 运行时。

## 问题与约束

当前仓库已有双语 Catalog、只读数据查询、REST、MCP 和 Dockerfile，但首次使用仍是开发者体验：没有默认首页、没有数据源诊断入口、没有一条命令启动流程，默认镜像也没有能直接验证的真实 OpenBB Provider。

Beta 必须同时证明三项产品主张：

1. 自定义市场和数据源有清晰入口。
2. 首次使用路径与错误反馈默认中文。
3. 仅安装 Docker 的用户可完成启动并看到真实数据。

OpenBB 的标准模型、Provider 插件、REST/MCP 契约和上游历史必须保留，不另造一套数据协议。

## 目标与成功指标

1. 用户执行 `docker compose up --build -d` 后，可从同一端口打开中文数据屏。
2. 数据屏展示 Catalog 数据集、数据源状态、数据集详情和真实行情验证入口。
3. 默认真实行情用 OpenBB yfinance Provider 请求固定历史区间；成功、无数据和失败均有中文状态。
4. “接入自定义市场”入口解释两条扩展路径：OpenBB Provider 与只读 Parquet/DuckDB 数据集，并指向仓库内可执行文档/模板。
5. 既有四个 MCP 工具和 Catalog API 保持兼容。
6. 自动化测试覆盖页面、健康检查、既有 API 契约和真实数据调用的可控边界；发布前另跑一次联网真实数据验收。
7. Beta 推送至公开 GitHub 仓库，并提供中文快速开始与已知限制。

## 用户流程

```text
安装 Docker
  -> docker compose up --build -d
  -> 打开 /api/v1/data/
  -> 看到服务健康、数据集数量和数据源状态
  -> 搜索/选择数据集
  -> 请求一段真实历史行情
  -> 需要扩展时进入“接入自定义市场”入口
```

## 公共验收面

| Seam | 用户可见行为 | 自动化证据 |
|---|---|---|
| `GET /api/v1/data/` | 返回可访问的中文数据屏 | FastAPI TestClient 页面契约测试 |
| `GET /api/v1/data/health` | 返回产品名、版本与健康状态 | API 响应断言 + Compose healthcheck |
| 既有 `/api/v1/data/catalog/*`、`/sources/status` | 行为与返回模型不回退 | 现有 16 项扩展测试 |
| `/api/v1/equity/price/historical` | 通过 yfinance 返回真实历史行情 | 隔离契约测试 + 发布前联网冒烟 |
| `docker compose up --build -d` | 单服务启动并暴露 6900 | Compose 配置校验 + 容器健康检查 |

## 方案权衡

| 方案 | 首次部署 | 复用 OpenBB | UI 能力 | Beta 风险 | 决策 |
|---|---:|---:|---:|---:|---|
| 复用上游 Tauri Desktop | 差，需要 Node/Rust/桌面运行时 | 高 | 高 | 高 | 不选；与傻瓜部署冲突 |
| 独立 React/Vite 服务 | 中，需要第二镜像和反向代理 | 高 | 高 | 中 | 延后；首个 Beta 过重 |
| FastAPI 同进程静态数据屏 | 最好，单端口单容器 | 高 | 足够 | 低 | 采用 |
| 只发布 Swagger/API | 好 | 高 | 低 | 低 | 不选；无法形成产品体验 |

## 功能优先级

### P0

- 中文单页数据屏与移动端可读布局。
- Catalog 搜索、数据集详情、数据源状态。
- OpenBB yfinance 真实行情验证。
- 中文空态、加载态和错误态。
- 自定义市场/数据源入口。
- 健康检查、Compose、中文快速开始。

### P1

- 数据源凭据向导。
- Provider 脚手架命令。
- 数据表分页、导出和图表。

### P2

- 用户账户、远程配置写入、采集调度、交易功能。

## 非目标

- 不在 Beta 中实现账户、持仓、下单或交易执行。
- 不提供采集调度器，不伪造 PIT 时间，不修改外部数据。
- 不替代 OpenBB Workspace，也不复刻完整分析终端。
- 不在网页中持久化第三方凭据。
- 不为了页面修改 OpenBB Core 的数据模型。

## 触达资产

| asset_id | relation | change_or_usage | risk | verify | rollback |
|---|---|---|---|---|---|
| `openalice_data` FastAPI router | 产品入口 | 新增 UI 与 health 非 MCP 路由 | 路由前缀或 MCP 工具数回退 | API/路由契约测试 | 删除新增路由和静态资源 |
| Dashboard 静态资源 | 用户界面 | 新增中文单页 | 浏览器兼容、接口错误未处理 | HTML/资源测试；人工打开 | 删除静态资源 |
| `build/docker/openalice-data.Dockerfile` | 运行镜像 | 安装 Equity/yfinance | 镜像增大、依赖冲突 | 构建与真实请求冒烟 | 移除新增包 |
| `compose.yaml` | 部署入口 | 单命令启动、健康检查 | 路径/挂载在不同主机失败 | `docker compose config` + health | 删除 Compose 文件，保留 Dockerfile |
| GitHub `2233admin/openalice-data` | 对外发布 | 新公开仓库与 Beta | 误带内部资料或无关脏改 | 显式 staging、diff 审计、PR/Release 检查 | 删除错误分支/Release；仓库操作另行确认 |

## 风险与停止条件

- 如果 Docker 镜像无法稳定加载本地扩展，停止发布并保留本地验证证据。
- 如果真实数据仅在测试桩中通过而联网请求失败，不标记 Beta 可发布。
- 如果准备推送的提交包含现有未跟踪研究材料，不纳入 Beta staging。
- 如果公开仓库的许可证或上游归属不完整，不发布 Release。

## 回滚

Beta 代码保持在独立提交和分支。出现阻断时可撤销该提交；现有 Gitea `origin` 与只读 `upstream` 不改变，GitHub 使用独立 `github` 远端。

## Action items

1. Codex：按公共 seam 进行红绿实现。
2. Codex：补 Compose、快速开始和联网验收证据。
3. Codex：审计 diff，仅提交 Beta 文件。
4. 项目维护者：验收数据屏与公开仓库呈现。
