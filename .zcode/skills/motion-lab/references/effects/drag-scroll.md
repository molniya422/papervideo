# 拖动滚动（Drag Scroll）· `drag-scroll`

横向拖动滚动容器。

- 分类: interaction · 难度: ★★ · 标签: drag, interaction

## 参数
- `duration` (惯性时长): 0.2–1.5（步长 0.1）s，默认 `0.6`

## HTML
```html
<div class="drag"><div class="drag-inner"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></div>
```

## CSS
```css
.drag { overflow: hidden; cursor: grab; user-select: none; }
.drag:active { cursor: grabbing; }
.drag-inner { display: flex; gap: 20px; padding: 20px; }
```

## JS
```javascript
const wrap = document.querySelector('.drag');
let isDown = false, startX = 0, scrollLeft = 0;
wrap.addEventListener('mousedown', (e) => { isDown = true; startX = e.pageX; scrollLeft = wrap.scrollLeft; });
window.addEventListener('mouseup', () => isDown = false);
wrap.addEventListener('mousemove', (e) => { if (!isDown) return; e.preventDefault(); wrap.scrollLeft = scrollLeft - (e.pageX - startX); });
```
