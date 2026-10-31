# 上滑淡入（Fade In Up）· `fade-in-up`

元素从下方淡入,常用于列表项。

- 分类: basic · 难度: ★ · 标签: fade, basic

## 参数
- `duration` (时长): 0.2–3（步长 0.1）s，默认 `0.8`
- `distance` (距离): 10–80（步长 5）px，默认 `20`

## HTML
```html
<div class="fade-in-up">Hello</div>
```

## CSS
```css
.fade-in-up { animation: fadeInUp var(--duration, 0.8s) ease-out both; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(var(--distance, 20px)); } to { opacity: 1; transform: translateY(0); } }
```

## JS
```javascript
// Pure CSS
```
