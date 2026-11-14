# 垂直翻转（Flip Y）· `flip-y`

元素绕 Y 轴翻转入场,类似翻牌。

- 分类: basic · 难度: ★★ · 标签: flip, basic

## 参数
- `duration` (时长): 0.3–2（步长 0.1）s，默认 `0.8`

## HTML
```html
<div class="flip-y">↻</div>
```

## CSS
```css
.flip-y { animation: flipY var(--duration, 0.8s) ease-out both; transform-origin: center; }
@keyframes flipY { from { transform: perspective(600px) rotateY(-90deg); opacity: 0; } to { transform: perspective(600px) rotateY(0); opacity: 1; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
