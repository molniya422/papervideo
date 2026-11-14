# 流场粒子（Flow Field）· `flow-field`

基于噪声场的粒子流动,有机运动轨迹。

- 分类: advanced · 难度: ★★★ · 标签: flow, advanced

## 参数
- `count` (粒子数): 100–2000（步长 100），默认 `600`

## HTML
```html
<canvas class="flow"></canvas>
```

## CSS
```css
.flow { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.flow'); const ctx = c.getContext('2d');
const ps = [];
for (let i = 0; i < 600; i++) ps.push({ x: Math.random()*c.width, y: Math.random()*c.height });
let t = 0;
function noise(x, y) { return Math.sin(x*0.01 + t)*Math.cos(y*0.01 + t*0.7); }
function tick() { ctx.fillStyle='rgba(10,10,30,0.05)'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle = 'hsl(280 90% 70%)'; ps.forEach(p => { const a = noise(p.x, p.y) * 6.28; p.x += Math.cos(a)*1.5; p.y += Math.sin(a)*1.5; if (p.x < 0 || p.x > c.width || p.y < 0 || p.y > c.height) { p.x = Math.random()*c.width; p.y = Math.random()*c.height; } ctx.fillRect(p.x, p.y, 1.5, 1.5); }); t += 0.01; requestAnimationFrame(tick); } tick();
```
