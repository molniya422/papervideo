# 鼠标拖尾（Mouse Trail）· `mouse-trail`

鼠标移动时留下一串彩色粒子拖尾。

- 分类: interaction · 难度: ★★ · 标签: mouse, interaction

## 参数
- `count` (粒子数): 6–30（步长 1），默认 `12`
- `size` (尺寸): 4–16（步长 1）px，默认 `8`

## HTML
```html
<div class="trail-zone"></div>
```

## CSS
```css
.trail-zone { position: relative; width: 100%; height: 100%; cursor: crosshair; }
.trail-dot { position: absolute; border-radius: 50%; pointer-events: none; }
```

## JS
```javascript
const zone = document.querySelector('.trail-zone');
let dots = [];
for (let i = 0; i < params.count; i++) { const d = document.createElement('div'); d.className = 'trail-dot'; d.style.width = d.style.height = params.size + 'px'; d.style.background = `hsl(${i * 30} 90% 60%)`; zone.appendChild(d); dots.push(d); }
let history = [];
zone.addEventListener('mousemove', (e) => { const r = zone.getBoundingClientRect(); history.unshift({ x: e.clientX - r.left, y: e.clientY - r.top }); if (history.length > params.count) history.pop(); dots.forEach((d, i) => { const p = history[i] || history[history.length - 1]; if (!p) return; d.style.left = (p.x - params.size/2) + 'px'; d.style.top = (p.y - params.size/2) + 'px'; d.style.opacity = String(1 - i / params.count); }); });
```
