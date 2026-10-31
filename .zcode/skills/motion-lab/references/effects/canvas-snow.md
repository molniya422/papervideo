# 雪花飘落（Canvas Snow）· `canvas-snow`

Canvas 模拟雪花飘落,带风偏移。

- 分类: advanced · 难度: ★★ · 标签: canvas, advanced

## 参数
- `count` (雪花数): 30–300（步长 10），默认 `100`

## HTML
```html
<canvas class="snow"></canvas>
```

## CSS
```css
.snow { width: 100%; height: 100%; }
```

## JS
```javascript
const c = document.querySelector('.snow'); const ctx = c.getContext('2d');
const flakes = [];
for (let i = 0; i < 100; i++) flakes.push({ x: Math.random()*c.width, y: Math.random()*c.height, r: 1+Math.random()*3, s: 0.5+Math.random()*1.5, w: Math.random()*2-1 });
function tick() { ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle = 'white'; flakes.forEach(f => { f.y += f.s; f.x += f.w; if (f.y > c.height) f.y = 0; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); }); requestAnimationFrame(tick); } tick();
```
