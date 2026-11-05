# 引用仓库清单（Referenced Repos）

> 本仓库包含 PaperVideo **自研工作流**（`paperpipe/` + `.zcode/skills/` + 文档 + 打包脚本）。
> 配套设施中引用了以下第三方仓库，均为**本地检出/裁剪缓存，不入本仓库**（体积与许可原因），
> 按 `paths.gitignore` 排除。取回方式见各条"恢复"。

## 一、引擎检出（`engines/`，已 gitignore）

| 本地路径 | 上游仓库 | 许可 | 大小 | 用途 | 恢复方式 |
|---|---|---|---|---|---|
| `engines/hyperframes/` | https://github.com/heygen-com/hyperframes | 见仓库内 LICENSE | 338MB | 渲染路线 D：HTML→确定性 MP4（`npx hyperframes`，本机锁 0.8.223） | `git clone https://github.com/heygen-com/hyperframes` |
| `engines/wise-motion/` | https://github.com/WiseWong6/wise-motion (v0.1.22) | Apache-2.0 | 368MB | 101 个 Remotion 动效组件 + 语义检索（match/show/export） | `git clone https://github.com/WiseWong6/wise-motion` |
| `engines/code-animation-prompts/` | https://github.com/XiaoyeCodes/code-animation-prompts | 见仓库内 LICENSE | 76MB | 341 种代码动画风格（193 静帧 + Canvas 参考实现 + 离线挑选器） | 下载 release/zip 解包至同名目录 |
| `engines/motion-lab/` | 上游 URL 待补（package.json 未记录） | 见仓库内 LICENSE | 12MB | 160 个 CSS 动效 + 48 模板（Next.js 实验室） | 待补 |
| `engines/lieflat-code-video/` | 上游 URL 待补（Starter 检出） | PolyForm-Noncommercial-1.0.0 | 411KB | 产品发布片 Remotion Starter（12 kit 模块） | 待补 |
| `engines/blender-pipeline/` | **自建**试验台（test_render.py + output） | — | 164KB | blender-visual 渲染试验 | 随本仓库（如需可移入 git） |

## 二、技能上游缓存（`.tmp-repos/`，已 gitignore，共 ≈250MB）

`.zcode/skills/` 中部分技能源自下列上游仓库的本地裁剪缓存（保留原文档与许可头，改造点见各 SKILL.md 顶部注册说明）：

| 上游缓存目录 | 派生的技能（.zcode/skills/） | 备注 |
|---|---|---|
| `AI_Animation/` | AI Animation 系列 17 个子技能（文档裁剪版） | 上游 512MB+，仅取 17 子技能文档；补素材用 `https://ghproxy.net/` 镜像前缀 |
| `paper-xray/` · `visual-explainer/` · `knowledge-explainer-skill/` · `anatomy/` · `product-launch-motion/` · `ai-flavor-remover/` · `taste-skill/` · `video-evaluator/` · `paper-share-skills/` · `opus55-video-guide-zh/` · `motion-video-kit/` · `Hell-Grind-AIGC-Skill/` · `code-animation-prompts-extract/` | 同名技能 | 各目录内含其原始 README/来源说明；URL 逐条补录中 |

## 三、运行时依赖（不随仓库分发）

| 依赖 | 位置/获取 | 说明 |
|---|---|---|
| ffmpeg / ffprobe | `tools/package.json`（@ffmpeg-installer / @ffprobe-installer，`npm install` 取回） | QA 与响度测量；Remotion 自带 ffmpeg 缺 f32le muxer，勿用 |
| Blender 5.2.4 LTS | `D:\blender\blender-5.2.4-candidate+v52.4f5026e99892-windows.amd64-release\blender.exe` | blender-visual 技能；本机安装于仓库外 |
| Chromium/Chrome | `D:\Chromium\Application\chrome.exe`（渲染时设 `HYPERFRAMES_BROWSER_PATH`） | hyperframes 渲染浏览器；本机安装于仓库外 |
| hyperframes npm 包 | `npx hyperframes@0.8.223` | 0.9.9 会误扫 vendor 报 Math.random，勿升 |
| Remotion 工作台依赖 | `remotion-studio/`（`npm install`） | node_modules 已 gitignore |

## 四、陈旧快照（已移出跟踪）

`.analysis/`（pack 快照 37MB）与 `.tmp_audit_automation/`（pack 暂存 37MB）为历史打包 staging 的残留拷贝，
与 `pack/`、`.zcode/skills/` 内容重复，已移出 git 跟踪并加入 `.gitignore`（磁盘文件保留）。
