# 数字雨（Matrix Rain）· `matrix-rain`

Matrix 风格绿色字符雨。

- 分类: advanced · 难度: ★★★ · 标签: matrix, advanced

## 参数
- `speed` (速度): 1–6（步长 1），默认 `3`
- `density` (密度): 0.3–1（步长 0.1），默认 `0.7`

## HTML
```html
<canvas class="mr"></canvas>
```

## CSS
```css
.mr { width: 100%; height: 100%; background: #000; }
```

## JS
```javascript
const c = document.querySelector('.mr'); const ctx = c.getContext('2d');
const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
resize();
window.addEventListener('resize', resize);
const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789';
const fontSize = 14;
let cols = Math.floor(c.width / fontSize * params.density);
let drops = new Array(cols).fill(0);
let raf = 0;
function draw() { ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#0f0'; ctx.font = fontSize + 'px monospace'; for (let i = 0; i < drops.length; i++) { const ch = chars[Math.floor(Math.random() * chars.length)]; ctx.fillText(ch, i * fontSize, drops[i] * fontSize); if (drops[i] * fontSize > c.height && Math.random() > 0.975) drops[i] = 0; drops[i] += params.speed / 3; } raf = requestAnimationFrame(draw); }
draw();
return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
```
