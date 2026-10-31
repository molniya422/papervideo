# 持续旋转（Rotate 360）· `rotate-360`

元素持续 360 度旋转,无限循环。

- 分类: basic · 难度: ★ · 标签: rotate, basic

## 参数
- `duration` (周期): 0.5–6（步长 0.1）s，默认 `2`

## HTML
```html
<div class="rotate-360">⟳</div>
```

## CSS
```css
.rotate-360 { display: inline-block; animation: rot360 var(--duration, 2s) linear infinite; }
@keyframes rot360 { to { transform: rotate(360deg); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
