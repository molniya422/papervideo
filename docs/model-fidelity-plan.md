# 建模精度提升方案（2026-11-04 · 深入研究 + 分步执行）

> 来源：NMS 试片评审——B 配方（构图/运镜/标注）通过，但"建模精度实在太低"。
> 本文回答三件事：为什么低精（解剖）、能有多精（路线对比）、怎么落地（具体到每一步）。

---

## 1. 现状解剖：为什么"看起来低精"（按视觉权重排序）

以 `lib3d.js carMesh`（v5 版）为例，逐层定位：

| # | 病因 | 证据（代码位置） | 视觉后果 |
|---|---|---|---|
| 1 | **单一 2D 侧影挤出成型** | `carMesh`: 一个 `Shape.quadraticCurveTo` 侧影 → `ExtrudeGeometry(depth 1.58)` | 车身是"挤出香肠"：没有轮拱（轮子是插在光滑板上的圆柱）、没有窗线内凹、引擎盖/行李箱无体块差 |
| 2 | **无环境贴图** | 全库只用 `MeshStandardMaterial`，`scene.environment` 从未设置 | 车漆/金属没有反射内容——roughness 0.28 + metalness 0.55 在无 envMap 时等于哑光塑料，"泥感"的主因 |
| 3 | **无真实阴影** | `sharedRenderer` 未开 `shadowMap`；`contactShadow` 是 canvas 画的黑圆贴图 | 物体"浮"在网格上，落地感差；假阴影在物体旋转时穿帮 |
| 4 | **玻璃是方盒** | `glass = BoxGeometry(1.42,0.4,1.36)` | 座舱与车身脱节，玩具感 |
| 5 | **倒角与曲线段不足** | `bevelSegments:3, curveSegments:14` | 轮廓圆钝，高光一滑就穿帮 |
| 6 | **材质参数未按部件分级** | `smoothMat(color,0.28,0.55)` 一把梭 | 车漆/橡胶/玻璃/镀铬混用一套 roughness-metalness |

**结论**：低精不是 three.js 的上限，是"没启用 three.js 已有的东西"。
r186 bundle 实测含 **PMREMGenerator / MeshPhysicalMaterial / ShadowMaterial**——
环境反射、清漆车漆、真接触阴影三件套全部零依赖可做。

---

## 2. 路线对比（研究结论）

| 路线 | 精度上限 | 成本 | 确定性 | 离线 | 决策 |
|---|---|---|---|---|---|
| **A. lib3d v2 程序化升级**（envMap + PBR 清漆 + 轮拱挖孔 + 分体座舱 + 真阴影） | 风格化高精（皮克斯玩具级），足够讲解片 | 1-2 天一次性投入，渲染成本不变 | ✅ f(t) 纯函数 | ✅ | **主路线，全片默认** |
| B. CC0 GLTF 资产库（Kenney Vehicle/City Kit） | 实物级 | 需补 GLTFLoader（bundle 缺，走 ghproxy 拉 three/examples 单文件）+ 资产分发 | ✅（GLB 静态） | 下载后 ✅ | **备选**：需要真实车型/街景时启用 |
| C. Blender（blender-visual，已接入） | 写实上限 | 10-100× 渲染成本 | ✅ 固定种子+帧序列 | ✅ | **英雄镜头专用**：物理模拟/复杂曲面才走 |

**纪律不变**：讲解片优先 A；three.js 能做到的不用 Blender；B 仅当 A 的造型语言
撑不住特定对象（真实街景/复杂机械）时引入，且必须登记资产来源与许可。

---

## 3. 执行方案（具体到每一步）

### 第一步 lib3d v2 基础设施（一次性，所有章受益）

1. `buildEnvMap(renderer)`：程序化环境场景（暗地坪 + 暖色天光渐变球 + 2 块发光灯卡）
   → `PMREMGenerator.fromScene()` → `scene.environment`。确定性（纯几何+固定色），约 15 行。
2. `enableShadows(scene, keyLight)`：`renderer.shadowMap.enabled=true`（PCFSoft），
   key DirectionalLight `castShadow` + 固定 shadow.camera 范围，返回 shadow catcher
   （`ShadowMaterial` 平面 opacity 0.35，物体真投影落地）。约 12 行。
3. `paintMat(color)`：`MeshPhysicalMaterial{ clearcoat:1, clearcoatRoughness:0.06,
   metalness:0.55, roughness:0.34, envMapIntensity:1 }`（车漆专用，与橡胶/玻璃分材质）。

### 第二步 carMesh v2（逐项对应病因）

1. **轮拱挖孔**：侧影 Shape 加 `holes: [absarc ×2]` → 挤出后车身自带轮拱，轮子嵌进去。
2. **分体座舱**：第二个更窄的挤出体（窗线内收）+ A/B 柱色块；玻璃用
   `MeshPhysicalMaterial{ transmission:0.55, roughness:0.08 }`。
3. **车轮组件化**：胎（Cylinder 28 段，rough 0.92）+ 轮盘 + 5 辐条（旋转阵列）+ 刹车盘，
   位置嵌进轮拱。
4. **体块差**：引擎盖/行李箱各有独立圆角盒叠出层次；前后保险杠独立件。
5. **细节件保留并升级**：大灯（emissive 胶囊+镀铬框）、尾灯条、格栅横条 ×3、门缝
   （细 LineSegments）、把手。
6. **法线平滑**：body/座舱 `computeVertexNormals()`（关 flatShading）。
7. **personMesh v2 / dogMesh v2**（第二步完成后做）：关节分件（头/躯干/髋/四肢转轴）
   + 衣物色块分层 + 同一套 envMap。

### 第三步 PoC 验证（本次就做）

用 v2 carMesh + envMap + 阴影重渲 entity 风格帧，与试片 v1 车同机位对比 → 用户过目。

### 第四步 验收标准固化（写回工作流，防回退）

"**精度四项**"进风格帧门（entity 帧必须四项齐）：
① 材质有环境反射（车漆 clearcoat 可见高光流动）② 真接触阴影（ShadowMaterial 落影）
③ 轮拱/窗线等结构细节 ≥4 处 ④ 玻璃非裸 Box（透射/分件）。

### 第五步 工作流登记（已完成项见 §4）

- `model_builder.md`：新 API + 精度四项 + 禁止回退裸 BoxGeometry/无 envMap 场景。
- `threejs-visual-example/SKILL.md`：新增"建模精度标准"章节。
- `preview-review/SKILL.md` + `contracts.yaml`：风格帧门 acceptance 换成精度四项。
- `model_manifest.json` 约定 `fidelity` 字段：`{envMap, shadows, clearcoat, wheelArches, ...}`
  逐项布尔，机器可查（导演/评审据此核对）。
- `WORKFLOW-MAP.md` 登记 lib3d v2；lessons 写回。

---

## 4. 落地状态

- [x] 研究（本文档）
- [x] lib3d v2 基础设施（buildEnvMap/enableShadows/paintMat，initScene 自动挂载）+ carMesh v2（轮拱/座舱/辐条轮/清漆）
- [x] PoC 同框对比（output/yolo-v6/4-video/pilot/poc.mp4 · poc_still.png：v1 挤出面包 vs v2 结构车）
- [x] 提示词/技能/合同更新（精度四项 + 资产小样门 + blender-visual 条件强制拆分）
- [ ] **全库 v2 重建**（systemic）：person/dog/building/lamp/tree/trash/bird 逐个走
  "v2 规格 → 单模型小样 → 资产门过审 → 入库"，每模型产 fidelity 字段；carMesh 为样板（已完成）
- [ ] Blender 强制边界（已入 contracts）：物理模拟=硬触发不可豁免；封面/英雄镜头=导演可选
