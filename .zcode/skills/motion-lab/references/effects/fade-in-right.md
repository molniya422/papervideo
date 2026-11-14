# 右侧淡入（Fade In Right）· `fade-in-right`

元素从右侧淡入滑入,横向入场。

- 分类: basic · 难度: ★ · 标签: fade, basic

## 参数
- `duration` (时长): 0.2–3（步长 0.1）s，默认 `0.8`
- `distance` (距离): 10–80（步长 5）px，默认 `24`

## HTML
```html
<div class="fade-in-right">Hello</div>
```

## CSS
```css
.fade-in-right { animation: fadeInRight var(--duration, 0.8s) ease-out both; }
@keyframes fadeInRight { from { opacity: 0; transform: translateX(var(--distance, 24px)); } to { opacity: 1; transform: translateX(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
