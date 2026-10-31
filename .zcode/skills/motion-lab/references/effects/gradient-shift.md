# 渐变流动（Gradient Shift）· `gradient-shift`

渐变背景持续流动,色彩柔和过渡。

- 分类: basic · 难度: ★ · 标签: gradient, basic

## 参数
- `duration` (周期): 2–10（步长 0.5）s，默认 `5`

## HTML
```html
<div class="gradient-shift">Flow</div>
```

## CSS
```css
.gradient-shift { background: linear-gradient(120deg, hsl(280 90% 60%), hsl(200 90% 60%), hsl(320 90% 60%), hsl(280 90% 60%)); background-size: 300% 300%; animation: gradientShift var(--duration, 5s) ease infinite; }
@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
