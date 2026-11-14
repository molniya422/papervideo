# 右侧滑入（Slide In Right）· `slide-in-right`

元素从右侧滑入视口。

- 分类: basic · 难度: ★ · 标签: slide, basic

## 参数
- `duration` (时长): 0.2–2（步长 0.1）s，默认 `0.6`

## HTML
```html
<div class="slide-right">←</div>
```

## CSS
```css
.slide-right { animation: slideRight var(--duration, 0.6s) ease-out both; }
@keyframes slideRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
