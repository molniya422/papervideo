# 故障文字（Glitch Text）· `glitch-text`

RGB 分离故障效果,赛博朋克风。

- 分类: text · 难度: ★★★ · 标签: glitch, text

## 参数
- `duration` (周期): 1–5（步长 0.1）s，默认 `2.5`

## HTML
```html
<h1 class="glitch" data-text="GLITCH">GLITCH</h1>
```

## CSS
```css
.glitch { position: relative; }
.glitch::before, .glitch::after { content: attr(data-text); position: absolute; inset: 0; }
.glitch::before { color: cyan; animation: glitchA var(--duration, 2.5s) infinite; }
.glitch::after { color: magenta; animation: glitchB var(--duration, 2.5s) infinite; }
@keyframes glitchA { 0%, 100% { transform: translate(0); } 20% { transform: translate(-2px, 2px); } 40% { transform: translate(2px, -1px); } }
@keyframes glitchB { 0%, 100% { transform: translate(0); } 20% { transform: translate(2px, -1px); } 40% { transform: translate(-1px, 2px); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
