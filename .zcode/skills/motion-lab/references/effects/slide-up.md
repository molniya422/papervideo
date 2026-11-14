# 上滑入场（Slide Up）· `slide-up`

元素从下往上滑入并淡入,通用入场动画。

- 分类: basic · 难度: ★ · 标签: slide, basic

## 参数
- `duration` (时长): 0.2–2（步长 0.1）s，默认 `0.6`
- `distance` (距离): 20–120（步长 5）px，默认 `40`

## HTML
```html
<div class="slide-up">Slide Up</div>
```

## CSS
```css
.slide-up { animation: slideUp var(--duration, 0.6s) ease-out both; }
@keyframes slideUp { from { opacity: 0; transform: translateY(var(--distance, 40px)); } to { opacity: 1; transform: translateY(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
