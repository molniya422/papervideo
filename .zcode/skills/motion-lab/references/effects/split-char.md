# 字符分裂（Split Character）· `split-char`

每个字符从上下分开再合拢。

- 分类: text · 难度: ★★ · 标签: split, text

## 参数
- `duration` (时长): 0.4–2（步长 0.1）s，默认 `0.8`

## HTML
```html
<h1 class="split-char">SPLIT</h1>
```

## CSS
```css
.split-char span { display: inline-block; animation: split var(--duration, 0.8s) ease-out both; }
.split-char span:nth-child(odd) { animation-name: splitTop; }
.split-char span:nth-child(even) { animation-name: splitBot; }
@keyframes splitTop { from { transform: translateY(-100%); } to { transform: translateY(0); } }
@keyframes splitBot { from { transform: translateY(100%); } to { transform: translateY(0); } }
```

## JS
```javascript
[...document.querySelector('.split-char').textContent].forEach(c => { const s = document.createElement('span'); s.textContent = c; c.replaceWith(s); });
```
