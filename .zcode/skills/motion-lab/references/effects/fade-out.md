# 淡出消失（Fade Out）· `fade-out`

元素持续淡出后回弹,适合循环演示。

- 分类: basic · 难度: ★ · 标签: fade, basic

## 参数
- `duration` (周期): 1–5（步长 0.1）s，默认 `2`

## HTML
```html
<div class="fade-out">Fade Out</div>
```

## CSS
```css
.fade-out { animation: fadeOut var(--duration, 2s) ease-in-out infinite alternate; }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
