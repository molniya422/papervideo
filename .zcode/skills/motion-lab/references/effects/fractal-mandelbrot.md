# 曼德博集合（Mandelbrot）· `fractal-mandelbrot`

Canvas 渲染曼德博分形集合,自相似图案。

- 分类: advanced · 难度: ★★★ · 标签: mandelbrot, advanced

## 参数
- `iterations` (迭代): 30–200（步长 10），默认 `80`

## HTML
```html
<canvas class="mandel"></canvas>
```

## CSS
```css
.mandel { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.mandel'); const ctx = c.getContext('2d');
const img = ctx.createImageData(c.width, c.height); const d = img.data;
for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) { let x = 0, y = 0, i = 0; const cx = (px - c.width/2)/120 - 0.5, cy = (py - c.height/2)/120; while (x*x + y*y < 4 && i < 80) { const xt = x*x - y*y + cx; y = 2*x*y + cy; x = xt; i++; } const idx = (py*c.width + px)*4; const v = i === 80 ? 0 : (i*8 % 256); d[idx] = v; d[idx+1] = v*0.5; d[idx+2] = 255 - v; d[idx+3] = 255; }
ctx.putImageData(img, 0, 0);
```
