# QA

## Scope

本轮验证 OpenAlice Data 最新三表面模型：导航、启动方案持久化、首页执行、环境与扩展页签和数据源入口。只使用现有 route-level/studio 行为 seam；不做快照、样式细节或浏览器验证。

## Design gates

- 正常导航只有首页、数据源、环境与扩展。
- ODP 继续负责凭证、环境、服务生命周期、扩展安装、Notebook 和上下文日志。
- 启动方案只保存环境、名称和统一服务/前端引用，不复制服务配置、数据源或工作区。
- 首页明确 Start 后才执行；服务先于前端；运行服务复用；部分失败不阻断其他项；停止本次不误停复用服务。
- 数据源使用原生/API Key 粒度和原版密集凭证组件；工作区关系不删除原生来源。
- Provider、Router、依赖和内部组件不在扩展页逐项暴露；Notebook 不进入首页普通服务候选。
- 旧 ODP URL 可深链但不再是正常导航；不新增 Query、Catalog、Advanced、第二数据核心、凭证桥或前端通用协议。

## Focused automated evidence

- `npm exec vitest run src/tests/routes/home.test.tsx src/tests/routes/__root.test.tsx src/tests/studio/startup-plan-store.test.ts src/tests/studio/client.test.ts`
- `npm exec tsc -- --noEmit`

最终命令结果应写入本文件和交付消息；formatter、linter、项目全量 suite 明确跳过。

## Remaining bounded checks

- 需要配置真实 OpenBB 服务时，可在 Tauri 原生窗口做一次服务启动/前端打开 smoke；本轮不启动浏览器。
- Rust/Windows OpenSSL 只在需要构建或 native 测试时使用现有项目环境变量，不作为产品阻塞。
- 原版大页面的完整 Conda 安装流程继续由其既有测试覆盖；本轮只验证新组合页对原生入口的调用边界。
