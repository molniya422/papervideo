# 路径运动（Trajectory）· `trajectory-path`

元素沿 SVG 路径平滑运动。

- 分类: advanced · 难度: ★★ · 标签: trajectory, advanced

## 参数
- `duration` (周期): 2–8（步长 0.2）s，默认 `4`

## HTML
```html
<svg class="traj" viewBox="0 0 200 100"><path class="p" d="M10,80 C40,10 70,90 100,40 S160,90 190,30" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="2" stroke-dasharray="4 4"/><circle class="dot" r="5" fill="hsl(280 90% 60%)"/></svg>
```

## CSS
```css
.traj { width: 100%; height: 100%; }
```

## JS
```javascript
const path = document.querySelector('.p'); const dot = document.querySelector('.dot');
const len = path.getTotalLength();
let t = 0; let raf = 0;
function tick() { t += 16 / (params.duration * 1000); if (t > 1) t = 0; const p = path.getPointAtLength(t * len); dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); raf = requestAnimationFrame(tick); } tick();
return () => cancelAnimationFrame(raf);
```
