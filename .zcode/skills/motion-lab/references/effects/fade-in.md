# 淡入（Fade In）· `fade-in`

元素从透明渐入到不透明,最基础的进入动画。

- 分类: basic · 难度: ★ · 标签: fade, basic

## 参数
- `duration` (时长): 0.2–3（步长 0.1）s，默认 `0.8`
- `delay` (延迟): 0–2（步长 0.1）s，默认 `0`

## HTML
```html
<div class="fade-in">Hello</div>
```

## CSS
```css
.fade-in { animation: fadeIn var(--duration, 0.8s) ease-out var(--delay, 0s) both; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
