# OpenAlice 可执行路线图

状态：执行中；基线日期：2026-08-12。

## Phase 0：冻结错误发布（已完成）

- [x] 当前 Desktop Release 保持 Draft。
- [x] 确认当前安装包只是构建证明，不是公开 Beta。
- [x] 建立产品章程和发布门禁。

## Phase 1：发行版身份

目标：安装后呈现一个清晰、隔离、可维护的 OpenAlice Desktop，而不是改名不完整的 OpenBB Desktop。

- [ ] 新增集中式品牌配置，减少散落字符串。
- [ ] OpenAlice Logo、窗口、托盘、安装器、发布者和应用标识完整替换。
- [ ] 默认目录改为 `OpenAlice` / `OpenAliceUserData`，并设计旧测试目录迁移或共存策略。
- [ ] 环境显示名改为 OpenAlice；保留 Python 包 `openbb` 的技术事实。
- [ ] 中文覆盖首次安装、环境、扩展、API Keys、Backends、日志、更新和卸载。
- [ ] 移除默认跳转 `pro.openbb.co`，改成 OpenAlice 文档/本地欢迎页；保留可选 OpenBB Workspace 兼容说明。
- [ ] 扩展清单增加 OpenAlice 自有清单，并将 OpenBB 清单作为上游来源合并。
- [ ] 卸载器仅清理 OpenAlice 标识与用户明确选择的数据。
- [ ] 建立 Windows 安装/首次启动/卸载自动或半自动验收脚本。

完成标准：品牌审计无产品身份残留；干净 Windows 安装和卸载通过；不会影响官方 OpenBB 安装。

## Phase 2：真实数据承诺

目标：无需 Key 获取第一条真实 A 股和美股数据。

- [ ] 确定首个公开 A 股数据源及条款、稳定性和限流策略。
- [ ] 实现证券列表、交易日历、实时快照和历史日线的最小 Provider。
- [ ] 默认安装 `openalice_data`、A 股 Provider、Equity、yfinance、Platform API 和 MCP。
- [ ] 增加“第一条数据”中文向导和可复现请求。
- [ ] 输出来源、供应商时间、接收时间、请求数、返回数、缺失和 `complete`。
- [ ] 在 GitHub Actions/发布验收中加入真实 A 股与美股验证。

完成标准：全新安装无需额外 Key，向导成功返回真实 A 股和 AAPL 数据；失败时能给出可操作诊断。

## Phase 3：研究与 Agent

目标：让研究者和 Agent 可靠使用数据，而不是简单暴露大量接口。

- [ ] Jupyter 中文研究模板和数据源示例。
- [ ] MCP 先发现、后描述、再查询的工具体验。
- [ ] 大结果使用 Artifact/文件，避免灌入 Agent 上下文。
- [ ] 覆盖、缺失、冲突和新鲜度诊断。
- [ ] 将 PIT/Parquet/DuckDB 作为可选研究数据扩展，提供真实版本化样例。

完成标准：完成跨 A 股/美股研究和一个 PIT 研究的端到端可复现案例。

## Phase 4：Stable 发行

- [ ] OpenAlice Windows 代码签名证书。
- [ ] 独立 Tauri 更新密钥、`latest.json` 和回滚方案。
- [ ] 从 Beta 升级到 Stable 的迁移测试。
- [ ] macOS arm64/x64 构建、公证与安装验证。
- [ ] 发布支持范围、隐私、数据条款和安全响应文档。

完成标准：满足 `RELEASE_GOVERNANCE.zh-CN.md` Stable 全部门禁。

## 下一批 PR

1. `desktop/brand-foundation`：集中品牌配置、目录/应用标识、OpenBB 共存策略。
2. `desktop/zh-cn-onboarding`：中文首次安装与欢迎页。
3. `desktop/extension-sources`：OpenAlice + OpenBB 扩展清单合并与默认组合。
4. `provider/ashare-source-decision`：数据源选型、条款和真实请求 spike。
5. `release/windows-install-smoke`：安装、启动、卸载候选包验收。

每个 PR 必须对应本路线图的一组复选项，不允许用“页面看起来完成”代替验收证据。
