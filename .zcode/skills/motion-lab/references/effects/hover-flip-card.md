# 翻转卡片（Flip Card）· `hover-flip-card`

悬停时卡片 3D 翻转,正反切换。

- 分类: interaction · 难度: ★★ · 标签: flip, interaction

## 参数
- `duration` (时长): 0.3–1.2（步长 0.05）s，默认 `0.6`

## HTML
```html
<div class="flip-card"><div class="flip-inner"><div class="front">FRONT</div><div class="back">BACK</div></div></div>
```

## CSS
```css
.flip-card { perspective: 800px; cursor: pointer; }
.flip-inner { position: relative; transform-style: preserve-3d; transition: transform var(--duration, 0.6s); }
.flip-card:hover .flip-inner { transform: rotateY(180deg); }
.flip-card .front, .flip-card .back { position: absolute; inset: 0; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; }
.flip-card .back { transform: rotateY(180deg); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
