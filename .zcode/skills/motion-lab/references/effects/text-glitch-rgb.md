# RGB 故障（RGB Glitch）· `text-glitch-rgb`

文字 RGB 三通道分离故障,赛博朋克风。

- 分类: text · 难度: ★★★ · 标签: rgb, text

## 参数
- `duration` (周期): 1–5（步长 0.1）s，默认 `2`

## HTML
```html
<h1 class="rgb-glitch" data-text="RGB">RGB</h1>
```

## CSS
```css
.rgb-glitch { position: relative; }
.rgb-glitch::before, .rgb-glitch::after { content: attr(data-text); position: absolute; inset: 0; mix-blend-mode: screen; }
.rgb-glitch::before { color: hsl(0 100% 55%); animation: rgbR var(--duration, 2s) infinite; }
.rgb-glitch::after { color: hsl(180 100% 55%); animation: rgbB var(--duration, 2s) infinite; }
@keyframes rgbR { 0%, 100% { transform: translate(0); } 20% { transform: translate(-3px, 1px); } 40% { transform: translate(2px, -2px); } 60% { transform: translate(-1px, 2px); } }
@keyframes rgbB { 0%, 100% { transform: translate(0); } 20% { transform: translate(3px, -1px); } 40% { transform: translate(-2px, 2px); } 60% { transform: translate(1px, -2px); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
