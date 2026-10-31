# 渐变文字（Gradient Text）· `gradient-text`

文字使用 HSL 渐变背景 + 循环动画。

- 分类: text · 难度: ★ · 标签: gradient, text

## 参数
- `duration` (周期): 2–10（步长 0.5）s，默认 `4`

## HTML
```html
<h1 class="gradient-text">COLOR</h1>
```

## CSS
```css
.gradient-text { background: linear-gradient(90deg, hsl(0 90% 60%), hsl(120 90% 60%), hsl(240 90% 60%)); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: hue var(--duration, 4s) linear infinite; }
@keyframes hue { to { background-position: 200% 0; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
