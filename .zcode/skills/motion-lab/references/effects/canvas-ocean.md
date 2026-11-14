# 海浪（Canvas Ocean）· `canvas-ocean`

Canvas 多层正弦叠加模拟海浪起伏。

- 分类: advanced · 难度: ★★★ · 标签: canvas, advanced

## 参数
- `speed` (速度): 0.01–0.2（步长 0.01），默认 `0.05`

## HTML
```html
<canvas class="ocean"></canvas>
```

## CSS
```css
.ocean { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.ocean'); const ctx = c.getContext('2d');
let t = 0;
function wave(y, amp, freq, color) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= c.width; x += 4) ctx.lineTo(x, y + Math.sin(x*freq + t)*amp); ctx.lineTo(c.width, c.height); ctx.lineTo(0, c.height); ctx.fillStyle = color; ctx.fill(); }
function tick() { ctx.fillStyle = '#0a1a3a'; ctx.fillRect(0,0,c.width,c.height); wave(c.height*0.5, 16, 0.02, 'hsl(200 80% 40%)'); wave(c.height*0.62, 12, 0.03, 'hsl(210 80% 50%)'); wave(c.height*0.74, 8, 0.04, 'hsl(200 90% 60%)'); t += 0.05; requestAnimationFrame(tick); } tick();
```
