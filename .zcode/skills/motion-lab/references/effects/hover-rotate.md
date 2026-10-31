# 悬停旋转（Hover Rotate）· `hover-rotate`

鼠标悬停时元素旋转,带过渡。

- 分类: interaction · 难度: ★ · 标签: hover, interaction

## 参数
- `angle` (角度): 5–180（步长 5）°，默认 `30`

## HTML
```html
<div class="hover-rotate">ROTATE</div>
```

## CSS
```css
.hover-rotate { transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); cursor: pointer; }
.hover-rotate:hover { transform: rotate(var(--angle, 30deg)); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
