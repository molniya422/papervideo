# Attention Is All You Need · 3D 讲解片（HANDOFF）

9 镜头、3 分 05 秒、1920×1080 / 30fps。three.js（@remotion/three + @react-three/fiber）驱动 3D 场景，
中文旁白由 edge-tts 生成，环境配乐用 numpy 代码合成，字幕与进度条由同一份时间轴派生。

## 一、文件地图

| 文件 | 作用 |
|---|---|
| `src/paper-attention/timeline.ts` | **唯一时间轴**：镜头帧长、章节名、字幕分段与权重 |
| `src/paper-attention/theme.ts` | 配色、字体、缓动、确定性伪随机 `rnd()` |
| `src/paper-attention/three/kit.tsx` | 复用 3D 组件：相机运镜、星空、发光球、弧线、正弦丝带、柱体、灯光 |
| `src/paper-attention/Chrome.tsx` | 全局叠层：章节标签、字幕、进度条、时间码、水印 |
| `src/paper-attention/shots-a.tsx` | 镜头 1 开篇 / 2 RNN 串行 / 3 全连接；另含 `Stage3D`、`ShotBullets`、`DepthBadge` |
| `src/paper-attention/shots-b.tsx` | 镜头 4 QKV / 5 缩放 √dk / 6 多头；另含 `FormulaCard` |
| `src/paper-attention/shots-c.tsx` | 镜头 7 位置编码 / 8 结果 / 9 收尾 |
| `src/paper-attention/Main.tsx` | 合成入口：Sequences + 旁白音轨 + BGM |
| `public/audio/seg1..9.mp3` | 9 段中文旁白（edge-tts，zh-CN-YunxiNeural，+8%） |
| `public/audio/bgm.wav` | 190s 环境铺底（Am-F-C-G 慢速和弦 + 低频脉冲 + 空气噪声） |

## 二、镜头表（帧长由旁白实测时长决定）

| # | 镜头 | 旁白时长 | 帧长 | 3D 内容 |
|---|---|---|---|---|
| 1 | 开篇 · 四个字的论文 | 17.47s | 536 | 星空 + 线框二十面体 + 核心光球 + 三轨道环，镜头推进 |
| 2 | RNN 的两个死结 | 22.56s | 689 | 7 个节点沿 Z 轴纵深排列，信号光点逐节点传递 5 轮 |
| 3 | 一步直达 | 16.63s | 511 | 6 节点环形全连接（15 条弧线），镜头穿入网心再退出 |
| 4 | Q / K / V | 18.60s | 570 | 主语发射 Q，逐渐转向候选词的 K；打分闪光；V 粒子弧线汇聚 |
| 5 | 除以 √dk | 26.30s | 801 | 左右两组 3D 柱：one-hot 尖峰 vs 平滑分布，镜头横移 |
| 6 | 八个头 | 20.52s | 628 | 8 块权重点阵面板绕环旋转，随后向中心汇聚成拼接柱 |
| 7 | 位置编码 | 21.05s | 644 | 三条不同频率正弦丝带，镜头沿 X 轴平移，底部位置刻度 |
| 8 | 数字有多硬 | 18.50s | 567 | BLEU 与算力两组 3D 柱（截断轴 / log10），镜头轻移 |
| 9 | 收尾 | 19.85s | 608 | 编码器/解码器各 6 层堆叠 + 交叉注意力光束，镜头拉远压暗出标题 |

## 三、重新生成素材

```bash
# 旁白（改文案后只重跑这一句，其余缓存不动）
cd output/test-attention/4-video
uv run --no-project --with edge-tts python tts_gen.py

# 配乐
uv run --no-project --with numpy python make_bgm.py
```

## 四、预览与渲染

```bash
cd D:/papervideo/remotion-studio
npx remotion studio src/index.ts                       # 实时预览（选 PaperExplain3D）
npx remotion render PaperExplain3D out/video.mp4 --concurrency=4
npx remotion still PaperExplain3D out/f.png --frame=220 # 单帧验收
```

## 五、动效铁律（改镜头时必须遵守）

1. 所有动画只能由 `useCurrentFrame()` 推导；禁止 `setTimeout` / `useState` / `Math.random()`。
   需要随机时用 `rnd(seed)`（正弦哈希，逐帧稳定）。
2. 每个镜头组件接收 `frames`，内部进度用 `frame / frames` 归一化，改旁白长度时无需改镜头代码。
3. 相机每帧用 `<CameraRig position lookAt />` 直接写入；不要在 `useFrame` 里做插值。
4. 字幕、进度条、章节都由 `timeline.ts` 派生；改文案只改这一处。
5. 3D 场景保持「几何复用 + 透明度动画」，避免逐帧重建 TubeGeometry 等昂贵对象。

## 六、验收记录

- 静帧覆盖 9 个镜头 14 个时间点，修复：面板标签压标题、公式卡压字幕、结果柱比例失真、结尾标题压 3D、开篇文字可读性。
- 音轨检查：AAC 双声道；BGM 音量 0.19 给旁白让位。
- 抽帧检查：字幕不越界、进度条与时间码一致、结尾淡出正常。
