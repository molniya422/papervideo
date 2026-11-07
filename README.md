# PaperVideo · 论文讲解工作区

> **状态：还在调整没完工（WIP）**。当前重心：机器门硬化与资产管线（见
> `docs/workflow-audit-2026-11-05.md` 的 65 项体检发现与四批修复计划）。


一套在本文件夹（`D:\papervideo`）安装注册的 **论文讲解技能套件**：从一篇 PDF/arXiv 论文出发，
经深度解读、图解可视化，一路做成讲解动画视频并发布。共 **72 个技能**，注册在 `.zcode/skills/`（workspace 级，打开本文件夹即生效）；
路由表/阶段合同/子智能体角色的唯一事实源在 `paperpipe/registry/*.yaml`，由 `paperpipe` 执行器（v2）按其验证。

## 一键全流程指令

**`/paper-video <PDF|arXiv|目录> [design.json]`**（技能 `paper-video`）：一条指令跑完
设计合同→brief→DAG→14 角子智能体派发环→三张风格帧小样门→渲染前人工预览（十类修改意见）→
渲染→三验收分离 QA→复盘→交付。子智能体派发环用 `paperpipe agents` +
`paperpipe handoff show/finish` 命令驱动；渲染预览用 `paperpipe preview` + `revise`。

## 论文讲解工作流

总编排技能是 **`paper-explain`**（直接说"帮我讲这篇论文 / 把这篇论文做成视频"即可触发）：

```
        ┌──────── 生成画面之前 ────────┐
PDF/arXiv ─▶ [0.5 提示词锻造] ─▶ [1 获取] ─▶ [2 深度解读] ─▶ [3 图解]
              prompt-forge       arXiv/MinerU   paper-xray
                                                              │
            [6 复盘] ◀─ [5 发布] ◀─ [4 成片] ◀────────────────┘
        video-retrospective  cover/B站   四条路线
```

三个**强制阶段**：
- **0 设计访谈（`design-intake`）**：用结构化问卷或可视化选择器问清视觉语言、主色、
  动效、声音、时长、画幅、受众，产出 `design-intake.md`。
- **0.5 提示词锻造（`prompt-forge`）**：先出三套差异化方案 + XML brief（含禁止清单与 8 分制验收），
  定稿后才允许写代码、渲帧；旁白先过 `humanize-writing` 去 AI 味。
- **6 复盘（`video-retrospective`）**：验收后必须写 retrospective + lessons，并把至少 1 条硬规则写回技能；
  没复盘不算交付。

成片四条路线：**A** `knowledge-explainer-skill`（文稿→动画 mp4，快）·
**B** `paper-to-beamer`+`paper-slides-to-video`（学术幻灯片配音，正式）·
**C** `remotion-video`（Remotion 自定义动画/仿真，自由）·
**D** 阶段 3 的 HTML 动画页 → `hyperframes` 确定性渲染成 MP4。

## 已注册技能一览（74 个 · 与 `paperpipe/registry/skills.yaml` 三账对齐）

### 核心流水线与元技能（11）

| 技能 | 来源 | 用途 |
|---|---|---|
| `paper-video` | 本工作区编写 | 一条指令跑完论文→讲解视频全流程（参数解析→设计合同→brief→DAG→子智能体派发环→渲染→QA→复盘→交付） |
| `paper-explain` | 本工作区编写 | 用户要求讲论文/做成讲解视频时的总路由器 |
| `preview-review` | 本工作区编写 | 渲染前人工预览 + 分类修改意见（十类：文稿/运镜/转场/建模/动效/布局/节奏/声音/数据/字幕）+ 三张风格帧小样门 |
| `content-mapping-review` | 本工作区编写 | 内容验收——数据组件的数值→几何映射与轴刻度同基准核对（ch18 教训：75 的柱在 80 轴上顶满） |
| `design-intake` | 本工作区编写 / 检出改编 | 有视觉交付目标时的设计访谈 |
| `prompt-forge` | 本工作区编写 | 任何画面生成之前的合同锻造 |
| `humanize-writing` | 本工作区编写 | 旁白进 TTS 之前 |
| `video-retrospective` | 本工作区编写 | 视频交付后 |
| `video-production-guide` | 本工作区编写 | 视频生产总方法论参考 |
| `design-taste-frontend` | 本工作区编写 | 任何视觉生成之前 |
| `skill-catalog` | 本工作区编写 | agent 发现可用技能 |

### 获取与解读（3）

| 技能 | 来源 | 用途 |
|---|---|---|
| `paper-download-arxiv-paper-source` | [yhbcode000/paper-share-skills](https://github.com/yhbcode000/paper-share-skills) | 输入为 arXiv id |
| `paper-xray` | [Wang-auspicious/paper-xray](https://github.com/Wang-auspicious/paper-xray) | 需要论文事实/机制说明 |
| `pdf-to-markdown` | 同上 | 本地 PDF 且需结构化文本（公式/表格） |

### 图解可视化（9）

| 技能 | 来源 | 用途 |
|---|---|---|
| `visual-explainer` | [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer) | 通用系统/流程/对比图解（默认主图解技能） |
| `flowchart` | [Unclecheng-li/AI_Animation](https://github.com/Unclecheng-li/AI_Animation) | AI/ML 模型原理图 |
| `dynamic-archify` | 同上 | 工程架构/数据流 |
| `network-protocol-viz` | 同上 | 网络协议类论文 |
| `anatomy` | [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy) | 需要物理结构直觉（等距机械插画） |
| `scholar-notes` | AI_Animation | 用户要学习笔记页 |
| `card-theater` | AI_Animation | 叙事型分步演示 |
| `stacked-data-cards` | AI_Animation | 论点数据卡牌堆（录屏即成片） |
| `ppt-animation` | AI_Animation | PPT 风格翻页演示（适配录屏） |

### 3D 资产与建模（2）

| 技能 | 来源 | 用途 |
|---|---|---|
| `threejs-visual-example` | 本工作区编写 | 具象对象例子必须 3D 化（three.js 建模演示，禁纯表格读数） |
| `blender-visual` | 本工作区编写 | Blender 3D 建模与离线渲染——高保真模型/PBR 材质/物理模拟/粒子系统，输出确定性帧序列 |

### 成片引擎（13）

| 技能 | 来源 | 用途 |
|---|---|---|
| `remotion-video` | 本工作区编写 | 定制讲解成片（路线 C，默认） |
| `knowledge-explainer-skill` | [znyupup/knowledge-explainer-skill](https://github.com/znyupup/knowledge-explainer-skill) | 快速视频（路线 A 模板） |
| `paper-to-beamer` | 论文→SUSTech Beamer 11 节幻灯片→编译 PDF | 组会幻灯片（路线 B） |
| `paper-slides-to-video` | 幻灯片 PDF→横竖双配音 MP4（edge-tts） | 幻灯片 PDF → 配音 MP4 |
| `hyperframes` | AI_Animation | 已有 HTML 动画 → 确定性 MP4（路线 D） |
| `code-mv-render` | AI_Animation | 代码音乐视频/数据纪录片 |
| `lemo-opuscar` | AI_Animation | 59 种代码导演风格库 |
| `opus-video-skills` | AI_Animation | 手绘水彩/水墨角色动画 |
| `product-launch-motion` | 上游检出（product-launch-motion） | 产品发布动效（一镜到底/光标驱动） |
| `business-motion-film` | 风格演示库（检出） | 产品/服务宣传短片 15-40s（路线 E） |
| `lieflat-code-video` | 引擎检出（PolyForm-NC） | 产品发布片 Remotion Starter（12 kit 模块） |
| `hyperframes-cli` | 引擎检出（同上） | hyperframes 命令行细节 |
| `remotion-to-hyperframes` | 引擎检出（同上） | Remotion 工程迁移到 hyperframes |

### 动效方法论与动效库（9）

| 技能 | 来源 | 用途 |
|---|---|---|
| `motion-doctrine` | HyperFrames 官方方法论 | 实际制作任何动效之前（网关，先读） |
| `cut-the-curve` | HyperFrames 官方方法论 | 使用自定义缓动曲线 |
| `seam-craft` | HyperFrames 官方方法论 | 有转场的镜头 |
| `oversized-cursor` | HyperFrames 官方方法论 | 光标驱动演示 |
| `captions-overlay` | HyperFrames 官方方法论 | 有字幕的成片 |
| `changelog-video` | HyperFrames 官方方法论 | 版本变更视频，领域不符 |
| `motion-lab` | 引擎检出（Motion.Lab） | HTML/CSS 运行时动效（先查库再动手） |
| `wise-motion` | 引擎检出（[WiseWong6/wise-motion](https://github.com/WiseWong6/wise-motion)，Apache-2.0） | Remotion 运行时动效（先查库再动手） |
| `code-animation-prompts` | 引擎检出（[XiaoyeCodes/code-animation-prompts](https://github.com/XiaoyeCodes/code-animation-prompts)） | 341 种代码动画风格库（193 静帧 + Canvas 参考实现 + 离线挑选器）——风格选型与视频/图解视觉语言参考 |

### 质检与发布（13）

| 技能 | 来源 | 用途 |
|---|---|---|
| `video-qa-frameproof` | AI_Animation | 视频渲染完成后的机器技术 QA |
| `video-technical-review` | 本工作区编写 | QA 机器检查通过后、交付前的内容技术审查 |
| `layout-safety-review` | 本工作区编写 | 安全区/遮挡/字幕审查 |
| `content-mapping-review` | 本工作区编写 | 内容验收——数据组件的数值→几何映射与轴刻度同基准核对（ch18 教训：75 的柱在 80 轴上顶满） |
| `compare-video-runs` | 本工作区编写 | 多版本对比择优 |
| `video-retrospective` | 本工作区编写 | 视频交付后 |
| `paper-video-cover` | 同上 | 用户要求发布或平台要求封面 |
| `paper-bilibili-uploader` | 同上 | 真实上传 B 站 |
| `paper-to-bilibili` | 同上 | B 站全流程一键编排 |
| `hell-grind-aigc-skill` | [renmu2017/Hell-Grind-AIGC-Skill](https://github.com/renmu2017/Hell-Grind-AIGC-Skill) | 需要 AI 生图素材/概念封面 |
| `review-bundle` | 本工作区编写 | 打包评审材料 |
| `package-review-prompt` | 本工作区编写 | 打包评审提示词 |
| `sustech-beamer-theme-fix` | 修复旧模板缺 `\setsource` 等宏 | 旧 Beamer 模板缺宏 |

### 参考视频理解（9）

| 技能 | 来源 | 用途 |
|---|---|---|
| `storyboard-extract` | 参考视频理解（检出改编） | 参考视频镜头拆解 |
| `storyboard-understand` | 参考视频理解（检出改编） | 参考视频叙事理解 |
| `storyboard-ocr` | 参考视频理解（检出改编） | 参考视频 OCR |
| `storyboard-transitions` | 参考视频理解（检出改编） | 参考视频转场分析 |
| `segment-evidence` | 参考视频理解（检出改编） | 视频证据分段理解 |
| `segment-storyboard` | 参考视频理解（检出改编） | 视频分段故事板 |
| `video-shots` | 参考视频理解（检出改编） | 镜头语言参考 |
| `source-media-signals` | 参考视频理解（检出改编） | 素材信号分析 |
| `video-artifact-intake` | 本工作区编写 | 复盘前产物清点 |

### 风格演示库（5）

| 技能 | 来源 | 用途 |
|---|---|---|
| `video-shot-demos` | 风格演示库（检出） | 分镜演示风格库 |
| `swiss-shot-demos` | 风格演示库（检出） | 瑞士风格分镜演示库 |
| `phone-ui-demos` | 风格演示库（检出） | 手机 UI 演示风格库 |
| `win11-ui-demos` | 风格演示库（检出） | Win11 UI 演示风格库 |
| `ui2v-motions` | 风格演示库（检出） | GSAP 动效索引 |

## 目录结构

```
papervideo/
├── .zcode/skills/          # ⭐ 64 个技能注册处（workspace 级）
├── engines/hyperframes/    # HyperFrames 引擎源码检出（npx hyperframes --help）
├── WORKFLOW.md             # 工作流总纲（阶段/产物/门槛/排查）
├── WORKFLOW-MAP.md         # 组件地图（有什么/怎么做/具体路径速查）
├── design-picker.html      # 可视化风格选择器（单文件）
├── remotion-studio/        # Remotion 4 自定义动画工作台（依赖已装、headless Chrome 就位）
├── output/                 # 工作流产物（如 output/test-attention/ 为工作流端到端测试）
├── .tmp-repos/             # 上游仓库缓存（AI_Animation 为按需裁剪下载；技能本体已复制，此目录可删）
└── README.md
```

## 快速上手

- **讲透一篇论文**：对 agent 说「帮我讲透这篇论文 <PDF/arXiv 链接>」→ 走 paper-xray。
- **做成讲解视频**：「把这篇论文做成讲解视频」→ paper-explain 全程，默认路线 A。
- **画模型/机制图**：「画个动画图讲清这篇论文的模型结构」→ `flowchart` / `dynamic-archify`。
- **学习笔记页**：「把这篇论文做成学霸笔记」→ `scholar-notes`。
- **自定义动画**：在 `remotion-studio/` 里 `npm run studio` 预览，`npm run render` 出片。
- **一键 B 站**：用 `paper-to-bilibili`（slides/video/bilibili 三模式）。

## 环境依赖

Node.js 20.10+（已满足）、Git Bash。按需：MinerU（GPU，pdf-to-markdown 用）、
ffmpeg 与 edge-tts（paper-slides-to-video 用）、LaTeX（beamer 编译用）、Chrome/Chromium（anatomy 自检用，Remotion 已自带 headless shell）。
本机网络直连 raw.githubusercontent.com 不通，补取 AI_Animation 重型素材时可用 `https://ghproxy.net/https://raw.githubusercontent.com/...` 镜像前缀。

## 引用的仓库

本工作流引用的第三方引擎/技能上游/运行时依赖**不入本仓库**（体积与许可原因），
完整清单（上游地址·许可·恢复方式）见 **[docs/REFERENCED-REPOS.md](docs/REFERENCED-REPOS.md)**。
