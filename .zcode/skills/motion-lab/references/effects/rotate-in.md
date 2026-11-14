# 旋转入场（Rotate In）· `rotate-in`

元素从旋转状态回归原位。

- 分类: basic · 难度: ★ · 标签: rotate, basic

## 参数
- `duration` (时长): 0.3–2（步长 0.1）s，默认 `0.7`

## HTML
```html
<div class="rotate-in">★</div>
```

## CSS
```css
.rotate-in { animation: rotateIn var(--duration, 0.7s) ease-out both; }
@keyframes rotateIn { from { transform: rotate(-180deg) scale(0.3); opacity: 0; } to { transform: rotate(0) scale(1); opacity: 1; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
