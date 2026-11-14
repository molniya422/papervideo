# 彩虹偏移（Rainbow Shift）· `text-rainbow-shift`

文字彩虹色循环并轻微偏移,梦幻。

- 分类: text · 难度: ★ · 标签: rainbow, text

## 参数
- `duration` (周期): 1–6（步长 0.1）s，默认 `3`

## HTML
```html
<h1 class="rainbow-shift">RAINBOW</h1>
```

## CSS
```css
.rainbow-shift { background: linear-gradient(90deg, hsl(0 90% 60%), hsl(60 90% 60%), hsl(120 90% 60%), hsl(180 90% 60%), hsl(240 90% 60%), hsl(300 90% 60%), hsl(360 90% 60%)); background-size: 300% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: rbShift var(--duration, 3s) linear infinite; }
@keyframes rbShift { to { background-position: 300% 0; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
