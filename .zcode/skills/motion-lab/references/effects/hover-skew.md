# 悬停倾斜（Hover Skew）· `hover-skew`

鼠标悬停时元素倾斜变形,动感。

- 分类: interaction · 难度: ★ · 标签: hover, interaction

## 参数
- `angle` (角度): 5–30（步长 1）°，默认 `15`

## HTML
```html
<div class="hover-skew">SKEW</div>
```

## CSS
```css
.hover-skew { transition: transform 0.3s ease; cursor: pointer; }
.hover-skew:hover { transform: skewX(calc(var(--angle, 15deg) * -1)); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
