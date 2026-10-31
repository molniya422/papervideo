# 加载旋转（Spinner）· `spinner`

经典加载指示器。

- 分类: basic · 难度: ★ · 标签: spinner, basic

## 参数
- `duration` (周期): 0.3–2（步长 0.1）s，默认 `0.8`

## HTML
```html
<div class="spinner"></div>
```

## CSS
```css
.spinner { width: 32px; height: 32px; border: 3px solid rgba(0,0,0,0.1); border-top-color: var(--accent); border-radius: 50%; animation: spin var(--duration, 0.8s) linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
