# Lottie 打勾（Lottie Checkmark）· `lottie-checkmark`

SVG 模拟 Lottie 打勾动画,完成反馈。

- 分类: advanced · 难度: ★★ · 标签: lottie, advanced

## 参数
- `duration` (时长): 0.4–2（步长 0.1）s，默认 `0.8`

## HTML
```html
<svg class="check" viewBox="0 0 100 100"><circle class="c" cx="50" cy="50" r="44" fill="none" stroke="hsl(140 80% 50%)" stroke-width="4"/><path class="mark" d="M30 52 L45 66 L72 36" fill="none" stroke="hsl(140 80% 50%)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
```

## CSS
```css
.check { width: 120px; height: 120px; }
.check .c { stroke-dasharray: 276; stroke-dashoffset: 276; animation: drawC var(--duration, 0.8s) ease-out forwards; }
.check .mark { stroke-dasharray: 60; stroke-dashoffset: 60; animation: drawM var(--duration, 0.8s) ease-out var(--duration, 0.8s) forwards; }
@keyframes drawC { to { stroke-dashoffset: 0; } }
@keyframes drawM { to { stroke-dashoffset: 0; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
