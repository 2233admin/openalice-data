# OpenAlice Data handoff

## 已确定

- 正常一级导航只有：首页 / 数据源 / 环境与扩展。
- 首页顺序是环境、环境内启动方案、数据源/工作区、Start；临时启动项调整不覆盖方案。
- 启动方案是环境内唯一新增运行概念，统一保存服务和可启动前端引用。
- 数据源页复用 API Keys 高密度能力，工作区是平级分类和组合式数据预配装。
- 环境与扩展页签共享环境上下文，至少包含启动方案、服务、扩展；原版环境流程继续复用。
- Provider/Router 属于数据源能力；Notebook 属于扩展；日志上下文化；旧 URL 只迁移安全。

## 当前实现切片

- `studio/startup-plan-store.ts` 持久化环境归属、名称和统一启动项，迁移旧 auto-start 服务到默认方案。
- `studio/client.ts` 返回所有受管服务和运行环境，继续通过 ODP commands 读取和启停。
- `home.tsx` 已改为环境/方案/来源三选择器，支持临时调整、服务复用、部分失败、重试、上下文日志和停止边界。
- `environment-extensions.tsx` 提供启动方案、服务、扩展、环境页签；服务操作调用原版 Tauri commands。
- `data-sources.index.tsx` 保留原生数据源/API Key 高密度清单及工作区关系，并把支持入口指向环境与扩展。
- `/frontends`、`/api-keys`、`/backends`、`/environments`、日志等旧路由仍可深链，但不再是正常导航。

## 验证边界

- 只运行 route-level / studio store / client 行为测试和必要 typecheck/build。
- 不启动浏览器，不运行 formatter、linter 或项目全量 suite。
- 不修改 ODP 安装初始化，不创建查询引擎、第二数据核心、凭证桥或通用前端协议。
