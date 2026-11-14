# SVG 形变（Morph SVG）· `morph-svg`

SVG path 之间平滑形变。

- 分类: advanced · 难度: ★★★ · 标签: morph, advanced

## 参数
- `duration` (时长): 0.4–3（步长 0.1）s，默认 `1.5`

## HTML
```html
<svg viewBox="0 0 100 100"><path class="p" d="M10 50 Q50 10 90 50 Q50 90 10 50" fill="none" stroke="currentColor" stroke-width="4"/></svg>
```

## CSS
```css
svg { width: 200px; height: 200px; }
```

## JS
```javascript
const p = document.querySelector('.p');
const paths = ['M10 50 Q50 10 90 50 Q50 90 10 50', 'M10 10 L90 10 L90 90 L10 90 Z'];
let i = 0; setInterval(() => { p.setAttribute('d', paths[i++ % 2]); }, 1500);
```
