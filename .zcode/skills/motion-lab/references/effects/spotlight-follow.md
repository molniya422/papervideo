# 跟随聚光（Spotlight）· `spotlight-follow`

鼠标位置形成 spotlight 高亮,其余区域变暗。

- 分类: interaction · 难度: ★★ · 标签: spotlight, interaction

## 参数
- `size` (光圈): 100–400（步长 20）px，默认 `220`

## HTML
```html
<div class="spot"><div class="spot-inner">SPOTLIGHT</div></div>
```

## CSS
```css
.spot { position: relative; width: 100%; height: 100%; background: #111; border-radius: 12px; cursor: crosshair; }
.spot-inner { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: 900; letter-spacing: 0.1em; }
```

## JS
```javascript
const spot = document.querySelector('.spot');
spot.addEventListener('mousemove', (e) => {
  const r = spot.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  spot.style.background = `radial-gradient(circle ${params.size}px at ${x}px ${y}px, rgba(255,255,255,0.25), #111 70%)`;
});
spot.addEventListener('mouseleave', () => spot.style.background = '#111');
```
