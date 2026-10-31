# 随悬停变色（Color Hover）· `color-picker-hover`

悬停位置产生彩色光晕。

- 分类: interaction · 难度: ★ · 标签: color, interaction

## 参数
- `size` (光晕大小): 100–600（步长 20）px，默认 `300`

## HTML
```html
<div class="color-hover"></div>
```

## CSS
```css
.color-hover { background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), hsl(var(--h, 0) 90% 60%), transparent 50%); }
```

## JS
```javascript
const el = document.querySelector('.color-hover');
el.addEventListener('mousemove', (e) => {
  const r = el.getBoundingClientRect();
  el.style.setProperty('--x', (e.clientX - r.left) + 'px');
  el.style.setProperty('--y', (e.clientY - r.top) + 'px');
  el.style.setProperty('--h', Math.random() * 360);
});
```
