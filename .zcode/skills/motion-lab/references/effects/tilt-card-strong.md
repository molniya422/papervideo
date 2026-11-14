# 强倾斜（Strong Tilt）· `tilt-card-strong`

比 3D Tilt 更夸张的倾斜效果,带光斑。

- 分类: interaction · 难度: ★★ · 标签: strong, interaction

## 参数
- `max` (最大角度): 10–45（步长 1）°，默认 `25`

## HTML
```html
<div class="tilt-s">STRONG TILT</div>
```

## CSS
```css
.tilt-s { width: 240px; height: 160px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, hsl(280 90% 65%), hsl(200 90% 60%)); color: white; font-weight: 900; font-size: 24px; border-radius: 16px; cursor: pointer; transform-style: preserve-3d; transition: transform 0.15s; }
```

## JS
```javascript
const el = document.querySelector('.tilt-s');
el.addEventListener('mousemove', (e) => {
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.transform = `perspective(800px) rotateY(${x * params.max * 2}deg) rotateX(${-y * params.max * 2}deg)`;
});
el.addEventListener('mouseleave', () => el.style.transform = '');
```
