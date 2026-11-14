# 工作流体检报告 Round 4-6（2026-11-07）

> 方法：延续 2026-11-05 体检的"声明 vs 实现"对照法——把 contracts.yaml / AGENTS.md / WORKFLOW.md /
> SKILL.md / prompts 里声明的每条门禁逐条对照执行器实现，证据导向（file:line 或测试实测）。
> 三层修复：① 声明层（registry/*.yaml）② 技能/提示词层（prompts + SKILL.md）③ 执行器机器门（谓词+测试）。
> 本轮共 **27 项发现**，全部修复；新增 test_triggers 套件 48 项；全 10 套件 226 项全绿 + validate 通过。
> 未渲成片（遵守约束）——所有验证走测试夹具与合成媒体。

---

## 一、Round 4 · 系统性缺口（P0，5 项）

| # | 问题（声明 vs 实现） | 修复 |
|---|---|---|
| R4-1 | **"条件触发"只实现了一半**：verify_stage 完全不评估 trigger 字段——本地 PDF 输入被 arXiv 技能凭据卡死、dry-run 发布被上传凭据卡死 | contracts 条件技能加 `trigger_when` 机器谓词（六原子：input/route/target/file/cfg/physics_sim，registry.parse_trigger 语法校验进 validate，求值 fail-closed）；未触发不拦 |
| R4-2 | **blender-visual"硬触发不可 route-decision 豁免"零实现**（且最初实现会让无物理模拟的 run 也被强制要 Blender 帧） | `hard: true` + `trigger_when: physics_sim`（enriched_spec 场景声明驱动）：声明即强制且决策不可豁免；未声明不空转；spec_enricher 提示词同步声明职责 |
| R4-3 | **verify_chosen_artifacts 占位符提取坏**：`<chapter>`/`{entity,mechanism,data}` 提取出 "/frame_*.png"、"data}.png"——blender/preview-review 已触发即误报缺产物 | 占位符归一（{a,b,c}→* 且按组内元素数要求最少命中；<>→*），token 类扩为 [\w./-*,<>{}] |
| R4-4 | **final.mp4 无生产者**：render check() 引用不存在的 encode_final.py 与"配置 encode"（无代码消费）；qa 查 4-video/final.mp4 而 SKILL 产出到 5-video-final/——按文档走完 qa 永远 waiting | RenderAdapter 端到端：渲染后自动 loudnorm 母带（audio_master.wav）+ remux 出 5-video-final/final.mp4（faststart），tool receipt 落盘；无音轨→waiting_for_agent；`_final_mp4()` 统一双路径（qa/render/publish/validate_review 四处共用）；ffmpeg 解析改优先 tools 全量构建（Remotion 捆绑版缺 f32le muxer） |
| R4-5 | **三张风格帧小样门（P0）无机器强制**：model_manifest 存在（=批量生成已发生）也不查 style_frames | figures check：manifest 存在 → 3 帧（entity/mechanism/data）必须存在 + preview-review 过审凭据，缺→waiting_for_agent |

## 二、Round 4 · 谓词与链路（P1，8 项）

| # | 问题 | 修复 |
|---|---|---|
| R4-6 | 渲染预览门只拦 hyperframes 路线，Remotion 路线绕过（AGENTS.md 声明无路线限定） | 两条路线同门（RenderAdapter remotion 分支渲前 preview.gate） |
| R4-7 | Blender 帧序列"确定性且无丢帧"（render machine_gate）零实现 | `_blender_frame_problems`：逐章 frame_NNNN 连续性断言，丢帧/命名不合规→waiting |
| R4-8 | 混合管线 remux 凭据零实现 | blender 帧存在 → render check 要求 remux tool receipt（执行器后处理自动写） |
| R4-9 | 精度四项只查"fidelity 是 dict"，键全凭自觉 | v_manifest：envMap/shadows 必须 true、detailCount≥4（④玻璃件属逐模型评审，留人审） |
| R4-10 | 指南要点摘录/审美清单/动效法则三个 brief 落点 acceptance 零谓词 | `verify_triggered_acceptance`：已触发技能的 brief 小节必须存在且条目数达标（≥5/≥3/≥3） |
| R4-11 | publish 的 release_reviewer 声明为 subagent 但无 handoff_plan——永不派发/核验 | contracts publish handoff_plan（写 5-video-final/release_checklist.json，只验证不上传） |
| R4-12 | agents.yaml aggregator outputs 含 narration.json，与 narration_editor"独占写窗口"正面冲突（三账不同步） | aggregator outputs 移除 narration.json 并写明禁写；inputs 对齐 contracts |
| R4-13 | Xray/Figures 适配器带外创建影子 handoff（"-xray-researcher"/"-figures-planner"：命名不合 dispatch 规则、不受 gate 检查） | 删除带外创建（信封统一由 ensure_stage_handoffs 建）；登记表初版归 visual_planner handoff（contracts 已声明），render 阶段 aggregator 刷新 |

## 三、Round 5 · "修了声明没修内容"类（P1，6 项）

| # | 问题 | 修复 |
|---|---|---|
| R5-1 | **data_viz_builder 提示词仍教"按组内最大值归一"**——ch18 事故根源在生产端原样保留（Batch1 第 6 条声明改"原始值+axis_max"但只改了 model_builder 侧） | 提示词改为原始值+axis_max 双字段 + v_dataviz 谓词（axis_max 必须为正数）——三层闭环 |
| R5-2 | aggregator 仍硬编码 NEON ORBIT 色板 / ch00~ch21 章节范围 / y≥940 keep-out（与技能条款冲突） | 色板从 design-intake 读、章数从 enriched_spec 来、keep-out 统一为"关键小字避让底部 80px+layout_audit error=0" |
| R5-3 | model_builder y≥940 keep-out 残留；spec_enricher 面板像素（1380-1780）硬编码 | 统一条款 / "以本章 composition 布局为准，不预设像素值" |
| R5-4 | validate_registry 不校验 handoff_plan（角色未注册/缺 task/output_paths 静默通过——R4-11 类问题无静态防线） | 静态校验两条 + 循环依赖由 dispatch.topo_order 运行时检测 |
| R5-5 | 文档计数漂移：WORKFLOW"66 技能/8 角色/9 提示词/六套件"、cli docstring"9 命令"、WORKFLOW-MAP 五处 66、validate 查不存在的 "slides" target | 全部对齐（72/14/12/10 套件/13 命令）；validate 死分支删除 |
| R5-6 | paper-explain SKILL：四层表子智能体缺 6 角色、五字段未更新、route-decision 教 Python API、visual_planner 触发条件与 agents.yaml 矛盾；"14 角派发环"实为 13 角入环（render_worker 机器执行） | 全部对齐 + decide CLI 写入两个 SKILL 与 WORKFLOW §15 |

## 四、Round 6 · 补漏（P2，8 项）

| # | 问题 | 修复 |
|---|---|---|
| R6-1 | "至少 1 条硬规则写回相关技能"零验证——lessons 不提任何技能也过 review 门 | validate_review：lessons 必须指明写回目标（含已注册技能 id） |
| R6-2 | `is_3d:false` 的 3D 豁免无留痕谓词（WORKFLOW §10.6 声明"缺豁免记录→拦"未实现） | v_examples：is_3d=false 必须带 exempt_reason |
| R6-3 | release_reviewer 的 agents.yaml outputs 与 contracts handoff 脱节 | outputs 补 5-video-final/release_checklist.json |
| R6-4 | init 的 paperpipe.yaml 模板无 hyperframes 路线示例（编排方须凭记忆手写 mode/command/cwd/sources） | 模板加注释块（含 loudnorm 可调项） |
| R6-5 | review 门文本漂移：CLI 清单与 WORKFLOW §1/§15 仍写"每项 ≥8"（Round 3 起低分合法+整改决定） | 三处文本对齐 |
| R6-6 | Round 3 遗留：test_scenarios 4 失败未修（夹具未跟上 deep-read"会怎么坏≥3"谓词——上轮改谓词没复跑全套件） | 夹具修复；确认 HEAD 上即失败（非本轮引入） |
| R6-7 | test_penetration 暴露 pass_role 默认载荷覆盖登记表（visual_planner handoff 新含 README.md 后） | 夹具给登记表真实内容 |
| R6-8 | pack manifest 三账核对（count=72=skillDirs=registry） | 已对齐（仅 zip 发行物为旧构建，重建时 make-pack.ps1 自检兜底） |

## 五、验证方式（本轮全部真实执行）

- `python -X utf8 -m paperpipe validate --target video` → PROBLEM 0；
- 10 套件：test_gates 18 / test_receipts 13 / test_handoff 15 / test_dispatch 17 / test_preview 17 /
  test_review_publish 13 / test_regressions 23 / test_penetration 14 / test_scenarios 31 / **test_triggers 48（新增）**——226 项全绿；
- test_triggers 覆盖：触发六原子求值与 fail-closed、触发决定凭据要求（PDF/arXiv/dry-run/upload/route）、
  硬触发声明驱动+豁免拒绝、占位符归一、风格帧门（缺帧/缺凭据/组≥3）、fidelity 三键、
  dataviz axis_max、brief 落点、丢帧+remux、decide CLI 硬触发拒登、final 双路径、3D 豁免留痕、写回目标。
- 未渲染任何成片；渲染路径的音频后处理以工具存在性与命令构造验证（真实 media 编解码仅在 1s 合成测试片上跑过，属测试夹具）。

## 六、剩余已知边界（记录，不属"声明未实现"）

1. `handoff finish --note` 自动 verdict:pass 仍比 --response-file 弱（已要求非空内容，结构化回传仍靠纪律）；
2. 物理 bake 与"玻璃/透光件非裸 Box"属逐模型/逐章人审（导演小样 + content-mapping-review），机器只验帧连续性与 fidelity 声明；
3. `pack/*.zip` 发行物是旧构建（源 manifest 已对齐，重建时自检兜底）；
4. fixtures 中的 enriched_spec 由测试直写（测试即整合方），生产路径受 trace_check 锁定。

---

## 七、Round 7-9 追加（同日续查，2026-11-07）

| # | 问题（声明 vs 实现） | 修复 |
|---|---|---|
| R7-1 | handoff submit_response / skill receipt 的产物路径接受绝对路径与 `..`（output-manifest 以绝对路径为键，溯源语义失效；穿透测试坐实） | `util.safe_rel_path` 归一：绝对/越界拒绝；越界提交信封转 failed（留失败痕）；receipt 在写凭据前即拒 |
| R7-2 | `paperpipe agents` 对无 handoff_plan 阶段（intake 等）all_passed 空集=False → 误报 exit 2 | 空集 vacuous=True + 测试 |
| R8-1 | **凭据供给无合法入口**：verify_stage 只认 receipt，但全部 12 个角色提示词零处提 receipt——真实运行中凭据门只能靠编排方违反"三不"手写 JSON 过 | ① `paperpipe receipt <stage> <skill> --output …` CLI（与 decide 对称，校验注册/阶段/产物存在）；② 8 个角色提示词补"凭据职责"段（researcher/example_writer/spec_enricher/model_builder/aggregator/narration_editor/technical_qa/visual_qa×2）；③ RenderAdapter 渲成后自写 hyperframes/remotion-video 凭据 |
| R9-1 | contracts fact_checker 输入声明 `paper_src/paper_text.txt` 是幻影产物（执行器从不生产） | 对齐 agents.yaml：`paper_src/` |
| R9-2 | "有视频交付目标"类触发（video-production-guide / threejs-visual-example）在 target=md/figures 时也被要求凭据——触发条件语义无原子可表达 | 新增 `video_target` 原子（target 含 render 阶段），挂到两条声明 |
| R9-3 | preview-review SKILL 漂移：仅写 hyperframes 路线（现两条路线同门）、"批量铺开 22 章"硬编码 | 文本对齐 |
| R9-4 | 端到端验证空白：此前只有夹具级测试，无真实状态机全链行走 | 真实冒烟（临时 run / 本地源 / target=md，不渲染）：init→brief 骨架停等→补齐→resume→acquire→xray 停等（2 信封自动创建）→receipt CLI→handoff finish×2（哈希核验）→`run --stage xray` passed。validate md/figures/video 三 target 全过 |

**累计（Round 4-9）：41 项发现全部修复；test_triggers 60 项；全 10 套件 221 项全绿；validate 三 target 通过；两次提交 c815c9f → 199b8cc → f920f99 → 本轮。**

---

## 八、Round 10-12 追加（同日续查）

| # | 问题 | 修复 |
|---|---|---|
| R10-1 | example_writer 提示词豁免规则只写 data_ref（与 exempt_reason 谓词脱节） | 提示词补"豁免必须留痕" |
| R10-2 | WORKFLOW-MAP 组件表计数陈旧（6 套件 109 项 / adapters 600 行 / 六维≥8） | 10 套件 221 项 / 渲染端到端职责 / 低分整改决定措辞 |
| R11-1 | AGENTS.md P0 门清单缺 physics_sim 声明驱动硬触发语义（编排方不知"乱声明即卡管线"） | 补 bullet + 豁免留痕语义；P0 清单 14 项逐条对照实现全 OK |
| R12-1 | **check() 兜底覆写 run() 的门停**：预览门在 run() 正确返回 waiting_for_human，但 check 的"尚未渲染"消息把它覆写成 waiting_for_agent——门语义被掩盖（真实冒烟坐实） | runner.run_stage：run() 的 waiting_* 优先，check() 复验只覆盖 run 声称 passed 的情况；T14 回归 |
| R12-2 | contracts 4 处 required_output 写"brief.md"，谓词解析到 run 根而不是 0-brief/brief.md（触发即误报缺产物） | 路径改 0-brief/brief.md |
| R12-3 | style_director 凭据职责漏配（Round 8 只覆盖 8 角色） | 补 code-animation-prompts receipt 段 |
| R12-4 | 端到端二轮冒烟（video target）：figures 门栈全链真实生效（风格帧门/溯源/scene_desc/axis_max/触发谓词/决策/凭据/写回目标）；render 停预览门；preview generate→add→resolve→confirm→gate(True) 闭环走通 | 未渲染任何成片；临时 run 已清理 |

**累计（Round 4-12）：52 项发现全部修复；test_triggers 61 项；全 10 套件 222 项全绿；七轮提交 c815c9f→199b8cc→f920f99→097637e→712b09b→ea57403→本轮。**

---

## 九、Round 13 · 全管线终极走查（同日）

方法：真实状态机上走完 intake→brief→acquire→xray（2 信封）→figures（6 信封+凭据+决策+风格帧门）→
render（幂等缓存+音频后处理）→qa（真实 ffprobe/loudnorm/blackdetect/freezedetect，合成 4s 测试片而非成片）→
retrospective→review --confirm（程序化核对通过）。**未渲染讲解成片**。

| # | 问题（全部由真实走查坐实） | 修复 |
|---|---|---|
| R13-1 | **渲染幂等缓存可绕过预览门**（cache hit 在 gate 之前返回） | 缓存路径同样强制过渲染人工门 |
| R13-2 | **缓存命中跳过音频后处理**——续跑 run 复用 raw 但 final.mp4 永远缺 | 缓存路径补跑 audio_master+remux（幂等：final 已存在跳过） |
| R13-3 | **重试预算耗尽+指纹未变时，resume 把 failed_retryable 无声改判 failed_permanent 且消息变 "unknown"**（last_err=None 走 repair 兜底） | 预算耗尽保持原状态/原消息，显式 `retry <stage>` 才重置 |
| R13-4 | **loudnorm 默认参数符号错误**（I=16 为正 → ffmpeg "Error setting option I"）；init 模板注释同样写错 | 默认 -16/-1.5；配置正数自动取负；模板纠正 |
| R13-5 | render 三个"自定义类"条件技能（cut-the-curve/seam-craft/oversized-cursor）无触发谓词——未自定义也被拦 | trigger_when: cfg:render.custom_easing/custom_transitions/cursor_demo |
| R13-6 | **targets.video 不含 retrospective**——"没有复盘不算交付"铁律只被人审门间接强制 | video target 补 retrospective（run --auto 到复盘停等，与 AGENTS.md P0 一致） |
| R13-7 | style_director 凭据职责漏配 | 补 code-animation-prompts receipt 段 |
| R13-8 | 渲染命令挂起风险：npx 在无工程 cwd 会联网取包挂 6h 超时 | （记录：render.command 应指向已检出引擎/工程；hyperframes 工程由 aggregator 产出 index.html） |

**终极走查结论：intake→review --confirm 全链真实走通；每个门按声明停机/放行；缓存/后处理/重试语义修复后闭环。**
**累计（Round 4-13）：60 项发现全部修复；test_triggers 61 项；全 10 套件 222 项全绿；validate 三 target 通过。**

---

## 十、Round 14-17 追加（同日）

| # | 问题 | 修复 |
|---|---|---|
| R14 | R13 修复缺回归固化 | T15（缓存同门+后处理）/ T16（loudnorm 符号归一，抽 `_loudnorm_args`）/ T17（预算语义+video target 复盘）——test_triggers 68 项 |
| R16-1 | **remotion 路线不强制 render.sources**（C2 在路线 C 仍开放：改 Remotion 源码不触发重渲） | remotion 分支同样硬要求 sources |
| R16-2 | WORKFLOW-MAP 复盘"≥8"陈旧 / paper-video SKILL"22 章"硬编码 | 文本对齐 |
| R17-1 | **lib3d 共享库无规范源**——只存在于各 run 拷贝，修复按 run 打散（ep05 仍有三次 scale.set 死代码；toneMapping/pitch 自适应只在个别拷贝） | 建 `assets/lib3d/lib3d.js` 规范源（唯一事实源），提示词/WORKFLOW/WORKFLOW-MAP 三处登记"改规范源再同步" |
| R17-2 | **Batch 3 欠账：gauge3d 指针 90° 错位 + 无 set() 唯一映射**（所有拷贝存续；上轮体检计划声称"提供 gauge3d.set"但从未落地） | 规范库重构 gauge3d（0 基准=左下、量程 270°、刻度覆盖行程）+ `gauge3dSet(g,value,axisMax)`（与 dataviz axis_max 同基准）；node --check 通过；model_builder 提示词禁手算角度 |
| R15-1 | html-to-video 路由"跳过 acquire/xray"不可执行（执行器无跳阶段机制） | 路由提示改为可执行路径（decide 豁免 + 极简 deep-read） |
| R15-2 | 路线 B/E（beamer/商业片）技能注册但零阶段合同——声明了门却不存在 | 如实声明"技能自管"（receipt 自留痕，xray/review 门照常） |

**累计（Round 4-17）：67 项发现全部修复或如实化；test_triggers 68 项；全 10 套件 229 项全绿；validate 四 target 通过；16 轮提交。**

## 十一、附录：条件技能门禁覆盖盘点（Round 18 机器生成）

| 阶段 | 技能 | trigger_when | hard | optional | 覆盖形态 |
|---|---|---|---|---|---|
| intake | design-intake | —(默认须凭据/决策) |  |  | 须凭据或决策 |
| brief | video-production-guide | video_target |  | 是 | 触发谓词判定 |
| acquire | paper-download-arxiv-paper-source | input=arxiv |  |  | 触发谓词判定 |
| acquire | pdf-to-markdown | input=pdf |  | 是 | 触发谓词判定 |
| xray | paper-xray | —(默认须凭据/决策) |  |  | 须凭据或决策 |
| figures | flowchart | —(默认须凭据/决策) |  | 是 | 须凭据或决策 |
| figures | visual-explainer | —(默认须凭据/决策) |  | 是 | 须凭据或决策 |
| figures | dynamic-archify | —(默认须凭据/决策) |  | 是 | 须凭据或决策 |
| figures | network-protocol-viz | —(默认须凭据/决策) |  | 是 | 须凭据或决策 |
| figures | anatomy | —(默认须凭据/决策) |  | 是 | 须凭据或决策 |
| figures | scholar-notes | —(默认须凭据/决策) |  | 是 | 须凭据或决策 |
| figures | motion-doctrine | —(默认须凭据/决策) |  |  | 须凭据或决策 |
| figures | wise-motion | route=remotion |  | 是 | 触发谓词判定 |
| figures | motion-lab | route!=remotion |  | 是 | 触发谓词判定 |
| figures | design-taste-frontend | —(默认须凭据/决策) |  |  | 须凭据或决策 |
| figures | blender-visual | physics_sim | 是 |  | 触发谓词判定·硬触发不可豁免 |
| figures | blender-visual | cfg:design.hero_blender=true |  | 是 | 触发谓词判定 |
| figures | code-animation-prompts | —(默认须凭据/决策) |  | 是 | 须凭据或决策 |
| figures | threejs-visual-example | video_target |  |  | 触发谓词判定 |
| figures | storyboard-extract | file=3-figures/reference_media |  | 是 | 触发谓词判定 |
| figures | storyboard-understand | file=3-figures/reference_media |  | 是 | 触发谓词判定 |
| figures | storyboard-ocr | file=3-figures/reference_media |  | 是 | 触发谓词判定 |
| figures | storyboard-transitions | file=3-figures/reference_media |  | 是 | 触发谓词判定 |
| figures | segment-evidence | file=3-figures/reference_media |  | 是 | 触发谓词判定 |
| figures | segment-storyboard | file=3-figures/reference_media |  | 是 | 触发谓词判定 |
| figures | video-shots | file=3-figures/reference_media |  | 是 | 触发谓词判定 |
| figures | source-media-signals | file=3-figures/reference_media |  | 是 | 触发谓词判定 |
| figures | video-artifact-intake | file=3-figures/reference_media |  | 是 | 触发谓词判定 |
| figures | preview-review | —(默认须凭据/决策) |  | 是 | 须凭据或决策 |
| render | humanize-writing | file=4-video/narration.json |  |  | 触发谓词判定 |
| render | remotion-video | route=remotion |  | 是 | 触发谓词判定 |
| render | knowledge-explainer-skill | route=template |  | 是 | 触发谓词判定 |
| render | hyperframes | route=hyperframes |  | 是 | 触发谓词判定 |
| render | cut-the-curve | cfg:render.custom_easing=true |  |  | 触发谓词判定 |
| render | seam-craft | cfg:render.custom_transitions=true |  | 是 | 触发谓词判定 |
| render | oversized-cursor | cfg:render.cursor_demo=true |  | 是 | 触发谓词判定 |
| render | hyperframes-cli | route=hyperframes |  | 是 | 触发谓词判定 |
| render | remotion-to-hyperframes | cfg:render.migrate_from_remotion=true |  | 是 | 触发谓词判定 |
| render | code-mv-render | route=code-mv |  | 是 | 触发谓词判定 |
| render | captions-overlay | —(默认须凭据/决策) |  |  | 须凭据或决策 |
| qa | video-qa-frameproof | —(默认须凭据/决策) |  |  | 须凭据或决策 |
| qa | video-technical-review | —(默认须凭据/决策) |  |  | 须凭据或决策 |
| qa | layout-safety-review | —(默认须凭据/决策) |  |  | 须凭据或决策 |
| qa | compare-video-runs | cfg:qa.compare_runs=true |  | 是 | 触发谓词判定 |
| qa | content-mapping-review | —(默认须凭据/决策) |  |  | 须凭据或决策 |
| retrospective | video-retrospective | —(默认须凭据/决策) |  |  | 须凭据或决策 |
| publish | paper-to-bilibili | cfg:publish.enabled=true |  | 是 | 触发谓词判定 |
| publish | hell-grind-aigc-skill | cfg:publish.aigc_cover=true |  | 是 | 触发谓词判定 |
| publish | review-bundle | cfg:publish.review_bundle=true |  | 是 | 触发谓词判定 |
| publish | skill-catalog | cfg:publish.refresh_catalog=true |  | 是 | 触发谓词判定 |
| publish | package-review-prompt | cfg:publish.review_prompt=true |  | 是 | 触发谓词判定 |
| publish | paper-video-cover | —(默认须凭据/决策) |  |  | 须凭据或决策 |
| publish | paper-bilibili-uploader | cfg:publish.enabled=true |  |  | 触发谓词判定 |
