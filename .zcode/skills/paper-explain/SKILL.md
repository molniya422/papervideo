---
name: paper-explain
description: |
  论文讲解工作流总路由器（v3）：解析用户意图 → 判断交付目标 → 选择最短路径 →
  决定澄清/技能/子智能体/CLI 工具 → 调用 paperpipe 执行 → 按门禁停下或继续 → 输出交付清单。
  路由表、阶段合同、技能注册表、子智能体角色的唯一事实源在 paperpipe/registry/*.yaml，
  本技能按注册表路由，不自行发明流程。
  当用户说"讲论文 / 论文讲解 / 做成视频 / 讲解动画 / 组会分享 / 画机制图"时使用。
argument-hint: "<PDF | arXiv 链接/ID | 论文目录> [--target md|figures|video|publish] [--audience 组会|公众|自学]"
user-invocable: true
version: 3.0.0
---

# 论文讲解路由器（Paper Explain Router v3）

## 四层职责（不可越层干活）

| 层 | 谁 | 只负责 |
|---|---|---|
| 1 路由器 | **本技能** | 解析意图、选 target/阶段/主技能、判断是否拆子智能体、生成执行计划 |
| 2 技能层 | `.zcode/skills/*` | 方法论与内容生产（每技能声明：适用条件/输入/输出/禁止误用/替代） |
| 3 子智能体层 | researcher / fact_checker / visual_planner / narration_editor / render_worker / technical_qa / visual_qa / release_reviewer | 独立生产或独立审查；经 handoff 信封交接，不直接改别人的文件 |
| 4 执行器 | `python -m paperpipe` | 只管 DAG/状态/缓存/命令/哈希/重试/机器门禁；**不假装调用技能**，只验证 receipt 和产物 |

## 路由顺序（固定 12 步）

1. 识别用户目标 → 2. 识别输入类型 → 3. 检查是否已有 run → 4. 判断是否需要澄清 →
5. 选 target → 6. 选阶段 → 7. 选主技能 → 8. 判断是否拆子智能体 → 9. 生成执行计划 →
10. 调用 paperpipe → 11. 按门禁停下或继续 → 12. 输出交付清单。

每步显示：`调用对象、输入、输出、命令、通过条件、失败后动作`。

## 意图路由表（唯一事实源：paperpipe/registry/routes.yaml）

| 用户请求 | route id | target / 终止 | 必选技能 |
|---|---|---|---|
| 只讲论文 / 学习笔记 | explain-only | md / xray | `paper-xray` |
| 画机制图 | mechanism-figure | figures / figures | `paper-xray` + **一个**主图解技能（按内容形态二选一） |
| 做快速视频 | quick-video | video / qa | `knowledge-explainer-skill`（路线 A） |
| 做定制视频 | custom-video | publish / publish | `remotion-video`（路线 C，默认） |
| 做组会分享 | seminar-slides | video / qa | `paper-to-beamer` + `paper-slides-to-video`（路线 B） |
| 已有 HTML 动画转视频 | html-to-video | video / qa | `hyperframes`（路线 D） |
| 只要封面 | cover-only | — | `paper-video-cover`（不建整条流水线） |
| 发布到 B 站 | publish-bilibili | publish / publish | QA → 封面 → dry-run → 人工确认 → 上传 |
| 上一版返工 | rework-previous | publish / publish | 读旧状态 → 复盘 → 改 brief → 指纹缓存只重跑受影响阶段 |

**默认原则**：没有明确要求发布 → 不进上传流程；没有要求视频 → 不执行 render/音频/视频 QA。

## 条件触发规则（P0 改为"触发 + 可验证证据"，唯一事实源：registry/contracts.yaml）

每条规则五字段：`触发条件 → 唯一责任技能 → 必需产物 → 验收判据 → 失败行为`。
**flowchart 与 visual-explainer、motion-lab 与 wise-motion 不再同时强制**——由路由器按内容形态/运行时选择，未选中的必须写 route-decision（含理由）：

```python
from paperpipe import receipts
receipts.record_route_decision(ctx, "figures", "visual-explainer", "skipped",
                               "内容形态为 AI/ML 模型 → 选 flowchart；通用图解不需要")
```

要点摘录（全表见 contracts.yaml）：
- 有视频目标 → `design-intake`（或执行器落"明确默认假设" receipt）；
- 任何视觉生成 → `prompt-forge` 先出 `0-brief/brief.md`；无 brief 不得写代码/渲帧；
- 旁白已起草未 TTS → `humanize-writing`（render 阶段验证 receipt）；
- arXiv 输入 → `paper-download-arxiv-paper-source`；本地 PDF 需结构化 → `pdf-to-markdown`；
- AI/ML 原理图 → `flowchart`；通用图 → `visual-explainer`；工程架构 → `dynamic-archify`；
  协议 → `network-protocol-viz`；物理直觉 → `anatomy`（组内二选一，写 route-decision）；
- Remotion 动效 → 查 `wise-motion`；HTML/CSS 动效 → 查 `motion-lab`（按运行时选一，写 route-decision）；
- 具象对象例子（视频目标）→ `threejs-visual-example`（3D 建模演示，禁纯表格读数；抽象数学 route-decision 豁免）；
- 制作动效前 → `motion-doctrine`（非条件，必读）；自定义缓动 → `cut-the-curve`；
- 渲染完成 → `video-qa-frameproof`（机器层由执行器内置同源硬校验）+ `video-technical-review` + `layout-safety-review`（receipt）；
- 交付后 → `video-retrospective`（六维评分+证据+receipt，validate_review 程序化核对）；
- 发布 → `paper-video-cover`；真实上传 → 人工确认 + 哈希匹配 + 回执存在。

## 子智能体何时调用（唯一事实源：registry/agents.yaml）

| 角色 | 触发 |
|---|---|
| fact_checker | 论文 ≥20 页 / 公式多 / 数字结论重要 / 用户要求"讲透""严谨核对" |
| visual_planner | 视频 >5 分钟或镜头 >8 个 |
| narration_editor | 旁白复杂或用户反馈过语速/重复 |
| technical_qa + visual_qa | 渲染完成后**并行**（各自输出目录） |
| release_reviewer | 真实发布前 |
| 不拆 | 简单摘要 / 单张静态图 / 封面任务 |

并行纪律：fact_checker 与 visual_planner 可并行（都只读固定版本输入快照）；
最终整合、pipeline-state.json 写入、发布必须串行；禁止两个 agent 同时写
brief.md / pipeline-state.json / 同一视频源文件。

## 调用凭据（receipt）纪律

每次技能/工具/子智能体调用后落 receipt，执行器只认 receipt 不认"文档里提过名字"：

```
output/<run-id>/receipts/skills/<stage>-<skill_id>-<n>.json   # 由 paperpipe.receipts.write_skill_receipt 生成
output/<run-id>/receipts/tools/… · receipts/agents/… · receipts/route-decisions.json
```

技能 receipt 示例字段：`skill_id / stage / trigger / input_hashes / output_paths / agent_id / status / evidence`。

## 阶段状态与停止位置（8 态，schema paperpipe-state/3）

`pending → running → passed`；`waiting_for_agent`（等技能产出）· `waiting_for_human`（人审门）·
`failed_retryable`（可 retry）· `failed_permanent`（需改内容/配置）· `not_applicable`（target 不含）。
**waiting_\* 与 failed_\* 一律停止下游**；前置必须全 passed/not_applicable；
target 终止阶段：md→xray · figures→figures · video→qa · publish→publish。
旧 schema（/1、/2）的 run 是 legacy：status 只读，resume/retry/publish 拒绝（重建用 `init --force`）。

## 执行器命令

```bash
python -m paperpipe init 1706.03762 --run-id my-run --target video   # 建 run
python -m paperpipe run --auto            # 自动跑到第一个等待/失败处
python -m paperpipe resume                # 指纹缓存续跑
python -m paperpipe retry <stage>         # 过前置门禁后重试
python -m paperpipe status [--json] / validate [--target video]
python -m paperpipe review --confirm      # 人审门（六维+证据+receipt 程序化核对）
python -m paperpipe publish --dry-run | --confirm <run_id>   # 双门
```

## 交付清单（路由器第 12 步输出）

每个阶段完成后列出：产物路径、对应 receipt、阶段状态、下一动作（继续/等待谁/失败原因）。
没有 `6-review/retrospective.md` 不算交付；用户未验收就自称完成的，该项直接记 5 分以下。
