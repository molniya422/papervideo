# 滚动进度（Scroll Progress）· `scroll-progress`

页面滚动进度条,顶部高亮显示。

- 分类: interaction · 难度: ★ · 标签: scroll, interaction

## 参数
- `height` (高度): 2–10（步长 1）px，默认 `4`

## HTML
```html
<div class="scroll-progress"><div class="bar"></div></div>
```

## CSS
```css
.scroll-progress { position: fixed; top: 0; left: 0; right: 0; height: 4px; background: rgba(0,0,0,0.1); z-index: 100; }
.scroll-progress .bar { height: 100%; width: 0; background: linear-gradient(90deg, hsl(280 90% 60%), hsl(200 90% 60%)); transition: width 0.1s; }
```

## JS
```javascript
const bar = document.querySelector('.scroll-progress .bar');
window.addEventListener('scroll', () => { const h = document.documentElement; const p = h.scrollTop / (h.scrollHeight - h.clientHeight); bar.style.width = (p * 100) + '%'; });
```
