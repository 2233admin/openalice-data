# OpenAlice 产品章程

状态：生效；生效日期：2026-08-12；适用范围：OpenAlice Desktop、OpenAlice Platform、所有自有 Provider、安装包和公开发行。

本文是 OpenAlice 的产品真相源。它取代将整个项目收窄为“只读 Data Hub”的旧定位；`PRODUCT_SCOPE.zh-CN.md` 继续约束 `openalice_data` 扩展本身，但不再定义整个产品。

## 一句话定义

OpenAlice 是基于 OpenBB Platform 的中文优先金融数据开发与研究发行版：通过桌面应用安装、配置和运行数据环境，通过兼容 OpenBB 的 Provider、Python、REST、MCP 与 Jupyter 向用户交付真实、多市场的数据能力。

## 用户承诺

首个可公开 Beta 必须兑现以下承诺：

1. Windows 用户下载一个安装包即可完成安装，不要求预装 Python、Rust、Node 或 Conda。
2. 首次启动、安装、错误、诊断和主要操作默认使用中文。
3. 软件和用户数据写入 OpenAlice 自己的目录，不覆盖或冒充官方 OpenBB Desktop。
4. 默认环境包含 OpenAlice 必需扩展，并能在无需第三方 API Key 的情况下取得一条真实 A 股数据和一条真实美股数据。
5. 用户可以一键启动 REST API、MCP 或 JupyterLab，并能看到数据来源、时间和失败原因。
6. OpenBB 上游版权、AGPL-3.0 许可证和技术归属清楚可见；OpenAlice 不暗示获得 OpenBB 官方背书。

“安装成功”“页面能打开”或“目录里登记了数据集”不能单独证明承诺完成。

## 产品组成

### OpenAlice Desktop

面向最终用户的本地控制台，负责：

- 隔离环境的安装、升级和卸载；
- Provider 与扩展管理；
- API Key 与本地设置管理；
- REST/MCP 后端及 JupyterLab 的启动、停止和诊断；
- 首次真实数据引导；
- OpenAlice 更新与发布渠道。

Desktop 不是 OpenBB Workspace 的复制品，也不以制作完整行情终端为首期目标。

### OpenAlice Platform

面向数据和程序的兼容层，负责：

- 保留 OpenBB 标准模型、`OBBject`、全球 Provider 和插件契约；
- 提供 A 股、国内期货及中国用户常用市场的自有 Provider；
- 通过 Python、REST、MCP 和 Jupyter 提供一致能力；
- 报告来源、新鲜度、覆盖、缺失和完整性；
- 以可选扩展提供 Catalog、Parquet/DuckDB 和 PIT 研究数据访问。

`openalice_data` 是 Platform 扩展，不是整个产品。

## 非目标

- 不复制 OpenBB Workspace 的闭源/托管分析界面。
- 不把整个项目重新定义成静态数据目录或单个 A 股 Provider。
- 不承诺替用户取得商业数据授权。
- 首个 Beta 不提供账户、持仓、下单或实盘交易。
- 不为赶发布时间伪造代码签名、数据完整性或上游归属。

## 架构与维护原则

1. OpenBB Core 尽量保持上游兼容；自有能力进入 Desktop、本地化层、独立扩展和 Provider。
2. 上游同步和产品功能使用不同 PR，不在同一个提交中混合。
3. OpenAlice 使用独立应用标识、目录、更新地址和发布密钥。
4. 面向用户的 OpenAlice 品牌与技术语义上的 OpenBB 名称必须区分：例如“OpenBB Provider 接口”应保留，“OpenBB Platform 已安装”应改成 OpenAlice 用户语言。
5. 任何公开 Release 都必须由可重复的 GitHub Actions 构建产生，不接受开发机手工打包。

## 决策优先级

发生冲突时按以下顺序处理：

1. 本章程中的用户承诺和产品边界；
2. 已发布兼容契约与安全约束；
3. 当前阶段验收标准；
4. 具体实现和历史文档。

修改本章程必须使用独立 PR，说明对用户承诺、兼容性和 Release 的影响。
