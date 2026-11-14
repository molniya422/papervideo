# 高亮扫过（Highlight Sweep）· `highlight-sweep`

高亮条从左到右扫过文字,常用于强调。

- 分类: text · 难度: ★★ · 标签: highlight, text

## 参数
- `duration` (周期): 1.5–4（步长 0.1）s，默认 `2.5`

## HTML
```html
<h1 class="hl-sweep">SWEEP</h1>
```

## CSS
```css
.hl-sweep { position: relative; display: inline-block; font-size: 36px; font-weight: 900; }
.hl-sweep::before { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, hsl(50 100% 60%), transparent); transform: translateX(-100%); animation: sweep var(--duration, 2.5s) ease-in-out infinite; mix-blend-mode: multiply; }
@keyframes sweep { 50% { transform: translateX(100%); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
