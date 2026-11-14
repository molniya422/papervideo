# Material 波纹（Material Ripple）· `click-ripple-material`

Material Design 风格点击波纹扩散。

- 分类: interaction · 难度: ★★ · 标签: material, interaction

## 参数
- `duration` (时长): 0.4–1.2（步长 0.05）s，默认 `0.6`

## HTML
```html
<button class="mat-ripple">CLICK</button>
```

## CSS
```css
.mat-ripple { position: relative; overflow: hidden; cursor: pointer; }
.mat-ripple .r { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.5); transform: translate(-50%, -50%) scale(0); animation: matRipple var(--duration, 0.6s) ease-out forwards; pointer-events: none; }
@keyframes matRipple { to { transform: translate(-50%, -50%) scale(10); opacity: 0; } }
```

## JS
```javascript
const btn = document.querySelector('.mat-ripple');
btn.addEventListener('click', (e) => { const r = btn.getBoundingClientRect(); const rip = document.createElement('span'); rip.className = 'r'; rip.style.left = (e.clientX - r.left) + 'px'; rip.style.top = (e.clientY - r.top) + 'px'; rip.style.width = rip.style.height = '20px'; btn.appendChild(rip); setTimeout(() => rip.remove(), 600); });
```
