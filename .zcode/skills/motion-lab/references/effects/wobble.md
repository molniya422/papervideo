# 摇摆（Wobble）· `wobble`

元素左右摇摆晃动,俏皮可爱。

- 分类: basic · 难度: ★★ · 标签: wobble, basic

## 参数
- `duration` (时长): 0.6–2（步长 0.1）s，默认 `1`

## HTML
```html
<div class="wobble">Wobble</div>
```

## CSS
```css
.wobble { display: inline-block; animation: wobble var(--duration, 1s) ease-in-out infinite; transform-origin: center; }
@keyframes wobble { 0%, 100% { transform: translateX(0) rotate(0); } 15% { transform: translateX(-12%) rotate(-5deg); } 30% { transform: translateX(10%) rotate(3deg); } 45% { transform: translateX(-8%) rotate(-3deg); } 60% { transform: translateX(6%) rotate(2deg); } 75% { transform: translateX(-3%) rotate(-1deg); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
