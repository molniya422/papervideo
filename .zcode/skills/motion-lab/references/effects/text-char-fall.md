# 字符下落（Char Fall）· `text-char-fall`

字符从上方依次下落入位,瀑布感。

- 分类: text · 难度: ★★ · 标签: char, text

## 参数
- `duration` (时长): 0.6–2.5（步长 0.1）s，默认 `1.2`

## HTML
```html
<h1 class="char-fall">FALL</h1>
```

## CSS
```css
.char-fall span { display: inline-block; opacity: 0; animation: charFall var(--duration, 1.2s) cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.char-fall span:nth-child(n) { animation-delay: calc(0.1s * n); }
@keyframes charFall { from { opacity: 0; transform: translateY(-60px) rotate(-20deg); } to { opacity: 1; transform: translateY(0) rotate(0); } }
```

## JS
```javascript
[...document.querySelector('.char-fall').textContent].forEach(c => { const s = document.createElement('span'); s.textContent = c; c.replaceWith(s); });
```
