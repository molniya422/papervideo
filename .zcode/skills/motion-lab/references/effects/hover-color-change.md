# 悬停变色（Hover Color）· `hover-color-change`

悬停时元素背景色平滑过渡。

- 分类: interaction · 难度: ★ · 标签: hover, interaction

## 参数
- `duration` (时长): 0.1–1（步长 0.05）s，默认 `0.3`

## HTML
```html
<div class="hover-color">CHANGE</div>
```

## CSS
```css
.hover-color { background: hsl(280 90% 60%); transition: background var(--duration, 0.3s) ease, transform var(--duration, 0.3s) ease; cursor: pointer; }
.hover-color:hover { background: hsl(200 90% 55%); transform: translateY(-2px); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
