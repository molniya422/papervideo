# 文字左滑（Text Slide Left）· `text-slide-left`

文字从右侧滑入归位,横向入场。

- 分类: text · 难度: ★ · 标签: slide, text

## 参数
- `duration` (时长): 0.4–2（步长 0.1）s，默认 `0.8`
- `distance` (距离): 20–100（步长 5）px，默认 `40`

## HTML
```html
<h1 class="text-slide-left">SLIDE</h1>
```

## CSS
```css
.text-slide-left { animation: textSlideLeft var(--duration, 0.8s) cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes textSlideLeft { from { opacity: 0; transform: translateX(var(--distance, 40px)); } to { opacity: 1; transform: translateX(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
