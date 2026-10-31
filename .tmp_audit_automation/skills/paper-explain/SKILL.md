---
name: paper-explain
description: |
  论文讲解工作流总编排：从 PDF/arXiv 到深度解读、图解、讲解视频与发布。
  七个强制阶段：0 设计访谈 → 0.5 提示词锻造（brief）→ 1 获取 → 2 深度解读 →
  3 图解 → 4 成片 → 5 发布 → 6 复盘总结。整合本地 50 个技能：
  paper-xray（解读）、visual-explainer / flowchart / dynamic-archify / anatomy（图解）、
  knowledge-explainer-skill / remotion-video / hyperframes（成片）、
  design-intake（问风格与细节，含可视化选择器）、prompt-forge（生成前写 brief）、humanize-writing（去 AI 味）、
  design-taste-frontend（反模板化审美）、video-production-guide（路线与交付检查）、
  video-retrospective（验收后复盘）、paper-video-cover / paper-bilibili-uploader（发布）等。
  当用户说"讲论文 / 论文讲解 / 做成视频 / 讲解动画 / 组会分享"时使用。
argument-hint: "<PDF | arXiv 链接/ID | 论文目录> [--target md|html|video|slides] [--audience 组会|公众|自学]"
user-invocable: true
version: 2.0.0
---

# 论文讲解工作流（Paper Explain Pipeline v2）

```
        ┌──────────── 生成任何画面之前 ────────────┐
PDF/arXiv ─▶ [0 对齐] ─▶ [0.5 提示词锻造] ─▶ [1 获取] ─▶ [2 深度解读]
               需求梳理      prompt-forge        arXiv/MinerU    paper-xray
                                                                     │
                                                                     ▼
            [6 复盘] ◀─ [5 发布] ◀─ [4 成片] ◀─ [3 图解]
          retrospective   cover/B站    四条路线    图解技能套件
             │
             └─▶ 结论写回技能，下一次默认生效
```

两条**不可跳过**的新增阶段：

- **阶段 0.5 提示词锻造**：任何生成（写代码/渲帧/出图）之前，必须先有 `0-brief/brief.md`。
  这是用户的明确要求，也是避免"渲了 9000 帧才发现方向错了"的唯一保险。
- **阶段 6 复盘**：验收通过后必须写 `6-review/retrospective.md` 与 `lessons.md`，
  把经验写回技能。没复盘不算交付完成。

## 阶段 0 · 设计访谈（`design-intake`）

用 `AskUserQuestion` 分两轮问清设计：视觉语言 / 主色 / 排版气质 / 画面密度 →
运动性格 / 转场 / 旁白 / 配乐；必要时第三轮问时长 / 画幅 / 受众 / 明确不要。
每轮 4 题、选项具体到能想象画面；用户可选 "Other" 自由输入。

也可以让用户直接打开 `design-picker.html` 自己点选，复制 JSON 回来。

产物 `0-brief/design-intake.md`：选择表 + **一句话风格内核** +（重做时）与上一版差异。
用户不在线则按默认值走并标注假设（论文讲解：工程蓝图 / 克制精确 / 中文男声 / 5–7 分钟 / 16:9）。

**门槛**：六个维度有明确值；重做时必须写清"保留什么、更换什么"。

## 阶段 0.5 · 提示词锻造（强制）

调用 **`prompt-forge`**，产出 `output/<paper>/0-brief/brief.md`：

1. **三套差异化方案**（视觉隐喻 / 镜头语言 / 技术路线 / 时长节奏各不相同），让用户选；
   用户不在场则选"最能承载解释"的一套并记录理由。
2. **XML 分区 brief**：role / subject / audience / duration / style / forbidden /
   storyboard / tech / pitfalls / acceptance。
3. **具体禁止清单**：不许深色底居中大字当默认页、不许无动机粒子爆炸、不许匀速运动、
   不许 3D 上叠长文、不许 AI 套话、不许截断坐标轴不标注。
4. **8 分制验收表**：前 2 秒 / 可读性 / 解释力 / 运动质量 / 音画同步 / 技术卫生，
   低于 8 分不交付。

同时调用 **`video-production-guide`** 确认路线（纯代码 / 图像+代码 / 视频+合成 / 产品界面），
写进 brief 的 `<tech>`。

**旁白文案**在进入 TTS 前先过 **`humanize-writing`**：一句一个意思、长短句交错、
动词优先、删掉"首先/其次/值得注意的是"、保留全部数字与术语。

**验收门**：`0-brief/brief.md` 存在且 `<acceptance>` 已填；没有 brief 不得开始写代码。

## 阶段 1 · 获取论文

- arXiv 链接/ID → **`paper-download-arxiv-paper-source`**
- PDF → **`pdf-to-markdown`**（MinerU，需 GPU）

**验收门**：Markdown 可读、公式为 LaTeX、图表路径有效。

## 阶段 2 · 深度解读

调用 **`paper-xray`**：还原作者思路、每个公式给可手算的例子、怀疑式核对数字、
标注【文中有据/推断/猜测】。产物是后面所有脚本的事实源。

**验收门**：每个关键机制都有"它会怎么坏"的讲解；推断都有证据等级。

## 阶段 3 · 可视化图解

按内容形态选：

- **`visual-explainer`** — 通用 HTML 图解（架构图/对比表/可步进状态机）
- **`flowchart`** — AI/ML 模型原理动画（RNN/LSTM/GRU/MLP 范式）
- **`dynamic-archify`** — 工程风精确架构图
- **`network-protocol-viz`** — 网络协议
- **`anatomy`** — 等距 SVG"物理装置"插画
- **`scholar-notes`** — 手写笔记风 HTML
- 叙事型：`card-theater` / `stacked-data-cards` / `ppt-animation`
- 需要 AI 生图素材时用 **`hell-grind-aigc-skill`** 写提示词

审美方向参考 **`design-taste-frontend`**：概念要从主题本身长出来，
不要默认的"居中标题 + 三张图标卡 + 渐变"。

**验收门**：HTML 无脚本错误；每张图对应阶段 2 的一个机制点。

## 阶段 4 · 成片

| 路线 | 技能 | 适用 |
|---|---|---|
| A 文稿→动画 | `knowledge-explainer-skill` | 快速草稿、内部过稿 |
| B 学术幻灯片 | `paper-to-beamer` → `paper-slides-to-video` | 组会正式风 |
| C 3D 讲解片 | **`remotion-video`** | 科普/讲解交付（默认） |
| D HTML 动画成片 | 阶段 3 的 HTML → `hyperframes` | 已有精美 HTML 页 |

**质量底线**（不满足不算交付）：
- 必须有中文旁白 + 成片音轨；静默视频不算讲解片；
- 单镜头只讲一个点；镜头时长由旁白实测决定；全片 3–8 分钟；
- **字幕必须由逐句音频驱动**，禁止按权重切分镜头时长；
- 至少 2 个真正的三维空间镜头；
- 文字区 / 3D 舞台 / 字幕带三区物理隔离；
- 渲染后抽帧（首帧、转场、最密帧、末帧）+ 量响度（目标 −16 LUFS）。

**验收门**：`video-retrospective` 的打分表每项 ≥ 8。

## 阶段 5 · 发布（可选）

- **`paper-video-cover`** 生成 16:10 封面
- **`paper-bilibili-uploader`** 发布（先 `--dry-run`）
- 一键：**`paper-to-bilibili`**

发布前可加 **`video-qa-frameproof`**（空帧/冻结/编码检查）与
**`video-technical-review`** / **`layout-safety-review`**（内容与版式审查）。

## 阶段 6 · 复盘总结（强制）

调用 **`video-retrospective`**，产出：

1. `6-review/retrospective.md`：一句话结论、6 维打分（每项带证据）、
   有效做法、无效做法（现象→根因→修复→固化成哪条规则）、数据、下一支片子的默认值。
2. 项目级 `lessons.md`：只写可迁移的规则，格式 `- [类别] 规则 —— 由哪次经历得来`。
3. **写回技能**：至少把 1 条硬规则写进 `prompt-forge` 的禁止清单 /
   `remotion-video` 的铁律 / 本技能的质量底线。
4. `pipeline-state.json` 标记 `retrospective: done`。

**完成判据**：没有 `retrospective.md` 不算交付；用户未验收就自称完成的，该项直接记 5 分以下。

## 路由表

| 用户诉求 | 执行 |
|---|---|
| "讲透这篇论文" | 0 → 1 → 2，交付 MD/HTML |
| "画个图讲清机制" | 0.5（轻）→ 1 → 2 → 3 |
| "做成讲解视频" | 0 → 0.5 → 1 → 2 → 4（默认 C）→ 6 |
| "组会分享" | 0 → 0.5 → 1 → 2 → 4B → 6 |
| "发到 B 站" | 全程 + 5 |
| "只要封面" | 1 → 2（快读）→ paper-video-cover |
| "上一版不行" | 先写失败复盘 → 改 brief → 再动手 |

## 状态契约

产物统一放 `output/<paper-id>/`：
`0-brief/` · `1-acquire/` · `2-xray/` · `3-figures/` · `4-video/`（或 `5-video-final/`）· `6-review/`
阶段状态写 `pipeline-state.json`，中断后可从任一阶段续跑。
