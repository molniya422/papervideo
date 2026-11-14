# PaperVideo 打包说明（两种发行物，职责分离）

本目录产出**两种发行物**，各自承诺不同，不要混用：

## 1. 技能包 `paper-explain-skills-pack.zip`（装技能，不含执行器）

内容：`skills/`（66 个技能）+ `WORKFLOW.md`（流程总纲）+ `design-picker.html`（风格选择器）+ `paper-explain-skills-pack.json`（清单）+ `INSTALL.md`（本说明副本）。

**不含 `paperpipe/`，不承诺可以直接运行执行器。** 装完即用技能方法论；
要跑状态机请改用工作区包。

安装（三选一）：

```bash
# 全局（推荐）
Expand-Archive paper-explain-skills-pack.zip -DestinationPath .
xcopy /E /I skills "%USERPROFILE%\.zcode\skills"

# 项目级：把 skills/ 放到 <project>/.zcode/skills/ 或 .agents/skills/

# 按需挑选：打开 paper-explain-skills-pack.json，只复制需要的技能目录
```

依赖（技能方法论的运行前提，按需自备）：Node.js 20.10+ / Remotion 工程 /
edge-tts / ffmpeg / MinerU（可选，需 GPU）。工作区包之外没有 Remotion 工作台和引擎检出
（engines/ 不随包分发，按 WORKFLOW-MAP.md 的上游 zip 自行检出）。

## 2. 工作区包 `papervideo-workspace-pack.zip`（技能 + 执行器 + 文档）

内容：`paperpipe/`（Python ≥3.10，零第三方依赖）+ `skills/` + `WORKFLOW.md` +
`WORKFLOW-MAP.md`（组件地图）+ `AGENTS.md` + `README.md` + `docs/`（基线报告）+ 清单。

在工作区根（即 paperpipe 的上级目录）执行：

```bash
python -X utf8 -m paperpipe --help          # 自检（-X utf8 防 GBK 控制台 ✓/✗ 问题，v2 测试输出已全 ASCII）
python -X utf8 -m paperpipe validate --target md
python -X utf8 -m paperpipe init <arXiv-ID> --run-id my-run --target video
python -X utf8 -m paperpipe run --auto
python -X utf8 -m paperpipe resume / status --json / validate
python -X utf8 -m paperpipe review --confirm       # 人审门
python -X utf8 -m paperpipe publish --dry-run | --confirm <run_id>   # 双门
```

注意：validate 的 video 目标要求 `remotion-studio/`（包内不含，需按 WORKFLOW-MAP.md §7 自建）；
技能 receipt（`output/<run>/receipts/`）由编排 agent 调用技能后生成，执行器只验证。

## 打包脚本自检（make-pack.ps1 v2）

1. 本地 ↔ manifest **双向差集**；每个技能有 SKILL.md；manifest.count 一致（66）；
2. 排除 `__pycache__/ *.pyc / node_modules / *.mp4 / *.pdf / *.wav`；
3. **zip 回读**：条目齐全、技能数一致、无排除物；
4. 工作区包在临时目录解压后跑 `python -X utf8 -m paperpipe --help` 与 `validate --target md`。

## 清单

- **66 个技能**（paperpipe/registry/skills.yaml 为技能注册表的唯一事实源，本 manifest 与其双向校验）
- 路由表/阶段合同/子智能体角色：`paperpipe/registry/{routes,contracts,agents}.yaml`（工作区包）
- 文档职责：`WORKFLOW.md` 流程权威 · `WORKFLOW-MAP.md` 组件地图 · `AGENTS.md` 入口规则 · 本文件只描述发行物
