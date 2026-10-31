# PaperVideo 论文讲解技能包（PaperVideo Skills Pack）

把本工作区这套论文讲解技能套件打成 zip，供其他项目复用。

## 安装方式

### 方式 A：全局安装（推荐，所有项目可用）

解压后把技能目录复制到用户全局技能目录：

```bash
# Windows / PowerShell
Expand-Archive paper-explain-skills-pack.zip -DestinationPath .
xcopy /E /I skills "%USERPROFILE%\.zcode\skills"

# macOS / Linux
unzip paper-explain-skills-pack.zip
cp -r skills/* ~/.zcode/skills/
```

之后任意项目/目录中启动 ZCode，技能即被发现。

### 方式 B：项目级安装

把 `skills/` 放到某个项目的 `.zcode/skills/` 或 `.agents/skills/` 下，只在该项目生效。

### 方式 C：按需挑选

打开 `paper-explain-skills-pack.json`（清单文件），只复制 jobs 需要的技能目录到目标技能目录。

## 使用

安装后在 ZCode 中说：

- 「讲这篇论文 https://arxiv.org/abs/1706.03762」
- 「把这个论文做成中文讲解视频，六分钟」
- 「画个图讲清这个 Transformer 机制」

通常会进入 `paper-explain` 总编排流程（0 设计访谈 → 0.5 提示词锻造 → 1 获取 → 2 深度解读 → 3 图解 → 4 成片 → 5 发布 → 6 复盘）。

## 依赖

### npm / Node 依赖

- Remotion 工作流（`remotion-video` / `knowledge-explainer-skill`）需要独立的 Remotion 工程；包内不含 node_modules。
- HyperFrames 引擎（`hyperframes` 技能）源码在单独的 `engines/hyperframes` 代码库，需在使用前克隆或 npm install。

### 外部工具

- `edge-tts`（旁白合成）
- `ffprobe` / `ffmpeg`（检测与编码；Remotion 自带二进制也可）
- PDF 转 Markdown 的 MinerU（可选）

## 执行器（paperpipe）在其他机器运行

包内含 `paperpipe/` Python 包（≥3.10，无第三方依赖）。在**工作区根**（即 paperpipe 的上级目录）执行：

```bash
python -m paperpipe validate
python -m paperpipe init <arXiv-ID> --run-id my-run
python -m paperpipe run --auto
```

若不在根目录，设 `PYTHONPATH` 指向解压目录：`set PYTHONPATH=解压目录`（Windows）或
`export PYTHONPATH=解压目录`（macOS/Linux）。Remotion 渲染还需 `remotion-studio/`（npm install）。

## 清单

- 64 个技能定义（SKILL.md + 可能的 scripts / references / templates / assets）
- `WORKFLOW.md`：完整阶段/产物/门槛/故障排查文档
- `design-picker.html`：风格可视化选择器

## paperpipe 执行器（v1.0 起）

包内含 `paperpipe/` Python 包——统一执行器，把 64 个技能串成可执行 DAG：

```bash
python -m paperpipe init 1706.03762 --target video
python -m paperpipe run --auto        # 自动跑到 upload_ready（人审门除外）
python -m paperpipe resume / status --json / validate
python -m paperpipe review --confirm  # 人审门
python -m paperpipe publish --dry-run | --confirm <run_id>
```

自动：design-intake/brief 生成、arXiv 获取、TTS、渲染、编码、QA、缓存、续跑。
人审门（不可自动通过）：xray 深读、图解文案、视觉叙事/听审、事实确认、retrospective、真实上传。
