# 缩放弹跳（Zoom Bounce）· `zoom-bounce`

元素放大入场,带弹跳回弹。

- 分类: basic · 难度: ★ · 标签: zoom, basic

## 参数
- `duration` (时长): 0.3–2（步长 0.1）s，默认 `0.8`

## HTML
```html
<div class="zoom-bounce">●</div>
```

## CSS
```css
.zoom-bounce { animation: zoomBounce var(--duration, 0.8s) cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes zoomBounce { from { transform: scale(0); } to { transform: scale(1); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
