# 分形树（Fractal Tree）· `fractal-tree`

递归绘制的分形树动画。

- 分类: advanced · 难度: ★★★ · 标签: fractal, advanced

## 参数
- `depth` (深度): 5–11（步长 1），默认 `8`
- `angle` (分支角度): 15–35（步长 1）°，默认 `22`

## HTML
```html
<canvas class="ftree"></canvas>
```

## CSS
```css
.ftree { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.ftree'); const ctx = c.getContext('2d');
const resize = () => { c.width = c.offsetWidth * 2; c.height = c.offsetHeight * 2; };
resize();
window.addEventListener('resize', resize);
let t = 0;
function branch(x, y, len, ang, d) { if (d <= 0 || len < 2) return; const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.strokeStyle = `hsl(${(10 - d) * 20} 70% 50%)`; ctx.lineWidth = d; ctx.stroke(); branch(x2, y2, len * 0.75, ang - params.angle * Math.PI / 180, d - 1); branch(x2, y2, len * 0.75, ang + params.angle * Math.PI / 180, d - 1); }
let raf = 0;
function draw() { ctx.clearRect(0, 0, c.width, c.height); t += 0.01; ctx.save(); ctx.translate(c.width / 2, c.height); branch(0, 0, 200, -Math.PI / 2 + Math.sin(t) * 0.05, params.depth); ctx.restore(); raf = requestAnimationFrame(draw); }
draw();
return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
```
