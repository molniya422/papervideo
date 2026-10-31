---
name: wise-motion
description: 理解动作需求，拆解并匹配动效参考，交付现有源码与接入说明。101 个 Remotion 动效（文字动效/转场/插画/组合序列）语义检索、查看与源码导出。当用户说"wise motion"、"找个动效参考"、"文字动效/转场/插画源码"、或明确要求动效检索交付时使用。
license: Apache-2.0
---

# Wise Motion（引擎检出版）

完整引擎（含素材库 catalog/assets 243M、字体 44M、效果源码 catalog/effects 101 个）检出在
**`engines/wise-motion/`**——命令在**工作区根**以相对路径执行，命令可在任意 cwd 调用：

```sh
# 语义检索：描述动作需求，返回最匹配的动效候选
node engines/wise-motion/scripts/match.mjs "两排卡片反向持续滚动，不要轮播"

# 查看某动效的用途、预览、源码入口、依赖与参数
node engines/wise-motion/scripts/show.mjs <编号或名称> [--variant <样式>] [--details]

# 把动效源码导出到目标目录（返回绝对路径与接入说明）
node engines/wise-motion/scripts/export.mjs <编号或名称> --out-dir <目标目录> [--variant <样式>]
```

预览可直接打开 `engines/wise-motion/catalog/index.html`（无需服务器）。

## 理解、匹配、交付

1. 提取主体、起止状态、动作关系和明确禁项。简单请求直接匹配；多段动作分别检索，再说明各候选对应哪一段。
   抽象感受可转成可观察的变化，简短标明假设；不要求设计表。
2. 指定条目时直接查看；否则用 `match.mjs` 找候选。优先使用命令输出，需要补充时只读候选对应的说明，
   分类浏览时再读索引。回到原需求说明已覆盖的动作与尚未覆盖的要求；词语命中只是线索，
   没有合适候选就说明缺口，由调用方继续创作。
3. 用 `show.mjs` 查看用途、预览、真实源码入口、依赖和参数；需要源码时用 `export.mjs` 写入目标目录，
   返回绝对路径和简短接入说明。详细动作与内容限制按需读取（本目录 `references/`），不把整段源码放进对话。

字幕、分镜、配色和整片组合由调用方自行设计；文字动效和转场是可选素材。目录示例和默认参数不构成用户约束。

## 按需读取与核对（本目录 references/）

- 入门、内容参数与速选：[快速上手](references/quickstart.md)；动作转译：[需求方法](references/method.md)；
  分类浏览：[动效索引](references/index.md)。
- 组件和素材接入：[组件说明](../../engines/wise-motion/REMOTION.md)、
  [播放接口](references/runtime-interface.md)、[Remotion 接入](references/remotion-production.md)。
  保留时长、循环、透明背景支持和运行环境等技术事实。
- 检查：[验证矩阵](references/validation-matrix.md)。区分文件检查、实际渲染与人工播放；默认不截图或启动浏览器。
- 维护目录：[目录维护](references/catalog-maintenance.md)；追溯来源：[来源与许可](../../engines/wise-motion/references/sources.md)、[版权说明](../../engines/wise-motion/NOTICE.md)。

## 与其他技能的关系
- 与 `motion-lab`（160 个网页 CSS/JS 动效）互补：wise-motion 提供 **Remotion 组件级**动效（含插画与音频组合），motion-lab 提供网页 HTML/CSS/JS 动效。
- 需要完整素材（插画/音频）时从 `engines/wise-motion/catalog/assets/` 取，许可见 NOTICE.md。
