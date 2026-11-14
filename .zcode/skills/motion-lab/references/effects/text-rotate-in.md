# 字符旋转（Char Rotate）· `text-rotate-in`

每个字符依次旋转入场,强调感强。

- 分类: text · 难度: ★★ · 标签: char, text

## 参数
- `duration` (单项时长): 0.3–1.2（步长 0.1）s，默认 `0.6`
- `stagger` (间隔): 0.05–0.4（步长 0.05）s，默认 `0.1`

## HTML
```html
<h1 class="tri">ROTATE</h1>
```

## CSS
```css
.tri span { display: inline-block; opacity: 0; animation: tri var(--duration, 0.6s) ease-out forwards; }
.tri span:nth-child(1) { animation-delay: 0s; }
.tri span:nth-child(2) { animation-delay: var(--stagger, 0.1s); }
.tri span:nth-child(3) { animation-delay: calc(var(--stagger, 0.1s) * 2); }
@keyframes tri { from { opacity: 0; transform: rotateY(180deg); } to { opacity: 1; transform: rotateY(0); } }
```

## JS
```javascript
[...document.querySelector('.tri').textContent].forEach(c => { const s = document.createElement('span'); s.textContent = c; c.replaceWith(s); });
```
