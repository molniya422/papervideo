# 缩小归位（Scale Out）· `scale-out`

元素从较大尺寸缩小归位,有收束感。

- 分类: basic · 难度: ★ · 标签: scale, basic

## 参数
- `duration` (时长): 0.2–2（步长 0.1）s，默认 `0.6`
- `from` (起始缩放): 1.05–2（步长 0.05），默认 `1.2`

## HTML
```html
<div class="scale-out">Scale</div>
```

## CSS
```css
.scale-out { animation: scaleOut var(--duration, 0.6s) cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes scaleOut { from { opacity: 0; transform: scale(var(--from, 1.2)); } to { opacity: 1; transform: scale(1); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
