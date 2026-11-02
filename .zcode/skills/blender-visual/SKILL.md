---
name: blender-visual
description: >
  Blender 3D 离线渲染——高保真模型/PBR 材质/物理模拟/粒子系统/相机动画，
  输出确定性帧序列或 MP4。适用于 three.js 精度不够的章节（物理模拟/复杂曲面/流体/布料/粒子）。
  Blender 5.2.4 LTS 位于 D:\blender\blender-5.2.4-candidate+v52.4f5026e99892-windows.amd64-release\blender.exe
---

# Blender Visual（Blender 3D 离线渲染）

将 enriched_spec 中的 3D 场景用 Blender 离线渲染为确定性帧序列（PNG）或 MP4。
输出由 aggregator 以 `<video>` 或帧序列合入 hyperframes 作为视频层。

## 定位（与 three.js 的关系）

| | three.js（threejs-visual-example） | Blender（本技能） |
|---|---|---|
| 精度 | 低多边形（程序化） | 高保真（GLTF/FBX 导入或 Blender 建模） |
| 材质 | MeshStandardMaterial | PBR（Principled BSDF，可含次表面/清漆/布料） |
| 物理 | 无（手动位姿） | 刚体/软体/布料/流体/粒子系统 |
| 渲染 | 实时（浏览器内） | 离线（EEVEE 实时或 Cycles 路径追踪） |
| 确定性 | f(t) 纯函数 | 固定种子 + 固定相机路径 + 固定帧率 |
| 成本 | 低（DOM 级） | 高（10-100×） |
| 适用 | 大多数章（15/22） | 需要物理模拟/复杂曲面/高保真的少数章 |

**选择规则**：three.js 能做到的不用 Blender；只有需要物理模拟（碎片飞散/布料飘动/流体）、
高保真 PBR 材质（金属漆/次表面散射）、或 GLTF/FBX 外部模型导入时才走 Blender。

## Blender 路径

```
D:\blender\blender-5.2.4-candidate+v52.4f5026e99892-windows.amd64-release\blender.exe
```

简称 `$BL`。版本 5.2.4 LTS · Python 3.13.13 · bpy/mathutils/bmesh/gpu 可用。

## 确定性渲染管线

```python
import bpy, os, math

# ── 1. 清空默认场景 ──
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

# ── 2. 固定随机种子（确定性）──
import random
random.seed(42)

# ── 3. 建模/导入（GLTF/FBX/OBJ）──
# bpy.ops.import_scene.gltf(filepath="model.gltf")

# ── 4. 材质（PBR）──
mat = bpy.data.materials.new("NeonOrange")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (1.0, 0.549, 0.258, 1)
bsdf.inputs["Emission Color"].default_value = (1.0, 0.549, 0.258, 1)
bsdf.inputs["Emission Strength"].default_value = 0.3

# ── 5. 相机动画（确定性 f(frame)）──
scene = bpy.context.scene
scene.frame_start = 0
scene.frame_end = 150          # 5s @ 30fps
scene.render.fps = 30
# 用 constraint 或 keyframe 驱动相机 orbit：
# cam.location = (r*cos(az)*cos(elv), r*cos(elv)*sin(az), r*sin(elv))

# ── 6. 渲染设置 ──
scene.render.engine = 'BLENDER_EEVEE'   # Blender 5.2：EEVEE（非 EEVEE_NEXT）
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.image_settings.file_format = 'PNG'
# 或输出 MP4：
# scene.render.image_settings.file_format = 'FFMPEG'
# scene.render.ffmpeg.format = 'MPEG4'
# scene.render.ffmpeg.codec = 'H264'

# ── 7. 输出 ──
scene.render.filepath = "//output/frame_"
scene.render.use_overwrite = True

# 逐帧渲染（确定性）：
for frame in range(scene.frame_start, scene.frame_end + 1):
    scene.frame_set(frame)
    bpy.ops.render.render(write_still=True)
# 或批量：
# bpy.ops.render.render(animation=True)
```

## CLI 调用

```bash
$BL --background --factory-startup \
    --python-exit-code 1 \
    --python scene_script.py
```

- `--background`：无 GUI（headless）
- `--factory-startup`：忽略用户偏好（确定性）
- `--python-exit-code 1`：脚本出错即退出码 1
- 首次调用验证：`$BL --background --factory-startup --python-expr "import bpy; print(bpy.app.version_string)"`

## 与 PaperVideo 的集成点

| 集成方式 | 说明 |
|---|---|
| **视频层** | Blender 输出 MP4 → aggregator 以 `<video>` 元素合入 hyperframes（作为背景层或前景层） |
| **帧序列** | Blender 输出 PNG 序列 → aggregator 以 `<img>` 每帧切换（更精确但文件大） |
| **静态帧** | 单帧 PNG 作为高保真插图嵌入章（如 k06 张量的 Blender 渲染替代 three.js 体素） |
| **深度合成** | Blender 输出 Z-depth pass → 后处理景深/雾效（高级） |

**aggregator 的处理**：Blender 帧序列输出为 `4-video/blender/<chapter>/frame_0001.png …`，
aggregator 在对应章的 enriched_spec 中标注 `blender_layer: {src: "4-video/blender/chXX/", format: "png_seq"}`，
组装时插入 `<video>` 或帧序列播放器。

## 确定性保障

- 固定随机种子：`random.seed(42)` / `numpy.random.seed(42)` / Blender 内部 `bpy.app.debug_events`
- 相机动画用 keyframe 或约束（不用 physics simulation 的非确定性反弹——除非 bake 成 keyframe）
- 物理模拟（刚体/布料/流体）须 **bake** 后才确定性：`bpy.ops.ptcache.bake_all(bake=True)`
- 渲染帧率固定 30fps（与 hyperframes 全片一致）
- 相同输入 + 相同 Blender 版本 = 相同输出（逐像素一致）

## 性能参考

| 引擎 | 640×360 单帧 | 1920×1080 单帧 | 150 帧 @1080p |
|---|---|---|---|
| EEVEE | <1s | 1-3s | 2-8 min |
| Cycles (128 samples) | 5-15s | 30-120s | 75-300 min |

EEVEE 足够大多数章（NEON ORBIT 风格不依赖路径追踪）；Cycles 仅在需要
折射/次表面散射/严格 PBR 时使用。

## 反模式

- ❌ three.js 能做的用 Blender（渲染成本高 10-100×）
- ❌ 随机种子未固定（"反正看起来差不多"——渲染时每个 worker 的帧会不同）
- ❌ 物理模拟不 bake 就渲（每帧结果不可复现）
- ❌ 把 Blender 渲染结果当"最终成片"——它只是 hyperframes 里的一层
