# 灰度入场（Grayscale In）· `grayscale-in`

元素从灰度渐变到彩色,复古转彩色。

- 分类: basic · 难度: ★★ · 标签: grayscale, basic

## 参数
- `duration` (时长): 0.5–3（步长 0.1）s，默认 `1.2`

## HTML
```html
<div class="grayscale-in">Color</div>
```

## CSS
```css
.grayscale-in { animation: grayscaleIn var(--duration, 1.2s) ease-out both; }
@keyframes grayscaleIn { from { filter: grayscale(1) brightness(1.2); opacity: 0.4; } to { filter: grayscale(0) brightness(1); opacity: 1; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
