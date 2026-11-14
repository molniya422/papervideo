# 遮罩揭示（Mask Reveal）· `mask-reveal`

文字从遮罩下方揭示,常用于 hero 标题。

- 分类: text · 难度: ★★ · 标签: mask, text

## 参数
- `duration` (时长): 0.4–2.5（步长 0.1）s，默认 `1.2`

## HTML
```html
<h1 class="mask-reveal">MOTION</h1>
```

## CSS
```css
.mask-reveal { clip-path: inset(0 0 100% 0); animation: reveal var(--duration, 1.2s) cubic-bezier(0.65, 0, 0.35, 1) forwards; }
@keyframes reveal { to { clip-path: inset(0 0 0 0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
