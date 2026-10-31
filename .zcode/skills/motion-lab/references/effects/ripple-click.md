# 点击波纹（Ripple Click）· `ripple-click`

Material Design 风格的点击波纹。

- 分类: interaction · 难度: ★ · 标签: ripple, interaction

## 参数
- `duration` (时长): 0.4–1.5（步长 0.1）s，默认 `0.6`

## HTML
```html
<button class="ripple-btn">Click</button>
```

## CSS
```css
.ripple-btn { position: relative; overflow: hidden; }
.ripple-btn .ripple { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.5); animation: ripple var(--duration, 0.6s); }
@keyframes ripple { to { transform: scale(4); opacity: 0; } }
```

## JS
```javascript
document.querySelector('.ripple-btn').addEventListener('click', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = (e.clientX - r.left) + 'px';
  ripple.style.top = (e.clientY - r.top) + 'px';
  ripple.style.width = ripple.style.height = '20px';
  e.currentTarget.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});
```
