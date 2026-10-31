# 弹簧物理（Spring Physics）· `physics-spring`

弹簧物理仿真,拖动后回弹。

- 分类: advanced · 难度: ★★★ · 标签: spring, advanced

## 参数
- `stiffness` (刚度): 0.02–0.3（步长 0.01），默认 `0.12`
- `damping` (阻尼): 0.7–0.98（步长 0.01），默认 `0.88`

## HTML
```html
<div class="spring-zone"><div class="ball-s"></div></div>
```

## CSS
```css
.spring-zone { position: relative; width: 100%; height: 100%; background: #f0f0f0; border-radius: 12px; cursor: grab; overflow: hidden; }
.spring-zone .ball-s { position: absolute; width: 48px; height: 48px; border-radius: 50%; background: radial-gradient(circle, hsl(20 90% 60%), hsl(0 80% 40%)); box-shadow: 0 8px 16px rgba(0,0,0,0.2); top: 50%; left: 50%; transform: translate(-50%, -50%); }
```

## JS
```javascript
const zone = document.querySelector('.spring-zone'); const ball = document.querySelector('.ball-s');
let px = zone.offsetWidth / 2, py = zone.offsetHeight / 2, vx = 0, vy = 0, dragging = false;
let offX = 0, offY = 0;
zone.addEventListener('mousedown', (e) => { dragging = true; const r = ball.getBoundingClientRect(); offX = e.clientX - (r.left + 24); offY = e.clientY - (r.top + 24); });
window.addEventListener('mousemove', (e) => { if (!dragging) return; const r = zone.getBoundingClientRect(); px = e.clientX - r.left - offX; py = e.clientY - r.top - offY; });
window.addEventListener('mouseup', () => dragging = false);
let raf = 0;
const cx = () => zone.offsetWidth / 2, cy = () => zone.offsetHeight / 2;
function tick() { if (!dragging) { const dx = cx() - px, dy = cy() - py; vx += dx * params.stiffness; vy += dy * params.stiffness; vx *= params.damping; vy *= params.damping; px += vx; py += vy; } ball.style.left = (px - 24) + 'px'; ball.style.top = (py - 24) + 'px'; raf = requestAnimationFrame(tick); } tick();
return () => { cancelAnimationFrame(raf); };
```
