# Tasks

## Foundation and Decisions

- [x] 完成设计质询并保存 `decisions/grill.md`。
- [x] 按 program 预算评估范围：8 surfaces、5 workflows、2 integrations、2 unknowns、8 decisions，score 47/60，不需要 Wayfinder。
- [x] 生成三条方向并选择 Alice 控制台。
- [x] 写入项目 `DESIGN.md` 与 `MOTION.md`。
- [ ] 运行 foundation check 并把 MOTION SHA-256 写回 `motion.md`。

## Tokens and Theme — P0

- [ ] 增加 `alice.*` CSS variables，映射现有 theme roles，并验证暗/浅色对比。
- [ ] 统一 focus ring、状态色、按钮等级和表面/分隔语义。

## Brand and App Frame — P0

- [ ] 设计 provisional `AliceMark` SVG，并做 16/24/32/64/128/256px 检查。
- [ ] 把左侧可见名称改为 OpenAlice Data Platform，把右上角 OpenBB 图形换为 Alice mark。
- [ ] 增加环境/API 全局状态区和克制版本信息。
- [ ] 更新 window title、HTML title、tray tooltip 等可见文案；保留内部 identifier。
- [ ] 增加 `Powered by OpenBB`、LICENSE 与第三方许可入口，核对法律归属。

## Information Architecture — P0

- [ ] 建立分组侧栏，保持所有既有路由可达。
- [ ] 将“高级设置”收敛为“设置与关于/诊断”，移除重复导航语义。
- [ ] 900px 以下折叠侧栏；740px 最小窗口验证无重叠。

## Core Product Surfaces — P1

- [ ] 首页改为状态结论、三步紧凑流程、status strip 和按影响排序的待处理列表。
- [ ] 数据源改为带列标题的 operation table，修复 provider 名称大小写并加筛选。
- [ ] 数据目录明确业务列与技术详情层级。
- [ ] 查询工作台稳定控制区与结果区，补齐运行/取消/失败/空结果/部分数据状态。

## Official OpenBB Surfaces — P1

- [ ] 服务、环境、凭证、扩展、日志接入统一 PageHeader、StatusChip 和操作等级。
- [ ] 验证创建/删除/安装/卸载/保存凭证的确认、进度、错误与恢复路径。
- [ ] 保持 OpenBB API、ProviderInterface、包名、路径和日志技术信息准确。

## Motion and Accessibility

- [ ] 实现 CSS 短过渡与中断策略，不增加动画 runtime。
- [ ] 实现 `prefers-reduced-motion` 静态替代。
- [ ] 验证 aria-current、导航分组、折叠 tooltip、表格标题、状态非颜色表达、focus order。

## Release and Migration — P2

- [ ] 单独评估 `co.openbb.platform`、publisher、updater、签名、应用数据和钥匙串迁移。
- [ ] 在审批后生成全平台应用图标和安装包 metadata；不得与 UI 品牌刷新混做。

## QA

- [ ] 运行 lint、unit、integration、build。
- [ ] 在真实 Tauri 窗口检查 740×400、900×600、1250×811、1440×900。
- [ ] 记录 implementation screenshots、键盘流程、reduced motion 和实际连接证据。
- [ ] 实施后更新 Spec Reconciliation 与 `qa.md`，通过 anti-slop、视觉、UX、a11y、motion 和 responsive gates。
