# 边框扩展（Border Expand）· `hover-border-expand`

悬停时边框从中心向四周扩展。

- 分类: interaction · 难度: ★★ · 标签: border, interaction

## 参数
- `duration` (时长): 0.2–1（步长 0.05）s，默认 `0.4`

## HTML
```html
<div class="border-expand">EXPAND</div>
```

## CSS
```css
.border-expand { position: relative; cursor: pointer; }
.border-expand::before { content: ""; position: absolute; inset: 50% 50%; border: 2px solid hsl(280 90% 60%); border-radius: 12px; transition: inset var(--duration, 0.4s) cubic-bezier(0.2, 0.8, 0.2, 1); }
.border-expand:hover::before { inset: 0; }
```

## JS
```javascript
// Pure CSS — no JS needed
```
