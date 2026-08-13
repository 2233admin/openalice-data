# Brief: OpenAlice 桌面品牌与体验刷新

## Goal

把当前基于 OpenBB Desktop 源码的混合界面重构为一致、中文优先、可真实连接的 **OpenAlice Data Platform**。更新主品牌和右上角标志，同时提升导航、状态、数据列表与官方功能的可发现性。

## Audience

- 需要配置数据源并快速运行真实查询的中文用户。
- 需要维护 OpenBB API、Python 环境、凭证、扩展和日志的技术用户。
- 使用压力集中在“能否连接、哪里出错、下一步做什么”。

## Surface

- 全局应用框架、产品名、窗口标题、Alice 品牌位和 attribution。
- 首页、数据源、数据目录、查询工作台。
- 服务、运行环境、API 凭证、扩展、日志、诊断和设置入口。
- 740px 最小桌面窗口到宽屏桌面；暗色为当前主要证据，浅色仍需 token 可用。

## Constraints

- 保持 Tauri 2 + React 18 + Vite 7 + Tailwind 3 + `@openbb/ui-pro`。
- 不删除现有官方功能和路由，不伪造连接状态。
- OpenAlice 为主品牌，保留必要 OpenBB 技术、版权和许可证归属。
- `co.openbb.platform`、publisher、updater、签名和应用数据目录暂不改，等待迁移评估。
- 不在本阶段编辑产品实现代码；仅产出可执行设计 artifacts。

## Non-goals

- 不重写 OpenBB 后端或 provider 协议。
- 不换组件库，不新增动画/渲染依赖。
- 不把当前截图做 1:1 复刻；截图只是现状审查证据。
- 不在未确认发行权和迁移策略时改安装包标识、publisher 或 updater。

## Acceptance Checks

- 所有可见主品牌统一为 OpenAlice Data Platform，零 “Date Platform”。
- 右上角 OpenBB 主标识被 Alice 品牌标志替代，OpenBB attribution 仍清晰可达。
- 官方功能与 Studio 功能有清晰分组，核心入口在 740px 宽度仍可使用。
- 中文任务文案一致，技术标识作为二级信息保留。
- 设计基础 checker 为 `ready`，实现任务按优先级可独立验证。

## Evidence

- 当前运行截图：本地 QA 截图（临时文件，不提交机器路径）
- 尺寸：1250 × 811；SHA-256：`E41D154DF697FDF4A69DC8558615966F2BD5CE7264667AAD23383C48081EE5FF`。
- 角色：现状证据（existing-system），不是视觉目标或精确重建参考。
