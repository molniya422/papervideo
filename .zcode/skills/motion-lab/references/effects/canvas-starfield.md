# 星空（Canvas Starfield）· `canvas-starfield`

Canvas 3D 星空穿越,星点向四周飞散。

- 分类: advanced · 难度: ★★ · 标签: canvas, advanced

## 参数
- `count` (星数): 100–800（步长 50），默认 `300`

## HTML
```html
<canvas class="stars"></canvas>
```

## CSS
```css
.stars { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.stars'); const ctx = c.getContext('2d');
const stars = [];
for (let i = 0; i < 300; i++) stars.push({ x: (Math.random()-0.5)*c.width, y: (Math.random()-0.5)*c.height, z: Math.random()*c.width });
function tick() { ctx.fillStyle='black'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='white'; stars.forEach(s => { s.z -= 4; if (s.z <= 0) s.z = c.width; const k = 128 / s.z; const x = s.x*k + c.width/2; const y = s.y*k + c.height/2; const r = (1 - s.z/c.width) * 2; ctx.fillRect(x, y, r, r); }); requestAnimationFrame(tick); } tick();
```
