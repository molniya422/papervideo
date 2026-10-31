# 磁吸光标（Magnetic Cursor）· `magnetic-cursor`

光标靠近元素时元素被吸引。

- 分类: interaction · 难度: ★★ · 标签: magnetic, interaction

## 参数
- `strength` (强度): 0.1–0.8（步长 0.05），默认 `0.4`

## HTML
```html
<button class="magnetic">Hover me</button>
```

## CSS
```css
.magnetic { transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
```

## JS
```javascript
const btn = document.querySelector('.magnetic');
btn.addEventListener('mousemove', (e) => {
  const r = btn.getBoundingClientRect();
  const x = (e.clientX - r.left - r.width / 2) * 0.4;
  const y = (e.clientY - r.top - r.height / 2) * 0.4;
  btn.style.transform = `translate(${x}px, ${y}px)`;
});
btn.addEventListener('mouseleave', () => btn.style.transform = '');
```
