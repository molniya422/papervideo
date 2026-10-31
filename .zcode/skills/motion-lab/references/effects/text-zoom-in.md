# 文字缩放（Text Zoom In）· `text-zoom-in`

文字从远处缩放放大入场,有冲击力。

- 分类: text · 难度: ★ · 标签: zoom, text

## 参数
- `duration` (时长): 0.4–2（步长 0.1）s，默认 `0.8`

## HTML
```html
<h1 class="text-zoom-in">ZOOM</h1>
```

## CSS
```css
.text-zoom-in { animation: textZoomIn var(--duration, 0.8s) cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes textZoomIn { from { opacity: 0; transform: scale(0.3); letter-spacing: 0.3em; } to { opacity: 1; transform: scale(1); letter-spacing: -0.02em; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
