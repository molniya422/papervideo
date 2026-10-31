# 悬停缩放（Hover Scale）· `hover-scale`

鼠标悬停时元素放大,平滑过渡。

- 分类: interaction · 难度: ★ · 标签: hover, interaction

## 参数
- `scale` (缩放): 1.05–1.6（步长 0.05），默认 `1.15`

## HTML
```html
<div class="hover-scale">HOVER</div>
```

## CSS
```css
.hover-scale { transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); cursor: pointer; }
.hover-scale:hover { transform: scale(var(--scale, 1.15)); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
