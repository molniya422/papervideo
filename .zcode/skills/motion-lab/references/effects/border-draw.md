# 边框画出（Border Draw）· `border-draw`

边框按顺时针逐步画出,勾勒轮廓。

- 分类: basic · 难度: ★★ · 标签: border, basic

## 参数
- `duration` (时长): 0.6–3（步长 0.1）s，默认 `1.4`

## HTML
```html
<div class="border-draw">Draw</div>
```

## CSS
```css
.border-draw { position: relative; padding: 24px 32px; }
.border-draw::before { content: ""; position: absolute; inset: 0; padding: 2px; border-radius: 12px; background: linear-gradient(90deg, hsl(280 90% 60%), hsl(200 90% 60%)); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; background-size: 300% 300%; animation: borderDraw var(--duration, 1.4s) ease-in-out infinite alternate; }
@keyframes borderDraw { to { background-position: 100% 100%; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
