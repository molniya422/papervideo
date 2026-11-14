# 彩虹文字（Rainbow Text）· `rainbow-text`

文字颜色按彩虹色循环变化。

- 分类: text · 难度: ★ · 标签: rainbow, text

## 参数
- `duration` (周期): 1–6（步长 0.1）s，默认 `3`

## HTML
```html
<h1 class="rainbow">RAINBOW</h1>
```

## CSS
```css
.rainbow { font-size: 40px; font-weight: 900; background: linear-gradient(90deg, hsl(0 90% 60%), hsl(60 90% 60%), hsl(120 90% 60%), hsl(180 90% 60%), hsl(240 90% 60%), hsl(300 90% 60%), hsl(360 90% 60%)); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: rb var(--duration, 3s) linear infinite; }
@keyframes rb { to { background-position: 200% 0; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
