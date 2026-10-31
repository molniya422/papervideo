# 布料模拟（Cloth Sim）· `physics-cloth`

Canvas 网格布料模拟,受重力下垂摆动。

- 分类: advanced · 难度: ★★★ · 标签: cloth, advanced

## 参数
- `resolution` (分辨率): 6–16（步长 1），默认 `10`

## HTML
```html
<canvas class="cloth"></canvas>
```

## CSS
```css
.cloth { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.cloth'); const ctx = c.getContext('2d');
const cols = 10, rows = 10, gap = 16;
const pts = [];
for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) pts.push({ x: col*gap, y: r*gap, px: col*gap, py: r*gap, pin: r === 0 });
function tick() { ctx.clearRect(0,0,c.width,c.height); pts.forEach(p => { if (p.pin) return; const vx = (p.x - p.px)*0.99, vy = (p.y - p.py)*0.99; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + 0.3; }); ctx.strokeStyle = 'hsl(280 90% 60%)'; for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) { const p = pts[r*cols+col]; if (col < cols-1) { const q = pts[r*cols+col+1]; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); } if (r < rows-1) { const q = pts[(r+1)*cols+col]; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); } } requestAnimationFrame(tick); } tick();
```
