# 水波涟漪（Water Ripple）· `ripple-water`

点击产生水波涟漪,实时衰减。

- 分类: advanced · 难度: ★★ · 标签: water, advanced

## 参数
- `duration` (衰减时长): 1–4（步长 0.2）s，默认 `2`
- `count` (波纹数): 2–6（步长 1），默认 `3`

## HTML
```html
<div class="water"><span class="hint">CLICK</span></div>
```

## CSS
```css
.water { position: relative; width: 100%; height: 100%; background: hsl(200 80% 50%); border-radius: 12px; cursor: pointer; overflow: hidden; }
.water .hint { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 24px; letter-spacing: 0.2em; pointer-events: none; }
.water .ring { position: absolute; border-radius: 50%; border: 3px solid white; transform: translate(-50%, -50%); pointer-events: none; }
```

## JS
```javascript
const water = document.querySelector('.water');
water.addEventListener('click', (e) => { const r = water.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; for (let i = 0; i < params.count; i++) { const ring = document.createElement('div'); ring.className = 'ring'; ring.style.left = x + 'px'; ring.style.top = y + 'px'; ring.style.width = ring.style.height = '20px'; ring.style.transition = `all ${params.duration}s ease-out ${i * 0.2}s`; water.appendChild(ring); requestAnimationFrame(() => { ring.style.width = ring.style.height = (200 + i * 80) + 'px'; ring.style.opacity = '0'; }); setTimeout(() => ring.remove(), (params.duration + i * 0.2) * 1000 + 200); } });
```
