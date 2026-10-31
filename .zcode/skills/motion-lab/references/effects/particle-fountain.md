# 粒子喷泉（Particle Fountain）· `particle-fountain`

Canvas 粒子从底部喷涌向上,受重力下落。

- 分类: advanced · 难度: ★★ · 标签: particle, advanced

## 参数
- `count` (粒子数): 30–300（步长 10），默认 `120`

## HTML
```html
<canvas class="fountain"></canvas>
```

## CSS
```css
.fountain { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.fountain'); const ctx = c.getContext('2d');
const ps = [];
function spawn() { return { x: c.width/2, y: c.height, vx: (Math.random()-0.5)*4, vy: -Math.random()*10-4, c: `hsl(${Math.random()*360} 90% 60%)`, s: 3+Math.random()*3 }; }
for (let i = 0; i < 120; i++) ps.push(spawn());
function tick() { ctx.fillStyle='rgba(10,10,30,0.2)'; ctx.fillRect(0,0,c.width,c.height); ps.forEach((p,i) => { p.vy += 0.2; p.x += p.vx; p.y += p.vy; if (p.y > c.height) ps[i] = spawn(); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s); }); requestAnimationFrame(tick); } tick();
```
