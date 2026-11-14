# 火焰文字（Fire Text）· `text-fire`

文字带火焰渐变与跳动,炽热燃烧感。

- 分类: text · 难度: ★★★ · 标签: fire, text

## 参数
- `duration` (周期): 1–4（步长 0.1）s，默认 `2`

## HTML
```html
<h1 class="text-fire">FIRE</h1>
```

## CSS
```css
.text-fire { background: linear-gradient(0deg, hsl(0 90% 50%), hsl(20 100% 55%), hsl(45 100% 60%), hsl(0 90% 50%)); background-size: 100% 200%; -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 -2px 6px hsl(20 100% 50%)); animation: fireFlicker var(--duration, 2s) ease-in-out infinite; }
@keyframes fireFlicker { 0%, 100% { background-position: 0% 0%; } 50% { background-position: 0% 100%; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
