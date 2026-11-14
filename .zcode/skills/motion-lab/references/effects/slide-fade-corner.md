# 角落滑入（Corner Slide）· `slide-fade-corner`

元素从左上角斜向滑入,带淡入。

- 分类: basic · 难度: ★★ · 标签: corner, basic

## 参数
- `duration` (时长): 0.3–2（步长 0.1）s，默认 `0.8`

## HTML
```html
<div class="corner-slide">Corner</div>
```

## CSS
```css
.corner-slide { animation: cornerSlide var(--duration, 0.8s) cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes cornerSlide { from { opacity: 0; transform: translate(-40px, -40px) scale(0.8); } to { opacity: 1; transform: translate(0, 0) scale(1); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
