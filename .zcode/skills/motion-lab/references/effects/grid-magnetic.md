# 网格磁吸（Grid Magnetic）· `grid-magnetic`

网格中每个点对鼠标有磁吸反应。

- 分类: advanced · 难度: ★★★ · 标签: grid, advanced

## 参数
- `radius` (吸引半径): 40–200（步长 10）px，默认 `100`

## HTML
```html
<div class="grid-mag"></div>
```

## CSS
```css
.grid-mag { position: relative; width: 100%; height: 100%; }
.grid-mag .dot { position: absolute; width: 4px; height: 4px; background: currentColor; border-radius: 50%; transition: transform 0.2s; }
```

## JS
```javascript
const el = document.querySelector('.grid-mag');
const dots = [];
for (let r = 0; r < 6; r++) for (let c = 0; c < 12; c++) { const d = document.createElement('div'); d.className = 'dot'; d.style.left = c * 24 + 'px'; d.style.top = r * 24 + 'px'; el.appendChild(d); dots.push(d); }
el.addEventListener('mousemove', (e) => { dots.forEach(d => { const r = d.getBoundingClientRect(); const dx = e.clientX - (r.left + 2); const dy = e.clientY - (r.top + 2); const dist = Math.hypot(dx, dy); if (dist < 100) d.style.transform = `translate(${dx * 0.3}px, ${dy * 0.3}px)`; else d.style.transform = ''; }); });
```
