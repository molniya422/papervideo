# 悬停图像畸变（Hover Distort）· `hover-image-distort`

悬停时图像被 SVG 滤镜畸变。

- 分类: interaction · 难度: ★★★ · 标签: hover, interaction

## 参数
- `amount` (畸变强度): 0–0.05（步长 0.005），默认 `0.02`

## HTML
```html
<svg width="0" height="0"><filter id="d"><feTurbulence baseFrequency="0.02" numOctaves="2" /><feDisplacementMap in="SourceGraphic" scale="20" /></filter></svg>
<div class="distort">HOVER</div>
```

## CSS
```css
.distort { filter: url(#d); transition: filter 0.3s; }
```

## JS
```javascript
// Pure CSS — no JS needed
```
