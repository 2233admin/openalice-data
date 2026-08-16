# QA — Design Stage

日期：2026-08-14
状态：设计 artifacts 已生成；产品实现和实机验收尚未进行。

## Evidence

- 当前运行窗口截图：本地 QA 截图（临时文件，不提交机器路径）
- 1250×811；SHA-256 `E41D154DF697FDF4A69DC8558615966F2BD5CE7264667AAD23383C48081EE5FF`。
- 源码审查：React/Tauri app frame、可见 branding、九个 nav routes、Studio routes、OpenBB official routes、theme preset 与 bundle metadata。
- 截图角色是现状证据，不是 primary target；未请求精确重建，因此未创建 `reference-evidence.json`/`reconstruction.json`，无 fidelity claim。
- Beta2 toolchain：`toolchain-request.json`、`toolchain-plan.json`、`toolchain-probe.json`。
- Beta2 component routing：`frontend-stack-decision.json`、`capability-inventory.json`、`component-routes.json`、`design-system-decision.json`。
- OpenSpec relationship：`openspec-compatibility.md` links the existing `openbb-studio-p0` product contract without duplicating its acceptance criteria.

## Foundation Gates

- Project DESIGN.md：待 checker。
- Project MOTION.md：待 checker；posture `minimal`，primitive `reveal.trim-line`。
- Input mode：requirements-only + existing-system evidence。
- Scope：47/60（program），Wayfinder 不需要。

## Design Review Findings

### Visual gate — design ready, implementation unverified

选定方向消除双品牌、九项 tab、无标题五列列表与过度分隔线，建立 Alice 专属标志、暖中性基底、青色连接信号和分组侧栏。实际像素、对比与密度需要实现截图验证。

### UX gate — design ready, implementation unverified

官方 OpenBB 功能全部保留并进入系统/支持分组；真实环境/API 状态提升为全局上下文；首页、数据源和查询的主流程明确。危险操作与恢复路径需逐页实机检查。

### Engineering gate — ready

继续使用 React/Tauri/Tailwind/`@openbb/ui-pro` 和既有路由；不新增组件库或动画依赖。`co.openbb.platform` 和发行 metadata 被明确隔离到迁移评估。

### Accessibility gate — specified, unverified

已定义 aria-current、导航 label、focus order、焦点环、非颜色状态、表格列标题、折叠 tooltip 与 reduced motion。需键盘和 screen reader 抽查。

### Motion gate — specified, unverified

动效为 minimal、CSS-first、可中断、无持续 loop。当前静态截图不能提供运行证据。

### Responsive gate — specified, unverified

定义 208px/64px 侧栏与列表列收起规则；需在 740、900、1250、1440 宽度验证。

### Manual QA gate — partial

已人工检查当前 1250×811 Tauri 截图；未检查重设计实现，因为本阶段按要求不改产品代码。

## Scorecard

| Dimension | Current UI | Proposed design | Implementation confidence |
| --- | ---: | ---: | --- |
| Visual taste | 2/5 | 4/5 | 未验证 |
| UX clarity | 2/5 | 4/5 | 未验证 |
| Accessibility | 2/5 | 4/5 | 未验证 |
| Responsiveness | 1/5 | 4/5 | 未验证 |
| Motion quality | 1/5 | 4/5 | 未验证 |
| Engineering fit | 4/5 | 5/5 | 高 |
| Performance risk | 4/5 | 5/5 | 低风险方案 |

## Anti-slop Review

- Pass：没有营销 hero、装饰 orb、玻璃卡片、嵌套卡片或虚假数据 artifact。
- Pass：产品特征来自 Alice 数据花结、运行时状态和 OpenBB/Studio 双层信息架构。
- Needs implementation review：标志资产、表格密度、响应式与组件实际一致性尚无实现证据。

## Capability Fallbacks

- `check-deps.cjs` 因运行账户的 skill root 解析与实际共享 skill hub 不一致，误报 core pipeline 不存在；本次直接从共享 `design-pipeline` skill 路径运行 bundled scripts。
- Visual taste、motion、React companion profile 在该 checker root 下未发现；使用 pipeline 自带视觉、UX、a11y、motion、anti-template 和 scorecard gates 手工完成。
- 没有发布远程 Issue 或 PR。

## Remaining Risks

- Alice mark 仍是设计概念，需要矢量资产、尺寸测试与商标审查。
- OpenBB attribution、publisher、copyright、updater 和 fork 发行方式需要法律/发行维护者确认。
- 内部 identifier、应用数据、系统钥匙串、单实例和更新链路的迁移风险尚未评估，所以明确不改。
- 中文化尚未覆盖所有旧官方页面；需建立逐页字符串清单，避免机械翻译包名、日志和 API 字段。
