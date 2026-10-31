# PaperVideo 工作流组件地图 —— 有什么 · 怎么做 · 在哪里

> 本文是**组件级速查手册**：每个东西是什么、放在哪个具体路径、怎么用。
> 流程的权威定义在 [WORKFLOW.md](WORKFLOW.md)（阶段/产物/门槛）；本文回答"具体文件在哪、命令怎么敲"。
> 工作区根：`D:\papervideo`（下文所有相对路径均以此为根）。

---

## 1. 一张图看懂

```
论文 PDF/arXiv
   │
   ▼
┌─ paperpipe 执行器（python -m paperpipe，9 阶段 DAG）────────────────────┐
│  intake → brief → acquire → xray → figures → render → qa → retro → publish │
│  每阶段: plan/run/check/repair · 状态机 · 指纹缓存 · 人审门                  │
└──────┬──────────────────────────────────────────────────────────────────┘
       │ 调用
       ▼
┌─ 66 个技能（.zcode/skills/<name>/SKILL.md）─┐   ┌─ 4 个引擎检出（engines/）─┐
│ 编排/解读/图解/成片/动效/QA/发布             │ + │ wise-motion 101 动效       │
│ 强制调用矩阵 P0：不调不许交付               │   │ motion-lab 160 CSS 动效    │
└─────────────────────────────────────────────┘   │ lieflat-code-video 商业片  │
       │ 产出代码                                  │ hyperframes HTML→MP4       │
       ▼                                          └────────────────────────────┘
remotion-studio（Remotion 4 工作台，11 个 Composition）
       │ npx remotion render
       ▼
output/<run-id>/4-video/final.mp4 → 5-video-final/ → 6-review/ 复盘 → 发布
```

**成品实例**：`output/test-attention/` 下已有 EP02/EP03/EP04 三支成片（详见 §8）。

---

## 2. 怎么做：标准作业流程（两条路线）

### 路线甲 · paperpipe 自动化（推荐，已跑通 4 集）

```bash
cd D:\papervideo

# ① 建运行目录（--force 清空重建）
python -m paperpipe init 1706.03762 --target video
#    → 生成 output/<run-id>/paperpipe.yaml + 阶段子目录

# ② 自动执行 DAG 到人审门（intake/brief/acquire/xray/figures/render/qa 全自动，
#    停在 retrospective / publish 两个人审门上）
python -m paperpipe run --auto

# ③ 中断后续跑（按输入指纹决定重跑范围，不清零失败历史）
python -m paperpipe resume
python -m paperpipe retry <stage>          # 显式重试单个失败阶段
python -m paperpipe status --json          # 机器可读状态
python -m paperpipe validate --target video # 检查组件/引擎/技能文件齐不齐

# ④ 人审门（程序化核对 QA 通过/无占位符/lessons 规则/哈希绑定）
python -m paperpipe review --confirm

# ⑤ 发布（默认 dry-run 只出计划；--confirm 才置 upload_ready）
python -m paperpipe publish --dry-run
python -m paperpipe publish --confirm <run_id>
```

- agent 在每个阶段**照常调用对应技能**（design-intake、prompt-forge、paper-xray、
  motion-lab/wise-motion、video-qa-frameproof…），paperpipe 负责：状态机、产物哈希、
  失败重试、门禁检查 —— 见 `paperpipe/adapters.py:529` 的 `MANDATORY_SKILLS`（P0 门禁）。
- 每个运行目录的标准结构：

```
output/<run-id>/
├── paperpipe.yaml          # 运行配置（arxiv id / target / 路线 / 语速 / 编码参数）
├── pipeline-state.json     # 唯一状态源（schema: paperpipe-state/1）
├── run.log.jsonl           # 全部事件 + 环境摘要
├── 0-brief/                # design-intake.md + brief.md
├── paper_src/              # 1-acquire：arXiv TeX 源码 + Figures
├── 2-xray/deep-read.md     # 深度解读（一切事实的唯一来源）
├── 3-figures/              # 图解 HTML + 动效匹配登记表
├── 4-video/                # narration.json / tts_build*.py / render-raw.mp4 / final.mp4
├── 5-video-final/          # qa_report.json + publish_plan.json
├── 6-review/               # retrospective.md + lessons.md
└── *.py                    # tts_build / make_music（按集命名的构建脚本）
```

### 路线乙 · 手动技能流（不跑执行器时，顺序完全一致）

```
0 设计访谈 design-intake（AskUserQuestion 两轮 或 design-picker.html）
0.5 提示词锻造 prompt-forge（三套方案 + XML brief + 禁止清单 + 8 分验收）
1 获取 paper-download-arxiv-paper-source → paper_src/
2 深读 paper-xray → 2-xray/deep-read.md
3 图解+动效匹配 → 3-figures/（先查动效库，见 §6）
4 成片 remotion-video → 4-video/（旁白先行→TTS→时间轴→渲染→编码）
5 发布 paper-video-cover + paper-bilibili-uploader --dry-run
6 复盘 video-retrospective → 6-review/（没复盘不算交付）
```

**没有 `0-brief/brief.md` 不得写代码、不得渲帧 —— 两条路线同此铁律。**

### 成片路线选择（阶段 4 内部）

| 路线 | 技能 | 适用 |
|---|---|---|
| A | `knowledge-explainer-skill` | 文稿→模板动画，1 分钟出片 |
| B | `paper-to-beamer` + `paper-slides-to-video` | 学术幻灯片正式风 |
| **C** | **`remotion-video`（本工作台）** | **科普/讲解交付，默认路线** |
| D | `hyperframes`（引擎在 engines/） | 已有 HTML 动画页 → MP4 |
| E | `business-motion-film` / `product-launch-motion` / `lieflat-code-video` | 商业/产品发布短片 |

---

## 3. 组件地图 · 根目录文档

| 文件 | 是什么 |
|---|---|
| `D:\papervideo\WORKFLOW.md` | **工作流总纲**（§0 三原则 · §1-9 阶段 · §10 目录 · §10.5 大胆变换 · §11 排查 · §12 技能清单 · §13 速查 · §14 社媒切片 · §15 paperpipe · §16 强制调用矩阵） |
| `D:\papervideo\README.md` | 技能套件说明（来源、目录结构、快速上手） |
| `D:\papervideo\AGENTS.md` | agent 工作区规则（技能路由、强制阶段、产物约定） |
| `D:\papervideo\WORKFLOW-MAP.md` | 本文（组件地图） |
| `D:\papervideo\design-picker.html` | **全维度设计选择器 v2**：8 视觉语言卡（含 NEON ORBIT 机甲霓虹/示波终端）× **61 决策维度**，九区：项目交付/视觉/**动效与特效（检索策略/wise-motion 12 分类/文字动效/每章动效数/特效密度/辉光/粒子/噪声）**/**运镜与场景切换（机位库/每章 cue/运镜节奏/环绕速度/视差强度/章间切换/章内切换/形式转场频率）**/标题字幕/声音/受众/**结构与交付**/**参考内容（EP 系列成片/方法论技能/镜头分镜库/动效库入口带路径/自定义）** + 6 条锁定铁律；输出三件套 **JSON（对话）+ paperpipe.yaml（直接落盘）+ design-intake.md（61 行总表自动生成 + 动效运镜计划 + 参考清单）** |
| `D:\papervideo\docs\design-picker-preview.png` | 选择器截图 |

---

## 4. 组件地图 · paperpipe 执行器（`D:\papervideo\paperpipe\`，v2.0.0，约 2000 行 + 注册表）

| 文件 | 行数 | 职责 |
|---|---|---|
| `paperpipe\registry.py` | 249 | **单一注册表加载器**：自研 YAML 子集解析（零依赖）；routes/skills/agents/contracts 查询；validate_registry（含与本地技能目录双向差集） |
| `paperpipe\registry\routes.yaml` | — | 9 条用户意图路由（唯一事实源）：target/终止阶段/必选技能 |
| `paperpipe\registry\skills.yaml` | — | 66 技能注册：适用条件/输入/输出/禁止误用/可替代 |
| `paperpipe\registry\agents.yaml` | — | 8 个子智能体角色：触发条件/输入输出/并行规则/禁写文件 |
| `paperpipe\registry\contracts.yaml` | — | 阶段合同：requires/条件技能（五字段）/机器门/人工门/子智能体；target 终止阶段 md→xray · figures→figures · video→qa · publish→publish |
| `paperpipe\cli.py` | 278 | 8 命令：init/run(--stage 拓扑+前置)/resume/retry(前置门禁)/status(legacy 打标)/validate(注册表驱动)/review/publish(双门)；`_safe_run_dir()` 路径安全 |
| `paperpipe\runner.py` | 220 | DAG 执行 v2：requires 前置检查（skipped_by_prerequisite 审计并停止）、waiting_*/failed_* 停下游、not_applicable、指纹缓存（stage+版本+config+输入哈希+上游指纹）、transient 退避 |
| `paperpipe\adapters.py` | 600 | 9 阶段适配器（run/check 返回 passed/waiting_for_agent/waiting_for_human）；validate_review（六维 ≥8+证据+receipt）；Publish 双门（confirmed+哈希+封面+回执） |
| `paperpipe\receipts.py` | 162 | **调用凭据**：write_skill/tool/agent_receipt + route-decisions + verify_stage（存在/注册/产物/哈希；替换字符串匹配） |
| `paperpipe\handoff.py` | 119 | 子智能体交接信封：request/input-manifest/response/output-manifest/failure；状态流 pending→running→waiting_for_review→passed/failed；哈希防篡改 |
| `paperpipe\state.py` | 165 | 状态机（schema paperpipe-state/3）：8 状态、warnings 独立列表、audit trail、register_artifact 路径安全、legacy 识别（/1、/2 冻结只读） |
| `paperpipe\config.py` | 72 | paperpipe.yaml 配置解析（mini-YAML） |
| `paperpipe\util.py` | 130 | `FileLock` 心跳锁、原子写、sha256、env_summary |
| `paperpipe\tests\` | 6 套件 | test_gates(18) · test_receipts(13) · test_handoff(15) · test_review_publish(13) · test_regressions(19 含布局门 T7) · test_scenarios(14 场景 31 检查)，共 109 项全绿；`python -X utf8 -m paperpipe.tests.<名>` |

**8 种阶段状态**：`pending / running / waiting_for_agent / waiting_for_human / passed / not_applicable / failed_retryable / failed_permanent`
（waiting_\* 与 failed_\* 停止下游；not_applicable=target 不含；warn/blocked 语义废除）

---

## 5. 组件地图 · 技能库（67 个，`D:\papervideo\.zcode\skills\<name>\SKILL.md`）

> 每个 skill 至少含 `SKILL.md`；部分带 `references/`、`scripts/`、`templates/`。
> 打包分发见 §9。

### 编排与元技能（8）
| 技能 | 用途 |
|---|---|
| `threejs-visual-example` | ⭐ 例子 3D 化强制（three.js 建模演示；禁纯表格读数；抽象数学 route-decision 豁免） |
| 技能 | 用途 |
|---|---|
| `paper-explain` | ⭐ 总编排（五段流水线、路由表、验收门） |
| `design-intake` | 设计访谈（AskUserQuestion 两轮 / 选择器），产出 design-intake.md |
| `prompt-forge` | 提示词锻造：三套方案 + XML brief + 禁止清单 + 8 分验收 |
| `video-retrospective` | 复盘：retrospective.md + lessons.md + 规则写回 |
| `humanize-writing` | 旁白去 AI 味（一句一个意思、长短句交错、动词优先） |
| `video-production-guide` | 视频生产总指南 |
| `design-taste-frontend` | 审美方向（概念从主题长出来，拒绝模板脸） |

### 获取与解读（3）
`paper-download-arxiv-paper-source`（TeX 源码下载）· `paper-xray`（深度解读，怀疑式审读）· `pdf-to-markdown`（MinerU，需 GPU）

### 图解可视化（9）
`visual-explainer`（通用 HTML 图解，默认）· `flowchart`（AI/ML 模型范式）· `dynamic-archify`（工程架构图）· `network-protocol-viz`（协议图）· `anatomy`（等距 SVG 机械插画）· `scholar-notes`（学霸笔记页）· `card-theater` · `stacked-data-cards` · `ppt-animation`

### 成片引擎技能（8）
`remotion-video`（⭐ 本工作台技能，路线 C 默认）· `knowledge-explainer-skill`（路线 A）· `paper-to-beamer`+`paper-slides-to-video`（路线 B，归 B 站组）· `hyperframes`（路线 D）· `code-mv-render` · `lemo-opuscar`（59 风格库）· `opus-video-skills`（手绘水彩）· `product-launch-motion`（一镜到底形变）· `business-motion-film`（Gauntlet 评审）· `lieflat-code-video`（产品发布片 Starter）

### 动效方法论（6，HyperFrames 官方）
`motion-doctrine`（⭐ 网关，先读；Vector Law：exit 方向 = entry 方向）· `cut-the-curve`（缓动曲线目录）· `seam-craft`（转场接缝）· `oversized-cursor`（光标驱动）· `captions-overlay`（字幕）· `changelog-video`

### 动效库（2，⭐ 每章动效先查这里）
| 技能 | 库 | 入口 |
|---|---|---|
| `motion-lab` | 160 个 CSS 动效 + 48 整页模板 | 索引在 `.zcode/skills/motion-lab/SKILL.md`（按 basic/text/interact/advanced 分表）→ 源码 `.zcode/skills/motion-lab/references/effects/<id>.md`；离线预览 `engines/motion-lab/motion-lab-showcase.html`；交互实验室 `engines/motion-lab`（npm run dev） |
| `wise-motion` | 101 个 Remotion 动效组件 | `node engines/wise-motion/scripts/match.mjs "需求描述"` 语义检索 → `show.mjs <名称>` 看详情 → `export.mjs <名称> --out-dir <目标>` 导出源码；预览 `engines/wise-motion/catalog/index.html` |

### 引擎与迁移（3）
`hyperframes`（引擎主技能）· `hyperframes-cli` · `remotion-to-hyperframes`（Remotion 工程迁移）

### 视频理解与 QA（16）
技术 QA：`video-qa-frameproof`（空帧/冻结/编码）· 内容 QA：`video-technical-review` · `layout-safety-review`（版式安全区）· `compare-video-runs`（多版本对比）
参考视频拆解：`storyboard-extract` · `storyboard-understand` · `storyboard-ocr` · `storyboard-transitions` · `segment-evidence` · `segment-storyboard` · `video-shots` · `source-media-signals` · `video-artifact-intake` · `review-bundle` · `skill-catalog` · `package-review-prompt`

### B 站流水线（6）
`paper-to-bilibili`（一键编排）· `paper-to-beamer`（SUSTech Beamer 11 节）· `sustech-beamer-theme-fix` · `paper-slides-to-video`（双配音 MP4）· `paper-video-cover`（16:10 封面）· `paper-bilibili-uploader`（biliup 投稿）

### 风格演示库（6）
`video-shot-demos` · `swiss-shot-demos` · `phone-ui-demos` · `win11-ui-demos` · `ui2v-motions`（GSAP 索引）· `hell-grind-aigc-skill`（AI 生图提示词七层架构）

---

## 6. 组件地图 · 引擎检出（`D:\papervideo\engines\`）

| 目录 | 大小 | 是什么 | 关键入口 |
|---|---|---|---|
| `engines\wise-motion\` | 368MB | Wise Motion 引擎：101 个 Remotion 动效源码（`catalog\effects\`）、registry.json（472 条含变体）、素材/字体 | `scripts\match.mjs` / `show.mjs` / `export.mjs`；预览 `catalog\index.html`；`REMOTION.md` 讲 Remotion 集成 |
| `engines\motion-lab\` | 12MB | Motion.Lab：160 CSS/JS 动效（索引数据 `data\effects.ts`）+ 48 模板 + Next.js 交互实验室 | 单文件预览 `motion-lab-showcase.html`；`npm run dev` 起实验室 |
| `engines\lieflat-code-video\` | 411KB | 产品发布片 Remotion Starter（重媒体已裁剪）：`starter\src\kit\` 12 模块（motion.ts / springs.tsx / transitions.tsx / timeline.ts / lens.tsx / type.tsx / surfaces.tsx / motion-blur.tsx / clock.tsx / fonts.ts / props.tsx / index.ts） | `lens\lens-reference.html` 镜头语言参考；`starter\` 可独立 npm install 渲染 |
| `engines\hyperframes\` | 338MB | HyperFrames monorepo（HTML→确定性 MP4）：CLI / Studio / registry / skills | `npx hyperframes --help`；路线 D 渲染底座 |

**动效库匹配流程（每章动效动手前必做，结果登记进 3-figures）**：

1. Remotion 组件动效 → `node engines/wise-motion/scripts/match.mjs "<动作描述>"`；
2. 网页/CSS 动效 → 查 `.zcode/skills/motion-lab/SKILL.md` 索引表 → 读 `references/effects/<id>.md` 拿源码；
3. 命中 → `export.mjs` 导出改造（注意：导出组件 import 路径需改为相对 `src/halftone/`）；
4. 未命中 → 手写，并在登记表标注缺口理由；
5. 风格跨集延续上一版内核（NEON ORBIT），变更需记录。

---

## 7. 组件地图 · remotion-studio（`D:\papervideo\remotion-studio\`）

Remotion 4.0.450/539 + React 19 + three 0.186；1920×1080 @30fps。

```bash
cd D:\papervideo\remotion-studio
npm run studio        # 预览
npm run render-still  # 静帧先行（每镜头 1-2 张先审）
npx remotion render <Comp> out/v.mp4 --concurrency=4
```

### Composition 注册表（`src\Root.tsx`）

| Composition ID | 源文件 | 是哪一集 |
|---|---|---|
| `PaperExplain` / `PaperExplain3D` | `src\scenes.tsx` 等 | 工作台模板（v1） |
| `TransformerExplained` / `TransformerBlueprint` | `src\paper-attention\` | 早期论文版 |
| `SocialAttention` / `SocialAttentionVertical` | `src\halftone\social.tsx` | EP01 社媒切片 51.7s（8 章） |
| `MechLong` / `TransformerHalftone` | `src\halftone\long-mech.tsx` / `mech.tsx` | v8.1 长版 21 章 |
| `Ep02Mha` | `src\halftone\ep02-mha.tsx` | EP02 多头注意力 11min（13 章，brutalist 纯音乐） |
| `Ep03Full` | `src\halftone\ep03-full.tsx` | EP03 全论文讲解 9.93min（21 章，152 句） |
| `Ep04Pe` | `src\halftone\ep04-pe.tsx` | EP04 位置编码 8.2min（12 章，80 句） |

### `src\halftone\`（NEON ORBIT 风格内核，跨集复用）

| 文件 | 职责 |
|---|---|
| `social-core.tsx` | **共享套件**：色板 S / glowText / panel / orb / neonLine / flowDots / 三层视差 starfield / worldTransform |
| `camera.tsx` / `core.tsx` / `scenes.tsx` / `Main.tsx` | 机位系统、通用元件、基础场景 |
| `ep0X-*.generated.ts` | TTS 时间轴自动生成（每句一个 Sequence，音频驱动字幕） |
| `src\wise-motion\` | wise-motion 组件集成副本（`index.jsx` + catalog） |
| `src\wise-motion-claude\` | wise-motion 安装器（install-wise-motion.cjs） |
| `src\ai-paper\` / `src\blueprint\` | v2 / v3 历史版本 |

### 渲染后处理（编码/QA 脚本）

| 脚本 | 位置 | 职责 |
|---|---|---|
| `tts_build_ep04.py`（每集一份） | `output\<run-id>\` | edge-tts 逐句合成（+50% ≈ 6.8 字/秒）+ ffprobe 量时长 + 时间轴 JSON |
| `make_music_ep0X.py` | 同上 | 按章节情绪合成 BGM（float32 防 MemoryError） |
| `encode_final.py` | `pack\` 与 `output\test-attention\9-social\` | 两遍 loudnorm（linear=true + volume=-0.4dB → I≈-16.5/TP≤-1.5）+ libx264 9M/12M GOP60 + faststart |
| Remotion 自带 ffmpeg | `remotion-studio\node_modules\@remotion\compositor-win32-x64-msvc\ffmpeg.exe` | 本机无独立 ffmpeg 时的兜底 |

---

## 8. 组件地图 · 产物（`D:\papervideo\output\`）

| 目录 | 是什么 | 成片位置 |
|---|---|---|
| `output\test-attention\` | 端到端测试主目录 + 成片汇总 | **`attention-ep02-mha.mp4`（451MB）· `attention-ep03-full.mp4`（650MB）· `attention-ep04-pe.mp4`（534MB，491.9s，I=-16.56/TP=-1.77）**；子目录 0-brief~9-social 为 v6→v8.1 历史版本 |
| `output\attention-ep02-mha\` | EP02 运行目录（多头注意力，11min 13 章） | `5-video-final\`（QA/发布计划） |
| `output\attention-ep03-full\` | EP03 运行目录（全论文，9.93min 21 章 152 句） | `4-video\final.mp4` |
| `output\attention-ep04-pe\` | EP04 运行目录（位置编码，8.2min 12 章 80 句，9/9 阶段 passed） | `4-video\final.mp4`（534MB） |
| `output\attention-long-v81\` | v8.1 长版运行目录 | — |
| `output\ep04-pe-v2\` | EP04 备用运行 | — |
| `output\pipe-test-md\` / `pipe-test-video\` | paperpipe 功能测试 | — |

**复盘知识库**（跨集经验沉淀）：
- `output\attention-ep03-full\6-review\retrospective.md` + `lessons.md`（事实核查 3 处错误、语速实测、排版规律、gate 语义）
- `output\attention-ep04-pe\6-review\retrospective.md` + `lessons.md`（动效库匹配首实测、wise-motion 路径、1800 字下限）

---

## 9. 组件地图 · 打包与上游

### 打包器（`D:\papervideo\pack\`）—— 两种发行物，职责分离

| 文件 | 职责 |
|---|---|
| `pack\make-pack.ps1` | 打包脚本 v2（ASCII 消息防 GBK 解析错乱）：**自检1** 本地↔manifest 双向差集 + 每技能 SKILL.md；**自检2** zip 回读（条目/技能数/无排除物）；**自检3** 工作区包在临时目录跑 `python -X utf8 -m paperpipe --help` + `validate --target md` |
| `paper-explain-skills-pack.zip`（根目录） | **技能包** 19.5MB：66 技能 + WORKFLOW.md + design-picker.html；**不含 paperpipe，不承诺执行器** |
| `papervideo-workspace-pack.zip`（根目录） | **工作区包** 19.6MB：paperpipe/（含 registry）+ 66 技能 + 全部文档 + docs/ 基线报告；解压即验证 |
| `pack\paper-explain-skills-pack.json` | 清单（count=66；artifacts 声明两种发行物） |
| `pack\README.md` | 只描述发行物与安装方式（技能包/工作区包分离） |

### 上游缓存与原始 zip

- `.tmp-repos\`：上游仓库缓存（AI_Animation、paper-share-skills、paper-xray、visual-explainer、video-evaluator、knowledge-explainer-skill、Hell-Grind-AIGC-Skill、product-launch-motion、anatomy、taste-skill…）。技能本体已复制进 `.zcode/skills/`，此目录仅补素材用，可删。
- 根目录原始 zip（引擎入库后可归档）：`wise-motion-main.zip`(303MB) · `hyperframes-main.zip`(153MB) · `lieflat-code-video-main.zip`(31MB) · `product-launch-motion-main.zip`(25MB) · `Motion.Lab-main.zip`(10MB) · `Hell-Grind-AIGC-Skill-main.zip`(7MB) · `motion-video-kit-main.zip`(64KB)

### 环境依赖

Node.js 20.10+ · Python（edge-tts、numpy）· Git Bash。MinerU/LaTeX 按需。
网络：直连 raw.githubusercontent.com 不通，补素材用 `https://ghproxy.net/` 镜像前缀。

---

## 10. 技能调用门禁（条件触发 + 可验证证据，全文见 WORKFLOW.md §16 与 registry/contracts.yaml）

**v2 起不再是"P0 全量强制"**：每条规则五字段（触发条件→唯一责任技能→必需产物→验收判据→失败行为），
执行器验证 receipt（`output/<run>/receipts/`）——"brief 里提过技能名"不算调用。
**二选一组**（未选中写 route-decision 即可）：图解主技能 flowchart vs visual-explainer（按内容形态）；
动效库 motion-lab vs wise-motion（按运行时 HTML/CSS vs Remotion）。

| paperpipe 阶段 | 触发 → 技能（摘录） |
|---|---|
| intake | 有视频目标 → `design-intake`（默认假设路径由执行器落 receipt） |
| brief | 任何视觉生成 → `prompt-forge` |
| acquire | arXiv 输入 → `paper-download-arxiv-paper-source`；本地 PDF 需结构化 → `pdf-to-markdown` |
| xray | 需要论文事实 → `paper-xray`（子智能体 researcher / fact_checker 可并行） |
| figures | 图解主技能组**二选一**；制作动效前 → `motion-doctrine`（必读）；视觉生成 → `design-taste-frontend`；动效库**按运行时二选一**；**具象例子 → `threejs-visual-example`（3D 建模，禁纯表格）** |
| render | 旁白未 TTS → `humanize-writing`；route 决定 `remotion-video` / `knowledge-explainer-skill`；自定义缓动 → `cut-the-curve`；有字幕 → `captions-overlay` |
| qa | 渲染完成 → `video-qa-frameproof`（机器层执行器内置）+ `video-technical-review` + `layout-safety-review`；**布局审计 error=0（零遮挡硬门槛）** |
| retrospective | 交付后 → `video-retrospective`（六维 ≥8+证据+receipt 才能过 review --confirm） |
| publish | 发布 → `paper-video-cover`（封面缺失不进真实上传）；真实上传 → `paper-bilibili-uploader`（回执 exit=0 才 uploaded） |

---

## 11. 质量门槛速查（不满足不算交付）

**旁白**：逐句合成、Audio=字幕同 Sequence；单主题 ≥1800 字（~80 句）；语速改动必须先测样句（+50% ≈ 6.8 字/秒舒适）；先过 `humanize-writing`。
**画面**：文字区/舞台/字幕带三区隔离；章内大标题 x≥250（防左缘机位裁切）；punch 收敛 s≤1.08；每章 ≥35% 面积主视觉。
**运镜**：motion-doctrine 向量法则（exit 方向 = entry 方向，同轴同速，切在运动中）。
**编码**（发布级，全部成片必跑）：

```bash
FF=remotion-studio/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe
$FF -i raw.mp4 -c:v libx264 -preset slow -profile:v high \
  -b:v 9M -maxrate 12M -bufsize 15M -g 60 -keyint_min 30 \
  -pix_fmt yuv420p -color_range tv -colorspace bt709 \
  -color_primaries bt709 -color_trc bt709 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart final.mp4
```

**QA**：`video-qa-frameproof`（技术）→ `video-technical-review` + `layout-safety-review`（内容/版式）→ 抽帧人工（首帧/转场/最密/末帧）。
**发布**：封面 16:10 必做（`paper-video-cover`）；B 站先 `--dry-run`。
**复盘**：6 维打分每项 ≥8 且带证据；≥1 条规则写回技能。

更多故障排查（404 bgm / 字幕不同步 / 热力图发白 / 曲线悬空 / TTS 限流 / 偏色）见 WORKFLOW.md §11。

---

## 12. 演进史（版本与教训索引）

| 版本 | 内容 | 关键教训（→ 写回处） |
|---|---|---|
| v6-v8.1 | 迭代长版，mech 风格成型 | 缓动凭感觉 → 必读 motion-doctrine |
| EP01 social | 51.7s 社媒切片，8 章 | 三轮审计循环建立 |
| EP02 | 11min brutalist 纯音乐 | 冻结帧/遮挡靠人工才查出 → P0 QA 矩阵 |
| EP03 | 9.93min 全论文 21 章 152 句 | 子智能体事实核查抓 3 处错误；语速实测校准；gate≠failed |
| EP04 | 8.2min 位置编码 12 章 | 动效库匹配规则首实测（12/12 章登记）；wise-motion 实装 2 组件 |
| paperpipe v1.0→v1.1 | 自然语言约定 → 状态机 | 指纹缓存/QA 硬校验/路径安全/发布三态/人审哈希绑定 |
| 技能 30→63→64→66 | +motion-lab / wise-motion / lieflat-code-video | 每步查动效库写入 WORKFLOW §3 |

Git 提交线（`git log --oneline`）：`c9d838f` paperpipe v1.1 → `79583e0` EP03+修复 → `687e863` 审计+§16 矩阵 → `9827a68` EP04 → `d25c36b` 注册 lieflat-code-video。

---

## 13. 一页速查（新项目从这开始）

```bash
cd D:\papervideo
python -m paperpipe init <arxiv-id> --target video   # ① 建目录
python -m paperpipe run --auto                        # ② 跑到人审门（agent 按阶段调技能）
python -m paperpipe resume                            # ③ 断点续跑
python -m paperpipe review --confirm                  # ④ 人审
python -m paperpipe publish --dry-run                 # ⑤ 发布计划

# 渲染调试（remotion-studio 内）
cd remotion-studio
npx remotion still Ep04Pe out/f.png --frame=3600      # 静帧先行
npx remotion render Ep04Pe out/v.mp4 --concurrency=4

# 动效检索
node engines/wise-motion/scripts/match.mjs "两排卡片反向持续滚动"
# CSS 动效 → .zcode/skills/motion-lab/SKILL.md 索引
```

**说"帮我讲这篇论文 / 做成讲解视频"给 agent，即自动触发以上全流程。**
