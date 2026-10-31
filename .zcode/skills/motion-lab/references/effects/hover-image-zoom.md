# 图片放大（Image Zoom）· `hover-image-zoom`

悬停时图片平滑放大,带遮罩。

- 分类: interaction · 难度: ★ · 标签: image, interaction

## 参数
- `scale` (缩放): 1.1–2（步长 0.05），默认 `1.3`

## HTML
```html
<div class="img-zoom"><div class="img"></div></div>
```

## CSS
```css
.img-zoom { overflow: hidden; cursor: pointer; }
.img-zoom .img { width: 100%; height: 100%; background: linear-gradient(135deg, hsl(280 90% 60%), hsl(200 90% 60%)); transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); }
.img-zoom:hover .img { transform: scale(var(--scale, 1.3)); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
