---
name: preview-review
description: >
  渲染前人工预览 + 分类修改意见 + 三张风格帧小样门。预览以图为核心：
  每章 3 帧真实渲染快照 + 每个建模 3 机位转台预览图，用户按图给意见
  （十类：文稿/运镜/转场/建模/动效/布局/节奏/声音/数据/字幕），
  修复后全部 resolved 才许渲成片（preview --confirm 是 RenderAdapter 的渲染人工门，
  缺图门不放行）。批量生成章节前先过"三张风格帧"小样门。
---

# Preview Review（渲染前人工预览 + 分类意见 + 小样门）

**为什么**：成片渲染前不预览 = 把返工成本最大化。预览门把"不好看/看不懂"拦在
最便宜的时点（HTML 可改），意见分类让每条意见路由到唯一责任产物与角色。

**历史教训（2026-11-07）**：旧预览包只有 iframe 播放页——file:// 下模块脚本与 GLB
全被浏览器拦死，用户什么都看不到，审批系统形同虚设。现在预览包以**图像证据**为核心，
执行器机器校验：无逐章实渲帧 / 无资产预览图 → 不许 confirm（`preview.gate`）。

## 一、预览包（成片前，hyperframes 路线）

```bash
python -m paperpipe preview                 # 生成预览包：逐章实渲帧 + 资产转台图 + 工作台
python -m paperpipe preview --serve 8765    # 起本地审批服务（推荐）——页面内直接提交意见
python -m paperpipe preview --chapters 5,6  # 只重生成指定章（局部修订后 delta 预览）
python -m paperpipe preview --assets-only   # 只生成资产转台预览图（figures 门要求）
```

`--serve` 后浏览器打开 `http://127.0.0.1:8765/4-video/preview/index.html`（仅绑定 127.0.0.1）；
不开服务直接双击 index.html 也能看图，但提交意见会给出可复制的 CLI 命令而非写账本。

| 产物 | 用途 |
|---|---|
| `index.html` | **图像审批工作台**：每章 3 帧实渲快照 + 每资产 3 机位转台图 + 反馈表单 + 意见账本 |
| `frames/chXX_f1..f3.png` | 每章 3 帧真实渲染（章内 25/55/85%，根组合偏移 + `--at` 单帧单跑） |
| `assetview/` | 资产转台迷你 hyperframes 项目（每 GLB 一个 3s 组合，lib3d loadGLB 自适应取景） |
| `preview_meta.json` | 章/资产元数据 + 帧清单（门谓词的数据源） |
| `storyboard.md` | 分镜表：章/标题/时长/转场/相机cue/3D对象/数据组件/字幕句数 |
| `narration.md` | 逐章逐句文稿（含秒数）——**文稿类意见审这里** |
| `revisions.json` | 分类意见账本（open/resolved，带 R00x id） |

对应每资产落盘：`3-figures/asset_previews/<asset>/a1..a3.png`（转台三机位，
figures 阶段门就查——**每个建模必须有用户可审的预览图**）。

## 二、用户怎么给意见（按图审，十类路由到唯一责任角色）

工作台每章/每资产下方都有反馈表单：选类别（十类）+ 严重级 + 写具体意见 → 提交
（serve 模式直接写 revisions.json 并回显 id；file:// 模式给出等价 CLI 命令）。

```bash
python -m paperpipe revise add --category camera --chapter 5 --severity minor \
    --target "ch05 orbit 段" --wanted "停 2s 再转，转速减半"
python -m paperpipe revise list [--status open]
python -m paperpipe revise resolve R003 --note "改了相机 cue，重生成 ch05"
```

| category | 审看入口 | 责任产物 | 责任角色 |
|---|---|---|---|
| `script` 文稿 | narration.md | narration.json / examples_spec | example_writer |
| `camera` 运镜 | 章帧 + 交互播放 | enriched_spec camera_path | spec_enricher |
| `transition` 转场 | 章切换处 | enriched_spec / aggregator 包装 | aggregator |
| `model` 建模 | **资产转台图** + 章帧 | compositions / asset_registry | model_builder |
| `motion` 动效 | 章帧 + 交互播放 | style_refs + tweens | model_builder |
| `layout` 布局 | 章帧 | 布局 / lib3d 标注层 | aggregator |
| `pacing` 节奏 | storyboard.md | 时长 / duration | spec_enricher |
| `audio` 声音 | 成片草稿 | bgm/sfx / audio_master | render_worker |
| `dataviz` 数据 | 章帧（数据章） | dataviz_spec / 数据组件 | data_viz_builder |
| `caption` 字幕 | 章帧字幕区 | captions.html | aggregator |

**严重级**：`major` = 必须重派责任角色（handoff 信封重做该产物）；`minor` = 导演（主编排）
直接改产物 + resolve 留痕。**resolved 的唯一凭证是 `revise resolve`，不是"我说改好了"。**

## 三、过审（渲染人工门）

```bash
python -m paperpipe preview --confirm --by 用户   # 全部 resolved + 图像证据齐才写凭据
```

- **门谓词四查**：意见全 resolved → narration.json 存在 → **逐章实渲帧齐**
  （`preview_meta.json` 里每章 3 帧、文件在盘）→ **资产预览图齐**（registry 每 GLB
  三机位图在盘）。confirm 后删图/加意见 → `preview.gate` 自动关闭（RenderAdapter 拒渲）。
- RenderAdapter（**两条路线同门**：hyperframes 与 remotion）在真渲染前强制检查此凭据，未过审 → `waiting_for_human`；
- 修复→重生成指定章（`preview --chapters …`）→ 让用户复查该章新帧 → resolve → confirm。

## 四、三张风格帧小样门（批量生成章节**前**）

model_builder 批量铺开各章之前，先用**真实渲染器**做三帧，导演过审才许批量（执行器机器化：model_manifest 已产出而三帧/凭据缺失 → figures 门不放行）：

| 帧 | 验证什么 |
|---|---|
| `3-figures/style_frames/entity.png` | 实体演示章：**精度四项**（环境反射/真接触阴影/结构细节≥4/玻璃非裸Box）+ 造型方向 + 主背景分离 |
| `3-figures/style_frames/mechanism.png` | 机制推导章：公式/标注可读性、字体层级、注意力焦点 |
| `3-figures/style_frames/data.png` | 数据比较章：柱/表盘可读性、数值→几何映射正确、轴刻度同基准 |

过审标准：**精度四项齐**（见 threejs-visual-example）；造型/光照/配色/构图一致；标签清晰；
**不通过不得批量生成**（on_fail: waiting_for_human）。通过后这套视觉语法全片复用，
后续章偏离此语法的，导演有权退回。

## 五、反模式

- ❌ 不预览直接渲 4K 成片（返工最贵）
- ❌ 出"无图预览包"（iframe/文字表）让用户审——用户看不到等于没审（2026-11-07 教训）
- ❌ 建模不经资产预览图直接进章——用户审到的必须是模型本体（转台三机位）与成片同源观感
- ❌ 意见不分类（"整体再优化一下"——不可执行，让用户挑一章一处说具体）
- ❌ 用自然语言"改好了"代替 `revise resolve`（账本与磁盘不同步）
- ❌ 三张风格帧用草图糊弄（必须真实渲染器产出，否则批量后全片返工）
- ❌ 预览只看首帧（每章 25/55/85% 三帧 + 交互播放看转场/字幕/节奏）
