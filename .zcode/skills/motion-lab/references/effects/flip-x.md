# 水平翻转（Flip X）· `flip-x`

元素绕 X 轴翻转入场。

- 分类: basic · 难度: ★★ · 标签: flip, basic

## 参数
- `duration` (时长): 0.3–2（步长 0.1）s，默认 `0.8`

## HTML
```html
<div class="flip-x">↻</div>
```

## CSS
```css
.flip-x { animation: flipX var(--duration, 0.8s) ease-out both; transform-origin: center; }
@keyframes flipX { from { transform: perspective(600px) rotateX(-90deg); opacity: 0; } to { transform: perspective(600px) rotateX(0); opacity: 1; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
