# 悬停上浮（Hover Lift）· `hover-lift`

hover 时元素上浮并加深阴影。

- 分类: interaction · 难度: ★ · 标签: hover, interaction

## 参数
- `lift` (上浮): 2–20（步长 1）px，默认 `8`

## HTML
```html
<div class="lift">HOVER ME</div>
```

## CSS
```css
.lift { padding: 24px 32px; background: white; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.25s ease, box-shadow 0.25s ease; font-weight: 700; }
.lift:hover { transform: translateY(calc(var(--lift, 8px) * -1)); box-shadow: 0 16px 32px rgba(0,0,0,0.18); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
