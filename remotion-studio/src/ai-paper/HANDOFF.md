# Transformer 讲解片 v2 · HANDOFF

10 镜头 / 5 分 29 秒 / 1920×1080 / 30fps。字幕由**逐句独立音轨**驱动，与语音天然同步；
版面采用**左右分区**（文字区 640px + 3D 舞台 1280px + 底部字幕带 128px），三类元素物理隔离。

## 一、为什么是这套结构

v1 的三个问题与对应解法：

| 问题 | 原因 | v2 解法 |
|---|---|---|
| 字幕对不上 | 按"权重"把整段旁白切到镜头时长上，语音并不按此节奏 | 旁白**逐句合成**，每句一个 `<Sequence>` 同时挂 `<Audio>` 和字幕条；镜头帧长 = 各句实测时长之和 |
| 文字与动画遮挡 | 全屏 3D 上直接叠字 | `TEXT_W=640` 文字区、`STAGE_X=640` 3D 舞台、`CAPTION_H=128` 字幕带；舞台 `overflow:hidden`，物理上不可能侵入 |
| 3D 太简单 | 只有球和线 | 用真实结构：注意力矩阵（瓦片高度=权重）、Q/K/V 管道、8 头模式阵列、位置编码热力图、编码器/解码器堆叠 + 子层色条 |

## 二、文件地图

| 文件 | 职责 |
|---|---|
| `output/test-attention/5-video-final/narration.json` | **内容源**：10 镜头、逐句旁白、标题/要点/配色 |
| `.../tts_build.py` | 逐句 edge-tts 合成 + ffprobe 量时长 + 生成 `timeline.generated.ts` |
| `.../make_bgm.py` | numpy 合成 340s 环境铺底 |
| `src/ai-paper/timeline.generated.ts` | 自动生成，勿手改：句子起始帧、镜头帧长、要点触发帧 |
| `src/ai-paper/layout.tsx` | 版面常量、`Stage`（含景深粒子+径向渐变）、`TextPanel`、`CaptionBand` |
| `src/ai-paper/three/parts.tsx` | 3D 构件：矩阵瓦片、向量列、条形、弧线、热力图（DataTexture）、层堆叠、曲线 |
| `src/ai-paper/shots1-5.tsx` / `shots6-10.tsx` | 10 个镜头 |
| `src/ai-paper/Main.tsx` | 组合：镜头 Sequences + 逐句音频/字幕 + 顶部进度条与时间码 |

## 三、镜头表

| # | 内容 | 时长 | 3D 主体 |
|---|---|---|---|
| 1 | 开篇（全屏 + 实底标题卡） | 25s | 三层纸面、14 个环绕 token、线框二十面体、轨道环 |
| 2 | RNN 串行 | 35s | 6 令牌 + 阅读光点 + 长依赖衰减弧 + 96 格 GPU 阵列（仅 2 格工作）+ 时间步刻度 |
| 3 | 查字典（Q/K/V 隐喻） | 34s | Query 球、6 张词条卡（Key 条 + Value 条）、按相似度加权的连线、权重矩阵 |
| 4 | 逐步计算 | 38s | Q → K → 分数条 → softmax 概率条 → V → 输出的五段管道，底部阶段标签，顶部公式 |
| 5 | 除以 √dk | 39s | 左右两组 3D 分布（one-hot 尖峰 vs 平滑）+ 贴合分布的概率曲线 + Var/σ 标注 |
| 6 | 多头 | 33s | 8 个 5×5 注意力矩阵，八种可辨识模式（对角/因果/局部/中心块…），汇聚成拼接矩阵 |
| 7 | 位置编码 | 38s | 位置×维度热力图（DataTexture）+ 单位置"指纹"点列 + 位置刻度 |
| 8 | 架构 | 34s | 编码器/解码器各 6 层堆叠 + 子层色条（注意力/FFN）+ 交叉注意力光束 + 残差旁路 |
| 9 | 结果 | 33s | BLEU 与算力两组 3D 柱（截断轴 / log10）+ 高度刻度 + 分组标注 |
| 10 | 收尾（全屏） | 22s | 44 个 token 螺旋收束 + 核心光球 + 标题卡 |

## 四、改内容的工作流

```bash
# 1) 改 narration.json（句子是语法单位：一句一个音频、一条字幕）
# 2) 重新合成并重建时间轴（只重做改动过的句子）
cd output/test-attention/5-video-final
uv run --no-project --with edge-tts python tts_build.py
# 3) 静帧检查
cd D:/papervideo/remotion-studio
npx remotion still TransformerExplained out/f.png --frame=4455
# 4) 全片
npx remotion render TransformerExplained out/v.mp4 --concurrency=4
# 5) 响度归一（内置 ffmpeg 有 loudnorm）
ffmpeg -i out/v.mp4 -c:v copy -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 192k final.mp4
```

## 五、动效与排版铁律

1. 动画只能由 `useCurrentFrame()` 推导；禁止 `setTimeout` / `useState` / `Math.random()`；随机用 `rnd(seed)`。
2. 带位置动画时，**缩放要套在定位组的内层**：`<group position=...><group scale=...>`。
   把 `scale` 和子元素 `position` 放在同一层会让元素被"拉回原点"（v2 踩过这个坑）。
3. 所有文字只出现在文字区/字幕带/舞台顶部的固定标注位；不要往 3D 中部叠字。
4. 矩阵、向量的尺寸在 0.2–0.3 之间最稳；超过 0.4 会互相挤压。
5. 热力图用 `THREE.DataTexture` + `colorSpace = SRGBColorSpace`，否则颜色会发白。
6. 曲线类（softmax）要锚定在柱状图基线上，`y = value * height`，不要用 `(value-0.5)*height`。

## 六、验收记录

- 静帧覆盖 10 个镜头共 20+ 个时间点，迭代修复：变换 bug、卡片贴边、热力图发白、曲线悬空、背板缩放、标题换行。
- 音频：53 句独立音轨 + 340s BGM（音量 0.15），成片 loudnorm 到 −16 LUFS。
- 抽帧：文字区/舞台/字幕带无重叠；字幕随句切换；顶部进度条与时间码一致。
