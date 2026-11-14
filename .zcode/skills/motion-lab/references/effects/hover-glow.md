# 悬停发光（Hover Glow）· `hover-glow`

悬停时元素周围发光晕,聚焦感。

- 分类: interaction · 难度: ★ · 标签: hover, interaction

## 参数
- `intensity` (强度): 10–60（步长 2）px，默认 `28`

## HTML
```html
<div class="hover-glow">GLOW</div>
```

## CSS
```css
.hover-glow { transition: box-shadow 0.3s ease, transform 0.3s ease; cursor: pointer; }
.hover-glow:hover { box-shadow: 0 0 var(--intensity, 28px) hsl(280 90% 60%); transform: translateY(-2px); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
