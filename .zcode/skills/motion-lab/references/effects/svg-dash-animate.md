# 虚线动画（SVG Dash Animate）· `svg-dash-animate`

SVG 虚线沿路径流动,蚂蚁线效果。

- 分类: advanced · 难度: ★★ · 标签: svg, advanced

## 参数
- `duration` (周期): 0.5–4（步长 0.1）s，默认 `1.5`

## HTML
```html
<svg class="svg-dash" viewBox="0 0 200 100"><path class="p" d="M10,50 L60,20 L110,80 L160,30 L190,60" fill="none" stroke="hsl(200 90% 55%)" stroke-width="3" stroke-dasharray="8 6"/></svg>
```

## CSS
```css
.svg-dash { width: 100%; height: 100%; }
.svg-dash .p { animation: dash var(--duration, 1.5s) linear infinite; }
@keyframes dash { to { stroke-dashoffset: -28; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
