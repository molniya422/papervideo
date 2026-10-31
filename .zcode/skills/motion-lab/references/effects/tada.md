# 庆祝抖动（Tada）· `tada`

元素放大并轻微旋转抖动,庆祝感强。

- 分类: basic · 难度: ★★ · 标签: tada, basic

## 参数
- `duration` (时长): 0.6–2（步长 0.1）s，默认 `1`

## HTML
```html
<div class="tada">Tada!</div>
```

## CSS
```css
.tada { display: inline-block; animation: tada var(--duration, 1s) ease-in-out infinite; transform-origin: center; }
@keyframes tada { 0%, 100% { transform: scale(1) rotate(0); } 10%, 20% { transform: scale(0.9) rotate(-3deg); } 30%, 50%, 70%, 90% { transform: scale(1.15) rotate(3deg); } 40%, 60%, 80% { transform: scale(1.15) rotate(-3deg); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
