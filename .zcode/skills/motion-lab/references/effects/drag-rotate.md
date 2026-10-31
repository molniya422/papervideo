# 拖动旋转（Drag Rotate）· `drag-rotate`

拖动元素使其 3D 旋转,可交互探索。

- 分类: interaction · 难度: ★★ · 标签: drag, interaction

## 参数
- `sensitivity` (灵敏度): 0.2–2（步长 0.1），默认 `0.6`

## HTML
```html
<div class="drag-rotate">DRAG</div>
```

## CSS
```css
.drag-rotate { transform-style: preserve-3d; cursor: grab; user-select: none; }
.drag-rotate:active { cursor: grabbing; }
```

## JS
```javascript
const el = document.querySelector('.drag-rotate');
let rx = -20, ry = 20, dragging = false, lx = 0, ly = 0;
el.addEventListener('mousedown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; });
window.addEventListener('mousemove', (e) => { if (!dragging) return; ry += (e.clientX - lx) * 0.6; rx -= (e.clientY - ly) * 0.6; lx = e.clientX; ly = e.clientY; el.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg)`; });
window.addEventListener('mouseup', () => dragging = false);
```
