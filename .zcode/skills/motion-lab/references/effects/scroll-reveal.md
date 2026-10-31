# 滚动揭示（Scroll Reveal）· `scroll-reveal`

元素进入视口时上滑淡入,常见落地页效果。

- 分类: interaction · 难度: ★★ · 标签: scroll, interaction

## 参数
- `distance` (位移): 10–100（步长 5）px，默认 `40`

## HTML
```html
<div class="scroll-reveal">REVEAL ON SCROLL</div>
```

## CSS
```css
.scroll-reveal { opacity: 0; transform: translateY(40px); transition: opacity 0.6s, transform 0.6s; }
.scroll-reveal.in { opacity: 1; transform: translateY(0); }
```

## JS
```javascript
const el = document.querySelector('.scroll-reveal');
const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) el.classList.add('in'); }), { threshold: 0.2 });
io.observe(el);
```
