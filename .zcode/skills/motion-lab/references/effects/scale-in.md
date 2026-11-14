# 缩放入场（Scale In）· `scale-in`

元素从较小尺寸缩放到原始大小入场。

- 分类: basic · 难度: ★ · 标签: scale, basic

## 参数
- `duration` (时长): 0.2–2（步长 0.1）s，默认 `0.6`
- `from` (起始缩放): 0.1–0.9（步长 0.05），默认 `0.5`

## HTML
```html
<div class="scale-in">Scale</div>
```

## CSS
```css
.scale-in { animation: scaleIn var(--duration, 0.6s) cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes scaleIn { from { opacity: 0; transform: scale(var(--from, 0.5)); } to { opacity: 1; transform: scale(1); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
