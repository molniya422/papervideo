# 点击冲击波（Shockwave）· `click-shockwave`

点击产生扩散冲击波环,强烈反馈。

- 分类: interaction · 难度: ★★ · 标签: shockwave, interaction

## 参数
- `duration` (时长): 0.4–1.5（步长 0.05）s，默认 `0.8`

## HTML
```html
<div class="shockwave">CLICK</div>
```

## CSS
```css
.shockwave { position: relative; cursor: pointer; }
.shockwave .wave { position: absolute; border: 3px solid hsl(280 90% 60%); border-radius: 50%; transform: translate(-50%, -50%) scale(0); animation: shock var(--duration, 0.8s) ease-out forwards; pointer-events: none; }
@keyframes shock { to { transform: translate(-50%, -50%) scale(8); opacity: 0; border-width: 1px; } }
```

## JS
```javascript
const el = document.querySelector('.shockwave');
el.addEventListener('click', (e) => { const r = el.getBoundingClientRect(); const w = document.createElement('span'); w.className = 'wave'; w.style.left = (e.clientX - r.left) + 'px'; w.style.top = (e.clientY - r.top) + 'px'; w.style.width = w.style.height = '20px'; el.appendChild(w); setTimeout(() => w.remove(), 800); });
```
