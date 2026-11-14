---
name: threejs-visual-example
description: |
  强制技能：论文讲解视频中的"例子"必须具象化——凡涉及真实世界对象或几何结构
  （检测目标、物理实体、机器人、网格/张量结构、几何变换）的举例，必须用 three.js
  生成可旋转/可扫描的 3D 建模演示，禁止用纯表格、纯数字读数或平面框线图代替。
  当例子是抽象数学（曲线、概率分布、标量场）时可豁免，但必须写 route-decision 说明。
---

# 具象例子 3D 化（three.js）

## 铁律

1. **具象对象必须 3D**：例子里出现"车/人/狗/椅子/房间/机械结构/分子/网格数据立方"等
   可被肉眼想象为实体的对象时，禁止用 2D 框线图 + 表格读数充当例子 —— 必须用
   three.js 建立对应的 3D 场景（哪怕低多边形），并在场景上演示机制（检测框贴合物体、
   光线扫描、切片探测等）。
2. **数据要有"载体"**：表格/数字只允许作为 3D 场景的伴随标注（锚定在 3D 元素旁），
   禁止整屏只有表格。一条机制点的演示 = 3D 主体（≥35% 画面）+ 局部标注。
3. **可交互感的运镜**：3D 场景至少 1 次慢环绕或推拉（电影感 per-semantic cue），
   让观众看到空间关系，而不是固定正面读数。
4. **确定性**：three.js 动画必须挂在可 seek 的时间轴上（hyperframes: 注册进
   window.__timelines；Remotion: useCurrentFrame 驱动）——禁随机、禁 Date.now、
   禁 requestAnimationFrame 自走时钟。

## three.js 接入模式（hyperframes / 零构建）

```html
<script type="importmap">
{"imports": {"three": "./assets/vendor/three.module.js"}}
</script>
<script type="module">
  import * as THREE from 'three';
  // 场景随 <template> 挂载后构建；时间轴驱动：把每帧状态写成 f(t)，
  // 由 GSAP tween 代理对象 onUpdate 里同步相机/物体位姿（确定性）。
</script>
```

- three.module.js 放 `assets/vendor/`（本地化，禁 CDN——网络不可达且违反确定性）。
- 渲染器用 `renderer.render(scene, camera)` 需要在每次 seek 后触发：
  把 render 调用挂进 GSAP onUpdate 或注册 `tl.eventCallback("onUpdate", render)`。
- 低多边形建模够用：BoxGeometry/CapsuleGeometry/CylinderGeometry + EdgesGeometry
  线框叠层，配 NEON 色板 emissive；检测框用 LineSegments(EdgesGeometry(Box)) 贴合。
- 性能：单场景 ≤3 个光源、≤5 万三角面；antialias:true；`powerPreference:"high-performance"`。

## 反模式（会被 QA/复盘点名）

- ❌ 例子里一整屏 CSV 式表格 + 旁白念数字（EP05 k06/k18 教训）
- ❌ "检测框"画在空白矩形网格上（没有可检测的实体）
- ❌ 3D 场景只有正面固定机位（无空间信息量）
- ❌ three.js 动画用自走时钟（渲染 seek 后漂移）

## 与其他技能的配合

- 动效法则：`motion-doctrine` 先读（向量法则适用于 3D 相机）。
- 登记表：每个 3D 例子在 3-figures/README.md 登记行注明「three.js · 3D」。
- 豁免：抽象数学例子（无具象对象）写 route-decision（stage=figures，
  skill=threejs-visual-example, decision=skipped, reason=抽象数学无具象对象）。
