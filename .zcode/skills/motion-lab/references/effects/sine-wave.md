# 正弦波（Sine Wave）· `sine-wave`

Canvas 渲染的正弦波。

- 分类: advanced · 难度: ★★ · 标签: sine, advanced

## 参数
- `frequency` (频率): 0.005–0.05（步长 0.005），默认 `0.02`
- `amplitude` (振幅): 10–80（步长 5）px，默认 `30`

## HTML
```html
<canvas class="wave"></canvas>
```

## CSS
```css
.wave { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.wave'); const ctx = c.getContext('2d');
let t = 0;
function draw() { ctx.clearRect(0, 0, c.width, c.height); ctx.beginPath();
for (let x = 0; x < c.width; x++) ctx.lineTo(x, c.height/2 + Math.sin(x * 0.02 + t) * 30);
ctx.stroke(); t += 0.05; requestAnimationFrame(draw); } draw();
```
