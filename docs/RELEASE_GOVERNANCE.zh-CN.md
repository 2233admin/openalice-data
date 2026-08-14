# OpenAlice PR 与 Release 治理

状态：生效；生效日期：2026-08-12。

## PR 类型

| 前缀 | 用途 | 必须验证 |
|---|---|---|
| `sync/openbb-*` | 同步 OpenBB 上游 | 上游 commit、Core 冲突、兼容测试、归属信息 |
| `desktop/*` | 品牌、本地化、安装、更新、环境与 UI | Desktop 单测、构建、首次启动相关测试 |
| `provider/*` | 单个真实数据源 | 合同测试、真实联网验证、字段/条款说明 |
| `platform/*` | 标准模型、REST/MCP、研究数据扩展 | Python matrix、API/MCP 契约、上游兼容 |
| `release/*` | 版本、发行说明、安装包门禁 | 安装/升级/卸载、真实数据、校验和、签名状态 |

一个 PR 不得同时做上游同步和 OpenAlice 产品功能。Release PR 不得临时混入未经单独审查的功能。

## 发布渠道

### Nightly

- `main` 或手动触发构建；
- 只上传 GitHub Actions Artifact；
- 不创建 GitHub Release；
- 允许未签名，但文件名和构建摘要必须说明；
- 用于安装、冒烟和回归测试。

### Beta Candidate

- 手动触发并强制创建 Draft Prerelease；
- 产出安装包、SHA256、依赖清单和已知限制；
- Draft 必须经过真实安装审计后才能发布；
- 发布动作由维护者在 GitHub Release 页面显式确认，工作流不得自动公开。

### Stable

必须满足：

- Windows 安装包具有 OpenAlice 自有代码签名；
- Tauri 自动更新具有 OpenAlice 自有更新签名；
- 干净系统安装、从上一版本升级、保留数据卸载和完全清理卸载均通过；
- 中文首次使用流程通过；
- 无 Key 的真实 A 股与美股数据验证通过；
- 更新地址、应用标识、目录、进程和卸载项与 OpenBB 官方发行版隔离；
- Release notes 记录上游基线、许可证、Breaking Changes 和已知问题。

## Beta 发布门禁

Draft 转公开前，每项都必须有可追踪证据：

1. 安装包由目标 commit 的 GitHub Actions 生成，SHA256 匹配。
2. Windows 干净用户环境能够安装和首次启动。
3. 默认目录为 OpenAlice，不创建新的 OpenBB 产品目录。
4. 首屏、安装、扩展、后端、日志、更新和卸载不存在误导性的官方 OpenBB 产品身份。
5. OpenBB 技术归属与 AGPL 信息仍可访问。
6. 默认扩展和真实数据任务通过。
7. API、MCP、Jupyter 至少各完成一次启动/停止验证。
8. 卸载不会删除官方 OpenBB 或用户未授权的数据。
9. 未签名 Beta 明示 SmartScreen 风险；Stable 不允许未签名。

任何一项缺少证据，Release 必须保持 Draft。

## 版本和标签

- Desktop 标签：`openalice-desktop-vX.Y.Z[-prerelease]`
- Platform 标签：`openalice-platform-vX.Y.Z[-prerelease]`
- 产品发行说明分别记录 Desktop 与 Platform 版本，避免沿用 OpenBB 的 `ODP` 浮动标签。

## 当前发行状态

`OpenAlice Desktop 0.1.0-beta.1` 是内部构建证明，不满足 Beta 发布门禁，必须保持 Draft。它证明 Windows 安装包可由 Actions 生成，不证明产品体验可公开交付。
