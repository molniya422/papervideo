# 钟摆（Swing）· `swing`

顶部固定,左右摆动,像钟摆一样。

- 分类: basic · 难度: ★★ · 标签: swing, basic

## 参数
- `duration` (周期): 0.8–3（步长 0.1）s，默认 `1.6`

## HTML
```html
<div class="swing">⏰</div>
```

## CSS
```css
.swing { display: inline-block; transform-origin: top center; animation: swing var(--duration, 1.6s) ease-in-out infinite; }
@keyframes swing { 0%, 100% { transform: rotate(15deg); } 50% { transform: rotate(-15deg); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
