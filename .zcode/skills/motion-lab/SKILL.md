---
name: motion-lab
description: >
  Motion.Lab 动效库 — 160 个精选前端动效（基础 42/文字 40/交互 40/高级 38），每个动效含
  可直接复制的 HTML/CSS/JS 源码与可调参数，另有 48 套整页模板（brutalism/neumorphism/cyberpunk/y2k 等）。
  当用户要"给页面/组件加动画"、"找个动效"、"粒子/滚动驱动/文字动效"、"页面模板"，
  或在 HTML 图解、Remotion 画面里需要现成动效源码时使用。
  源码检出在 engines/motion-lab（含可 npm run dev 的交互实验室）。
---

# Motion.Lab 动效库（160 动效 · 48 模板）

> 用法：在本文件按名称/标签定位动效 → 读 `references/effects/<id>.md` 拿参数与 HTML/CSS/JS 源码 → 复制进目标页面或 Remotion。
> 交互实验室在 `engines/motion-lab`（npm install && npm run dev）；单文件离线预览 `engines/motion-lab/motion-lab-showcase.html`。

## 基础（basic）— 42 个

| ID | 名称 | 难度 | 说明 |
|----|------|------|------|
| `fade-in` | 淡入 Fade In | ★ | 元素从透明渐入到不透明,最基础的进入动画。 |
| `fade-in-up` | 上滑淡入 Fade In Up | ★ | 元素从下方淡入,常用于列表项。 |
| `slide-in-left` | 左侧滑入 Slide In Left | ★ | 元素从左侧滑入视口。 |
| `slide-in-right` | 右侧滑入 Slide In Right | ★ | 元素从右侧滑入视口。 |
| `zoom-bounce` | 缩放弹跳 Zoom Bounce | ★ | 元素放大入场,带弹跳回弹。 |
| `flip-x` | 水平翻转 Flip X | ★★ | 元素绕 X 轴翻转入场。 |
| `rotate-in` | 旋转入场 Rotate In | ★ | 元素从旋转状态回归原位。 |
| `pulse` | 脉冲 Pulse | ★ | 元素持续放大缩小,吸引注意。 |
| `shake` | 摇晃 Shake | ★ | 元素左右快速摇晃,常用于表单错误提示。 |
| `heartbeat` | 心跳 Heartbeat | ★ | 双拍心跳节奏,模拟真实心跳。 |
| `marquee` | 跑马灯 Marquee | ★★ | 内容从右向左无限滚动。 |
| `spinner` | 加载旋转 Spinner | ★ | 经典加载指示器。 |
| `slide-up` | 上滑入场 Slide Up | ★ | 元素从下往上滑入并淡入,通用入场动画。 |
| `slide-down` | 下滑入场 Slide Down | ★ | 元素从上往下滑入,适合顶部 banner。 |
| `bounce-in` | 弹跳入场 Bounce In | ★★ | 元素入场时多次反弹,有节奏感。 |
| `elastic-in` | 弹性入场 Elastic In | ★★ | 入场时带有明显弹性回弹,生动有趣。 |
| `fade-out` | 淡出消失 Fade Out | ★ | 元素持续淡出后回弹,适合循环演示。 |
| `scale-pulse` | 缩放呼吸 Scale Pulse | ★ | 元素持续缩放形成呼吸效果,比 pulse 更夸张。 |
| `rotate-360` | 持续旋转 Rotate 360 | ★ | 元素持续 360 度旋转,无限循环。 |
| `swing` | 钟摆 Swing | ★★ | 顶部固定,左右摆动,像钟摆一样。 |
| `jello` | 果冻 Jello | ★★ | 元素呈现果冻般的扭曲抖动,俏皮可爱。 |
| `flash` | 闪烁 Flash | ★ | 元素透明度快速闪烁,适合新消息/警告提示。 |
| `fade-in-down` | 上方淡入 Fade In Down | ★ | 元素从上方淡入下滑,通用入场动画。 |
| `fade-in-left` | 左侧淡入 Fade In Left | ★ | 元素从左侧淡入滑入,适合横向布局。 |
| `fade-in-right` | 右侧淡入 Fade In Right | ★ | 元素从右侧淡入滑入,横向入场。 |
| `scale-in` | 缩放入场 Scale In | ★ | 元素从较小尺寸缩放到原始大小入场。 |
| `scale-out` | 缩小归位 Scale Out | ★ | 元素从较大尺寸缩小归位,有收束感。 |
| `flip-y` | 垂直翻转 Flip Y | ★★ | 元素绕 Y 轴翻转入场,类似翻牌。 |
| `flip-in-3d` | 3D 翻转 Flip In 3D | ★★ | 元素以 3D 透视翻转加缩放入场,立体感强。 |
| `wobble` | 摇摆 Wobble | ★★ | 元素左右摇摆晃动,俏皮可爱。 |
| `tada` | 庆祝抖动 Tada | ★★ | 元素放大并轻微旋转抖动,庆祝感强。 |
| `bounce-down` | 向下弹跳 Bounce Down | ★★ | 元素从上方弹跳落下,带多次反弹。 |
| `slide-fade-corner` | 角落滑入 Corner Slide | ★★ | 元素从左上角斜向滑入,带淡入。 |
| `skew-in` | 倾斜入场 Skew In | ★★ | 元素以倾斜状态滑入归位,动感十足。 |
| `blur-in` | 模糊入场 Blur In | ★★ | 元素从模糊状态渐变到清晰,柔和入场。 |
| `blur-out` | 模糊呼吸 Blur Pulse | ★★ | 元素在清晰与模糊间循环呼吸,梦幻感。 |
| `grayscale-in` | 灰度入场 Grayscale In | ★★ | 元素从灰度渐变到彩色,复古转彩色。 |
| `color-cycle` | 色彩循环 Color Cycle | ★ | 元素背景色按 HSL 循环变化,霓虹感。 |
| `border-draw` | 边框画出 Border Draw | ★★ | 边框按顺时针逐步画出,勾勒轮廓。 |
| `shadow-grow` | 阴影生长 Shadow Grow | ★ | 元素阴影循环生长,产生悬浮呼吸感。 |
| `gradient-shift` | 渐变流动 Gradient Shift | ★ | 渐变背景持续流动,色彩柔和过渡。 |
| `typewriter-cursor` | 光标打字 Typing Cursor | ★★ | 带闪烁光标的打字效果,逐字输入循环。 |

## 文字（text）— 40 个

| ID | 名称 | 难度 | 说明 |
|----|------|------|------|
| `typewriter` | 打字机 Typewriter | ★ | 字符逐个出现,模拟键盘输入。 |
| `wave-text` | 波浪文字 Wave Text | ★★ | 每个字符上下波动形成波浪。 |
| `mask-reveal` | 遮罩揭示 Mask Reveal | ★★ | 文字从遮罩下方揭示,常用于 hero 标题。 |
| `split-char` | 字符分裂 Split Character | ★★ | 每个字符从上下分开再合拢。 |
| `gradient-text` | 渐变文字 Gradient Text | ★ | 文字使用 HSL 渐变背景 + 循环动画。 |
| `glitch-text` | 故障文字 Glitch Text | ★★★ | RGB 分离故障效果,赛博朋克风。 |
| `scramble` | 乱码解码 Scramble | ★★★ | 文字先以乱码出现,逐渐解码为目标文字。 |
| `count-up` | 数字滚动 Count Up | ★★ | 数字从 0 滚动到目标值。 |
| `stagger-fade` | 错落淡入 Stagger Fade | ★★ | 多个文字依次淡入,带 stagger 延迟。 |
| `vertical-marquee` | 垂直跑马灯 Vertical Marquee | ★★ | 文字从下往上垂直滚动。 |
| `text-shadow-shift` | 阴影偏移 Shadow Shift | ★★ | 文字阴影循环偏移,产生霓虹闪烁感。 |
| `text-3d` | 3D 文字 3D Text | ★★ | 多层文字堆叠形成 3D 立体透视效果。 |
| `text-rotate-in` | 字符旋转 Char Rotate | ★★ | 每个字符依次旋转入场,强调感强。 |
| `letter-spacing-wave` | 字距呼吸 Letter Spacing | ★ | 字间距循环变化,产生呼吸节奏。 |
| `underline-draw` | 下划线 Underline Draw | ★ | 下划线从左到右逐段画出,适合链接。 |
| `highlight-sweep` | 高亮扫过 Highlight Sweep | ★★ | 高亮条从左到右扫过文字,常用于强调。 |
| `text-blink-cursor` | 闪烁光标 Blink Cursor | ★ | 模拟终端的闪烁光标,极简风格。 |
| `rainbow-text` | 彩虹文字 Rainbow Text | ★ | 文字颜色按彩虹色循环变化。 |
| `text-flip-3d` | 3D 翻面 Flip 3D | ★★ | 文字整体绕 Y 轴 360 度翻转,类似卡片。 |
| `number-marquee` | 数字翻牌 Number Marquee | ★★★ | 类似时钟翻页的数字滚动效果。 |
| `text-fade-up` | 文字上滑 Text Fade Up | ★ | 文字从下方淡入上滑,优雅入场。 |
| `text-slide-left` | 文字左滑 Text Slide Left | ★ | 文字从右侧滑入归位,横向入场。 |
| `text-zoom-in` | 文字缩放 Text Zoom In | ★ | 文字从远处缩放放大入场,有冲击力。 |
| `text-blur-reveal` | 模糊揭示 Blur Reveal | ★★ | 文字从模糊状态揭示为清晰,柔和神秘。 |
| `text-glitch-rgb` | RGB 故障 RGB Glitch | ★★★ | 文字 RGB 三通道分离故障,赛博朋克风。 |
| `text-neon` | 霓虹发光 Neon Text | ★★ | 文字带霓虹灯发光效果,夜店招牌感。 |
| `text-fire` | 火焰文字 Fire Text | ★★★ | 文字带火焰渐变与跳动,炽热燃烧感。 |
| `text-ice` | 冰霜文字 Ice Text | ★★★ | 文字带冰霜蓝白渐变与结晶光泽,寒冷感。 |
| `text-metallic` | 金属质感 Metallic Text | ★★★ | 文字带金属光泽渐变,质感高级。 |
| `text-outline` | 描边文字 Outline Text | ★★ | 文字仅描边显示并循环呼吸,极简风格。 |
| `text-typewriter-multi` | 多行打字 Multi Typewriter | ★★ | 多行文字依次打字输入,循环切换。 |
| `text-delete-retype` | 删除重打 Delete Retype | ★★ | 文字打完后删除再重新输入,循环演示。 |
| `text-wave-3d` | 3D 波浪 Wave 3D | ★★ | 字符以 3D 透视上下波浪起伏,立体波浪。 |
| `text-bounce` | 弹跳文字 Bounce Text | ★★ | 字符依次弹跳,活泼有趣。 |
| `text-rainbow-shift` | 彩虹偏移 Rainbow Shift | ★ | 文字彩虹色循环并轻微偏移,梦幻。 |
| `text-shadow-long` | 长投影 Long Shadow | ★★ | 文字带超长投影,层叠立体感强。 |
| `text-stroke-animate` | 描边动画 Stroke Animate | ★★★ | SVG 描边文字按路径逐步绘制,书写感。 |
| `text-split-reveal` | 分裂揭示 Split Reveal | ★★★ | 文字从中间分裂上下展开揭示,戏剧性。 |
| `text-char-fall` | 字符下落 Char Fall | ★★ | 字符从上方依次下落入位,瀑布感。 |
| `text-word-fly` | 词语飞入 Word Fly | ★★ | 词语依次从远处飞入,带 stagger 延迟。 |

## 交互（interaction）— 40 个

| ID | 名称 | 难度 | 说明 |
|----|------|------|------|
| `magnetic-cursor` | 磁吸光标 Magnetic Cursor | ★★ | 光标靠近元素时元素被吸引。 |
| `three-d-tilt` | 3D 倾斜 3D Tilt | ★★ | 卡片随鼠标 3D 倾斜。 |
| `ripple-click` | 点击波纹 Ripple Click | ★ | Material Design 风格的点击波纹。 |
| `parallax-mouse` | 鼠标视差 Parallax Mouse | ★★ | 多层元素按不同深度响应鼠标。 |
| `blob-cursor` | 粘性光标 Blob Cursor | ★★ | 光标变成一个跟随的彩色 blob。 |
| `hover-image-distort` | 悬停图像畸变 Hover Distort | ★★★ | 悬停时图像被 SVG 滤镜畸变。 |
| `magnetic-button` | 磁吸按钮 Magnetic Button | ★★ | 按钮周围区域吸引按钮位移。 |
| `sticky-stack` | 堆叠翻页 Sticky Stack | ★★★ | 滚动时卡片堆叠翻页效果。 |
| `drag-scroll` | 拖动滚动 Drag Scroll | ★★ | 横向拖动滚动容器。 |
| `color-picker-hover` | 随悬停变色 Color Hover | ★ | 悬停位置产生彩色光晕。 |
| `button-press` | 按钮按下 Button Press | ★ | 鼠标按下时按钮缩放反馈,有手感。 |
| `hover-lift` | 悬停上浮 Hover Lift | ★ | hover 时元素上浮并加深阴影。 |
| `tilt-card-strong` | 强倾斜 Strong Tilt | ★★ | 比 3D Tilt 更夸张的倾斜效果,带光斑。 |
| `spotlight-follow` | 跟随聚光 Spotlight | ★★ | 鼠标位置形成 spotlight 高亮,其余区域变暗。 |
| `mouse-trail` | 鼠标拖尾 Mouse Trail | ★★ | 鼠标移动时留下一串彩色粒子拖尾。 |
| `click-burst` | 点击爆开 Click Burst | ★★ | 点击位置爆开一圈彩色粒子。 |
| `hover-icon-spin` | 悬停旋转 Icon Spin | ★ | hover 时图标旋转一周。 |
| `toggle-flip` | 滑动开关 Toggle Flip | ★★ | 可点击切换的左右滑动 toggle。 |
| `accordion-smooth` | 手风琴 Accordion | ★★ | 点击展开/收起内容,平滑过渡。 |
| `range-drag` | 滑块拖动 Range Drag | ★★ | 可拖动的圆形滑块,显示当前值。 |
| `hover-scale` | 悬停缩放 Hover Scale | ★ | 鼠标悬停时元素放大,平滑过渡。 |
| `hover-rotate` | 悬停旋转 Hover Rotate | ★ | 鼠标悬停时元素旋转,带过渡。 |
| `hover-skew` | 悬停倾斜 Hover Skew | ★ | 鼠标悬停时元素倾斜变形,动感。 |
| `hover-blur` | 悬停模糊 Hover Blur | ★★ | 悬停时背景模糊,聚焦前景元素。 |
| `hover-color-change` | 悬停变色 Hover Color | ★ | 悬停时元素背景色平滑过渡。 |
| `hover-border-expand` | 边框扩展 Border Expand | ★★ | 悬停时边框从中心向四周扩展。 |
| `hover-text-reveal` | 文字揭示 Text Reveal | ★★ | 悬停时隐藏文字从下方滑入揭示。 |
| `hover-image-zoom` | 图片放大 Image Zoom | ★ | 悬停时图片平滑放大,带遮罩。 |
| `hover-flip-card` | 翻转卡片 Flip Card | ★★ | 悬停时卡片 3D 翻转,正反切换。 |
| `hover-glow` | 悬停发光 Hover Glow | ★ | 悬停时元素周围发光晕,聚焦感。 |
| `click-ripple-material` | Material 波纹 Material Ripple | ★★ | Material Design 风格点击波纹扩散。 |
| `click-shockwave` | 点击冲击波 Shockwave | ★★ | 点击产生扩散冲击波环,强烈反馈。 |
| `click-emoji-burst` | Emoji 爆开 Emoji Burst | ★★ | 点击位置爆开一圈 emoji,趣味反馈。 |
| `drag-to-reveal` | 拖动揭示 Drag Reveal | ★★ | 拖动遮罩揭示下方内容,刮刮卡感。 |
| `drag-rotate` | 拖动旋转 Drag Rotate | ★★ | 拖动元素使其 3D 旋转,可交互探索。 |
| `scroll-progress` | 滚动进度 Scroll Progress | ★ | 页面滚动进度条,顶部高亮显示。 |
| `scroll-reveal` | 滚动揭示 Scroll Reveal | ★★ | 元素进入视口时上滑淡入,常见落地页效果。 |
| `scroll-parallax` | 滚动视差 Scroll Parallax | ★★ | 多层元素按不同速度响应滚动,纵深感。 |
| `hover-magnetic-text` | 磁吸文字 Magnetic Text | ★★ | 文字字符被光标磁吸,逐字位移。 |
| `hover-follow-cursor` | 跟随光标 Follow Cursor | ★★ | 元素平滑跟随光标移动,带惯性。 |

## 高级（advanced）— 38 个

| ID | 名称 | 难度 | 说明 |
|----|------|------|------|
| `gsap-scrollTrigger` | 滚动驱动 GSAP ScrollTrigger | ★★★ | 使用 GSAP ScrollTrigger 绑定滚动进度。 |
| `three-particles` | 粒子系统 Three.js Particles | ★★★ | Three.js 渲染的几何粒子系统。 |
| `webgl-shader` | 着色器 WebGL Shader | ★★★ | 自定义 GLSL 片元着色器生成动画。 |
| `canvas-confetti` | 五彩纸屑 Canvas Confetti | ★★ | 撒花庆祝效果。 |
| `lottie-loader` | Lottie 加载 Lottie Loader | ★★ | 使用 Lottie 动画作为加载器。 |
| `morph-svg` | SVG 形变 Morph SVG | ★★★ | SVG path 之间平滑形变。 |
| `grid-magnetic` | 网格磁吸 Grid Magnetic | ★★★ | 网格中每个点对鼠标有磁吸反应。 |
| `sine-wave` | 正弦波 Sine Wave | ★★ | Canvas 渲染的正弦波。 |
| `audio-wave` | 音频条 Audio Wave | ★★ | 模拟音频可视化的跳动条形。 |
| `fractal-tree` | 分形树 Fractal Tree | ★★★ | 递归绘制的分形树动画。 |
| `noise-flow` | 噪声流动 Noise Flow | ★★★ | 基于 value-noise 的 2D 流动场。 |
| `metaball` | 粘性球 Metaball | ★★★ | 模糊叠加形成粘性 metaball 效果。 |
| `physics-spring` | 弹簧物理 Spring Physics | ★★★ | 弹簧物理仿真,拖动后回弹。 |
| `trajectory-path` | 路径运动 Trajectory | ★★ | 元素沿 SVG 路径平滑运动。 |
| `3d-cube-rotate` | 立方体 3D Cube | ★★ | 纯 CSS 3D 立方体持续旋转。 |
| `matrix-rain` | 数字雨 Matrix Rain | ★★★ | Matrix 风格绿色字符雨。 |
| `ripple-water` | 水波涟漪 Water Ripple | ★★ | 点击产生水波涟漪,实时衰减。 |
| `fluid-distort` | 流体畸变 Fluid Distort | ★★★ | 使用 feTurbulence + feDisplacementMap 实现流体畸变。 |
| `particle-fountain` | 粒子喷泉 Particle Fountain | ★★ | Canvas 粒子从底部喷涌向上,受重力下落。 |
| `particle-galaxy` | 粒子星系 Particle Galaxy | ★★★ | Three.js 螺旋星系粒子,缓慢自转。 |
| `shader-plasma` | 等离子着色器 Plasma Shader | ★★★ | GLSL 片元着色器生成等离子流动色彩。 |
| `shader-fireball` | 火球着色器 Fireball Shader | ★★★ | GLSL 着色器生成燃烧火球纹理。 |
| `canvas-snow` | 雪花飘落 Canvas Snow | ★★ | Canvas 模拟雪花飘落,带风偏移。 |
| `canvas-fireworks` | 烟花 Canvas Fireworks | ★★★ | Canvas 烟花自动升空爆炸,多彩粒子。 |
| `canvas-starfield` | 星空 Canvas Starfield | ★★ | Canvas 3D 星空穿越,星点向四周飞散。 |
| `canvas-ocean` | 海浪 Canvas Ocean | ★★★ | Canvas 多层正弦叠加模拟海浪起伏。 |
| `svg-draw-path` | 路径绘制 SVG Path Draw | ★★ | SVG 路径按 stroke-dashoffset 逐步绘制。 |
| `svg-dash-animate` | 虚线动画 SVG Dash Animate | ★★ | SVG 虚线沿路径流动,蚂蚁线效果。 |
| `3d-sphere` | 3D 球体 3D Sphere | ★★★ | Three.js 线框球体自转,带粒子环绕。 |
| `3d-torus` | 3D 圆环 3D Torus | ★★ | Three.js 圆环持续旋转,带光泽材质。 |
| `gsap-timeline` | GSAP 时间线 GSAP Timeline | ★★★ | GSAP 时间线编排多步动画序列。 |
| `gsap-stagger` | GSAP 错落 GSAP Stagger | ★★ | GSAP stagger 让多个元素错落入场。 |
| `lottie-checkmark` | Lottie 打勾 Lottie Checkmark | ★★ | SVG 模拟 Lottie 打勾动画,完成反馈。 |
| `physics-gravity` | 重力物理 Gravity Physics | ★★★ | Canvas 多球受重力碰撞弹跳,物理仿真。 |
| `physics-cloth` | 布料模拟 Cloth Sim | ★★★ | Canvas 网格布料模拟,受重力下垂摆动。 |
| `fractal-mandelbrot` | 曼德博集合 Mandelbrot | ★★★ | Canvas 渲染曼德博分形集合,自相似图案。 |
| `flow-field` | 流场粒子 Flow Field | ★★★ | 基于噪声场的粒子流动,有机运动轨迹。 |
| `voronoi-art` | Voronoi 艺术 Voronoi Art | ★★★ | Canvas 生成 Voronoi 单元艺术图案,彩色拼贴。 |

## 模板（48 套整页）

风格系列：marketing / product / auth / commerce / creative / **brutalism / neumorphism / cyberpunk / y2k** 等。
交互实验室 `engines/motion-lab` 的 `/templates` 路由可视化浏览；源码在 `app/templates/`。

## 集成提示
- 纯 CSS 动效可直接进 Remotion：把 @keyframes 改为 interpolate/useCurrentFrame 驱动，或在 HTML 面板内嵌
- `prefers-reduced-motion` 尊重无障碍偏好（库内置）
