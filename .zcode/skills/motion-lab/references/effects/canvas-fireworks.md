# 烟花（Canvas Fireworks）· `canvas-fireworks`

Canvas 烟花自动升空爆炸,多彩粒子。

- 分类: advanced · 难度: ★★★ · 标签: canvas, advanced

## 参数
- `count` (粒子数): 30–200（步长 10），默认 `80`

## HTML
```html
<canvas class="fw"></canvas>
```

## CSS
```css
.fw { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.fw'); const ctx = c.getContext('2d');
let ps = [];
function launch() { const x = Math.random()*c.width; const y = c.height; const hue = Math.random()*360; for (let i = 0; i < 80; i++) { const a = (i/80)*6.28; ps.push({ x, y: c.height*0.4, vx: Math.cos(a)*3, vy: Math.sin(a)*3, c: `hsl(${hue} 90% 60%)`, life: 1 }); } }
setInterval(launch, 1200);
function tick() { ctx.fillStyle='rgba(0,0,20,0.2)'; ctx.fillRect(0,0,c.width,c.height); ps = ps.filter(p => p.life > 0); ps.forEach(p => { p.vy += 0.05; p.x += p.vx; p.y += p.vy; p.life -= 0.015; ctx.fillStyle = p.c; ctx.globalAlpha = p.life; ctx.fillRect(p.x, p.y, 3, 3); }); ctx.globalAlpha = 1; requestAnimationFrame(tick); } tick();
```
