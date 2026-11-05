# 工作流全方位体检报告（2026-11-05）

> 方法：4 路并行深查（3D 资产与视觉代码 / 旁白-音频-渲染链路 / 提示词与技能 / 执行器门禁），
> 全部证据导向（file:line 或实测数据），主线对关键指控做了复核（证伪 1 条假阳性）。
> 共 **65 项发现**：P0 ×11 · P1 ×29 · P2 ×25。建模精度问题只是其中一个实例——
> 审计证明它是**一类病**：声明与执行两张皮。

---

## 一、P0 清单（11 项，直接产出错误成片或链路断裂）

### A. 数据/事实链断裂

| # | 问题 | 证据 | 后果 |
|---|---|---|---|
| A1 | **fact_checker 的修正结论无任何消费方** | fact_checker.md:25 "供整合方采纳"——"整合方"在 9 个提示词+agents.yaml 中无定义；example_writer/data_viz_builder 输入清单不含 corrections；且 fact_checker 与 example_writer **并行**（agents.yaml:28） | 核对出的错误数字原样进规格成片——核对白做 |
| A2 | **model_builder 提示词教它读裸规格，绕过 spec_enricher** | model_builder.md:9-11 输入=examples_spec+dataviz_spec；:134-152 两节解读全是裸规格字段；enriched_spec 的相机路径表/布点/narration_cues 在提示词中**无对应字段** | 熔炼层被架空：同一章两套相机布点方案，任何"对照规格验收"失去基准——**建模精度漏检的管道根源** |
| A3 | **style_refs.json 到不了 spec_enricher** | spec_enricher.md:10-12 输入清单无 style_refs/design-intake；contracts figures outputs 也不含 style_refs | 341 风格库选型成果不落地，各章风格漂移 |
| A4 | **字幕时间轴三套来源互相矛盾，audio 恒 null** | example_writer 产 narration_seconds、spec_enricher 产 narration_cues 拍点、aggregator.md:42 说"字幕文本来自 examples_spec"但输入清单无 enriched_spec；aggregator.md:36 硬编码 audio(null) | captions-overlay 铁律"字幕由逐句音频驱动"被自己的生产提示词违反 |
| A5 | **narration_editor / technical_qa / visual_qa 注册了角色但没有提示词** | agents.yaml:78-84 定义，prompts/ 目录只有 9 个文件；humanize-writing 六条硬规则无人承接 | 去 AI 味规则躺平，QA 角色退化为主 agent 自由发挥 |

### B. 渲染与资产

| # | 问题 | 证据 | 后果 |
|---|---|---|---|
| B1 | **labelLayer/frameCheck 库能力全片零调用** | grep 22 章无命中；safeTop=96 与真实标题带 268px 不符 | 零遮挡标注层是死代码，3D 标签裸奔 |
| B2 | **gauge3d 指针与刻度错位 90°** | lib3d.js:553-557 指针初始向下（rotation.z=π），刻度全在上半圆（:550,561-567）；ch02/08/19 各自手猜角度 | 三章仪表全部指针在下、刻度在上 |
| B3 | **textSprite"自适应宽度"是死代码** | lib3d.js:498-500 连写三次 scale.set 互相覆盖；调用点再硬编码覆盖（ch14:224 拉宽 33%） | 全部 3D 文字比例靠手调漂移 |
| B4 | **ch00 开场相机在车身体内** | ch00.html:199-201 初始 r=2.4 落在 car_b 包围盒内，iris 只遮 0.62s 而运镜 0.2s 才起步 | 开场 0-0.6s 露内壁碎片 |
| B5 | **共享渲染器无 tone mapping** | lib3d.js:10-16 只设 antialias/alpha；emissive 1.4-1.7 直达 | 12+ 章高光死白、压缩 banding |

### C. 执行器

| # | 问题 | 证据 | 后果 |
|---|---|---|---|
| C1 | **figures machine_gate 后半句零实现** | contracts.yaml:180 声明"shot_plan.json 存在且 flagged 有裁定"；grep shot_plan 全库 *.py 零命中；FiguresAdapter 无 check() 覆盖 | 镜头规划/pacing 裁定整层缺失直达渲染 |
| C2 | **render 指纹默认不覆盖任何合成源码** | init 模板 `sources: []`（cli.py:79）；改 lib3d.js/章节/字体/音频 → resume 报 cached | 旧视觉静默直达成片 |
| C3 | **publish --confirm 缓存空转** | publish 指纹切片取自配置文件（runner.py:42-43），confirm 改的是 state → 指纹不变 → cache_hit → PublishAdapter.run 不执行 | 确认后**上传命令从未运行**却报 passed |
| C4 | **渲染预览门无防伪** | preview.py:216-221 只查文件存在；confirm 后 revise add 不回拦；generate 不清旧 confirmed；handoff finish 默认回传 {"verdict":"pass"}（cli.py:333-334） | 人工门=可手写的普通 JSON |

---

## 二、P1 摘选（29 项，按域归组）

**视觉/资产（12 项）**：bars3d 标签宽度手调与 pitch 互叠（ch05/ch18）；ch12 三层 lossSurface 隐身叠放；ch06 instanceColor 被均匀 emissive 冲淡；除 car 外全部模型无 castShadow（人/狗/树悬浮）；粒子下探到地面以下；**22 章整文件复制 ≈160 行 CSS+JS 样板**（fov 40/50/42 漂移、flyArc 22 份只 1 处调用）；四层注意力竞争最重 ch06/21/18（巨字+面板+3D 标签同屏+双层辉光糊边）；halftone 14px 点阵接近编码 Nyquist；魔法数字无出处（13 章置信度/收尾机位）；22 个 scene 无 dispose；雾程 30-72 全片够不到=死设置；captions 与 3D 标签无避让。

**文稿/音频（7 项）**：**BGM 0dBFS 硬切无淡出**（末 2s RMS 高 21dB，成片最后一声爆切）；**四款设计字体渲染机不存在静默降级**（Archivo Black/Outfit/Space Mono→Arial；JetBrains Mono 靠 Google Fonts 网络缓存）；SFX=node-only 零落地（22 次转场全静音）；encode/qa 链断头（v5 无 audio_master/final，qa.expect 无音频断言）；k21 结论章节奏塌陷（覆盖率 50%、7s 句隙，凑 608s 所致）；字幕与章内面板双源冗余（同屏读两遍）；sources 白名单漏 three.scene.stub.js。

**提示词/技能（7 项 doctrine 冲突）**：data_viz_builder"按最大值归一"vs QA"按轴满量程"（ch18 教训被自己的生产端再犯）；技能"至少环绕一次"vs 提示词"禁止数量下限"；技能废除字幕 keep-out vs 提示词强制 y≥940；技能授权 BoxGeometry 低多边形 vs 提示词禁裸 Box；aggregator 硬编码 22 章+NEON 色板；motion-doctrine 禁 drift vs spec_enricher 用 drift_points；visual_planner 的 retime/cut 裁定无回流管线。

**执行器（5 项）**：xray"非骨架"=单句 grep + handoff 可空 JSON 过（finish 默认 verdict:pass）；narration.json 零 schema 校验（`{"shots":[]}` 全链通过）；QA 缺音画时长差/容器偏移/码率/帧数一致四项；receipt 无防伪（evidence 自由文本、input_hashes 落盘后从不重验）；Figures/Qa/Retro/Publish 四适配器无 check()（passed 后删产物/换报告仍 passed）。

---

## 三、假阳性（已证伪）

- ~~ch14 模板 div 结构损坏~~：程序化验证 div 平衡（depth=0），与 ch00/ch10 同构。**驳回**。
- ~~figures 门只查 3/6 角色~~：contracts 文本确实写 3 个，但代码 `stage_handoffs_passed` 实际检查全部 6 角色——属**声明文本陈旧**，降级为 P2 文档修正。

---

## 四、系统性根因（六条）

1. **声明与执行两张皮**：contracts 的 acceptance 是给人读的散文，没有一条被结构化为机器谓词；九个阶段的实现深度统一停在"文件存在/子串出现"。事故驱动加 grep 的修复模式，每修一处同类盲区换个字段复现。
2. **合同演进了、提示词没跟上**：enriched_spec/shot_plan/精度四项/blender 这些演进只改了 registry，9 个提示词停留在旧管线（model_builder 读裸规格、aggregator 硬编码 22 章）——没有"改 contract 必须同步 system_prompt"的机制。
3. **并行编排压倒了数据依赖**：fact_checker 与 example_writer 并行、style_refs 不进 enricher 输入、shot_plan 无回流——流程图画得出、数据流接不上。
4. **技能与提示词互相矛盾**：三处 doctrine 正面冲突（环绕下限/字幕 keep-out/BoxGeometry），加载技能与只读提示词的 agent 产出相反。
5. **passed 是一次性事件不是持续属性**：缓存路径不复验（check() 空转）、指纹缺默认兜底、人工门凭证是可手写 JSON——执行器既是门卫又是唯一被约束的进程。
6. **库有能力、用法两张皮**：labelLayer/frameCheck/自适应 textSprite 全是死代码，渲染基础设施（tone mapping/雾/阴影）按单章感觉配置——成片缺陷集中出现在"库提供了正确做法但生成端不知道/不使用"的地方。**建模精度只是这一条的实例。**

---

## 五、修复计划（四批，按依赖排序）

### Batch 1 · 管道正确性（断链归一）——先做，其他批的前提
1. fact_checker→修订回路：fact_checker 核对**定稿快照**（hash 记入 response），corrections 由整合方（aggregator 前置步骤）回写 deep-read.md，修订版 hash 必须晚于 response——机器可验
2. model_builder 输入契约统一：提示词输入清单改为**只含 enriched_spec.json**，解读章节重写为 enriched_spec 字段；相机 tween 终值与 camera_path 逐条一致（脚本 diff 进资产门）
3. style_refs/design-intake 进 spec_enricher 输入清单；enriched_spec 每章必含 style_ref 且可在 catalog 命中（机器谓词）
4. 补 narration_editor / technical_qa / visual_qa 三个提示词（humanize-writing 六条规则进 narration_editor 可判定清单）
5. 字幕时间轴单一事实源：narration.json 的 start/seconds 唯一来自 spec_enricher 拍点表（TTS 后由音频实测回填），example_writer 只产文本；删除三源并存
6. data_viz_builder 归一化规则改为"原始值+axis_max 双字段"，与 QA 内容验收同向
7. 清除三处 doctrine 冲突：环绕下限删除（以相机三问为准）、字幕带条款统一（关键小字避让底部 80px）、BoxGeometry 条款标 v1 废弃
8. aggregator 去硬编码（章数/色板从 brief 读）；提示词加"坏例对照"小节（从本项目教训取材）；lessons.md 进 researcher/model_builder 输入

### Batch 2 · 机器门硬化（形式通过清零）
1. **contracts 谓词化**：JSON 产物声明 jsonschema（narration/examples_spec/dataviz/enriched/shot_plan/model_manifest），执行器统一解释执行——根治"grep 存在性"
2. Figures/Qa/Retro/Publish 补 check()（passed 后删产物/换报告/清 README → resume 必须复验失败）
3. publish 指纹切片并入 state（confirmed/upload_ready）——修 C3 缓存空转
4. 预览门防伪：confirmed 存修订计数+时间戳，门里比对当前计数与 open==0；handoff finish 默认 verdict 改为必填 --response-file
5. QA 增四项：|v.dur−a.dur|≤0.5s、|start_time 差|≤0.05s、bit_rate 下限、|nb_frames−dur×fps|≤1%
6. render sources 空时拒绝渲染；默认兜底 glob（hf/**+figures json+音频字体配置）；lib3d.js/资产变化必须进 figures 指纹
7. 文本产物"必填小节+占位符黑名单"机制（deep-read 机制点计数下限、design-intake 风格内核标题级检查）

### Batch 3 · 视觉资产与观感
1. lib3d 数据组件修复：gauge3d 提供 `gauge3d.set(value)` 值→角度唯一映射（0 基准=左下，量程 270°）；bars3d 标签宽度随 pitch 自适应；textSprite 删三次覆盖死代码+调用点参数清理；tone mapping（ACESFilmic+exposure）；雾随相机范围联动或删除；driftPoints y≥0.1 钳制
2. 全模型 castShadow + person/dog/building/lamp/tree/trash/bird 逐个走资产小样门 v2 重建（8 模型，每模型出小样帧）
3. 22 章模板抽公共 helper（shared.css/shared-helpers.js 一份），fov/粒子盒/标签高度收敛为共享常量
4. 四层注意力预算规则进 aggregator（巨字/面板/3D 标签/字幕同屏数量上限），halftone 14px 层在暗场 3D 章禁用，glowtx 限主标题
5. 示意值规范推广到全部章（机位/置信度标注纳入出处规范）；scene 生命周期 dispose

### Batch 4 · 音频与排版
1. BGM 母带：结尾 3s 淡出、-1dBTP 余量、48kHz 对齐；SFX 执行层（转场音效生成器）或显式降级配置
2. 字体自托管 woff2（Archivo Black/Outfit/Space Mono/JetBrains Mono 四款进 assets/fonts，render.sources 覆盖），渲染前字体预检
3. k21 节奏修复（结论章内容补齐或时长压缩，禁"拉长结尾凑总长"）——进 visual_planner 裁定项
4. sources 白名单按实际引用自动生成（解析 compositions 的 src/import）

**验收方式**：每批修复 = 修复 + 对应回归测试进 tests/ + 在 yolo-v6 重跑受影响阶段用真实产物验证；Batch 2 完成后故意注入 5 类坏产物做"门禁穿透测试"（空 JSON/旧指纹/手写 receipt/confirm 后加意见/删 README）全部必须被拦。

---

## 六、与既有结论的关系

- 建模精度（已修的 carMesh v2）= 根因 6 的实例；全库 8 模型重建纳入 Batch 3.2
- 用户上一轮评审的 8 项发现中：#1 已修（布局/帧级 QA/ch18）、#2 已修（去配额）、#5 已修（导演制）、#6 已修（三验收/证据制）；#3 小样门已建但门未硬化（C1）、#4 标签投影已建但零调用（B1）——**"修了"和"被使用/被强制"之间还有一层，这正是本次体检的最大教训**
