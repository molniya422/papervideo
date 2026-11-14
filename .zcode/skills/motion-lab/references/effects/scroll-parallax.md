# 滚动视差（Scroll Parallax）· `scroll-parallax`

多层元素按不同速度响应滚动,纵深感。

- 分类: interaction · 难度: ★★ · 标签: scroll, interaction

## 参数
- `speed` (速度): 0.1–0.8（步长 0.05），默认 `0.3`

## HTML
```html
<div class="scroll-parallax"><div class="layer" data-d="0.3">BACK</div><div class="layer" data-d="0.6">MID</div><div class="layer" data-d="1">FRONT</div></div>
```

## CSS
```css
.scroll-parallax { position: relative; }
.scroll-parallax .layer { transition: transform 0.1s; }
```

## JS
```javascript
const wrap = document.querySelector('.scroll-parallax');
window.addEventListener('scroll', () => { const r = wrap.getBoundingClientRect(); const y = r.top; wrap.querySelectorAll('.layer').forEach(l => { const d = +l.dataset.d; l.style.transform = `translateY(${y * d * 0.3}px)`; }); });
```
