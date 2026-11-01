# PaperVideo 工作流总纲

> 从一篇论文（或一个产品/主题）到一条能发出去的讲解片。本文是**唯一权威流程说明**：
> 每个阶段做什么、用什么技能、产出什么文件、什么条件才算过关、出问题去哪查。
>
> 技能总数：**66**，注册在 `.zcode/skills/`。总编排技能：`paper-explain`。
> 本地引擎检出：`engines/`（hyperframes / wise-motion / motion-lab / lieflat-code-video）。
> 组件级路径与用法速查：**[WORKFLOW-MAP.md](WORKFLOW-MAP.md)**（有什么 · 怎么做 · 在哪里）。

---

## 0. 三条原则

1. **先定方向，再渲帧。** 一句"做个视频"直接开写代码，最后一定返工。所有生成前必须先有
   `design-intake.md` + `brief.md`。
2. **事实与表达分离。** 论文事实来自原文（`paper-xray` + 源码），表达来自写作者（去 AI 味），
   画面只负责把已确认的事实讲清楚。
3. **验收后可复用才算完成。** 每支片子交付后必须写复盘，把至少一条规则写回技能；
   否则下一次还会踩同一个坑。

---

## 1. 阶段总览

```
        ┌─────────── 任何画面生成之前 ───────────┐
 需求 ─▶ 0 设计访谈 ─▶ 0.5 提示词锻造 ─▶ 1 获取 ─▶ 2 深度解读
        design-intake   prompt-forge      arXiv     paper-xray
                                                          │
                   6 复盘 ◀─ 5 发布 ◀─ 4 成片 ◀─ 3 图解 ◀─┘
              video-retrospective       四条路线   图解技能
```

| 阶段 | 技能 | 主要产物 | 硬门槛 |
|---|---|---|---|
| 0 设计访谈 | `design-intake` | `0-brief/design-intake.md` | 风格、主色、动效、时长、画幅、受众六项已有明确值 |
| 0.5 提示词锻造 | `prompt-forge` | `0-brief/brief.md` | 三套方案 + XML brief + 禁止清单 + 8 分验收表 |
| 1 获取 | `paper-download-arxiv-paper-source` / `pdf-to-markdown` | `paper_src/` 或 Markdown | 公式为 LaTeX、图表路径有效 |
| 2 深度解读 | `paper-xray` | `2-xray/deep-read.md` | 每个机制有"会怎么坏"；推断有证据等级 |
| 3 图解 | `visual-explainer` / `flowchart` / `dynamic-archify` / `anatomy` | `3-figures/*.html` | 浏览器无脚本错误；一图对应一个机制 |

**动效库匹配（强制前置，先查库再动手）**：每个镜头/章节动效实现前，先检索动效库并登记结果——
网页动效查 `motion-lab`（160 种，索引即源码）；Remotion 组件动效用 `wise-motion`（101 种，match/show/export）。
命中 → 导出改造；未命中 → 手写并在 3-figures 登记表标注缺口。风格跨集延续上一版内核（变更需记录）。
| 4 成片 | `remotion-video` / `knowledge-explainer-skill` / `paper-to-beamer` | `4-video/*.mp4` | 有旁白、字幕逐句对齐、三区不重叠、抽帧通过 |
| 5 发布 | `paper-video-cover` / `paper-bilibili-uploader` | 封面 + 投稿 | `--dry-run` 元数据通过 |
| 6 复盘 | `video-retrospective` | `6-review/retrospective.md`、`lessons.md` | 6 维打分每项 ≥8 且有证据；至少 1 条规则写回技能 |

---

## 2. 阶段 0 · 设计访谈（问用户）

**目的**：把"做个视频"问成可执行的设计契约。**这一步就是给用户的选择功能。**

### 两种使用方式

**A. 对话内提问（默认）**
用 `AskUserQuestion`，每轮 4 题、最多两轮：

- 第一轮：视觉语言（蓝图/纸本/霓虹/极简）、主强调色、排版气质、画面密度
- 第二轮：运动性格、转场方式、旁白声音、配乐气质
- 第三轮（按需）：时长、画幅、受众、明确不要

**B. 可视化选择器（用户自己点）**
打开 [design-picker.html](design-picker.html)（或 `.zcode/skills/design-intake/templates/style-picker.html`）：

- 6 张风格卡，每张都有真实动效预览；
- 选主色、运动、转场、密度、声音、时长、画幅、受众；
- 右侧实时生成 JSON，一键复制或下载 `design-intake.md`。

### 输出契约

`output/<project>/0-brief/design-intake.md`，必须包含：
选择表 + **一句话风格内核** + （重做时）与上一版的差异。

### 用户不在线的默认值

| 项目类型 | 默认 |
|---|---|
| 论文讲解 | 工程蓝图 · 克制精确 · 中文男声 · 5–7 分钟 · 16:9 · 泛技术读者 |
| 产品发布 | 极简白或品牌色 · 轻快 · 120BPM · 45–90 秒 · 16:9 |
| 组会分享 | 编辑纸本 · 克制 · 中文男声 · 8–12 分钟 · 16:9 |
| 社交媒体 | 暗场霓虹 · 弹跳 · 竖版 · 30–60 秒 |

---

## 3. 阶段 0.5 · 提示词锻造

调用 `prompt-forge`，把访谈结果锻造成合同：

1. **三套差异化方案**（视觉隐喻 / 镜头语言 / 技术路线 / 时长各不同），选出并记录理由；
2. **XML brief**：role / subject / audience / duration / style / forbidden / storyboard / tech /
   pitfalls / acceptance；
3. **禁止清单**：必须具体到能一眼判断（"不要匀速"能判断，"不要 low"不能）；
4. **8 分制验收表**：前 2 秒 / 可读性 / 解释力 / 运动质量 / 音画同步 / 技术卫生。

旁白文案在进 TTS 前先过 `humanize-writing`：一句一个意思、长短句交错、动词优先、
删掉"首先/其次/值得注意的是"。

**没有 brief 不得写代码、不得渲帧。**

---

## 4. 阶段 1 · 获取论文

```bash
# arXiv 源码（优先，公式最干净）
uv run --no-project python .zcode/skills/paper-download-arxiv-paper-source/scripts/download_source.py \
  "1706.03762" --output output/<project>/paper_src

# 或 PDF → Markdown（MinerU，需 GPU）
# 调用 pdf-to-markdown 技能
```

产物：`paper_src/`（TeX + Figures）或论文 Markdown。

**门槛**：Markdown 可读、公式为 LaTeX、图片路径有效。失败则回退直接读 PDF。

---

## 5. 阶段 2 · 深度解读

调用 `paper-xray`。要求的不是摘要，而是：

- 前人方法在什么具体场景失效、作者凭什么相信能做成；
- 每个公式给形状、含义和一个能纸笔验算的例子；
- 数字自洽性核对（表内、跨表、与正文）；
- 每条推断标注【文中有据】【推断】【猜测】。

产物 `2-xray/deep-read.md` 是后续所有脚本、旁白、图解的事实源。

**门槛**：每个关键机制都有"它会怎么坏"；推断有等级。

---

## 6. 阶段 3 · 图解

| 内容形态 | 技能 |
|---|---|
| 通用系统/流程/对比 | `visual-explainer` |
| AI/ML 模型原理 | `flowchart` |
| 工程架构/数据流 | `dynamic-archify` |
| 网络协议 | `network-protocol-viz` |
| 需要"物理直觉" | `anatomy`（等距 SVG 机械插画） |
| 学习笔记页 | `scholar-notes` |
| 叙事型演示 | `card-theater` / `stacked-data-cards` / `ppt-animation` |
| 需要 AI 生图素材 | `hell-grind-aigc-skill`（写提示词） |

审美方向参考 `design-taste-frontend`：概念从主题本身长出来，拒绝默认的
"居中标题 + 三张图标卡 + 渐变"。

**门槛**：HTML 无脚本错误；每张图对应阶段 2 的一个机制点。

---

## 7. 阶段 4 · 成片（四条路线）

| 路线 | 技能 | 适用 | 典型耗时 |
|---|---|---|---|
| A 文稿→模板动画 | `knowledge-explainer-skill` | 内部过稿、草稿 | 1 分钟渲完 |
| B 学术幻灯片 | `paper-to-beamer` → `paper-slides-to-video` | 组会正式风 | 10–20 分钟 |
| C 3D 讲解片 | `remotion-video` | **科普/讲解交付（默认）** | 9–15 分钟 |
| D HTML 动画成片 | 阶段 3 的 HTML → `hyperframes`（引擎已检出：`engines/hyperframes`） | 已有精美 HTML 页 | 视工程 |
| E 商业片 | `business-motion-film`（含 Gauntlet 评审循环） | 产品/服务宣传短片 15–40s | 视工程 |

产品发布/品牌动效短片可用 `product-launch-motion`：一镜到底形变、光标驱动、
闭式弹簧、BPM 网格与合成音效。

### 路线 C 的标准做法（已验证两次）

1. **旁白先行**：40–70 句，一句一个语义单元；逐句 edge-tts 合成，ffprobe 量时长；
2. **时间轴自动生成**：每句一个 `<Sequence>`（音频 + 字幕），镜头长度 = 句子时长之和；
3. **版面三区隔离**：文字区 / 3D 舞台 / 字幕带，`overflow:hidden`，不共享像素；
4. **3D 用真实结构**：矩阵瓦片高度=权重、向量列、层堆叠、线框/热力图；
5. **静帧先行**：每镜头 1–2 张，检查遮挡、比例、色彩空间、曲线基线；
6. **全片渲染 → loudnorm → 抽帧复核**。

### 质量底线（不满足不算交付）

- 必须有中文旁白与成片音轨；
- 字幕必须由逐句音频驱动，禁止按权重切分；
- 至少 2 个真正的三维镜头；
- 文字与画面物理隔离；
- 抽帧看首帧、转场、最密帧、末帧；响度目标 −16 LUFS；
- 编码 `-pix_fmt yuv420p -color_range tv -colorspace bt709`。

---

## 8. 阶段 5 · 发布

```bash
# 封面（16:10 海报）
# 调用 paper-video-cover

# B 站投稿（先 dry-run）
# 调用 paper-bilibili-uploader --dry-run
```

成片技术 QA 可选：`video-qa-frameproof`（空帧/冻结/编码）、
`video-technical-review` / `layout-safety-review`（内容与版式）。

---

## 9. 阶段 6 · 复盘

调用 `video-retrospective`，产出：

- `6-review/retrospective.md`：一句话结论、6 维打分（带证据）、有效/无效做法、数据、下一支默认值；
- `6-review/lessons.md`：累积可迁移规则；
- 至少把 1 条规则写回 `prompt-forge` 禁止清单 / `remotion-video` 铁律 / `paper-explain` 质量底线；
- `pipeline-state.json` 标记 `retrospective: done`。

**没有复盘不算交付。**

---

## 10. 目录约定

```
output/<project>/
├── 0-brief/
│   ├── design-intake.md      # 访谈结果
│   └── brief.md              # 锻造后的合同
├── 1-acquire/ 或 paper_src/  # 源码/PDF
├── 2-xray/deep-read.md
├── 3-figures/*.html + 截图
├── 4-video/ 或 5-video-final/
│   ├── narration.json
│   ├── tts_build.py
│   ├── make_bgm.py
│   └── *.mp4
├── 6-review/{retrospective,lessons}.md
└── pipeline-state.json
```

工程代码在 `remotion-studio/src/`：`ai-paper/`（v2）、`blueprint/`（v3）。

---

## 10.5 大胆变换（Bold Transformation）

形式单调是视频最容易被判"平庸"的原因。默认按"大胆"档执行：

| 要求 | 标准 | 怎么查 |
|---|---|---|
| 图形族 | ≥3 套可互相变形的图形（点阵/齿轮/仪表/等距爆炸图/示波器/铆接板/雷达） | 列清单，数数量 |
| 每章形变 | ≥2 次，写清"从什么变成什么、第几秒" | 看 storyboard 表 |
| 形式转场 | 每 45 秒 ≥1 次（机械光圈/闸门/扫描擦除/拆解重组） | 按时间轴数 |
| 主视觉 | 每章一个占画面 ≥35% 的图形主体，对比度最高 | 抽帧看 |
| 禁止 | 连续 20 秒只有位移/淡入；只换色不换形；图形全部退居背景 | 抽查 |

实现手法：
- **同构形变**：把两种图形都参数化为"沿某条路径排布的点/线"，在 0.4 秒内插值参数；
- **拆解重组**：旧图形炸开成碎片（带阻尼），新图形从碎片位置收拢；
- **机械转场**：光圈叶片闭合 → 全黑 → 在新构图打开；或闸门从两侧合拢带走旧画面；
- **尺度对比**：先给一个巨大的局部（占满画面），再拉远揭示整体。

风格扩展：参考素材是**下限**不是上限。允许在参考语言上叠加相容的"卫星风格"
（如工业半调 + 示波器 + 等距爆炸图），但必须有统一的网格、配色和字重，且转场要有逻辑。

## 10.6 具象化与布局强制（3D 例子 · 零遮挡 · 2026-11-01 起 P0）

> 来源：EP05 用户审查反馈——"举例没有 3D 建模，总在读数据全是表格；遮挡与布局不合理"。
> 两条都是 **QA 机器门**（违反即 failed_permanent），不是建议。

| 规则 | 触发条件 | 硬指标 | 失败行为 |
|---|---|---|---|
| **例子 3D 化**（技能 `threejs-visual-example`） | 视频交付目标 + 例子涉及具象对象（检测目标/物理实体/几何结构） | 具象对象例子必须有 three.js 3D 建模演示（低多边形即可），3D 主体 ≥35% 画面；**纯表格/纯数字读数例示 = 0**（表格只允许作为 3D 主体旁的伴随标注）；3D 场景 ≥1 次慢环绕/推拉 | figures 阶段 waiting_for_agent 退回重做 |
| **3D 确定性** | 使用 three.js | 动画挂可 seek 时间轴（GSAP onUpdate/代理对象），禁自走时钟/随机/Date.now；three.module.js 本地化 assets/vendor/（禁 CDN） | render/qa 阶段 failed |
| **零遮挡布局** | 所有成片 | hyperframes check 的 layout 段或 layout-safety-review：`content_overlap` / `container_overflow` error = 0；报告落 `5-video-final/layout_audit.json` | qa 阶段 failed_permanent |
| **3D 豁免** | 抽象数学例子（无具象对象） | route-decision 写明 reason（stage=figures, skill=threejs-visual-example, decision=skipped） | 缺豁免记录 → figures waiting_for_agent |

实现要点：three.module.js 本地 importmap；检测框用 EdgesGeometry 线框贴合物体；
单场景 ≤3 光源 ≤5 万面；GSAP onUpdate 里同步相机与位姿（确定性 seek）。

---

## 11. 故障排查

| 现象 | 原因 | 处理 |
|---|---|---|
| 渲染第 1 帧就失败，404 public/audioN/bgm.wav | BGM 没生成 | 先跑 `make_bgm.py`，再 `ls public/audioN` |
| BGM 生成 MemoryError | float64 全片数组 | 改 float32；噪声用降采样生成 |
| 字幕与语音不同步 | 按权重切分镜头时长 | 改为逐句音轨 + 每句一个 Sequence |
| 3D 元素被"拉回原点" | `scale` 与子元素 `position` 同层 | 外层定位、内层缩放 |
| 热力图发白 | DataTexture 未设 sRGB | `tex.colorSpace = THREE.SRGBColorSpace` |
| 线框矩阵看不出模式 | 低权重格仍有底色 | 用 `v^1.7` 映射，低值近乎透明 |
| 曲线悬空 | 用了 `(v-0.5)*h` | 改 `v*h` 锚定基线 |
| TTS 批量失败 | 服务端限流 | 逐句重试 + 1–5 秒退避；已成功的跳过 |
| 成片偏亮/偏灰 | yuvj420p full range | 重封装 `-pix_fmt yuv420p -color_range tv -colorspace bt709` |
| 响度偏低 | 未归一 | `loudnorm=I=-16:TP=-1.5:LRA=11` |
| 音频混音崩溃（FFmpeg exited 3165764104） | Remotion 捆绑 ffmpeg 缺 f32le 混流器 | 换全量构建（npm @ffmpeg-installer）+ `HYPERFRAMES_FFMPEG_PATH` |
| aac 编码后 TP 超标 +2~5dB | 旧版 aac 编码器对密集合成内容过冲 | 响度/TP 以 audio_master.wav（WAV 母带）验收，母带阶段留 TP 余量 |
| 渲染卡在 installing chrome-headless-shell | 渲染器不用 HYPERFRAMES_BROWSER_PATH | 用 `PRODUCER_HEADLESS_SHELL_PATH` 指向本机 Chromium/Chrome |
| 渲染帧序列撑爆 C 盘（ENOSPC） | 帧序列走 os.tmpdir() | `TMP/TEMP/TMPDIR` 重定向大容量盘 |
| 挂载文档里 importmap 报 null-base | 子合成内联后 ESM 相对解析失败 | esbuild `--format=iife` 打全局包（window.THREE/window.__lib3d） |

---

## 12. 技能清单（66）

**编排与元技能（7）**
`paper-explain` · `design-intake` · `prompt-forge` · `video-retrospective` ·
`humanize-writing` · `video-production-guide` · `design-taste-frontend`

**解读与获取（3）**
`paper-xray` · `paper-download-arxiv-paper-source` · `pdf-to-markdown`

**图解（9）**
`visual-explainer` · `flowchart` · `dynamic-archify` · `network-protocol-viz` ·
`anatomy` · `scholar-notes` · `card-theater` · `stacked-data-cards` · `ppt-animation`

**成片（7）**
`remotion-video` · `knowledge-explainer-skill` · `hyperframes` · `code-mv-render` ·
`lemo-opuscar` · `opus-video-skills` · `product-launch-motion` · `business-motion-film`

**动效方法论（HyperFrames 官方，6）**
`motion-doctrine`（网关，先读） · `cut-the-curve`（转场目录） · `seam-craft` ·
`oversized-cursor` · `captions-overlay` · `changelog-video`

**引擎与迁移（3）**
`hyperframes`（引擎主技能，本地检出 `engines/hyperframes`） · `hyperframes-cli` ·
`remotion-to-hyperframes`（Remotion 工程迁移）

**视频理解与 QA（16）**
`video-qa-frameproof` · `video-technical-review` · `layout-safety-review` ·
`compare-video-runs` · `storyboard-extract` · `storyboard-understand` · `storyboard-ocr` ·
`storyboard-transitions` · `segment-evidence` · `segment-storyboard` · `video-shots` ·
`source-media-signals` · `video-artifact-intake` · `review-bundle` · `skill-catalog` ·
`package-review-prompt`

**B 站流水线（5）**
`paper-to-bilibili` · `paper-to-beamer` · `paper-slides-to-video` · `paper-video-cover` ·
`paper-bilibili-uploader` · `sustech-beamer-theme-fix`

**风格演示库（6）**
`video-shot-demos` · `swiss-shot-demos` · `phone-ui-demos` · `win11-ui-demos` ·
`ui2v-motions` · `hell-grind-aigc-skill`

**动效库与商业片补充（3）**
`motion-lab`（160 CSS 动效，检出 `engines/motion-lab`） · `wise-motion`（101 Remotion 动效，检出 `engines/wise-motion`） ·
`lieflat-code-video`（产品发布片 Starter，检出 `engines/lieflat-code-video`）

> 各技能具体路径与用法：[WORKFLOW-MAP.md](WORKFLOW-MAP.md) §5。

---

## 13. 一页速查

```bash
# 0 风格：对话里问，或用选择器
start design-picker.html

# 0.5 写合同（技能内完成）
# 1 下载源码
uv run --no-project python .../download_source.py 1706.03762 --output paper_src
# 2 解读（技能内完成）
# 3 图解（技能内完成）
# 4 成片
cd output/<project> && uv run --no-project --with edge-tts python tts_build.py
uv run --no-project --with numpy python make_bgm.py
cd D:/papervideo/remotion-studio
npx remotion still <Comp> out/f.png --frame=3600     # 静帧先行
npx remotion render <Comp> out/v.mp4 --concurrency=4
ffmpeg -i out/v.mp4 -c:v libx264 -pix_fmt yuv420p -color_range tv \
  -colorspace bt709 -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 192k final.mp4
# 6 复盘（技能内完成）
```

---

## 14. 社媒切片流水线（60s 短视频 · v7 起可用）

长版成片后，可按同一主题拆 30-60s 竖/横短视频。触发语：「把这篇论文拆成 N 条短视频，先做第 1 条」。

### 结构合同（每条必过）

1. **0-3s 钩子**：第一句旁白直接抛出问题，配全片对比度最高的画面；结尾停持 +2s
2. **8 镜内讲完一个概念**：每镜一句旁白（≤5.5s），句子时长驱动镜头长度
3. **步骤大标题**：顶部 62px 白字 + accent 光晕 + "SEC 0X · kicker" 芯片；每镜切换
4. **三级层级**：当前元素全亮 / 关联元素 50% / 环境压暗 20-35%
5. **因果动画**：画面里每个动起来东西都必须是旁白正在讲的；装饰性动效一律删
6. **大字幕**：42px，底部安全区（横 70 / 竖 260），左缘强调色边框，逐句与 Audio 同 Sequence
7. **结尾卡**（≥5s 停持）：一句核心结论 + 下一集预告 + 收藏 CTA + 账号签名
8. **机位**：每镜 2-4 个 cue（推拉摇移），cue 前先反算 `screen = center + (world-cam)*s` 保证主体不出画
9. **转场**：机械快门 9f 进 9f 出（上下闸门 + 危险条 + SEC 标签）

### 发布编码（平台规范，全部成片必跑）

```bash
FF=node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe
$FF -i raw.mp4 -c:v libx264 -preset slow -profile:v high \
  -b:v 9M -maxrate 12M -bufsize 15M -g 60 -keyint_min 30 \
  -pix_fmt yuv420p -color_range tv -colorspace bt709 \
  -color_primaries bt709 -color_trc bt709 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart final.mp4
```

### 竖版规则

- 9:16 = 世界坐标 scale 0.6 + 中轴 830（**不是中心裁切**）；标题区 top 110 / 内容带 / 字幕带 bottom 260 三段隔离
- 竖版专用大字幕放宽到 42px 以上，且字幕必须落在平台 UI 安全区内

### 拆条主题清单（Attention Is All You Need · EP 系列）

1. Attention 到底在注意什么？（本片 EP01）
2. Q、K、V 分别是什么？
3. 为什么要做点积？
4. softmax 如何把分数变成权重？
5. 加权求和如何产生新的词表示？
6. 多头注意力为什么比单头更强？
7. 位置编码解决了什么问题？
8. Encoder 和 Decoder 如何串起来？
9. Transformer 为什么能并行计算？
10. 一句话总结 Transformer

---

## 15. paperpipe 统一执行器（v2）

把整条流水线从"自然语言约定"升级为可执行的状态机。**四层职责**：paper-explain 路由器 →
技能层 → 子智能体层（handoff）→ 执行器（只管 DAG/状态/哈希/机器门禁，验证 receipt，不假装调用技能）。
**唯一事实源：`paperpipe/registry/{routes,skills,agents,contracts}.yaml`** —— 路由表、66 技能注册、
8 个子智能体角色、阶段合同（requires/条件技能/机器门/人工门）全部从注册表读取。

9 阶段 DAG：`intake → brief → acquire → xray → figures → render → qa → retrospective → publish`
（拓扑序见 registry；阶段与工作流 §0-6 的编号是映射不是同一套）。

**8 种状态**（schema: paperpipe-state/3）：
`pending / running / waiting_for_agent / waiting_for_human / passed / not_applicable / failed_retryable / failed_permanent`
- `waiting_for_agent` = 等 agent 按技能产出；`waiting_for_human` = 人审门；二者**都停止下游**；
- `failed_retryable`（transient 耗尽，可 retry）/ `failed_permanent`（需改内容或配置）；
- `not_applicable` = target 不含此阶段（md→xray · figures→figures · video→qa · publish→publish 终止）；
- 普通 `warn` 语义废除，警告进独立 `warnings` 列表。

**门禁语义**：
- 阶段启动前所有 requires 必须 `passed/not_applicable`，否则 skipped_by_prerequisite 审计并停止；
- `retry` 与 `run --stage`（自动按拓扑排序）同样过前置检查；
- **技能凭据（receipt）**：`output/<run>/receipts/{skills,tools,agents}/` + `route-decisions.json`；
  执行器按 contracts.yaml 验证 receipt 存在/技能已注册/产物存在/哈希一致——
  **"brief 里提过技能名"不再算调用**；条件技能（图解主技能组、动效库组）可凭
  route-decision（skipped+理由）豁免；
- 人审门：`review --confirm` 程序化核对 QA passed + 复盘六维全部有分且 ≥8 且每项有证据 +
  无占位符 + lessons ≥1 条规则 + video-retrospective receipt；确认哈希绑定产物；
- 发布双门：`publish --confirm` 需 review 已确认 + 哈希全匹配 + 封面存在；真实上传需
  publish.command 且回执 exit=0 才置 uploaded，失败 → failed_retryable 绝不谎报。

含：输入/产物哈希、尝试计数、transient 指数退避重试、文件锁、`.partial` 原子写、
`run.log.jsonl` 事件日志、状态文件内 audit trail、按输入哈希的幂等续跑。
**legacy**：旧 schema（paperpipe-state/1、/2）的 run 冻结只读（status 打 LEGACY 标记），
resume/retry/publish 拒绝，重建用 `init --force`（见 docs/baseline-2026-10-31.md §4）。

### 命令

```bash
python -m paperpipe init 1706.03762 --run-id <id> --target video   # 建运行目录（--force 清空重建）
python -m paperpipe run --auto                        # 执行 DAG 到第一个等待/失败处
python -m paperpipe run --stage render,qa             # 子集（自动拓扑排序 + 前置检查）
python -m paperpipe resume                            # 按输入指纹决定重跑范围（不清零失败历史）
python -m paperpipe retry <stage>                     # 过前置门禁后显式重试
python -m paperpipe status --json                     # 状态（机器可读，legacy 打标）
python -m paperpipe validate --target video           # 注册表驱动：组件/引擎/技能/差集
python -m paperpipe review --confirm                  # 人审门（程序化核对）
python -m paperpipe publish --dry-run                 # 发布计划（默认）
python -m paperpipe publish --confirm <run_id>        # 真实上传双门
```

测试六套件：`test_gates / test_receipts / test_handoff / test_review_publish / test_regressions / test_scenarios`
（`python -X utf8 -m paperpipe.tests.<名>`，含 14 场景端到端验收）。

---

## 15.1 多子智能体管线（12 角色 · 三路并行 → 串行汇总 → 并行 QA）

> 来源：用户要求"拆解论文解析、举例细化、建模、数据分别交给 subagent，最后汇总"。
> 全部角色注册在 `paperpipe/registry/agents.yaml`（唯一事实源）；每阶段的 handoff 信封
> 由 runner 自动创建（`ensure_stage_handoffs`），全部 passed 才能过阶段门。

```
论文输入 (arXiv / PDF)
    │
    ▼ acquire
    │
    ├──→ [researcher]  解析主稿 deep-read.md（机制点/会怎么坏/手算例/证据分级）
    └──→ [fact_checker] 数字核查 ←── wave 1 并行
         │
         ▼ （deep-read 就绪）
    ┌── wave 1（并行，四路独立）───────────────────────────────┐
    │  [example_writer]     举例细化 → examples_spec.json      │
    │  [data_viz_builder]   数据 3D 规格 → dataviz_spec.json   │
    │  [style_director]     风格选型 → style_refs.json          │
    │                       （341 风格库 code-animation-prompts）│
    └───────────────────────────────────────────────────────────┘
         ▼
    [spec_enricher] 提示词丰富优化 → enriched_spec.json（串行熔炼）
       · 合并去重 · 相机路径精确化 · 物体布点 · 检测框贴合
       · 数据组件定位 · 字幕节拍对齐 · 特效指配 · style_ref 落章
         ▼
    ┌── wave 3（并行）─────────────────────────────────────────┐
    │  [model_builder]      three.js 场景代码 → model_manifest │
    │  [visual_planner]     图解登记表 → README.md              │
    └───────────────────────────────────────────────────────────┘
         ▼
    [aggregator] 汇总组装 compositions + 时间轴 + 字幕（串行，零遮挡自检）
         ▼
    [render_worker] 渲染 → render-raw.mp4
         ├──→ [technical_qa] 机器 QA    ←── 并行
         └──→ [visual_qa] 布局审查       ←── 并行
         ▼ 全部回传
    [narration_editor] 旁白校对
         ▼
    [release_reviewer] 发布确认 → upload_ready
```

**调度查询**（编排方派子智能体前必看）：

```bash
python -m paperpipe agents --run-dir output/<run-id>          # 派发波次/状态/下一步可派/卡点
python -m paperpipe agents --stage figures --json             # 机器可读
```

输出示例：
```
stage=figures  all_passed=False
派发波次（同波次可并行）:
  wave 1: example_writer | data_viz_builder | style_director
  wave 2: spec_enricher
  wave 3: model_builder | visual_planner
现在可派: example_writer, data_viz_builder
卡在: spec_enricher←example_writer,data_viz_builder; model_builder←spec_enricher
```

退出码：全部 handoff passed → 0；仍有未完成 → 2（编排方据此决策）。

**门禁语义**：每阶段 runner 自动创建 handoff 信封（`ensure_stage_handoffs`）；
阶段 passed 前 `stage_handoffs_passed` **按 depends_on 拓扑**检查——
每个 handoff 自身 passed 且其依赖也 passed；未满足依赖的标 `blocked_by(...)`
→ 阶段 waiting_for_agent（消息列明谁 pending / 谁卡在谁身上）。

**系统提示词**：9 个角色配了可执行提示词（`paperpipe/prompts/<role>.md`），
`handoff.create` 自动把全文内联到 `request.json.system_prompt`——
分派时直接取用，不需要另查文档。

**隔离规则**：example_writer 与 data_viz_builder 写不同文件（examples_spec.json / dataviz_spec.json）；
model_builder 串行吃两份规格；aggregator 串行汇总；pipeline-state.json 仅整合方写入。

---

## 16. 技能调用门禁（66 技能 → 条件触发 + 可验证证据）

> v2 重构：P0"全量强制"升级为**"条件触发 + 可验证证据"**——每条规则五字段
> `触发条件 → 唯一责任技能 → 必需产物 → 验收判据 → 失败行为`，唯一事实源
> `paperpipe/registry/contracts.yaml`。执行器用 receipt（`output/<run>/receipts/`）验证调用，
> 不再接受"文档里提过技能名"。
> **关键变化**：`flowchart` 与 `visual-explainer` 按内容形态**二选一**；
> `motion-lab` 与 `wise-motion` 按运行时（HTML/CSS vs Remotion）**二选一**；
> 未选中的写 route-decision（skipped + 理由）即可豁免。

### 调用现状审计（2026-10-31）

| 状态 | 数量 | 说明 |
|------|------|------|
| 已调用 | 15 | design-intake / prompt-forge / paper-download / paper-xray / remotion-video / video-retrospective / video-qa-frameproof / motion-lab / wise-motion / humanize-writing / design-taste-frontend / video-production-guide / paper-bilibili / paper-video-cover / paper-explain |
| **应调未调** | **17** | ↓ 见 P0/P1 矩阵 |
| 路线未走 | 8 | beamer/slides/hyperframes/知识科普/商业片等（路线 B/D/E 未走，合理） |
| 领域不符 | 25 | UI 演示/协议图/变更日志/代码 MV 等与论文讲解无关（合理闲置） |

### 强制调用矩阵

| pipeline 阶段 | 技能 | 级别 | 当前状态 | 强制规则 |
|---|---|---|---|---|
| **阶段 1 获取** | `pdf-to-markdown` | **P0** | ❌ 直接读 tex 跳过了 MD 转换 | 渲染前必须有 `1-acquire/paper.md`；没有→acquire 阶段 failed |
| **阶段 1 获取** | `paper-download-arxiv-paper-source` | P0 | ✅ 已用 | 维持 |
| **阶段 2 深读** | `paper-xray` | P0 | ✅ 已用 | 维持 |
| **阶段 3 图解** | `motion-doctrine` | **P0** | ❌ 从未读过；动效法则全部凭感觉 | 写第一行动效代码前必须读完并写读后摘要到 brief |
| **阶段 3 图解** | `flowchart` | **P0** | ❌ AI/ML 机制图从未查 | 每个机制点先查是否有现成范式可改造 |
| **阶段 3 图解** | `visual-explainer` | **P0** | ❌ 通用 HTML 图解从未查 | 同上 |
| **阶段 3 图解** | `dynamic-archify` | P1 | ❌ 工程架构图 | 涉及系统架构时查 |
| **阶段 3 图解** | `anatomy` | P1 | ❌ 等距 SVG 物理插画 | 涉及物理直觉时查 |
| **阶段 3 图解** | `scholar-notes` | P2 | ❌ 手写笔记风 | 按需 |
| **阶段 3 图解** | `card-theater` / `stacked-data-cards` / `ppt-animation` | P2 | ❌ | 按需 |
| **阶段 3 动效** | `motion-lab` | P0 | ⚠️ 注册了但只查了 1 次 | 每章动效先查（EP04 已固化此规则） |
| **阶段 3 动效** | `wise-motion` | P0 | ⚠️ 同上 | 同上 |
| **阶段 3 审美** | `design-taste-frontend` | **P0** | ❌ 写了在文档里但从未实际读 | 生成前必须读并写审美清单 |
| **阶段 4 动效精调** | `cut-the-curve` | **P0** | ❌ 缓动曲线全凭感觉 | 渲染前必须读并检查 easing |
| **阶段 4 转场** | `seam-craft` | P1 | ❌ 转场接缝凭感觉 | 有转场的镜头必须读 |
| **阶段 4 大字** | `oversized-cursor` | P2 | ❌ | 有光标驱动时查 |
| **阶段 4 字幕** | `captions-overlay` | P1 | ❌ 字幕全手写样式 | 每次渲染前查是否有更好的字幕方案 |
| **阶段 4 QA** | `video-qa-frameproof` | **P0** | ❌ 用自写 QA 替代；缺帧级检测（空帧/冻结/花屏） | paperpipe qa 通过后必须跑一次 |
| **阶段 4 QA** | `video-technical-review` | **P0** | ❌ 从未跑 | QA 后人工审查前跑一次 |
| **阶段 4 QA** | `layout-safety-review` | **P0** | ❌ 遮挡全靠静帧肉眼 | 渲染后必须跑（本可自动检出 EP02/k07 的裁切） |
| **阶段 5 发布** | `paper-video-cover` | **P0** | ❌ 四支视频都没有封面 | 发布前必须生成 16:10 封面 |
| **阶段 6 复盘** | `video-retrospective` | P0 | ✅ 已用 | 维持 |
| **阶段 6 复盘** | `video-artifact-intake` | P1 | ❌ 产物清点未用 | 复盘前清点产物 |
| **阶段 6 复盘** | `review-bundle` | P2 | ❌ | 按需 |
| **全片参考** | `video-shot-demos` / `video-shots` / `swiss-shot-demos` | P1 | ❌ 镜头参考从未查 | 每种新镜头类型先查 demo |
| **全片参考** | `design-picker.html` | P0 | ⚠️ EP01 用过，后续跳了 | 每集必须在设计访谈时走一遍 |

### 路线专属（按需，当前项目未走）

| 技能 | 路线 |
|---|---|
| `knowledge-explainer-skill` | A 文稿→动画 |
| `paper-to-beamer` + `paper-slides-to-video` | B 学术幻灯片 |
| `hyperframes` + `hyperframes-cli` + `remotion-to-hyperframes` | D HTML 动画 |
| `business-motion-film` / `product-launch-motion` | E 商业片 |
| `network-protocol-viz` | 协议类论文 |
| `hell-grind-aigc-skill` | 需 AI 生图时 |

### 与领域无关的技能（合理闲置）

`phone-ui-demos` / `win11-ui-demos` / `ui2v-motions` / `code-mv-render` / `opus-video-skills` / `lemo-opuscar` / `sustech-beamer-theme-fix` / `changelog-video` / `skill-catalog`（agent 发现用）/ `package-review-prompt` / `source-media-signals` / `segment-*` / `compare-video-runs` / `pdf-to-markdown`（GPU 依赖）

### P0 缺失对质量的影响（实际案例）

| 跳过的技能 | 实际后果 |
|---|---|
| `motion-doctrine` | v6-v8.1 的缓动曲线全部凭感觉，直到 EP03 才读 |
| `video-qa-frameproof` | EP02 有一帧冻结画面上线后才被发现 |
| `layout-safety-review` | EP02 k07 标注被标题盖住，静帧审计才查出来 |
| `paper-video-cover` | 四支视频发布时全部没有封面 |
| `design-taste-frontend` | v7 社媒版风格太素，用户打回两轮 |
| `pdf-to-markdown` | paper-xray 直接读 tex，遗漏了 PDF 中才有的图表信息 |
