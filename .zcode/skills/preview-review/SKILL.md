---
name: preview-review
description: >
  渲染前人工预览 + 分类修改意见 + 三张风格帧小样门。用户逐章审看预览包，
  按十类登记修改意见（文稿/运镜/转场/建模/动效/布局/节奏/声音/数据/字幕），
  修复后全部 resolved 才许渲成片（preview --confirm 是 RenderAdapter 的渲染人工门）。
  批量生成章节前先过"三张风格帧"小样门（实体演示/机制推导/数据比较各一帧真实渲染）。
---

# Preview Review（渲染前人工预览 + 分类意见 + 小样门）

**为什么**：成片渲染前不预览 = 把返工成本最大化。预览门把"不好看/看不懂"拦在
最便宜的时点（HTML 可改），意见分类让每条意见路由到唯一责任产物与角色。

## 一、预览包（成片前，hyperframes 路线）

```bash
python -m paperpipe preview                 # 生成 4-video/preview/ 预览包
# 浏览器打开 output/<run>/4-video/preview/index.html —— 逐章 iframe 播放 + 元信息面板
python -m paperpipe preview --chapters 5,6  # 只重生成指定章（局部修订后 delta 预览）
```

| 产物 | 用途 |
|---|---|
| `index.html` | 预览工作台：左栏章列表 / 中间 iframe 播放 / 底部元信息（时长/转场/相机 cue/字幕句） |
| `storyboard.md` | 分镜表：章/标题/时长/转场/相机cue/3D对象/数据组件/字幕句数 |
| `narration.md` | 逐章逐句文稿（含秒数）——**文稿类意见审这里** |
| `revisions.json` | 分类意见账本（open/resolved，带 R00x id） |

## 二、分类修改意见（十类，路由到唯一责任角色）

```bash
python -m paperpipe revise add --category camera --chapter 5 --severity minor \
    --target "ch05 orbit 段" --wanted "停 2s 再转，转速减半"
python -m paperpipe revise list [--status open]
python -m paperpipe revise resolve R003 --note "改了相机 cue，重生成 ch05"
```

| category | 审看入口 | 责任产物 | 责任角色 |
|---|---|---|---|
| `script` 文稿 | narration.md | narration.json / examples_spec | example_writer |
| `camera` 运镜 | index.html 播放 | enriched_spec camera_path | spec_enricher |
| `transition` 转场 | 章切换处 | enriched_spec / aggregator 包装 | aggregator |
| `model` 建模 | index.html 播放 | compositions / blender | model_builder |
| `motion` 动效 | index.html 播放 | style_refs + tweens | model_builder |
| `layout` 布局 | index.html 播放 | 布局 / lib3d 标注层 | aggregator |
| `pacing` 节奏 | storyboard.md | 时长 / duration | spec_enricher |
| `audio` 声音 | 成片草稿 | bgm/sfx / audio_master | render_worker |
| `dataviz` 数据 | index.html 播放 | dataviz_spec / 数据组件 | data_viz_builder |
| `caption` 字幕 | index.html 播放 | captions.html | aggregator |

**严重级**：`major` = 必须重派责任角色（handoff 信封重做该产物）；`minor` = 导演（主编排）
直接改产物 + resolve 留痕。**resolved 的唯一凭证是 `revise resolve`，不是"我说改好了"。**

## 三、过审（渲染人工门）

```bash
python -m paperpipe preview --confirm --by 用户   # 全部 resolved 才写 preview_confirmed.json
```

- RenderAdapter（hyperframes 路线）在真渲染前强制检查此凭据，未过审 → `waiting_for_human`；
- 过审后又改了合成源码 → 指纹变化会重渲，但**意见账本仍有效**：新一轮改动若引入新意见，
  用户追加 `revise add`，出现新的 open 意见后需再次 `--confirm`；
- 修复→重生成指定章（`preview --chapters …`）→ 让用户复查该章 → resolve → confirm。

## 四、三张风格帧小样门（批量生成章节**前**）

model_builder 批量铺开 22 章之前，先用**真实渲染器**做三帧，导演过审才许批量：

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
- ❌ 意见不分类（"整体再优化一下"——不可执行，让用户挑一章一处说具体）
- ❌ 用自然语言"改好了"代替 `revise resolve`（账本与磁盘不同步）
- ❌ 三张风格帧用草图糊弄（必须真实渲染器产出，否则批量后全片返工）
- ❌ 预览只看首帧（转场/字幕/节奏要在播放里看）
