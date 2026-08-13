---
schema: design-pipeline.motion-foundation.v0.1
name: OpenAlice Data Platform Motion Language
posture: minimal
primitiveRegistry: design-pipeline.motion-primitives.v1
---

## Motion Thesis

动效只用于确认状态、维持方向感和解释数据变化。OpenAlice 是高频桌面操作台，响应应快速、可中断、不妨碍阅读；品牌不通过持续动画表达。

## Motion Principles

- 导航、展开和状态切换在 120–180ms 内完成；复杂结果区更新不超过 240ms。
- 首次可操作时间不等待动画，焦点和点击在视觉过渡期间仍有效。
- 动效优先使用 opacity 与 transform；高度变化只用于小范围折叠且不可让表格抖动。
- 数据刷新不整页淡出；仅更新受影响的状态点、行或结果区域。
- 快速重复输入以最新状态为准，前序过渡取消或反向，不排队播放。

## Motion Vocabulary

- `primitive: reveal.trim-line`：仅用于 Alice 数据花结在启动/关于界面的短线条显现；普通页面不播放。
- UI 基础过渡为项目自有的离散状态过渡，不把它伪装成注册表中的轨迹类 primitive。
- 品牌标志静止是默认态；不使用 orbit、噪声、位移或无限循环曲线。

## Procedural Motion

不使用程序化持续动效。加载、查询和安装进度由确定性状态组件表达。未来若加入曲线型品牌加载器，必须另立变更并设置采样、性能、暂停与静态替代。

## Runtime Policy

- CSS transition 是导航、hover、focus、展开和状态色变化的首选适配器。
- WAAPI 仅在需要可取消的短序列时使用。
- 不为本品牌刷新引入 GSAP、Anime.js、Canvas、SVG render loop 或 WebGL。
- `reveal.trim-line` 的 CSS 实现能力视为 degraded；只允许在非关键品牌线条上使用，并保证最终静态标志始终可见。
- 组件卸载、路由切换或查询取消时，不得遗留计时器、observer 或 animation handle。

## Reduced Motion

减弱动效替代（substitute）：`prefers-reduced-motion: reduce` 下，导航与状态直接切换；折叠内容瞬时出现；Alice 标志显示最终静态形态；加载保留文字与进度值，不依赖旋转或路径运动传达状态。

## Source Decisions

- 来源变更：`design/changes/openalice-desktop-brand-refresh/`。
- 采用：注册 primitive `reveal.trim-line` 的语义和现有 CSS/Tailwind 运行时，不复制其来源实现，`codeCopied: false`。
- 拒绝：增加新的动画依赖、复制外部实现、持续品牌动画、噪声与轨迹装饰。
- 当前截图没有可验证的动效证据；所有时间、缓动与行为均为本项目 authored 决策，实施后必须实际 QA。
