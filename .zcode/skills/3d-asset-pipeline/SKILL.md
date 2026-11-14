---
name: 3d-asset-pipeline
description: |
  可重复的 3D 资产生产流水线：brief（model-asset-brief 输出）→ 来源策略执行（CC0 下载 /
  AI 生成 / 程序化三条路线，各带可重跑程序与存证规范）→ three.js 接入合同（GLB 规格）→
  双层质检（Blender 预览 + 场景内快照）→ 资产注册表与许可证存证。
  每个资产、每部视频都走同一条流水线；新增资产 = 新增一份 brief + 跑一遍管线，不是重新发明。
  任何 3D 资产生产/引入时使用（与 model-asset-brief 配对：先描述，后生产，再登记）。
---

# 3D Asset Pipeline（可重复资产流水线）

**一句话**：资产不是一次性手工艺品——每个资产 = 一份 brief + 一条路线执行 + 一次登记；
下次要"人"、要"车"、要"树"，重跑同一条管线，只换 brief。

## S1 · Brief（上游：model-asset-brief 强制网关）

入口条件：`3-figures/asset_briefs/<asset>.md` 已过 12 字段谓词、导演已过目。
brief 是整条管线的**唯一输入**——来源选择、提示词、验收清单都从它读，禁止绕过。

## S2 · 来源策略执行（三路线，brief 第 9 字段决定，全部可重跑）

### R1 · CC0 生产级下载（首选——真拓扑/UV/贴图，版权最干净）
1. **只允许第一方官方源**：quaternius.com / kenney.nl / KhronosGroup 官方仓库
   （直连不畅可用镜像前缀）。第三方"模型站"一律禁用。
2. 下载即存证：许可证原文/页面快照 → `4-video/hf/assets/LICENSES/<asset>.md`
   （来源 URL + 许可证 + 下载日期 + 署名要求）。
3. 合格性验收：对着 brief 第 11 字段验收清单逐条打勾；不过格 → 换备选，不将就。
4. 适配：three.js 侧重调色至纸面色板（几何/贴图保留）；修改权 CC0 允许。

### R2 · AI 生成（hyper3d-rodin MCP 等）
1. 提示词 = brief 第 2 字段**原文**（15-40 词，单主体单风格），禁现场编。
2. 生成消耗积分——提交前向用户报量；失败查同 ID，不自动重提交。
3. 产出 GLB → 同 S3/S4 检查；贴图分辨率 ≥2K、无接缝。
4. 存证：generation_id + 平台条款要点记入 LICENSES。

### R3 · 程序化/Blender 脚本
1. 脚本是 brief 的**逐字段翻译**（比例表→坐标、材质表→BSDF、细节清单→几何操作）。
2. 模板：`assets/blender/build_<asset>.py`（blob-fuse 仅限无机几何；有机体需
   盒模+细分+毛发粒子路线，按 brief 验收清单预判轮数）。
3. 每轮：构建 → EEVEE 预览 PNG → 导演看图 → 按 brief 修订；禁止不看图连跑。

## S3 · three.js 接入合同（所有路线统一）

- **GLB 规格**：Y-up、+Z 前进、原点在脚底几何中心、单位=场景单位（建模即按目标尺度）。
- **加载**：lib3d `loadGLB(url, { material, scale, pos, rotY })`（规范源已实现，
  依赖 window.GLTFLoader——`_3dentry.js` 打包注入；GLTFLoader 与 utils 已 vendor）。
- **材质**：默认重挂纸面色板 `paperMaterial(color)`（几何/贴图保留，材质统一）——
  风格一致性归导演；保留原生贴图时须过色板核对。
- **确定性**：GLB 为静态资产，f(t) 可 seek；动画绑定（如需要）用 glTF 动画 + mixer 按时间轴采样。

## S4 · 双层质检（每资产必过，两层都要有用户可审的图）

| 层 | 工具 | 判定 |
|---|---|---|
| 资产层 | **转台预览图**：`python -m paperpipe preview --assets-only` 自动生成
（assetview 迷你项目：lib3d loadGLB 原生材质 + Box3 自适应取景 + Idle 姿态，
三机位 PNG → `3-figures/asset_previews/<asset>/a1..a3.png`）；
GLB 无法在 three.js 正确呈现时的备选：Blender EEVEE side+iso 双机位 | brief 第 11 字段验收清单逐条打勾（剪影/材质/拼接/色板/尺度）；figures 门与预览门都查这些图——**用户按图审建模** |
| 场景层 | `npx hyperframes snapshot`（在章节场景内） | 精度四项（环境反射/接触阴影/细节≥4/无裸盒）+ 零遮挡 + 与检测框并列比例可信 |

任一层不过 → 回 S2/S3 修，禁止"先这样，后面再看"。

## S5 · 登记与存证（执行器门禁可查）

- `3-figures/asset_registry.json`：每资产一条
  `{name, brief, source(route+url), license, glb, bbox, palette, quality_gate, used_in[]}`。
- 外部/AI 资产的 **LICENSES/<asset>.md 必须存在**（程序化 lib3d 资产免登记——brief 即出处）。
- 执行器谓词：`hf/assets/models/*.glb` 逐一核对注册表条目 + 许可证文件缺失 → figures 门不放行。

## Misuse
- 拿到一次成功的狗就手搓下一个模型（= 放弃流水线）
- 下载不存许可证；AI 生成不存 generation_id
- 绕过 brief 直接"先看看素材"
- GLB 朝向/原点/尺度随手摆（接入合同三要素必须成立）

## Alt
无——与 model-asset-brief 配对的唯一生产流程。
