---
name: remotion-video
description: |
  Build fully custom animated explainer videos with Remotion in the local remotion-studio
  workspace (D:\papervideo\remotion-studio). Use when the user wants programmatic video:
  React/SVG/canvas-driven motion graphics, physics simulations, chart animations, or any
  scene beyond the built-in templates of knowledge-explainer-skill. Trigger on "remotion",
  "自定义动画视频", "写动画场景", "custom animation video", "motion graphics". For
  template-driven markdown→mp4, prefer knowledge-explainer-skill instead.
version: 1.0.0
---

# Remotion 自定义讲解视频（remotion-studio 工作台）

本工作区在 `D:\papervideo\remotion-studio` 预装了 Remotion 4 + React 19 + headless Chrome。
技能 `knowledge-explainer-skill` 是"模板化、文稿驱动"的快速路线；本技能是"场景级自定义"的进阶路线——
任何 React 能画的东西都能成为视频场景。

## 何时用本技能

- 需要物理仿真（双摆、粒子、弹簧网络）、自定义数据可视化、复杂镜头编排
- knowledge-explainer-skill 的 6 个内置版式 + 简单 custom 组件装不下这个创意
- 需要多条 Composition（例如同一篇论文出横版 16:9 与竖版 9:16）

## 工作台结构

```
remotion-studio/
├── package.json          # remotion 4 + react 19（依赖已安装）
├── remotion.config.ts    # jpeg 帧格式、允许覆盖输出
├── tsconfig.json
└── src/
    ├── index.ts          # registerRoot 入口
    ├── Root.tsx          # 所有 <Composition> 注册处 + TitleCard 起手模板
    └── (按论文/主题新建场景文件，如 src/paper-xxx/)
```

## 核心工作流

1. **写场景**：在 `src/` 新建组件文件。铁律：
   - 动画只用 `useCurrentFrame()` + `interpolate()` / `spring()` 驱动——同一帧必须渲染出同一画面；
   - 禁止 `setTimeout`、`Math.random()`（要随机用 `<Random seed={...}>`）、外部可变状态；
   - 中文字体用 `system-ui, 'Microsoft YaHei', sans-serif` 或 `@remotion/google-fonts`；
   - 每个 `useVideoConfig()` 拿 fps/duration/width/height，不要硬编码。
2. **注册 Composition**：在 `src/Root.tsx` 的 `RemotionRoot` 里加
   `<Composition id="Xxx" component={Xxx} durationInFrames={n} fps={30} width={1280} height={720} defaultProps={...} />`。
3. **预览**：`npm run studio`（打开 http://localhost:3000 实时预览，确认节奏和时长）。
4. **渲染**：
   ```bash
   cd D:\papervideo\remotion-studio
   npx remotion render <CompositionId> out/<name>.mp4           # 全片
   npx remotion render <CompositionId> out/x.mp4 --frames=0-90  # 抽段试渲
   npx remotion still <CompositionId> out/thumb.png --frame=60  # 封面帧
   ```
   渲染参数常用：`--scale=2`（画质翻倍）、`--concurrency`（并行度）、`--muted`（无音频）。
5. **验收**：渲染完成后用 Read 工具查看抽帧 PNG（`npx remotion still` 多取几帧），确认文字不溢出、动画到位，再交付。

## 科普讲解片标准配方（已在 Attention 项目验证）

做"论文讲解视频"时，默认不要用模板套文字——那是幻灯片。用下面这套 3D 讲解片配方：

1. **旁白先行，逐句合成**：写 40–60 句中文口播稿（一句一个语义单元），**逐句**用 edge-tts 合成，
   每句一个音频文件，用 ffprobe 量出真实时长。
   **镜头帧长 = 该镜头所有句子时长之和**；每句在 Remotion 里是一个 `<Sequence>`，
   同时挂 `<Audio>` 和字幕条——字幕与语音因此天然对齐，不会"对不上"。
   ```bash
   uv run --no-project --with edge-tts python tts_build.py   # 自动生成 timeline.generated.ts
   ```
2. **版面物理隔离**：文字区（约 640px）+ 3D 舞台（其余宽度）+ 底部字幕带（约 128px），
   三块互不重叠；舞台容器 `overflow:hidden`。不要在全屏 3D 上直接叠字。
3. **每镜头一个 three.js 场景，用真实结构而不是装饰**：
   注意力权重用矩阵瓦片（高度=权重）、Q/K/V 用向量列与矩阵、位置编码用 DataTexture 热力图、
   架构用层堆叠 + 子层色条。相机每帧用 `<CameraRig>` 写位；几何 `useMemo` 复用，只动材质/缩放/位置。
   注意：**缩放要套在定位组的内层**（`<group position><group scale>`），否则子元素会被拉回原点。
4. **全局叠层**：顶部进度条 + 时间码；文字区放章节/标题/要点（要点触发帧由时间轴生成）。
5. **配乐代码合成**：numpy 生成慢速和弦铺底（音量 0.15 左右），完成后用 ffmpeg `loudnorm=I=-16` 归一。
6. **静帧先行**：每个镜头先渲 1–2 张 `remotion still`，检查文字压图、元素重叠、热力图色彩空间
   （`DataTexture` 必须设 `colorSpace = SRGBColorSpace`）、曲线是否锚定基线，再全片渲染。
7. **抽帧验收**：按 20–30 秒抽帧，检查字幕随句切换、无遮挡、进度条一致；再量响度。

参考实现：`remotion-studio/src/ai-paper/`（10 镜头 / 5 分 29 秒 / 1080p），
说明见同目录 `HANDOFF.md`；旧版 `src/paper-attention/` 保留作对照。

## 与论文讲解工作流的关系

本技能是 `paper-explain` 工作流第 4 阶段（动画视频）的"自定义路线"：
- 快速出片 → `knowledge-explainer-skill`（写 script.md，一条命令出 mp4）
- 学术幻灯片风 → `paper-to-beamer` + `paper-slides-to-video`
- 完全自定义动画/仿真 → 本技能（remotion-studio）

三者的成品 mp4 都可交给 `paper-video-cover`（封面）与 `paper-bilibili-uploader`（B 站发布）。
