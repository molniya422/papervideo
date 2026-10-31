# PaperVideo 工作区说明

本工作区是一套**论文讲解技能套件**：论文 PDF/arXiv → 深度解读 → 图解 → 讲解动画视频 → 发布。

**四层职责**（不可越层干活）：① `paper-explain` 路由器（解析意图/选 target/拆子智能体）→
② 技能层 `.zcode/skills/*`（方法论与内容生产）→ ③ 子智能体层（handoff 信封交接）→
④ `paperpipe` 执行器（只管 DAG/状态/哈希/门禁，验证 receipt 不假装调用技能）。
路由表、阶段合同、技能注册表、子智能体角色的**唯一事实源**：`paperpipe/registry/*.yaml`。

- **66 个技能**注册在 `.zcode/skills/`，总编排技能为 **`paper-explain`**（v3 路由器）。
- 用户要求"讲论文 / 论文讲解 / paper explainer / 做成讲解视频 / 画模型图 / 学习笔记"时，
  优先走 `paper-explain` 工作流，按其路由表选择下游技能。
- **生成视频前必须先跑 `design-intake`**：用 AskUserQuestion 两轮问清风格/主色/动效/声音/时长/画幅/受众，
  或让用户用 `design-picker.html` 自己选；产出 `0-brief/design-intake.md`。用户不在线则按默认值并标注假设。
- **然后跑 `prompt-forge`** 产出 `0-brief/brief.md`（三套方案 + XML brief + 禁止清单 +
  8 分制验收），旁白先过 `humanize-writing`；没有 brief 不得写代码或渲帧。
- **P0 是"条件触发 + 可验证证据"**：每个技能调用落 receipt（`output/<run>/receipts/`），
  执行器按 `paperpipe/registry/contracts.yaml` 验证；图解主技能按内容形态二选一、
  动效库按运行时二选一，未选中的写 route-decision（含理由），不再全部强制。
- **验收后必须跑 `video-retrospective`** 写 `6-review/retrospective.md` 与 `lessons.md`，
  并把至少 1 条硬规则写回相关技能；没复盘不算交付。
- 关键下游技能：解读用 `paper-xray`；图解按内容选（AI 模型 `flowchart`、工程系统 `dynamic-archify`、
  通用 `visual-explainer`、物理直觉 `anatomy`、笔记页 `scholar-notes`）；成片按需选
  （`knowledge-explainer-skill` 快、`paper-to-beamer`+`paper-slides-to-video` 正式、
  `remotion-video` 自由、`hyperframes` 渲染 HTML 动画）；发布前成片 QA 可用
  `video-qa-frameproof`（技术层）与 `video-technical-review`/`layout-safety-review`（内容层）；
  需要 AI 生图素材/概念封面用 `hell-grind-aigc-skill` 写提示词。
- `remotion-studio/` 是 Remotion 自定义动画工作台（依赖已安装），写动画场景时遵守
  `remotion-video` 技能的纯函数动画铁律（useCurrentFrame + interpolate/spring，禁 setTimeout/随机数）。
- 工作流产物统一放 `output/`（按阶段编号子目录），阶段状态写 `pipeline-state.json` 以便续跑。
- HyperFrames 引擎源码检出在 `engines/hyperframes`（不要删）；渲染路线 D 用它，命令 `npx hyperframes --help`。
- Wise Motion 引擎检出在 `engines/wise-motion`（101 个 Remotion 动效 + 素材库，match/show/export 三命令，技能 `wise-motion`；仅在用户明确调用时使用）。
- Lieflat Code Video Starter 在 `engines/lieflat-code-video`（产品发布片 Remotion Starter，12 个 kit 模块：camera/springs/transitions/surfaces/type 等，12s 示例影片，lens-reference.html 镜头语言参考）。技能 `lieflat-code-video`。
- Motion.Lab 动效库检出在 `engines/motion-lab`（160 动效 + 48 模板，Next.js）；技能 `motion-lab` 提供按需读取的 HTML/CSS/JS 源码（references/effects/<id>.md），零依赖单文件预览 `engines/motion-lab/motion-lab-showcase.html`。
- 动效法则先读 `motion-doctrine`，再按需 `cut-the-curve` / `seam-craft` / `oversized-cursor`。
- 完整的阶段/产物/门槛/故障排查写在 `WORKFLOW.md`，修改流程时同步更新它；
  每个组件的具体路径与用法速查在 `WORKFLOW-MAP.md`（有什么/怎么做/在哪里），新增组件时同步登记。
- `.tmp-repos/` 是上游仓库缓存。AI_Animation 上游 512MB+，本地为裁剪下载（17 个子技能的文档
  与 13 个轻量技能的完整文件已就位，4 个重型演示库仅文档，见其 SKILL.md 顶部注册说明）。
  本机直连 raw.githubusercontent.com 不通，补素材用 `https://ghproxy.net/` 镜像前缀。
