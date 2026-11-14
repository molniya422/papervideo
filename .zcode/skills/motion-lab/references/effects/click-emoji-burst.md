# Emoji 爆开（Emoji Burst）· `click-emoji-burst`

点击位置爆开一圈 emoji,趣味反馈。

- 分类: interaction · 难度: ★★ · 标签: emoji, interaction

## 参数
- `count` (数量): 6–24（步长 1），默认 `12`

## HTML
```html
<div class="emoji-burst">CLICK</div>
```

## CSS
```css
.emoji-burst { position: relative; cursor: pointer; }
.emoji-burst .e { position: absolute; font-size: 24px; pointer-events: none; transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.7s; }
```

## JS
```javascript
const el = document.querySelector('.emoji-burst');
const emojis = ['🎉','✨','⭐','💫','🌟','🎊'];
el.addEventListener('click', (e) => { const r = el.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; for (let i = 0; i < 12; i++) { const s = document.createElement('span'); s.className = 'e'; s.textContent = emojis[i % emojis.length]; s.style.left = x + 'px'; s.style.top = y + 'px'; el.appendChild(s); const ang = (i / 12) * Math.PI * 2; const dist = 50 + Math.random() * 30; requestAnimationFrame(() => { s.style.transform = `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px) scale(0)`; s.style.opacity = '0'; }); setTimeout(() => s.remove(), 750); } });
```
