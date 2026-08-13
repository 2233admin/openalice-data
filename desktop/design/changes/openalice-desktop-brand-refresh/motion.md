# Change Motion Spec

## Foundation Link

- Project foundation: `../../../MOTION.md`
- Foundation schema: `design-pipeline.motion-foundation.v0.1`
- Foundation SHA-256: `b5b16897bf7adb30791965a0bb15b17c05613acba02f480db1598078aa7f5353`
- Foundation posture: `minimal`
- Primitive registry: `design-pipeline.motion-primitives.v1`
- Selected primitive IDs: `reveal.trim-line`（仅品牌启动/关于场景，可降级）
- Runtime: CSS；不增加依赖

## Interaction Inventory

| Trigger | Target | Effect | Purpose | Timing | Easing | Interruption |
| --- | --- | --- | --- | --- | --- | --- |
| 路由切换 | 当前导航项 | 背景/左信号条状态切换 | 保持方向感 | 140ms | `cubic-bezier(.2,.8,.2,1)` | 新路由覆盖旧状态 |
| 侧栏折叠 | 标签与内容区 | 标签 opacity + 轻微 x 位移 | 解释空间变化 | 180ms | `cubic-bezier(.2,.8,.2,1)` | 反向或跳到最终态 |
| 行 hover/focus | operation row | surface 色变化 | 指示可操作行 | 120ms | ease-out | 立即反向 |
| API/环境状态变化 | status indicator | 颜色/文字 cross-state | 确认真实连接变化 | 160ms | ease-out | 最新状态胜出，不循环脉冲 |
| 折叠技术详情 | details region | opacity + bounded height | 解释展开关系 | 180ms | ease-out | 保持焦点，反向 |
| 品牌启动（可选） | Alice mark 线条 | `reveal.trim-line` | 一次性建立品牌 | 320ms，无 delay | ease-out | 立即显示最终静态标志 |

## State And Interruption

- 重复点击导航不重播；路由切换期间页面仍可操作。
- 查询成功/失败直接替换结果状态，不让旧状态退场动画阻塞新结果。
- 组件卸载取消 animation/timeout；无常驻 requestAnimationFrame。
- resize 时立即采用目标布局，侧栏过渡可取消；焦点保持在触发控件或新页面标题。

## Accessibility And Reduced Motion

- `prefers-reduced-motion: reduce`：所有位移、线条绘制和高度动画取消；颜色/可见性最多 80ms 或瞬时。
- screen reader 通过 `aria-live` 获取服务、查询和安装状态，不朗读动画过程。
- 动效不得移动焦点、隐藏键盘 focus ring 或改变点击目标尺寸。
- Alice mark 的意义由名称/文本提供，不依赖绘制动画。

## Performance Budget

- 目标 60fps；单次 UI 过渡主线程工作不超过一个 16ms frame。
- 仅允许 opacity/transform/颜色；小范围 details 高度变化例外。
- 不使用 blur、filter、Canvas、WebGL、粒子或持续 loop。
- DOM 同时动画元素上限 12；数据表不做逐行 stagger。

## Evidence And Provenance

| Fact | Classification | Source | Confidence |
| --- | --- | --- | ---: |
| 当前运行截图不能证明动效行为 | measured（静态限制） | 现状截图 | 1.0 |
| 120–180ms 基础时间与中断策略 | authored | 本变更 | 1.0 |
| `reveal.trim-line` 品牌用途 | authored，registry-derived semantics | project MOTION.md | 1.0 |

## QA Scenarios

- 快速连续切换五个路由：仅最终路由保持 active，无动画队列。
- 键盘导航：焦点始终可见，折叠后 tooltip/accessibility name 存在。
- reduced motion：无位移、路径绘制或旋转，状态含义完整。
- 740px 与 1250px resize：内容不重叠，焦点不丢失。
- API 状态在动画期间变化两次：只呈现最新实际状态。
- 窗口隐藏/恢复或路由卸载：无遗留 timer/observer。

## Final Motion Score

设计阶段预期：Purpose 5、Timing 4、Easing 4、Interruption 4、Accessibility 5、Performance 5、Foundation fit 5。实施前均标记为未验证。
