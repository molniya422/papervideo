---
name: code-animation-prompts
description: 使用 341 种风格提示词和参考静帧制作代码动画、HTML 动效或视频。适用于按风格编号选型、组合视觉风格、把内容转成可编辑动画并渲染成片。
---

# Code Animation Prompts

将用户的内容转成有明确视觉风格、可编辑、可复现的代码动画。素材库在本技能的 `assets/library/`，包含 341 份提示词、193 张参考静帧、离线挑选器和原始示例。

## 找到合适的风格

以本文件所在目录为技能根目录，执行脚本时使用它的绝对路径；不要假定当前工作目录是技能目录。

```bash
python "<技能目录>/scripts/styles.py" search 水墨
python "<技能目录>/scripts/styles.py" search 粒子 --series AG
python "<技能目录>/scripts/styles.py" show B3
python "<技能目录>/scripts/styles.py" list --series Z
```

索引见 [references/catalog.json](references/catalog.json)，只含编号、名称、标签与文件路径。优先查索引，再读取选中的 Markdown 和同名静帧；不要一次加载全部提示词。没有 Python 时直接查索引与文件。

- 用户给了编号或挑选器导出的清单：精确匹配，保留编号和名称。
- 用户只描述气质：给出 2–3 个匹配项，说明色彩、运动和适用内容；用户已要求直接制作时选择最匹配的一项并继续。
- A–G 是带代码的样片；M 是运动／叙事；K、Z、R 是画风；H 是版式；L、V、X 是第三方风格；O 是电影视觉参考。不要把多个风格的全部约束机械叠加，应确定主画风、运动方式和版式各自的职责。
- 148 个条目没有静帧；明确说明文字参考，不虚构截图。
- **B6 只存在于原始示例目录，不在 341 个风格条目中。** 用户点名 B6 时阅读 `assets/library/示例/B6_光速穿梭·爆炸·重聚_同一份提示词/提示词.md`，不要冒充索引中有 B6。

## 从提示词到可编辑动画

从用户要求中提取内容、时长、画幅、字幕及声音选择。遵循用户已经给定的参数；缺失且不影响内容时可采用 12 秒、1920×1080、30 fps、无声预览，并说明假设。不要把无声预览描述成已经配音或配乐的成片。

读取所选提示词，填充 `{{ }}` 占位符，保留形成该风格的核心视觉特征。原提示词中的“只输出代码”等措辞是局部素材模板，不能覆盖当前用户的交付需求。原始示例的模型名称是素材记录，不代表本技能验证过这些模型。

一般从 HTML + Canvas／SVG／CSS 开始；复杂空间镜头可用 Three.js，已有 Remotion 等工程则沿用工程。选择满足画面要求的实现，不强制改框架。需要外部字体、图片、库或音频时，检查来源与实际可用性。

浏览器动画需要稳定导出时，采用 [references/rendering.md](references/rendering.md) 的时间接口：画面由秒数 `t` 决定，随机数固定种子，导出时关闭实时循环。模板见 [assets/starter/index.html](assets/starter/index.html)，它只演示接口，不是 341 个风格之一。

在用户工作目录中保存项目，保留技能素材库原样。将文案、颜色、节奏等常改参数集中配置；长片先确定镜头顺序与每段时间，再实现。

## 验收与交付

打开动画，检查首帧、中段、尾帧及转场：字体、溢出、黑帧、图像加载、字幕可读性。确认相同时间重复渲染一致，并且不同时间确实有预期运动。

用户要 MP4 时，实际渲染并检查分辨率、时长、帧率和声音轨。可使用随附的 `scripts/render_video.py`，接口和依赖见渲染说明。若缺少渲染依赖，交付已完成的 HTML、源码与准确的运行命令，并明确视频尚未导出；不能把 HTML 或录屏命令当成成片。

交付实际文件链接，说明所用风格编号、运行方法、视频规格与声音状态。保留素材内的来源及第三方许可；免费分享约定见 [references/attribution.md](references/attribution.md)。

---

## 本工作区集成（PaperVideo LOCAL）

- **引擎检出**：`D:\papervideo\engines\code-animation-prompts`（76MB，含 341 提示词 + 193 静帧 + 离线挑选器 + 示例）
- **技能副本**：`D:\papervideo\.zcode\skills\code-animation-prompts`（本目录）
- **离线挑选器**：`assets/library/风格挑选.html`（双击打开，472KB 单文件，可筛选/预览/导出清单）
- **风格索引**：`references/catalog.json`（341 条：id/name/series/category/description/fit/tags/file/image）
- **检索命令**（在技能根目录执行）：
  ```bash
  python scripts/styles.py search 粒子 --series AG
  python scripts/styles.py show B3
  python scripts/styles.py list --series Z
  ```
- **渲染**：`scripts/render_video.py`（时间接口 `f(t)`，随机种子固定，导出时关实时循环）

### 在 PaperVideo 中的位置（路由规则）

| 场景 | 用法 |
|---|---|
| **design-intake** | 风格候选池：341 风格的 series 分类（AG 代码样片 / M 动态 / K 卡通 / Z 中国风 / H 版式 / L Lemo / V mg-styles / X code-video / R 参考学习 / O 奥斯卡 98 部）可作为 design-picker 的"风格参考源"；用户按编号选风格 |
| **figures（图解）** | 需要"风格化视觉解释"时，读对应 `风格提示词/<id>_<name>.md` 的 Canvas 参考实现，改造成章节场景（时间接口天然适配 hyperframes/Remotion） |
| **render（成片）** | 路线 D 的 DOM/Canvas 层可直接复用 `S.<id>(c,w,h,t,s)` 实现；须固定随机种子（`rng(seed)`）保证确定性 |
| **spec_enricher** | 可为每章指定 `style_ref: "A1"` 供 model_builder 取用参考实现 |

### 硬约束（与 threejs-visual-example 的关系）

- 本库是**风格与参考实现库**，不是 3D 模型库：具象对象仍必须用 `threejs-visual-example` + lib3d 的模型函数；
  本库的 Canvas 2D 实现用于**排版/文字/光效/粒子/转场**等非具象元素。
- 引用编号时必须保留 id 与名称（如 `B3 粒子聚形`），并在 `3-figures/README.md` 登记（动效匹配列写 `cap:<id>`）。
- 148 条无静帧的条目只能作为文字参考，不得声称有截图。
- 素材许可：见 `assets/library/许可与来源.md` 与 `LICENSE.md`；分发时保留来源。
