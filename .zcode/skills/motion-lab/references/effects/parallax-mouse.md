# 鼠标视差（Parallax Mouse）· `parallax-mouse`

多层元素按不同深度响应鼠标。

- 分类: interaction · 难度: ★★ · 标签: parallax, interaction

## 参数
- `intensity` (强度): 5–40（步长 1）px，默认 `20`

## HTML
```html
<div class="parallax"><div class="layer bg" data-depth="1"></div><div class="layer fg" data-depth="3"></div></div>
```

## CSS
```css
.parallax { position: relative; }
.layer { position: absolute; inset: 0; transition: transform 0.2s; }
```

## JS
```javascript
document.querySelector('.parallax').addEventListener('mousemove', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  e.currentTarget.querySelectorAll('.layer').forEach(l => {
    const d = +l.dataset.depth;
    l.style.transform = `translate(${x * d * 20}px, ${y * d * 20}px)`;
  });
});
```
