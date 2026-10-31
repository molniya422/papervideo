# 磁吸按钮（Magnetic Button）· `magnetic-button`

按钮周围区域吸引按钮位移。

- 分类: interaction · 难度: ★★ · 标签: magnetic, interaction

## 参数
- `radius` (吸引半径): 30–200（步长 10）px，默认 `80`

## HTML
```html
<button class="mag-btn">PRESS</button>
```

## CSS
```css
.mag-btn { transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
```

## JS
```javascript
const btn = document.querySelector('.mag-btn');
document.addEventListener('mousemove', (e) => {
  const r = btn.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  const dist = Math.hypot(dx, dy);
  if (dist < 80) btn.style.transform = `translate(${dx * 0.3}px, ${dy * 0.3}px)`;
  else btn.style.transform = '';
});
```
