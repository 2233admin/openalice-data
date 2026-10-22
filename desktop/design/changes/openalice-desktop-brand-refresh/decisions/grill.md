# 设计质询与决策记录

日期：2026-08-14
变更：`openalice-desktop-brand-refresh`

## 已确认的产品事实

- 产品名称必须统一为 **OpenAlice Data Platform**，不是 “Date Platform”，也不再用 ODP 作为面向用户的主名称。
- 目标不是另做一层脱离实际运行环境的网页壳，而是在 OpenBB 官方 Desktop 源码上建立可真实连接的数据工作台。
- OpenBB 原有的服务、运行环境、API 凭证、扩展、日志、安装与卸载能力必须保留并可被发现；Studio 的数据源、数据目录与查询能力叠加在它们之上。
- 右上角现有 OpenBB 图形标志要换成 Alice 品牌标志；必要的 OpenBB 技术、许可证和版权归属转移到克制但可发现的 attribution 区域。
- Tauri 内部 identifier `co.openbb.platform` 暂不改动。它可能关联单实例、安装目录、更新、系统钥匙串、应用数据和迁移路径，必须另做数据迁移影响评估。
- 中文是默认产品语言；OpenBB、API、Provider、Python 包名、模型和字段标识等不可翻译的技术名作为二级信息保留。

## 质询结果

### 谁在什么压力下使用

用户既包括首次连接数据源的人，也包括维护 Python/OpenBB 环境的技术用户。首要压力不是“探索页面”，而是快速回答：当前环境能不能用、服务是否运行、凭证是否齐全、下一步去哪里、查询是否真的返回数据。

### 当前界面为何显得粗糙

1. 顶部同时存在 ODP 长字标、OpenBB 图形、版本和九项一级导航，品牌与工具层级互相争抢。
2. 所有内容以细边框矩形和横向分隔线组织，缺乏节奏与明确的工作区层级。
3. 数据源页面把名称、状态、能力数、测试时间和两个动作硬塞进五列；列宽对中文和窄窗不友好。
4. 强调色仅作为散落的蓝色链接，缺少与状态、主操作和焦点一致的语义系统。
5. “高级设置”和已恢复的官方一级功能同时存在，造成重复入口与信息架构含混。
6. 首页文案把底层功能说成“收在高级设置”，与实际一级导航冲突。
7. 品牌文案仍在 ODP/OpenBB/OpenBB Studio 之间切换；中文标签与英文技术文案没有清晰规则。

### 选定的设计原则

- 这是长期使用的桌面操作台，不做营销式 hero、大渐变、发光球、玻璃卡片或层层嵌套卡片。
- 用“导航分组 + 状态可见 + 内容密度分级”代替九项平铺标签。
- 业务层称 OpenAlice；技术层准确称 OpenBB runtime / ProviderInterface / API，并把归属放在页脚与关于界面。
- 用一个 Alice 品牌符号贯穿应用图标、左侧产品锁定标志和右上角品牌章，但不把人物头像伪装成用户账户。
- 先让 740px 最小窗口可用，再利用宽屏增加上下文；不能依赖横向滚动来理解主流程。

## 品牌 ADR

### Alice 标志概念：数据花结 A

以几何字母 A 为骨架，三条数据轨迹在中心交汇，形成一个克制的“花结/连接节点”。轮廓在 16px 仍可辨识，不使用人物脸、兔耳或童话剪影，避免儿童化和通用 AI 助手气质。

- 主锁定标志：`Alice mark + OpenAlice`，副行 `DATA PLATFORM / 数据平台`。
- 右上角：32px 独立 Alice mark，旁边显示当前环境/服务状态，版本作为三级文本。
- 单色优先；品牌青只用于激活点、焦点环和关键连线，不能把整屏染成蓝绿色。
- OpenBB 标志不再占主品牌位；`Powered by OpenBB`、许可证与版权链接置于页脚/关于界面。

## 保留与迁移边界

- 保留现有 `@openbb/ui-pro` 组件能力，以主题映射和外层组合修正观感，不在本变更引入第二套组件库。
- 不删除现有路由和官方能力；变更的是分组、命名、入口优先级和视觉呈现。
- 不在品牌刷新里更改更新 endpoint、publisher、copyright、bundle license 或 `co.openbb.platform`；这些需要发行权、签名和迁移策略单独审批。
- 可先改窗口标题、网页标题、可见产品名和主品牌资产；安装包 metadata 需要 attribution/发行评估后再决定。

## 词汇表

| 面向用户 | 技术名/保留说明 |
| --- | --- |
| OpenAlice Data Platform | 唯一主产品名 |
| 数据源 | Provider；详情中可显示 provider id |
| 数据目录 | OpenBB Standard Models / API routes 的可查询目录 |
| 查询工作台 | Playground 的中文产品名 |
| 服务 | OpenBB API 与其他 backend |
| 运行环境 | Python/Conda environment |
| 凭证 | API keys / provider credentials |
| 扩展 | OpenBB extensions、PyPI/Conda 包在技术视图保留原名 |
| 由 OpenBB 提供数据能力 | 推荐 attribution 文案，不暗示 OpenAlice 自研所有数据连接器 |
