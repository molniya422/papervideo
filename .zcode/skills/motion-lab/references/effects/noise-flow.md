# 噪声流动（Noise Flow）· `noise-flow`

基于 value-noise 的 2D 流动场。

- 分类: advanced · 难度: ★★★ · 标签: noise, advanced

## 参数
- `speed` (速度): 0.001–0.02（步长 0.001），默认 `0.005`
- `scale` (尺度): 0.005–0.05（步长 0.005），默认 `0.02`

## HTML
```html
<canvas class="nf"></canvas>
```

## CSS
```css
.nf { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.nf'); const ctx = c.getContext('2d');
const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
resize();
window.addEventListener('resize', resize);
const grad = ctx.createLinearGradient(0, 0, 0, c.height);
grad.addColorStop(0, '#ff00aa'); grad.addColorStop(1, '#00ddff');
function noise(x, y) { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); }
function smoothNoise(x, y) { const ix = Math.floor(x), iy = Math.floor(y); const fx = x - ix, fy = y - iy; const a = noise(ix, iy), b = noise(ix + 1, iy), c2 = noise(ix, iy + 1), d = noise(ix + 1, iy + 1); const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return a + (b - a) * u + (c2 - a) * v + (a - b - c2 + d) * u * v; }
let t = 0; let raf = 0;
function draw() { const img = ctx.createImageData(c.width, c.height); const d = img.data; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const n = smoothNoise(x * params.scale + t, y * params.scale - t); const idx = (y * c.width + x) * 4; const v = Math.floor(n * 255); d[idx] = v < 128 ? 255 - v * 2 : 0; d[idx + 1] = v; d[idx + 2] = 255 - v; d[idx + 3] = 255; } ctx.putImageData(img, 0, 0); t += params.speed * 10; raf = requestAnimationFrame(draw); }
draw();
return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
```
