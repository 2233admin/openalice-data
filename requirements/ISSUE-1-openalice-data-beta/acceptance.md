# OpenAlice Data Beta 验收清单

## 功能

- [x] `/api/v1/data/` 返回中文数据屏，页面标题为 `OpenAlice Data`。
- [x] 页面可搜索内置 Catalog，并查看数据集详情。
- [x] 页面显示数据源状态，能区分可用、仅目录和不可用。
- [x] 页面可请求 OpenBB yfinance 的真实历史行情并呈现结果。
- [x] 页面提供“接入自定义市场”入口，区分 Provider 与只读数据集。
- [x] 页面具备中文加载、空数据和错误反馈。

## 兼容性

- [x] 四个既有 MCP 工具名称和数量不变。
- [x] Catalog/PIT/Facade 现有测试全部通过。
- [x] 新增 UI 与 health 路由不进入 MCP 工具清单。
- [x] Python 3.11–3.13 契约不回退。

## 部署

- [x] `docker compose config` 通过。
- [x] `docker compose up --build -d` 可启动单服务。
- [x] 容器健康检查通过，6900 端口可访问。
- [x] 中文 README 从零说明安装、启动、验证和停止。

## 真实数据

- [x] 发布前联网调用 OpenBB yfinance 返回至少一行已知历史区间数据。
- [x] 验收记录 Provider、参数、时间、结果数和错误类别。
- [x] 联网失败不得以 mock 或 `SKIP` 计为通过。

## 发布

- [x] Git diff 不包含既存的 `docs/OPENALICE_DATA_NEXT_PHASE_DECISION.md` 与 `docs/research/`。
- [x] 许可证、OpenBB 上游归属和免责声明保留。
- [ ] 提交已推送至 `2233admin/openalice-data`。
- [ ] GitHub Beta 发布说明包含能力、启动方法和已知限制。
