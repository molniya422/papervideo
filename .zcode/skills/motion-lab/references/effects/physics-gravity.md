# 重力物理（Gravity Physics）· `physics-gravity`

Canvas 多球受重力碰撞弹跳,物理仿真。

- 分类: advanced · 难度: ★★★ · 标签: gravity, advanced

## 参数
- `gravity` (重力): 0.1–1（步长 0.05），默认 `0.4`

## HTML
```html
<canvas class="grav"></canvas>
```

## CSS
```css
.grav { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.grav'); const ctx = c.getContext('2d');
const balls = [];
for (let i = 0; i < 8; i++) balls.push({ x: Math.random()*c.width, y: 50, vx: (Math.random()-0.5)*4, vy: 0, r: 12+Math.random()*8, c: `hsl(${Math.random()*360} 90% 60%)` });
function tick() { ctx.clearRect(0,0,c.width,c.height); balls.forEach(b => { b.vy += 0.4; b.x += b.vx; b.y += b.vy; if (b.y + b.r > c.height) { b.y = c.height - b.r; b.vy *= -0.8; } if (b.x < b.r || b.x > c.width - b.r) b.vx *= -1; ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); }); requestAnimationFrame(tick); } tick();
```
