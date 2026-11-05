---
name: paper-video
description: |
  一条指令跑完「论文 → 讲解视频」全流程：参数解析 → 设计合同 → prompt-forge brief →
  paperpipe 9 阶段 DAG（acquire/xray/figures/render/qa/retrospective/publish）→
  14 角色子智能体派发环（handoff 信封）→ 三张风格帧小样门 → 渲染前人工预览（分类修改意见）→
  出成片 → 三验收分离 QA → 复盘 → 交付。
  路由表/阶段合同/技能注册表/子智能体角色的唯一事实源在 paperpipe/registry/*.yaml，
  本指令按注册表执行，不发明流程、不假装调用技能（一切以 receipt 为证）。
  当用户说"做成视频 / 重做 / 重构视频 / 一键出片 / 跑全流程 / 把这篇论文做成视频"时使用。
argument-hint: "<PDF | arXiv ID/链接 | 论文目录> [design.json 或内联设计 JSON] [--target video|md|figures|publish] [--run-id ID] [--route hyperframes|remotion] [--audience 组会|公众|技术]"
user-invocable: true
version: 2.0.0
---

# /paper-video —— 论文→讲解视频 一键全流程指令

这是**可执行指令**，不是说明文档：按 PHASE A→I 顺序推进，每个 PHASE 有
「命令 → 通过判据 → 失败动作」。全程在 `D:\papervideo` 工作区根执行。
目标不明确、只是"讲讲这篇论文"的对话 → 改走 `paper-explain` 路由器；本指令默认 target=video。

**导演权（2026-11-03 起）**：主编排 agent（你）是全片最终画面负责人——
叙事取舍、镜头好坏、风格一致性由你裁定；子智能体各有明确分工但**没人对自己输出的观感负责**。
你拥有退回权（重派）、删改权（砍镜头/砍章）、样片否决权；独立评审意见（technical_qa/visual_qa/
用户）带时间码提出问题，由你决定修订并交回原作者。visual_planner 的 pacing 裁定
（shot_plan.json 的 flagged/cut/return）是你的裁定输入，不是自动执行。

## 0. 参数解析（PHASE A，最先做，缺什么向用户要什么）

| 参数 | 规则 |
|---|---|
| 论文源 | PDF 路径 / arXiv ID 或链接 / 本地目录（已解包 TeX）→ 原样传给 `paperpipe init` |
| design.json | 第 2 个位置参数。三种形态都收：① design-picker.html 导出的 JSON 文件；② 用户消息里内联的 `{...}` 设计 JSON；③ 缺省 → 走 PHASE B 访谈 |
| --target | 默认 `video`；用户明确要"发布/上传"才用 `publish`；只要笔记/图解用 `md`/`figures` |
| --run-id | 缺省 = 论文短名（如 `yolo`）。**返工铁律：绝不改旧 run**，重做开新版本 `yolo-v2`/`yolo-v3`（问用户拿上次版本号 +1，或查 `output/` 里最大号） |
| --route | 默认 `hyperframes`（HTML→确定性 MP4，本工作台主力）；Remotion 定制才用 `remotion` |

```bash
python -m paperpipe init <论文源> --run-id <id> --target <target>
```

## 1. PHASE B 设计合同（有 design.json 就不访谈）

1. **给了 design.json** → 把它落成 `0-brief/design-intake.md`（含"风格内核"一句话小节 +
   逐维度选择表），并把 `design:` 块合并进 `output/<run-id>/paperpipe.yaml`。
2. **没给且用户在线** → 按 `design-intake` 技能两轮 AskUserQuestion（风格/主色/动效/声音/时长/画幅/受众）。
3. **没给且用户不在线** → 按默认值落盘，每一项标注"默认假设"。
4. 用户引用过 `design-picker.html` 编号（cap_ids）→ 原样保留编号写入。

判据：`0-brief/design-intake.md` 存在且含"风格内核"。`python -m paperpipe run --stage intake` 过门。

## 2. PHASE C 合同锻造（无 brief 不写代码）

按 `prompt-forge` 技能产出 `0-brief/brief.md`：三套方案 + XML brief + 禁止清单（可判项，
禁"不要 low"）+ 8 分制验收 + motion-doctrine 读后摘要（Vector Law 等落点）。
`python -m paperpipe run --stage brief`。三方案取舍默认可自选，但须在文内标注。

## 3. PHASE D 获取 + 深读（子智能体派发环第一次启动）

```bash
python -m paperpipe run --stage acquire     # arXiv 拉源码 / PDF 结构化
python -m paperpipe run --stage xray        # 创建 researcher + fact_checker 信封（幂等）
python -m paperpipe agents --stage xray     # 看波次：两者并行
```

按下文 §5 派发环执行两个角色 → 各自 `handoff finish` → 重跑 `run --stage xray` 过机器门。
fact_checker 发现的数字错误必须回写 deep-read.md 后才算 passed。

## 4. PHASE E 图解规格（6 步子智能体链 + 三张风格帧小样门）

```bash
python -m paperpipe run --stage figures     # 创建 6 个信封（幂等）
python -m paperpipe agents --stage figures  # 波次：wave1 三人并行 → wave2 → wave3 两人并行
```

| 波次 | 角色 | 产物 |
|---|---|---|
| wave1（并行） | example_writer / data_viz_builder / style_director | examples_spec.json / dataviz_spec.json / style_refs.json |
| wave2（串行） | spec_enricher | enriched_spec.json（相机 cue/布点/检测框/字幕节拍/特效落章） |
| wave3（并行） | model_builder / visual_planner | 场景代码 + model_manifest.json / **shot_plan.json（镜头规划+pacing 裁定）** |

**三张风格帧小样门（批量生成前，导演过审）**：wave3 开跑前，先让 model_builder 用真实渲染器产
`3-figures/style_frames/{entity,mechanism,data}.png` 三帧（实体演示/机制推导/数据比较），
验证造型方向、主背景分离、接触阴影、标签可读性、数值→几何映射——**你过审才许批量铺章**，
不通过就换方向重做（最多两轮，仍不行报告用户具体阻碍）。

**导演裁定**：visual_planner 的 `shot_plan.json` 会标出拖沓/信息量不足的段（flagged/cut/return）——
逐条裁定：采纳 → 退回 spec_enricher 改时长或 example_writer 补例子；否决 → 写明理由登记 route-decision。

**硬门（P0）**：具象对象例子必须 3D 建模（three.js lib3d / Blender），纯表格读数 = 0；
抽象数学例走 route-decision 豁免。相机运镜与粒子**无数量配额**——每个动作过三问
（观众现在需要看什么？说明什么？为何必须动？），答不上就保持稳定。

## 5. 子智能体派发环（PHASE D/E/F 通用的核心循环）

```bash
python -m paperpipe run --stage <s>            # ① 生成信封（幂等，已存在跳过）
python -m paperpipe agents --stage <s>         # ② 波次/状态/卡点（exit 2 = 还有未完成）
python -m paperpipe handoff show <hid>         # ③ 读任务：task + system_prompt 全文 + 输入清单
# ④ 用 Agent 工具派发（见下方模板）；同波次角色在【同一条消息】里并行派发
python -m paperpipe handoff finish <hid> --output 3-figures/xxx.json --response-file resp.json
#                                               ⑤ 回传+核验一条命令闭环（哈希校验 + agent receipt）
python -m paperpipe run --stage <s>            # ⑥ 全部 passed → 重跑过机器门
```

**Agent 派发模板**（subagent_type: general-purpose，一次一角色）：

```
[系统提示词] ← handoff show 里 request.json.system_prompt 全文原样贴入
[任务] request.json.task
[工作目录] <run 目录绝对路径>（输入/输出都相对它）
[输入] input-manifest.json 列出的文件（先读后写）
[输出] 严格写到 output_requirement.output 指定路径，不碰别人的文件
[回执] 完成后列出产出路径 + 一段 JSON 结论（由编排方写 resp.json 转交 handoff finish）
```

纪律：整合/状态写入/发布必须串行；禁两个 agent 同写一个文件；子智能体只回传结构化结论，
**不得把自然语言"我做完了"当通过**——以 `handoff finish` 的哈希核验为准。

## 6. PHASE F 预览审核（人工门——成片渲染前必过）

aggregator 组装完 compositions 后、渲成片前，用户必须预览并提分类修改意见：

```bash
python -m paperpipe preview                  # 生成 4-video/preview/ 预览包
#   → 浏览器打开 preview/index.html 给用户：逐章 iframe 播放 + 分镜表 + 文稿
# 用户口头反馈 → 你翻译成分类意见（十类：script/camera/transition/model/motion/
#   layout/pacing/audio/dataviz/caption），一条一条登记：
python -m paperpipe revise add --category camera --chapter 5 --severity minor \
    --wanted "环绕停 2s 再转"
python -m paperpipe revise list --status open
# 修复：minor → 你直接改产物；major → 重派责任角色（回 §5 派发环）；
#      改完用 preview --chapters 5 重新生成该章让用户复查
python -m paperpipe revise resolve R003 --note "改了相机 cue"
python -m paperpipe preview --confirm --by 用户   # 全部 resolved → 过审凭据
```

- **RenderAdapter 强制此门**：hyperframes 路线未过审（或仍有 open 意见）→ `waiting_for_human` 不渲染；
- 批量铺开前已过风格帧小样门，此处主要拦截：节奏拖沓、运镜无目的、标签遮挡、文稿别扭；
- 用户不在场时可先 `--confirm --by 导演+用户缺席默认` 继续跑，但交付前必须补真人预览。

## 7. PHASE G 渲染（确定性渲染 → 母带 → remux）

```bash
python -m paperpipe run --stage render        # aggregator 信封 → 组装 compositions + narration.json + captions
```

aggregator passed 后（route=hyperframes）：

```bash
cd output/<run-id>/4-video/hf
npx hyperframes check --json                  # 六门（脚本错/字体/WebGL/截图/时序/布局）——全绿才许渲染
npx hyperframes render --browser-timeout 180 -o ../../4-video/render-raw.mp4
```

音频后处理（**full ffmpeg 在 `tools/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe`**，
Remotion 自带的缺 f32le muxer，不要用）：

```bash
FF=../../../../../tools/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe
$FF -i render-raw.mp4 -vn -af "loudnorm=I=-14.3:TP=-3.7:LRA=11" -ar 48000 4-video/audio_master.wav
$FF -y -i 4-video/render-raw.mp4 -i 4-video/audio_master.wav -map 0:v:0 -map 1:a:0 \
    -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart 5-video-final/final.mp4
```

**确定性铁律**：动画全是 f(t) 纯函数；禁随机数/自走时钟；22 章以上必须用 lib3d 共享
WebGLRenderer（上下文 ≤16 的教训）；字幕由逐句音频驱动，禁按权重切分。

## 8. PHASE H 质检（三验收分离；零遮挡是硬门）

```bash
npx hyperframes check --json                  # 把含 layout 段的报告落 5-video-final/layout_audit.json
python -m paperpipe run --stage qa
```

- **技术验收**（执行器真实执行）：流/规格/faststart/响度 + 布局审计（`content_overlap`/
  `container_overflow` **error=0** 才放行）+ 黑帧 blackdetect + 冻结帧 freezedetect——
  任一不达标 → failed_permanent（布局 error 曾被静默放行，已修，2026-11-03）；
- **内容验收**：逐组件核对数值→几何映射与轴刻度同基准（ch18 教训：75 的柱在 0-80 轴上
  = 75/80 × 轴高），核对报告落盘后签 `content-mapping-review` receipt——缺失 → waiting_for_agent；
- **观看验收**：你以观众身份带时间码提问题清单（构图/可读性/节奏/解释效果），创作 agent 不自评；
- 响度在 audio_master.wav 上测（AAC 编码后测会虚高）；
- 失败修复后回到 PHASE F/G 重渲（指纹缓存只重跑受影响部分）。

## 9. PHASE I 复盘 → 人审 → 交付

```bash
python -m paperpipe run --stage retrospective   # 六维评分+证据 → 6-review/retrospective.md + lessons.md
python -m paperpipe review --confirm            # 人审门：用户看过成片并验收后才执行
python -m paperpipe publish --dry-run           # 默认只出计划；--confirm 仅在用户明确要求上传时
```

- 复盘 ≥1 条硬规则写回对应技能（没复盘不算交付）；
- 交付 = 复制 `5-video-final/final.mp4` 到用户指定位置（如 `output/test-attention/`）；
- `publish --confirm` 是第二道人工门，没有用户明确指令绝不执行。

## 10. 中断与断点续跑（任何一步挂了都这么办）

```bash
python -m paperpipe status --json   # 看停在哪、为什么
python -m paperpipe resume          # 按输入指纹决定重跑范围（不清零失败历史）
python -m paperpipe retry <stage>   # 显式重试单个失败阶段
```

`waiting_for_agent` = 派发环没跑完 → 回 §5；`waiting_for_human` = 人审门 → 报告用户等决定；
`failed_permanent` = 内容/配置问题 → 修源再 resume。**会话被打断后恢复时：先 status，再 resume，不重开 run。**

## 11. 全程铁律（违者该 PHASE 判失败）

1. 顺序执行 A→I，不跳阶段；每阶段完成向用户报一行：`[PHASE n/9 ✅] 阶段 → 关键产物（下一动作）`。
2. 无 brief 不写一行动画代码；无 design-intake.md 不建视觉；**渲染前预览门必过**（preview --confirm）。
3. 具象例子必须 3D（three.js lib3d / Blender），纯表格 = 0；数据组件用 bars3d/gauge3d/heatColumns。
4. 布局审计 error=0；关键标签走 labels2d 屏幕标注层（可被 DOM 审计看见），零遮挡指**观众看到的画面**。
5. 确定性：f(t) 纯函数、固定种子、固定相机路径、30fps。
6. 相机/粒子无配额：每个动作过三问，无目的不动；数据映射与轴刻度同基准（内容验收 receipt）。
7. 每次技能/子智能体调用落 receipt；paperpipe 只认 receipt，不认"文档里写过"；
   意见 resolved 只认 `revise resolve`，不认"我说改好了"。
8. 绝不改旧 run：返工开 `-vN` 新 run，旧产物是对照基线。
9. 用户未验收不自称完成；没有 `6-review/retrospective.md` 不算交付；
   复盘低分合法但必须附整改决定，不允许无证据的高分。
10. 事实错误（数字/公式）必须修在 deep-read.md 源头，不许只在旁白里改口。
11. 你是导演：画面好坏最终由你负责——不好看的镜头退回，讲不清的段落删改，不等 QA 才发现。
12. 全流程只有 `paperpipe/registry/*.yaml` 是流程事实源——本指令与它冲突时，以注册表为准。

## 12. 与 paper-explain 的关系

`paper-explain` = 交互式路由器（目标不明时对话分流）；本指令 = 定制视频全流程的**直通车道**
（默认 route=hyperframes + 14 角子智能体链 + 零遮挡/3D 硬门）。两者共用同一个执行器与注册表。
