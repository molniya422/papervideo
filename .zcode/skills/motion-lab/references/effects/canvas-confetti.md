# 五彩纸屑（Canvas Confetti）· `canvas-confetti`

撒花庆祝效果。

- 分类: advanced · 难度: ★★ · 标签: canvas, advanced

## 参数
- `count` (粒子数): 30–300（步长 10），默认 `120`

## HTML
```html
<canvas class="cv"></canvas>
```

## CSS
```css
.cv { position: absolute; inset: 0; pointer-events: none; }
```

## JS
```javascript
const cv = document.querySelector('.cv'); const ctx = cv.getContext('2d');
const particles = [];
for (let i = 0; i < 120; i++) particles.push({ x: 200, y: 200, vx: (Math.random()-0.5)*8, vy: Math.random()*-12, g: 0.3, c: `hsl(${Math.random()*360} 90% 60%)` });
function tick() { ctx.clearRect(0,0,cv.width,cv.height); particles.forEach(p => { p.vy += p.g; p.x += p.vx; p.y += p.vy; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 6, 6); }); requestAnimationFrame(tick); } tick();
```
