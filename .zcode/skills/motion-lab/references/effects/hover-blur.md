# 悬停模糊（Hover Blur）· `hover-blur`

悬停时背景模糊,聚焦前景元素。

- 分类: interaction · 难度: ★★ · 标签: hover, interaction

## 参数
- `blur` (模糊): 2–16（步长 1）px，默认 `6`

## HTML
```html
<div class="hover-blur"><div class="bg"></div><div class="fg">FOCUS</div></div>
```

## CSS
```css
.hover-blur { position: relative; cursor: pointer; }
.hover-blur .bg { transition: filter 0.3s; }
.hover-blur:hover .bg { filter: blur(var(--blur, 6px)); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
