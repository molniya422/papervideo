# 路径绘制（SVG Path Draw）· `svg-draw-path`

SVG 路径按 stroke-dashoffset 逐步绘制。

- 分类: advanced · 难度: ★★ · 标签: svg, advanced

## 参数
- `duration` (时长): 1–6（步长 0.2）s，默认 `3`

## HTML
```html
<svg class="svg-draw" viewBox="0 0 200 100"><path class="p" d="M10,80 C40,10 70,90 100,40 S160,90 190,30" fill="none" stroke="hsl(280 90% 60%)" stroke-width="3"/></svg>
```

## CSS
```css
.svg-draw { width: 100%; height: 100%; }
.svg-draw .p { stroke-dasharray: 400; stroke-dashoffset: 400; animation: draw var(--duration, 3s) ease-in-out infinite alternate; }
@keyframes draw { to { stroke-dashoffset: 0; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
