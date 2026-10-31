# 粘性球（Metaball）· `metaball`

模糊叠加形成粘性 metaball 效果。

- 分类: advanced · 难度: ★★★ · 标签: metaball, advanced

## 参数
- `count` (球数): 3–10（步长 1），默认 `6`
- `blur` (模糊): 10–60（步长 2）px，默认 `28`

## HTML
```html
<div class="mb"></div>
```

## CSS
```css
.mb { position: relative; width: 100%; height: 100%; background: #0a0a1a; }
.mb .ball { position: absolute; border-radius: 50%; filter: blur(var(--blur, 28px)); will-change: transform; }
```

## JS
```javascript
const mb = document.querySelector('.mb');
const balls = [];
for (let i = 0; i < params.count; i++) { const b = document.createElement('div'); b.className = 'ball'; b.style.width = b.style.height = (60 + Math.random() * 40) + 'px'; b.style.background = i % 2 ? 'hsl(280 90% 60%)' : 'hsl(180 90% 55%)'; mb.appendChild(b); balls.push({ el: b, x: 0, y: 0, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2 }); }
let raf = 0;
const w = () => mb.offsetWidth, h = () => mb.offsetHeight;
function tick() { balls.forEach(b => { b.x += b.vx; b.y += b.vy; if (b.x < 0 || b.x > w() - 80) b.vx *= -1; if (b.y < 0 || b.y > h() - 80) b.vy *= -1; b.el.style.transform = `translate(${b.x}px, ${b.y}px)`; }); raf = requestAnimationFrame(tick); }
tick();
return () => cancelAnimationFrame(raf);
```
