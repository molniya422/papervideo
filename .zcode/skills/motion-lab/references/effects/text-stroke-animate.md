# 描边动画（Stroke Animate）· `text-stroke-animate`

SVG 描边文字按路径逐步绘制,书写感。

- 分类: text · 难度: ★★★ · 标签: stroke, text

## 参数
- `duration` (时长): 1–5（步长 0.2）s，默认 `2.5`

## HTML
```html
<svg viewBox="0 0 300 80"><text class="stroke-text" x="150" y="60" text-anchor="middle">STROKE</text></svg>
```

## CSS
```css
.stroke-text { font-size: 56px; font-weight: 900; fill: transparent; stroke: hsl(280 90% 60%); stroke-width: 2; stroke-dasharray: 600; stroke-dashoffset: 600; animation: strokeDraw var(--duration, 2.5s) ease-out infinite alternate; }
@keyframes strokeDraw { to { stroke-dashoffset: 0; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
