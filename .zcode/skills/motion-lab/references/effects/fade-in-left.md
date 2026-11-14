# 左侧淡入（Fade In Left）· `fade-in-left`

元素从左侧淡入滑入,适合横向布局。

- 分类: basic · 难度: ★ · 标签: fade, basic

## 参数
- `duration` (时长): 0.2–3（步长 0.1）s，默认 `0.8`
- `distance` (距离): 10–80（步长 5）px，默认 `24`

## HTML
```html
<div class="fade-in-left">Hello</div>
```

## CSS
```css
.fade-in-left { animation: fadeInLeft var(--duration, 0.8s) ease-out both; }
@keyframes fadeInLeft { from { opacity: 0; transform: translateX(calc(var(--distance, 24px) * -1)); } to { opacity: 1; transform: translateX(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
