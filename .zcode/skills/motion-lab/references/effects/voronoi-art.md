# Voronoi 艺术（Voronoi Art）· `voronoi-art`

Canvas 生成 Voronoi 单元艺术图案,彩色拼贴。

- 分类: advanced · 难度: ★★★ · 标签: voronoi, advanced

## 参数
- `count` (种子数): 10–80（步长 5），默认 `30`

## HTML
```html
<canvas class="voronoi"></canvas>
```

## CSS
```css
.voronoi { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.voronoi'); const ctx = c.getContext('2d');
const seeds = [];
for (let i = 0; i < 30; i++) seeds.push({ x: Math.random()*c.width, y: Math.random()*c.height, c: `hsl(${Math.random()*360} 70% 60%)` });
const img = ctx.createImageData(c.width, c.height); const d = img.data;
for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) { let best = 0, bd = Infinity; for (let i = 0; i < seeds.length; i++) { const dx = px - seeds[i].x, dy = py - seeds[i].y; const dist = dx*dx + dy*dy; if (dist < bd) { bd = dist; best = i; } } const idx = (py*c.width + px)*4; const m = seeds[best].c.match(/hsl\((\d+)/); const h = +m[1]; d[idx] = h; d[idx+1] = 150; d[idx+2] = 150; d[idx+3] = 255; }
ctx.putImageData(img, 0, 0);
```
