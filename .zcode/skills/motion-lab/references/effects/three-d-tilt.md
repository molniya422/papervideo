# 3D 倾斜（3D Tilt）· `three-d-tilt`

卡片随鼠标 3D 倾斜。

- 分类: interaction · 难度: ★★ · 标签: 3d, interaction

## 参数
- `max` (最大角度): 5–30（步长 1）°，默认 `15`

## HTML
```html
<div class="tilt">TILT</div>
```

## CSS
```css
.tilt { transform-style: preserve-3d; transition: transform 0.2s; }
```

## JS
```javascript
const el = document.querySelector('.tilt');
el.addEventListener('mousemove', (e) => {
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.transform = `perspective(600px) rotateY(${x * 30}deg) rotateX(${-y * 30}deg)`;
});
```
