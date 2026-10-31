# 磁吸文字（Magnetic Text）· `hover-magnetic-text`

文字字符被光标磁吸,逐字位移。

- 分类: interaction · 难度: ★★ · 标签: magnetic, interaction

## 参数
- `strength` (强度): 0.1–0.8（步长 0.05），默认 `0.35`

## HTML
```html
<h1 class="mag-text">MAGNETIC</h1>
```

## CSS
```css
.mag-text span { display: inline-block; transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1); }
```

## JS
```javascript
const el = document.querySelector('.mag-text');
[...el.textContent].forEach(c => { const s = document.createElement('span'); s.textContent = c; c.replaceWith(s); });
el.addEventListener('mousemove', (e) => { el.querySelectorAll('span').forEach(s => { const r = s.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2); const dy = e.clientY - (r.top + r.height / 2); const d = Math.hypot(dx, dy); if (d < 100) s.style.transform = `translate(${dx * 0.35}px, ${dy * 0.35}px)`; else s.style.transform = ''; }); });
```
