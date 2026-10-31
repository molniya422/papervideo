# 点击爆开（Click Burst）· `click-burst`

点击位置爆开一圈彩色粒子。

- 分类: interaction · 难度: ★★ · 标签: click, interaction

## 参数
- `count` (粒子数): 8–40（步长 2），默认 `20`

## HTML
```html
<div class="burst">CLICK ANYWHERE</div>
```

## CSS
```css
.burst { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #222; color: white; font-weight: 700; border-radius: 12px; cursor: pointer; }
```

## JS
```javascript
const burst = document.querySelector('.burst');
burst.addEventListener('click', (e) => {
  const r = burst.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  for (let i = 0; i < params.count; i++) {
    const p = document.createElement('span');
    const ang = (i / params.count) * Math.PI * 2;
    const dist = 40 + Math.random() * 30;
    p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:8px;height:8px;border-radius:50%;background:hsl(${Math.random()*360} 90% 60%);transition:all 0.6s cubic-bezier(0.2,0.8,0.2,1);`;
    burst.appendChild(p);
    requestAnimationFrame(() => { p.style.transform = `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px) scale(0)`; p.style.opacity = '0'; });
    setTimeout(() => p.remove(), 700);
  }
});
```
