# UX information architecture

Status: Active baseline.

```text
首页
数据源
环境与扩展
  启动方案
  服务
  扩展
  环境
```

原则：

1. ODP 继续负责服务、环境、凭证、扩展安装、Notebook 和日志。
2. 首页只做环境/方案/数据源选择和明确 Start，不内嵌管理表单。
3. 启动方案是环境内统一的服务/前端启动项引用，可有多个，不复制服务配置。
4. 数据源是 ODP/OpenBB 原生粒度；API Keys 合并在唯一数据源管理页。
5. 工作区是数据源侧平级组合预配装；成员关系、顺序和批量策略保留。
6. Provider、Router 和依赖是数据源能力或安装细节，不在扩展页逐包重复暴露。
7. Query、Catalog、Advanced、独立 Frontends、全局 Logs 和第二数据核心不属于正常 IA。
8. 旧 URL 只作为迁移安全，不能重新成为一级导航。
