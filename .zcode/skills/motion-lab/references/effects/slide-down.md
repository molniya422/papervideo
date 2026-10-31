# 下滑入场（Slide Down）· `slide-down`

元素从上往下滑入,适合顶部 banner。

- 分类: basic · 难度: ★ · 标签: slide, basic

## 参数
- `duration` (时长): 0.2–2（步长 0.1）s，默认 `0.6`
- `distance` (距离): 20–120（步长 5）px，默认 `40`

## HTML
```html
<div class="slide-down">Slide Down</div>
```

## CSS
```css
.slide-down { animation: slideDown var(--duration, 0.6s) ease-out both; }
@keyframes slideDown { from { opacity: 0; transform: translateY(calc(var(--distance, 40px) * -1)); } to { opacity: 1; transform: translateY(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
