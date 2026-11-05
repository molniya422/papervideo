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

## 已注册技能一览（30 个）

### 核心流水线

| 技能 | 来源 | 用途 |
|---|---|---|
| `paper-explain` | 本工作区编写 | ⭐ 工作流总编排（五阶段、路由表、验收门） |
| `paper-xray` | [Wang-auspicious/paper-xray](https://github.com/Wang-auspicious/paper-xray) | 深度解读：还原作者思路、公式讲透、怀疑式审读，出 MD/可标注 HTML |
| `paper-download-arxiv-paper-source` | [yhbcode000/paper-share-skills](https://github.com/yhbcode000/paper-share-skills) | arXiv TeX 源码下载解包 |
| `pdf-to-markdown` | 同上 | MinerU（GPU）PDF→干净 Markdown |
| `paper-video-cover` | 同上 | 16:10 视频封面海报 |
| `paper-bilibili-uploader` | 同上 | biliup B 站投稿（横+竖、定时发布） |
| `paper-to-bilibili` | 同上 | B 站流水线一键编排器（slides/video/bilibili 三模式） |

### 图解可视化

| 技能 | 来源 | 用途 |
|---|---|---|
| `visual-explainer` | [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer) | 自包含 HTML 图解页：架构图/对比表/可步进状态机/幻灯片（通用默认） |
| `flowchart` | [Unclecheng-li/AI_Animation](https://github.com/Unclecheng-li/AI_Animation) | 教育/科普动画流程图，AI 模型可视化（RNN/LSTM/GRU/MLP 范式齐全） |
| `dynamic-archify` | 同上 | 精确工程风动态架构图/数据流/状态机，流动动画+多格式导出 |
| `network-protocol-viz` | 同上 | 网络协议可视化（TCP/IP、以太帧、路由、HTTPS） |
| `anatomy` | [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy) | 等距 SVG"物理装置"插画，把机制画成会动的机器（含 WebGL/3D） |
| `scholar-notes` | AI_Animation | 手写笔记本风格单文件 HTML 学习笔记 |
| `card-theater` | AI_Animation | 侧边栏叙事 + 3D 卡片轮播的分步讲解演示 |
| `stacked-data-cards` | AI_Animation | 论点数据卡牌堆自动播放动画（对齐口播，录屏即成片） |
| `ppt-animation` | AI_Animation | PPT 风格翻页 HTML 演示（5 套主题，适配录屏） |

### 动画成片

| 技能 | 来源 | 用途 |
|---|---|---|
| `knowledge-explainer-skill` | [znyupup/knowledge-explainer-skill](https://github.com/znyupup/knowledge-explainer-skill) | 分页 markdown 文稿 → Remotion 渲染讲解动画 mp4（依赖已装、已验证可出片） |
| `remotion-video` | 本工作区编写 | 自定义动画工作台 `remotion-studio/` 的使用技能 |
| `hyperframes` | AI_Animation | HTML→确定性 MP4 渲染底座导航（需按其说明安装上游 CLI） |
| `code-mv-render` | AI_Animation | 确定性音乐视频/数据纪录片工程库（帧 = f(时间)） |
| `lemo-opuscar` | AI_Animation | 59 种代码导演视频风格库 |
| `opus-video-skills` | AI_Animation | 手绘水彩/水墨角色动画与动态排版 Reel 风格库 |
| `video-qa-frameproof` | AI_Animation | 成片 QA：空帧/冻结/字幕/音频/编码检查与修复闭环 |
| `video-technical-review` · `layout-safety-review` · `compare-video-runs` | [45ck/video-evaluator](https://github.com/45ck/video-evaluator) | 成片内容级 QA：画面缺陷/版式安全区审查、多版本对比择优 |
| `storyboard-extract` · `storyboard-understand` · `storyboard-ocr` · `storyboard-transitions` · `segment-*` · `video-shots` · `source-media-signals` · `video-artifact-intake` · `review-bundle` · `skill-catalog` · `package-review-prompt` | 同上 | 视频理解包：参考视频拆解（镜头/转场/OCR/叙事）、素材信号分析等 12 技能 |
| `hell-grind-aigc-skill` | [renmu2017/Hell-Grind-AIGC-Skill](https://github.com/renmu2017/Hell-Grind-AIGC-Skill) | 模型无关的 AI 图/视频提示词工程：七层提示词架构、镜头契约、生成记录追踪与失败诊断 |
| `video-shot-demos` · `swiss-shot-demos` · `phone-ui-demos` · `win11-ui-demos` · `ui2v-motions` | AI_Animation | 分镜演示风格库与 GSAP 动效索引（仅注册文档，重型媒体未下载，见各 SKILL.md 顶部说明） |

### B 站流水线附属

| 技能 | 用途 |
|---|---|
| `paper-to-beamer` | 论文→SUSTech Beamer 11 节幻灯片→编译 PDF |
| `sustech-beamer-theme-fix` | 修复旧模板缺 `\setsource` 等宏 |
| `paper-slides-to-video` | 幻灯片 PDF→横竖双配音 MP4（edge-tts） |

> 完整阶段、产物、门槛、排查表见 **[WORKFLOW.md](WORKFLOW.md)**；
> 每个组件的具体路径与用法速查见 **[WORKFLOW-MAP.md](WORKFLOW-MAP.md)**（有什么 · 怎么做 · 在哪里）。
> 可视化风格选择器：[design-picker.html](design-picker.html)（双击打开：8 风格卡 × 61 决策维度·九区，含动效库匹配/运镜/场景切换/特效密度/参考清单，
> 出 JSON / paperpipe.yaml / design-intake.md 三件套）。

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
